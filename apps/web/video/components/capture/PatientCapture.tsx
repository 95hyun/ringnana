"use client";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { config } from "@/video/lib/config";
import type { RoomContext } from "@/video/lib/contracts";
import {
  CAPTURE_ORDER,
  initialPatientState,
  metaOf,
  patientReducer,
  type PatientState,
  type Shot,
} from "@/video/lib/capture-flow";
import { messagesFor } from "@/video/messages";
import { BlobImage } from "./BlobImage";
import { GuidedShooter } from "./GuidedShooter";
import { createAudio } from "./media";
import { StepIndicator } from "./StepIndicator";
import { useFaceAnalyzer } from "./useFaceAnalyzer";

// 제출이 끝나지 않으면 통화 종료가 영영 막히므로 상한을 둔다 (config 에 없는 값)
const SUBMIT_TIMEOUT_MS = config.capture.submitTimeoutMs;

type State = PatientState<Blob>;
const NUM = ["①", "②", "③"];

export function PatientCapture({ ctx }: { ctx: RoomContext }) {
  const { sessionId, uiLang, localStream, testMode, send, on, setPatientLayout, registerEndGuard } = ctx;
  const t = messagesFor(uiLang).capture;
  const [state, dispatch] = useReducer(patientReducer<Blob>, undefined, initialPatientState<Blob>);
  const stateRef = useRef<State>(state);
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const active =
    state.phase === "consent" || state.phase === "shooting" || state.phase === "preview" || state.phase === "submitting";

  // 배치: 촬영 회차가 진행 중이면 내 영상을 크게 (spec §5.3)
  useEffect(() => {
    setPatientLayout(active ? "capture" : "call");
  }, [active, setPatientLayout]);
  useEffect(() => () => setPatientLayout("call"), [setPatientLayout]);

  useEffect(
    () =>
      on((ev) => {
        if (ev.type === "capture:request") dispatch({ type: "request", batchId: ev.payload.batchId });
        else if (ev.type === "capture:cancel") dispatch({ type: "cancel", batchId: ev.payload.batchId });
      }),
    [on],
  );

  const { analyzer, status: analyzerStatus } = useFaceAnalyzer(active);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoEl, setVideoEl] = useState<HTMLVideoElement | null>(null);
  const attachVideo = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el;
    setVideoEl(el);
  }, []);
  useEffect(() => {
    const v = videoRef.current;
    if (!v || v.srcObject === localStream) return;
    v.srcObject = localStream;
    if (localStream) v.play().catch(() => {});
  }, [videoEl, localStream]);

  const [audio, setAudio] = useState<AudioContext | null>(null);
  useEffect(() => () => void audio?.close().catch(() => {}), [audio]);

  const start = useCallback(() => {
    if (!audio) setAudio(createAudio());
    dispatch({ type: "start" });
  }, [audio]);

  const onShot = useCallback(
    (shot: Shot<Blob>) => {
      const s = stateRef.current;
      if (s.phase !== "shooting" || s.step !== shot.meta.angle) return;
      dispatch({ type: "shot", shot });
      send({ type: "capture:progress", payload: { batchId: s.batchId, angle: shot.meta.angle } });
    },
    [send],
  );

  const submit = useCallback(async () => {
    const s = stateRef.current;
    if (s.phase !== "preview") return;
    const { batchId, consentedAt, photos } = s;
    dispatch({ type: "submit" });
    let finish: () => void = () => {};
    const settled = new Promise<void>((r) => (finish = r));
    // 제출 중 통화가 끝나면 결과(성공·실패)가 날 때까지 기다리게 한다 (spec §4.4)
    const unregister = registerEndGuard(() => settled);
    const abort = new AbortController();
    const timer = setTimeout(() => abort.abort(), SUBMIT_TIMEOUT_MS);
    try {
      const fd = new FormData();
      fd.set("sessionId", sessionId);
      fd.set("batchId", batchId);
      fd.set("consentedAt", consentedAt);
      for (const a of CAPTURE_ORDER) fd.set(a, photos[a].image, `${a}.jpg`);
      fd.set("meta", JSON.stringify(metaOf(photos)));
      const res = await fetch("/api/capture", { method: "POST", body: fd, signal: abort.signal });
      if (!res.ok) throw new Error(`submit failed: ${res.status}`);
      const cur = stateRef.current;
      // 제출 중에 새 요청이 와서 다른 회차로 넘어갔다면 이전 회차 완료는 알리지 않는다
      if (cur.phase === "submitting" && cur.batchId === batchId) {
        send({ type: "capture:done", payload: { batchId } });
      }
      dispatch({ type: "submitOk", batchId });
    } catch (e) {
      console.error("[capture] submit failed", e);
      dispatch({ type: "submitFail", batchId });
    } finally {
      clearTimeout(timer);
      unregister();
      finish();
    }
  }, [registerEndGuard, send, sessionId]);

  const startTest = useCallback(() => dispatch({ type: "testStart", batchId: crypto.randomUUID() }), []);

  if (!active) {
    return (
      <>
        {testMode && (
          <button
            type="button"
            onClick={startTest}
            className="absolute left-3 top-3 z-20 rounded-full bg-amber-400 px-4 py-2 text-sm font-semibold text-neutral-950 shadow-lg hover:bg-amber-300"
          >
            {t.testStart}
          </button>
        )}
        {state.phase === "submitted" && (
          <div
            role="status"
            className="absolute inset-x-0 top-3 z-20 mx-auto flex w-fit max-w-[90%] items-center gap-3 rounded-full bg-emerald-600/95 py-2 pl-5 pr-2 text-base font-semibold text-white shadow-xl"
          >
            <span>✔ {t.submitted}</span>
            <button
              type="button"
              onClick={() => dispatch({ type: "dismiss" })}
              className="rounded-full px-2 py-0.5 text-sm font-normal text-emerald-50 hover:bg-white/20"
              aria-label={t.close}
            >
              ✕
            </button>
          </div>
        )}
      </>
    );
  }

  const doneAngles = "photos" in state ? CAPTURE_ORDER.filter((a) => state.photos[a]) : [];

  return (
    <div className="absolute inset-0 overflow-hidden bg-black text-white">
      {/* 거울 반전 미리보기 — 분석·저장은 이 요소의 반전 없는 원본 프레임으로 한다 */}
      <video
        ref={attachVideo}
        muted
        autoPlay
        playsInline
        className={`absolute inset-0 h-full w-full -scale-x-100 object-cover ${state.phase === "shooting" || state.phase === "consent" ? "" : "invisible"}`}
      />
      {!localStream && (
        <p className="absolute inset-0 flex items-center justify-center text-neutral-400">{t.noCamera}</p>
      )}

      {state.phase === "consent" && (
        <div className="absolute inset-0 flex flex-col items-center justify-end bg-gradient-to-t from-black/85 via-black/40 to-black/20 p-4 sm:justify-center">
          <div className="w-full max-w-lg rounded-2xl bg-neutral-900/95 p-5 shadow-2xl ring-1 ring-white/10">
            <h2 className="text-xl font-bold">{t.title}</h2>
            {state.source === "doctor" && <p className="mt-1 text-sm text-neutral-300">{t.consentLead}</p>}
            <div className="mt-3 flex justify-center">
              <StepIndicator step={null} doneAngles={[]} t={t} />
            </div>
            <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl bg-neutral-800 p-4 text-base leading-relaxed">
              <input
                type="checkbox"
                checked={state.consentedAt !== null}
                onChange={(e) =>
                  dispatch({ type: "agree", checked: e.target.checked, at: new Date().toISOString() })
                }
                className="mt-1 h-6 w-6 shrink-0 accent-emerald-500"
              />
              <span>{t.consentText}</span>
            </label>
            <button
              type="button"
              onClick={start}
              disabled={state.consentedAt === null}
              className="mt-4 w-full rounded-xl bg-emerald-500 px-4 py-3 text-lg font-bold text-white hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-400"
            >
              {t.start}
            </button>
          </div>
        </div>
      )}

      {state.phase === "shooting" && (
        <GuidedShooter
          video={videoEl}
          analyzer={analyzer}
          analyzerStatus={analyzerStatus}
          step={state.step}
          doneAngles={doneAngles}
          audio={audio}
          t={t}
          onShot={onShot}
        />
      )}

      {(state.phase === "preview" || state.phase === "submitting") && (
        <div className="absolute inset-0 flex flex-col items-center gap-4 overflow-y-auto bg-neutral-950 p-4 sm:justify-center">
          <StepIndicator step={null} doneAngles={doneAngles} t={t} />
          <h2 className="text-center text-xl font-bold">{t.previewTitle}</h2>
          <div className="grid w-full max-w-3xl grid-cols-3 gap-2 sm:gap-4">
            {CAPTURE_ORDER.map((a, i) => (
              <figure key={a} className="flex flex-col items-center gap-2">
                <figcaption className="text-sm font-semibold text-neutral-200">
                  {NUM[i]} {t.steps[a]}
                </figcaption>
                <BlobImage
                  blob={state.photos[a].image}
                  alt={t.steps[a]}
                  className="aspect-[3/4] w-full rounded-lg bg-neutral-800 object-cover"
                />
                <button
                  type="button"
                  disabled={state.phase === "submitting"}
                  onClick={() => dispatch({ type: "retake", angle: a })}
                  className="w-full rounded-lg border border-white/30 px-2 py-2 text-sm hover:bg-white/10 disabled:opacity-40"
                >
                  {t.retake}
                </button>
              </figure>
            ))}
          </div>
          {state.phase === "preview" && state.error && (
            <p role="alert" className="max-w-lg rounded-lg bg-red-900/70 px-4 py-2 text-center text-sm text-red-100">
              {t.submitFailed}
            </p>
          )}
          <button
            type="button"
            disabled={state.phase === "submitting"}
            onClick={() => void submit()}
            className="w-full max-w-md rounded-xl bg-emerald-500 px-4 py-3 text-lg font-bold text-white hover:bg-emerald-400 disabled:cursor-wait disabled:bg-neutral-700 disabled:text-neutral-300"
          >
            {state.phase === "submitting" ? t.submitting : state.error ? t.resubmit : t.submit}
          </button>
        </div>
      )}
    </div>
  );
}
