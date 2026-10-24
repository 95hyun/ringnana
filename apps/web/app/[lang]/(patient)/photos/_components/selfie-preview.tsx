"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import type { Dict } from "@/dictionaries/jp";
import type { ConcernKey } from "@/lib/intake";
import { pollPreview, startPreview, uploadSelfie } from "../actions";
import { resizeImage } from "./resize-image";

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
  procedures: Dict["h2"]["procedures"];
};

export function SelfiePreview({ lang, consultPath, intakeId, concerns, t, concernLabels, procedures }: Props) {
  const router = useRouter();
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [before, setBefore] = useState<string | null>(null);
  const [consultationId, setConsultationId] = useState<string | null>(null);
  const [concern, setConcern] = useState<ConcernKey>(concerns[0] ?? "melasma");
  const [gen, setGen] = useState<Gen>({ state: "idle" });
  const [pending, startTransition] = useTransition();
  const runId = useRef(0);

  useEffect(() => () => {
    if (before) URL.revokeObjectURL(before);
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
      const t = await pollPreview(start.taskId, start.ticket);
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
          {before && !consultationId && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={before} alt={t.selectedAlt} className="aspect-square w-full rounded-lg border object-cover" />
          )}
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
            <CardDescription>
              {t.reference.replace("{procedure}", procedures[concern]).replace("{concern}", concernLabels[concern])}
            </CardDescription>
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
                    className={`rounded-full border px-3 py-1 text-xs ${k === concern ? "border-primary bg-primary/10" : ""}`}
                  >
                    {concernLabels[k]}
                  </button>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <figure className="flex flex-col gap-1">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {before && <img src={before} alt={t.before} className="aspect-square w-full rounded-lg border object-cover" />}
                <figcaption className="text-center text-xs text-muted-foreground">{t.before}</figcaption>
              </figure>
              <figure className="flex flex-col gap-1">
                {gen.state === "done" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={gen.url} alt={t.after} className="aspect-square w-full rounded-lg border object-cover" />
                ) : (
                  <div className="flex aspect-square w-full flex-col items-center justify-center gap-2 rounded-lg border bg-muted p-3 text-center text-xs text-muted-foreground">
                    {gen.state === "running" ? (
                      <>
                        <span>{t.generating}</span>
                        <Progress value={gen.progress} className="w-full" />
                      </>
                    ) : (
                      <span>{t.unavailable}</span>
                    )}
                  </div>
                )}
                <figcaption className="text-center text-xs text-muted-foreground">{t.after}</figcaption>
              </figure>
            </div>

            <p className="rounded-md bg-muted p-2 text-xs text-muted-foreground">
              {t.disclaimer}
            </p>

            <Button size="lg" onClick={() => router.push(`${consultPath}/${consultationId}`)}>
              {t.toConsult}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
