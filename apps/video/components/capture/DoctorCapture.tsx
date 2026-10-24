"use client";
import { useCallback, useEffect, useReducer, useState } from "react";
import type { CaptureLatestOk, LatestPhoto, PhotoAngle, RoomContext } from "@/lib/contracts";
import { CAPTURE_ORDER, doctorReducer, initialDoctorState } from "@/lib/capture-flow";

// 의사 화면은 한국어 고정. 좌·우는 환자 본인 기준
const ANGLE_LABEL: Record<PhotoAngle, string> = { front: "정면", left: "좌측", right: "우측" };

export function DoctorCapture({ ctx }: { ctx: RoomContext }) {
  const { sessionId, peerPresent, send, on } = ctx;
  const [state, dispatch] = useReducer(doctorReducer, undefined, initialDoctorState);
  const [loadError, setLoadError] = useState(false);
  const [enlarged, setEnlarged] = useState<LatestPhoto | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [retryToken, setRetryToken] = useState(0);

  // 화면 상태는 항상 서버에서 다시 불러온 최신 회차로 맞춘다 (spec §5.6)
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/capture/latest?sessionId=${encodeURIComponent(sessionId)}`, { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<CaptureLatestOk>) : Promise.reject(new Error(String(r.status)))))
      .then(
        (body) => {
          if (cancelled) return;
          setLoadError(false);
          dispatch({ type: "loaded", batch: body.batch });
        },
        (e) => {
          console.error("[capture] latest load failed", e);
          if (!cancelled) setLoadError(true);
        },
      );
    return () => {
      cancelled = true;
    };
  }, [sessionId, state.reloadToken, retryToken]);

  useEffect(() => on((event) => dispatch({ type: "event", event })), [on]);

  useEffect(() => {
    if (!peerPresent) dispatch({ type: "peerLeft" });
  }, [peerPresent]);

  const request = useCallback(() => {
    const batchId = crypto.randomUUID();
    dispatch({ type: "request", batchId });
    send({ type: "capture:request", payload: { batchId } });
    setCollapsed(false);
    setEnlarged(null);
  }, [send]);

  const cancel = useCallback(() => {
    if (state.batchId) send({ type: "capture:cancel", payload: { batchId: state.batchId } });
    dispatch({ type: "cancel" });
  }, [send, state.batchId]);

  const active = state.mode === "active";
  const photos = state.latest?.photos ?? [];
  const photoOf = (a: PhotoAngle) => photos.find((p) => p.angle === a);

  return (
    <>
      <div className="absolute right-3 top-3 z-20 w-72 max-w-[calc(100%-1.5rem)] rounded-xl border border-white/10 bg-neutral-950/85 p-3 text-neutral-100 shadow-xl backdrop-blur">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold">얼굴 사진</h2>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="rounded px-2 py-0.5 text-xs text-neutral-400 hover:bg-white/10 hover:text-white"
          >
            {collapsed ? "펼치기" : "접기"}
          </button>
        </div>

        {!collapsed && (
          <div className="mt-2 flex flex-col gap-3">
            {active ? (
              <div className="rounded-lg bg-sky-950/70 p-3">
                <p className="text-base font-semibold text-sky-100">촬영 중 {state.angles.length}/3</p>
                <ol className="mt-2 flex gap-1.5">
                  {CAPTURE_ORDER.map((a) => {
                    const done = state.angles.includes(a);
                    return (
                      <li
                        key={a}
                        className={`flex-1 rounded-md px-2 py-1 text-center text-xs ${
                          done ? "bg-emerald-600 text-white" : "bg-neutral-800 text-neutral-400"
                        }`}
                      >
                        {done ? "✔ " : ""}
                        {ANGLE_LABEL[a]}
                      </li>
                    );
                  })}
                </ol>
                <button
                  type="button"
                  onClick={cancel}
                  className="mt-3 w-full rounded-md border border-red-400/60 px-3 py-1.5 text-sm text-red-200 hover:bg-red-900/40"
                >
                  촬영 취소
                </button>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  onClick={request}
                  disabled={!peerPresent}
                  className="w-full rounded-lg bg-sky-500 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-400"
                >
                  얼굴 촬영 요청
                </button>
                {!peerPresent && <p className="-mt-2 text-xs text-neutral-400">환자가 입장하면 요청할 수 있습니다</p>}

                <div>
                  <div className="mb-1 flex items-baseline justify-between text-xs text-neutral-400">
                    <span>최근 제출 사진 (좌·우는 환자 기준)</span>
                    {state.latest && (
                      <span>{new Date(state.latest.createdAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}</span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {CAPTURE_ORDER.map((a) => {
                      const p = photoOf(a);
                      return (
                        <figure key={a} className="flex flex-col gap-1">
                          {p ? (
                            <button
                              type="button"
                              onClick={() => setEnlarged(p)}
                              className="aspect-[3/4] overflow-hidden rounded-md bg-neutral-800 ring-sky-400 hover:ring-2"
                              title="크게 보기"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element -- 서버가 발급한 임시 주소 */}
                              <img src={p.url} alt={ANGLE_LABEL[a]} className="h-full w-full object-cover" />
                            </button>
                          ) : (
                            <div className="flex aspect-[3/4] items-center justify-center rounded-md border border-dashed border-neutral-700 text-xs text-neutral-600">
                              없음
                            </div>
                          )}
                          <figcaption className="text-center text-xs text-neutral-300">
                            {ANGLE_LABEL[a]}
                            {p?.captureMode === "manual" && <span className="ml-1 text-amber-400">수동</span>}
                          </figcaption>
                        </figure>
                      );
                    })}
                  </div>
                  {loadError && (
                    <p className="mt-2 text-xs text-red-300">
                      사진을 불러오지 못했습니다.{" "}
                      <button type="button" className="underline" onClick={() => setRetryToken((n) => n + 1)}>
                        다시 시도
                      </button>
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {enlarged && (
        <div
          role="dialog"
          aria-label={`${ANGLE_LABEL[enlarged.angle]} 사진`}
          onClick={() => setEnlarged(null)}
          className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-black/85 p-4"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- 서버가 발급한 임시 주소 */}
          <img src={enlarged.url} alt={ANGLE_LABEL[enlarged.angle]} className="max-h-[85%] max-w-full rounded-lg object-contain" />
          <div className="flex items-center gap-3 text-sm text-neutral-200">
            {CAPTURE_ORDER.map((a) => {
              const p = photoOf(a);
              return (
                <button
                  key={a}
                  type="button"
                  disabled={!p}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (p) setEnlarged(p);
                  }}
                  className={`rounded-full px-3 py-1 ${a === enlarged.angle ? "bg-white text-black" : "bg-white/10 hover:bg-white/20"} disabled:opacity-30`}
                >
                  {ANGLE_LABEL[a]}
                </button>
              );
            })}
            <span className="text-neutral-500">· 화면을 누르면 닫힘</span>
          </div>
        </div>
      )}
    </>
  );
}
