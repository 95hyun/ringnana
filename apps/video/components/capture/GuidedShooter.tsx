"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { FrameAnalysis, PhotoAngle } from "@/lib/contracts";
import { config } from "@/lib/config";
import { createCaptureJudge, type CaptureVerdict } from "@/lib/capture/judge";
import { EMPTY_ANALYSIS, type FaceAnalyzer } from "@/lib/face";
import type { Shot } from "@/lib/capture-flow";
import type { capture as CaptureText } from "@/messages/ja/capture";
import type { Messages } from "@/messages/types";
import { grabJpeg, playShutter } from "./media";
import { StepIndicator } from "./StepIndicator";

type Text = Messages<typeof CaptureText>;

// 찍은 직후 ✔를 보여 주고 다음 단계 판단을 시작하기까지의 쉼
const STEP_COOLDOWN_MS = 900;

const round1 = (v: number | null) => (v === null ? null : Math.round(v * 10) / 10);

function sameVerdict(a: CaptureVerdict | null, b: CaptureVerdict) {
  return (
    a !== null &&
    a.block === b.block &&
    a.dark === b.dark &&
    a.manualAvailable === b.manualAvailable &&
    a.holding === b.holding &&
    Math.abs(a.progress - b.progress) < 0.02 &&
    Math.abs(a.holdProgress - b.holdProgress) < 0.02
  );
}

