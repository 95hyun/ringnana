"use client";

import { Sparkles } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingCard } from "@/components/ui/loading-card";
import { SampleImage } from "@/components/ui/sample-image";
import type { Dict } from "@/dictionaries/jp";
import type { ConcernKey } from "@/lib/intake";
import { cn } from "@/lib/utils";
import { pollPreview, startPreview, uploadSelfie } from "../actions";
import demoGoalMelasma from "../_assets/demo-goal-melasma.jpg";
import demoGoalPores from "../_assets/demo-goal-pores.jpg";
import demoGoalWrinkles from "../_assets/demo-goal-wrinkles.jpg";
import demoSelfie from "../_assets/demo-selfie.jpg";
import { resizeImage } from "./resize-image";

// 실시간 생성이 안 될 때의 대체: 가상 모델(AI 생성 인물)의 셀카·목표 이미지 쌍. 본인 셀카와 섞지 않는다(본인 결과로 오인 방지)
const DEMO_GOALS: Partial<Record<ConcernKey, string>> = {
  melasma: demoGoalMelasma.src,
  freckles: demoGoalMelasma.src,
  wrinkles: demoGoalWrinkles.src,
  sagging: demoGoalWrinkles.src,
  pores: demoGoalPores.src,
};

const POLL_MS = 6_000;
const TIMEOUT_MS = 90_000;

type Gen =
  | { state: "idle" }
  | { state: "running"; startedAt: number; progress: number }
  | { state: "done"; url: string }
  | { state: "unavailable" };

type Props = {
  lang: string;
  consultationId: string;
  concerns: ConcernKey[]; // 문진 폼에서 지금 고른 고민 (제출 전이라 DB에 없다)
  t: Dict["h2"]["photos"];
  tg: Dict["booking"]["intake"]["goal"];
  concernLabels: Dict["h2"]["concerns"];
  common: Pick<Dict["common"], "sampleImage" | "aiLabel" | "loadingCaption">;
  // 이미 셀카를 보낸 draft면 서버가 넘겨주는 복원값 (새로고침해도 업로드 단계로 되돌아가지 않게)
  initial?: { selfieUrl: string; previewUrl: string | null };
};

