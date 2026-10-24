"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingCard } from "@/components/ui/loading-card";
import { SampleImage } from "@/components/ui/sample-image";
import type { Dict } from "@/dictionaries/jp";
import type { ConcernKey } from "@/lib/intake";
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
  consultPath: string; // href(lang, "/consult") — 서버에서 만들어 넘긴다
  intakeId: string;
  concerns: ConcernKey[];
  t: Dict["h2"]["photos"];
  concernLabels: Dict["h2"]["concerns"];
  common: Pick<Dict["common"], "sampleImage" | "aiLabel" | "loadingCaption">;
  // 이미 셀카를 보낸 문진이면 서버가 넘겨주는 복원값 (새로고침·재방문 시 업로드 단계로 되돌아가지 않게)
  submitted?: { consultationId: string; selfieUrl: string | null; previewUrl: string | null };
};

export function SelfiePreview({ lang, consultPath, intakeId, concerns, t, concernLabels, common, submitted }: Props) {
  const router = useRouter();
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [before, setBefore] = useState<string | null>(submitted?.selfieUrl ?? null);
  const [consultationId, setConsultationId] = useState<string | null>(submitted?.consultationId ?? null);
  const [concern, setConcern] = useState<ConcernKey>(concerns[0] ?? "melasma");
  const [gen, setGen] = useState<Gen>(
    submitted?.previewUrl ? { state: "done", url: submitted.previewUrl } : { state: "idle" },
  );
  const [pending, startTransition] = useTransition();
  const runId = useRef(0);

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
      setConsultationId(null);
      setGen({ state: "idle" });
    } catch {
      toast.error(t.imageLoadError);
    }
  }

  function upload() {
    if (!photo) return;
    const fd = new FormData();
    fd.set("intakeId", intakeId);
    fd.set("lang", lang);
    fd.set("photo", photo, "selfie.jpg");
    startTransition(async () => {
      const res = await uploadSelfie(fd);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setConsultationId(res.consultationId);
      await generate(concern);
    });
  }

  // 생성은 부가 연출 — 어떤 실패든 'unavailable'로 접고 진행 버튼은 항상 살아 있다
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
    const start = await startPreview(intakeId, target);
    if (!start.ok) {
      console.info("preview unavailable:", start.reason);
      if (runId.current === id) setGen({ state: "unavailable" });
      return;
    }
    while (runId.current === id && Date.now() - startedAt < TIMEOUT_MS) {
      await new Promise((r) => setTimeout(r, POLL_MS));
      if (runId.current !== id) return;
      const t = await pollPreview(start.taskId, intakeId, start.ticket);
      if (runId.current !== id) return;
      if (t.status === "succeeded") return setGen({ state: "done", url: t.url });
      if (t.status === "failed") {
        console.info("preview failed:", t.code);
        return setGen({ state: "unavailable" });
      }
      setGen({ state: "running", startedAt, progress: t.progress });
    }
    if (runId.current === id) setGen({ state: "unavailable" });
  }


  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>{t.step1Title}</CardTitle>
          <CardDescription>{t.step1Desc}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {before && !consultationId && <SampleImage src={before} alt={t.selectedAlt} label={common.sampleImage} />}
          <label className="flex cursor-pointer items-center justify-center rounded-md border border-dashed py-3 text-sm font-medium">
            {photo ? t.retake : t.pick}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              data-testid="selfie-input"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
          </label>
          {photo && !consultationId && (
            <Button size="lg" onClick={upload} disabled={pending}>
              {pending ? t.sending : t.send}
            </Button>
          )}
        </CardContent>
      </Card>

      {consultationId && (
        <Card data-testid="preview-card" data-state={gen.state}>
          <CardHeader>
            <CardTitle>{t.step2Title}</CardTitle>
            <CardDescription>{t.goalFor.replace("{concern}", concernLabels[concern])}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {concerns.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {concerns.map((k) => (
                  <button
                    key={k}
                    type="button"
                    disabled={gen.state === "running"}
                    onClick={() => {
                      setConcern(k);
                      void generate(k);
                    }}
                    className={`rounded-full border px-3 py-1 text-xs ${k === concern ? "border-primary bg-blush-tint" : ""}`}
                  >
                    {concernLabels[k]}
                  </button>
                ))}
              </div>
            )}

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
                        // 새로고침 등으로 저장된 이미지가 없을 때 — 다시 만들 수 있게
                        <Button size="sm" variant="outline" onClick={() => void generate(concern)}>
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

            <Button size="lg" onClick={() => router.push(`${consultPath}/${consultationId}`)}>
              {t.toConsult}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