export function GuidedShooter({
  video,
  analyzer,
  analyzerStatus,
  step,
  doneAngles,
  audio,
  t,
  onShot,
}: {
  video: HTMLVideoElement | null;
  analyzer: FaceAnalyzer | null;
  analyzerStatus: "loading" | "ready" | "failed";
  step: PhotoAngle;
  doneAngles: PhotoAngle[];
  audio: AudioContext | null;
  t: Text;
  onShot: (shot: Shot<Blob>) => void;
}) {
  const [verdict, setVerdict] = useState<CaptureVerdict | null>(null);
  const [taking, setTaking] = useState(false);
  const lastFrame = useRef<FrameAnalysis>(EMPTY_ANALYSIS);
  const busy = useRef(false);
  const flashRef = useRef<HTMLDivElement>(null);
  const checkRef = useRef<HTMLDivElement>(null);
  const onShotRef = useRef(onShot);
  useEffect(() => {
    onShotRef.current = onShot;
  }, [onShot]);

  const take = useCallback(
    async (mode: "auto" | "manual", frame: FrameAnalysis) => {
      if (!video || busy.current) return;
      busy.current = true;
      setTaking(true);
      try {
        const blob = await grabJpeg(video, config.capture.jpegQuality);
        const hasFace = frame.faceCount >= 1;
        flashRef.current?.animate([{ opacity: 0.95 }, { opacity: 0 }], { duration: 350, easing: "ease-out" });
        checkRef.current?.animate(
          [
            { opacity: 0, transform: "scale(0.6)" },
            { opacity: 1, transform: "scale(1)", offset: 0.25 },
            { opacity: 1, transform: "scale(1)", offset: 0.75 },
            { opacity: 0, transform: "scale(1.1)" },
          ],
          { duration: STEP_COOLDOWN_MS, easing: "ease-out" },
        );
        playShutter(audio);
        onShotRef.current({
          meta: {
            angle: step,
            captureMode: mode,
            yaw: hasFace ? round1(frame.yaw) : null,
            pitch: hasFace ? round1(frame.pitch) : null,
          },
          image: blob,
        });
      } catch (e) {
        console.error("[capture] grab failed", e);
      } finally {
        busy.current = false;
        setTaking(false);
      }
    },
    [video, audio, step],
  );

  // 단계가 바뀌면 판단기를 새로 만든다 (= 재촬영·다음 단계 시 초기화)
  useEffect(() => {
    if (!video) return;
    const startAt = performance.now() + STEP_COOLDOWN_MS;
    const judge = createCaptureJudge(step, startAt);
    let raf = 0;
    let stopped = false;
    const tick = () => {
      if (stopped) return;
      raf = requestAnimationFrame(tick);
      const now = performance.now();
      if (busy.current || now < startAt) return;
      let frame: FrameAnalysis = EMPTY_ANALYSIS;
      if (analyzer && video.readyState >= 2 && video.videoWidth > 0) {
        try {
          frame = analyzer.analyze(video, now);
        } catch (e) {
          console.error("[capture] analyze failed", e);
        }
      }
      lastFrame.current = frame;
      const v = judge.update(frame, now);
      setVerdict((prev) => (sameVerdict(prev, v) ? prev : v));
      if (v.captureNow) void take("auto", frame);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      setVerdict(null);
    };
  }, [video, analyzer, step, take]);

  const block = verdict?.block ?? null;
  const passing = verdict !== null && block === null;
  const guideColor = !verdict || block === "noFace" ? "grey" : passing ? "green" : "white";
  const hint =
    verdict && block && block !== "angleShort" ? t.hint[block] : verdict?.dark ? t.hint.dark : null;
  const showDarkExtra = verdict?.dark && block && block !== "angleShort";
  const arrowStrong = block === "angleShort";
  const arrow = step === "left" ? "◀" : step === "right" ? "▶" : null;
  const progress = verdict?.progress ?? 0;

  return (
    <div className="pointer-events-none absolute inset-0 select-none">
      <style>{NUDGE_CSS}</style>

      {/* 얼굴 가이드 (바깥은 어둡게) */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className={`relative aspect-[3/4] h-[62%] max-w-[70%] rounded-[50%] border-[5px] transition-[border-color,box-shadow] duration-200 ${
            guideColor === "green"
              ? "border-emerald-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.45),0_0_40px_8px_rgba(52,211,153,0.6)]"
              : guideColor === "white"
                ? "border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.5)]"
                : "border-dashed border-neutral-400 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)]"
          }`}
        >
          {passing && (
            <svg className="absolute -inset-3 h-[calc(100%+1.5rem)] w-[calc(100%+1.5rem)]" viewBox="0 0 100 100" preserveAspectRatio="none">
              <ellipse
                cx="50"
                cy="50"
                rx="48"
                ry="48"
                fill="none"
                stroke="rgb(52 211 153)"
                strokeWidth="2.5"
                strokeLinecap="round"
                pathLength={100}
                strokeDasharray={`${(verdict?.holdProgress ?? 0) * 100} 100`}
                transform="rotate(-90 50 50)"
              />
            </svg>
          )}
        </div>
      </div>

      {/* 화살표 — 거울 화면에서 고개를 돌리는 방향 */}
      {arrow && verdict && (
        <div
          className={`absolute top-1/2 -translate-y-1/2 ${step === "left" ? "left-[4%]" : "right-[4%]"}`}
          style={{ animation: `${step === "left" ? "rn-nudge-left" : "rn-nudge-right"} ${arrowStrong ? "0.8s" : "1.4s"} ease-in-out infinite` }}
        >
          <span
            className={`block leading-none drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)] transition-all ${
              arrowStrong ? "text-[9rem] text-amber-300" : passing ? "text-[6rem] text-emerald-300/80" : "text-[6rem] text-white/60"
            }`}
          >
            {arrow}
          </span>
        </div>
      )}

      {/* 위: 단계 + 지시 */}
      <div className="absolute inset-x-0 top-0 flex flex-col items-center gap-2 bg-gradient-to-b from-black/70 to-transparent px-4 pb-10 pt-4">
        <StepIndicator step={step} doneAngles={doneAngles} t={t} />
        <p className="text-center text-2xl font-bold text-white drop-shadow sm:text-3xl">{t.instruction[step]}</p>
      </div>

      {/* 아래: 진행바 + 안내 + 수동 */}
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 bg-gradient-to-t from-black/75 to-transparent px-4 pb-5 pt-12">
        {analyzerStatus === "loading" && (
          <p className="rounded-full bg-black/60 px-3 py-1 text-sm text-neutral-200">{t.preparing}</p>
        )}
        {hint && (
          <p
            className={`rounded-lg px-4 py-2 text-center text-lg font-semibold ${
              hint === t.hint.dark ? "bg-amber-500/90 text-neutral-950" : "bg-neutral-900/85 text-white"
            }`}
          >
            {hint}
          </p>
        )}
        {showDarkExtra && (
          <p className="rounded-lg bg-amber-500/90 px-3 py-1 text-sm font-medium text-neutral-950">{t.hint.dark}</p>
        )}
        <div className="h-3 w-full max-w-md overflow-hidden rounded-full bg-white/20">
          <div
            className={`h-full rounded-full transition-[width] duration-150 ${passing ? "bg-emerald-400" : arrowStrong ? "bg-amber-300" : "bg-white/80"}`}
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
        {verdict?.manualAvailable && (
          <button
            type="button"
            disabled={taking}
            onClick={() => void take("manual", lastFrame.current)}
            className="pointer-events-auto rounded-full bg-white px-6 py-3 text-base font-semibold text-neutral-900 shadow-lg hover:bg-neutral-100 disabled:opacity-50"
          >
            {t.manual}
          </button>
        )}
      </div>

      {/* 촬영 순간: 번쩍임 + ✔ */}
      <div ref={flashRef} className="absolute inset-0 bg-white opacity-0" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          ref={checkRef}
          className="flex h-32 w-32 items-center justify-center rounded-full bg-emerald-500/90 text-7xl font-bold text-white opacity-0 shadow-2xl"
        >
          ✔
        </div>
      </div>
    </div>
  );
}

const NUDGE_CSS = `
@keyframes rn-nudge-left { 0%,100% { transform: translateX(0); } 50% { transform: translateX(-28px); } }
@keyframes rn-nudge-right { 0%,100% { transform: translateX(0); } 50% { transform: translateX(28px); } }
`;