// 문진 안의 선택 카드 — 셀카 1장 + AI 목표 이미지(BBANANA). 구 /photos 화면을 흡수
export function GoalImageCard({ lang, consultationId, concerns, t, tg, concernLabels, common, initial }: Props) {
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [before, setBefore] = useState<string | null>(initial?.selfieUrl ?? null);
  const [uploaded, setUploaded] = useState(Boolean(initial));
  const [picked, setPicked] = useState<ConcernKey | null>(null);
  const [gen, setGen] = useState<Gen>(initial?.previewUrl ? { state: "done", url: initial.previewUrl } : { state: "idle" });
  const [pending, startTransition] = useTransition();
  const runId = useRef(0);
  // 고민 선택이 바뀌어 사라진 값이면 첫 고민으로
  const concern = picked && concerns.includes(picked) ? picked : (concerns[0] ?? null);

  useEffect(() => () => {
    if (before?.startsWith("blob:")) URL.revokeObjectURL(before);
  }, [before]);

  async function onFile(file: File | undefined) {
    if (!file) return;
    try {
      const blob = await resizeImage(file);
      runId.current++; // 이전 사진의 생성 폴링을 끊는다
      setPhoto(blob);
      setBefore(URL.createObjectURL(blob));
      setUploaded(false);
      setGen({ state: "idle" });
    } catch {
      toast.error(t.imageLoadError);
    }
  }

  function upload() {
    if (!photo) return;
    const fd = new FormData();
    fd.set("consultationId", consultationId);
    fd.set("lang", lang);
    fd.set("photo", photo, "selfie.jpg");
    startTransition(async () => {
      const res = await uploadSelfie(fd);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setUploaded(true);
      if (concern) await generate(concern);
    });
  }

  // 생성은 부가 연출 — 어떤 실패든 'unavailable'로 접고 신청은 항상 가능하다
  async function generate(target: ConcernKey) {
    const id = ++runId.current;
    try {
      await runGeneration(id, target);
    } catch (e) {
      console.info("preview error:", e);
      if (runId.current === id) setGen({ state: "unavailable" });
    }
  }

  async function runGeneration(id: number, target: ConcernKey) {
    const startedAt = Date.now();
    setGen({ state: "running", startedAt, progress: 0 });
    const start = await startPreview(consultationId, target);
    if (!start.ok) {
      console.info("preview unavailable:", start.reason);
      if (runId.current === id) setGen({ state: "unavailable" });
      return;
    }
    while (runId.current === id && Date.now() - startedAt < TIMEOUT_MS) {
      await new Promise((r) => setTimeout(r, POLL_MS));
      if (runId.current !== id) return;
      const res = await pollPreview(start.taskId, consultationId, start.ticket);
      if (runId.current !== id) return;
      if (res.status === "succeeded") return setGen({ state: "done", url: res.url });
      if (res.status === "failed") {
        console.info("preview failed:", res.code);
        return setGen({ state: "unavailable" });
      }
      setGen({ state: "running", startedAt, progress: res.progress });
    }
    if (runId.current === id) setGen({ state: "unavailable" });
  }

  return (
    <section
      id="goal-image"
      className="flex scroll-mt-24 flex-col gap-6 rounded-2xl border bg-surface p-5 shadow-xs md:p-7"
      aria-labelledby="goal-image-title"
      data-testid="preview-card"
      data-state={uploaded ? gen.state : "upload"}
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-2">
          <h2 id="goal-image-title" className="flex items-center gap-2 text-[17px] font-semibold">
            <Sparkles className="size-[18px] text-primary" aria-hidden />
            {tg.title}
          </h2>
          <Badge variant="outline" className="border-border-strong text-muted-foreground">
            {tg.optional}
          </Badge>
        </div>
        <p className="text-[13px] leading-relaxed text-muted-foreground">{tg.lead}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <p className="text-[15px] font-semibold leading-normal">{t.step1Title}</p>
            <p className="text-[13px] leading-relaxed text-muted-foreground">{t.step1Desc}</p>
          </div>
          {before && !uploaded && <SampleImage src={before} alt={t.selectedAlt} label={common.sampleImage} className="max-w-60" />}
          <label className="flex h-11 cursor-pointer items-center justify-center rounded-[10px] border border-dashed bg-background text-[13px] font-medium has-focus-visible:ring-2 has-focus-visible:ring-ring">
            {photo || uploaded ? t.retake : t.pick}
            <input type="file" accept="image/*" className="sr-only" data-testid="selfie-input" onChange={(e) => onFile(e.target.files?.[0])} />
          </label>
          {photo && !uploaded && (
            <Button type="button" variant="outline" onClick={upload} disabled={pending} className="h-11 rounded-[10px] text-[13px] font-semibold">
              {pending ? t.sending : t.send}
            </Button>
          )}
          {uploaded && <p className="text-xs text-muted-foreground">{tg.sent}</p>}
        </div>

        <div className="flex flex-col gap-3">
          <p className="text-[15px] font-semibold leading-normal">{t.step2Title}</p>
          {concerns.length === 0 ? (
            <p className="text-[13px] text-muted-foreground" data-testid="preview-need-concern">
              {tg.needConcern}
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {concerns.map((k) => (
                <button
                  key={k}
                  type="button"
                  disabled={gen.state === "running"}
                  onClick={() => {
                    setPicked(k);
                    if (uploaded) void generate(k);
                  }}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-[13px]",
                    k === concern ? "border-primary bg-primary-tint font-semibold text-primary-hover" : "text-muted-foreground",
                  )}
                >
                  {concernLabels[k]}
                </button>
              ))}
            </div>
          )}

          {uploaded && concern && (
            <>
              {gen.state === "running" ? (
                <LoadingCard steps={t.loadingSteps} caption={common.loadingCaption} />
              ) : gen.state === "unavailable" && DEMO_GOALS[concern] ? (
                <div className="flex flex-col gap-2" data-testid="preview-fallback">
                  <div className="grid grid-cols-2 gap-2">
                    <figure className="flex flex-col gap-1">
                      <SampleImage src={demoSelfie.src} alt={t.fallbackBefore} label={common.sampleImage} />
                      <figcaption className="text-center text-xs text-muted-foreground">{t.fallbackBefore}</figcaption>
                    </figure>
                    <figure className="flex flex-col gap-1">
                      <SampleImage src={DEMO_GOALS[concern]!} alt={t.after} label={common.sampleImage} />
                      <figcaption className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                        {t.after}
                        <Badge variant="ai-label">{common.aiLabel}</Badge>
                      </figcaption>
                    </figure>
                  </div>
                  <p className="text-xs text-muted-foreground">{t.fallbackNote}</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <figure className="flex flex-col gap-1">
                    {before && <SampleImage src={before} alt={t.before} label={common.sampleImage} />}
                    <figcaption className="text-center text-xs text-muted-foreground">{t.before}</figcaption>
                  </figure>
                  <figure className="flex flex-col gap-1">
                    {gen.state === "done" ? (
                      <SampleImage src={gen.url} alt={t.after} label={common.sampleImage} />
                    ) : (
                      <div className="flex aspect-[4/5] w-full flex-col items-center justify-center gap-2 rounded-xl border bg-muted p-3 text-center text-xs text-muted-foreground">
                        {gen.state === "idle" ? (
                          <Button type="button" size="sm" variant="outline" onClick={() => void generate(concern)}>
                            {t.generate}
                          </Button>
                        ) : (
                          <span>{t.unavailable}</span>
                        )}
                      </div>
                    )}
                    <figcaption className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                      {t.after}
                      {gen.state === "done" && <Badge variant="ai-label">{common.aiLabel}</Badge>}
                    </figcaption>
                  </figure>
                </div>
              )}
              <p className="text-xs text-muted-foreground">{t.disclaimer}</p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
