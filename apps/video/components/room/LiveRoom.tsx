"use client";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CaptureSlot } from "@/components/capture/CaptureSlot";
import { InterpSlot } from "@/components/interp/InterpSlot";
import type { IceResponse, RoomContext, RoomEvent, UiLang } from "@/lib/contracts";
import { config } from "@/lib/config";
import { isDemoMode, openLocalLink, trackPeerWindow } from "@/lib/room/demo";
import { buildIceServers } from "@/lib/room/ice";
import { callAlert as jaAlert } from "@/messages/ja/call";
import { callAlert as koAlert } from "@/messages/ko/call";
import type { RoomQuery } from "@/lib/room/query";
import type { RoomText } from "@/lib/room/text";
import { StreamVideo } from "./StreamVideo";
import { useLocalMedia } from "./useLocalMedia";
import { usePeerConnection } from "./usePeerConnection";
import { useRoomChannel } from "./useRoomChannel";

const END_SEND_TIMEOUT_MS = 1500; // call:end 전송을 기다리는 최대 시간 (이동이 늦어지지 않게)

function newTabId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function LiveRoom({
  query,
  uiLang,
  text: t,
  renderHeader,
  onLeave,
  onSuperseded,
}: {
  query: RoomQuery;
  uiLang: UiLang;
  text: RoomText;
  renderHeader: (status: ReactNode) => ReactNode;
  onLeave: () => void;
  onSuperseded: () => void;
}) {
  const { sessionId, role, testMode, name, demo } = query;
  const [tabId] = useState(newTabId);
  const [joinedAt, setJoinedAt] = useState(() => Date.now());
  const [micMuted, setMicMuted] = useState(false);
  const [patientLayout, setPatientLayoutState] = useState<"call" | "capture">("call");
  const [ending, setEnding] = useState(false);
  const [audioEl, setAudioEl] = useState<HTMLAudioElement | null>(null);
  const [needsSoundTap, setNeedsSoundTap] = useState(false);
  const [iceServers, setIceServers] = useState<RTCIceServer[] | null>(null);
  const [peerWindowOpen, setPeerWindowOpen] = useState(false);
  const demoMode = isDemoMode(demo, peerWindowOpen);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const attachAudio = useCallback((el: HTMLAudioElement | null) => {
    audioRef.current = el;
    setAudioEl(el);
  }, []);
  const endGuardsRef = useRef(new Set<() => Promise<void>>());
  const endingRef = useRef(false);

  const { media, retry } = useLocalMedia();
  const localStream = media.stream;
  const self = useMemo(() => ({ role, tabId, joinedAt }), [role, tabId, joinedAt]);
  const channel = useRoomChannel({ sessionId, self });
  const { valid, known, superseded, error: channelError, send, sendAndWait, on } = channel;
  const peerRole = role === "doctor" ? "patient" : "doctor";
  const peerPresent = valid[peerRole] !== null;

  const { remoteStream } = usePeerConnection({
    role,
    tabId,
    localStream,
    mediaSettled: media.status !== "pending",
    iceServers,
    valid,
    known,
    send,
    on,
  });

  // spec §4.3: 같은 역할의 더 늦은 창이 들어오면 이 창은 모두 닫고 멈춘다
  useEffect(() => {
    if (superseded) onSuperseded();
  }, [superseded, onSuperseded]);

  // spec §16: 같은 브라우저에 상대 역할 창이 열려 있으면 시연 모드
  useEffect(() => {
    const link = openLocalLink(sessionId);
    if (!link) return;
    const stop = trackPeerWindow({
      link,
      role,
      tabId,
      heartbeatMs: config.demo.heartbeatMs,
      timeoutMs: config.demo.peerTimeoutMs,
      onChange: setPeerWindowOpen,
    });
    return () => {
      stop();
      link.close();
    };
  }, [sessionId, role, tabId]);

  // 시연 모드는 같은 스피커·마이크라 상대 원음을 틀면 되울린다 — 영상·자막·번역 음성만 둔다
  useEffect(() => {
    const el = audioRef.current;
    if (el) el.muted = demoMode;
  }, [audioEl, demoMode]);

  // spec §7.6: 중계 서버 목록. 실패하면 공개 STUN 만으로 연결한다
  useEffect(() => {
    let cancelled = false;
    fetch("/api/ice", { cache: "no-store" })
      .then((r) => (r.ok ? (r.json() as Promise<IceResponse>) : Promise.reject(new Error(String(r.status)))))
      .then(
        (b) => b.iceServers,
        () => buildIceServers({}, config.ice.publicStun),
      )
      .then((list) => {
        if (!cancelled) setIceServers(list);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 음소거는 트랙을 끄는 방식 — 연결이 새로 만들어져도 같은 트랙이라 상태가 유지된다
  useEffect(() => {
    localStream?.getAudioTracks().forEach((tr) => (tr.enabled = !micMuted));
  }, [localStream, micMuted]);

  // 상대 원음은 <audio> 하나로만 재생한다 (RoomContext.remoteAudio)
  useEffect(() => {
    const el = audioRef.current;
    if (!el || el.srcObject === remoteStream) return;
    el.srcObject = remoteStream;
    if (remoteStream) el.play().then(() => setNeedsSoundTap(false), () => setNeedsSoundTap(true));
  }, [audioEl, remoteStream]);

  const leave = useCallback(async () => {
    if (endingRef.current) return;
    endingRef.current = true;
    setEnding(true);
    if (role === "doctor") {
      await Promise.race([
        sendAndWait({ type: "call:end", payload: {} }).catch(() => {}),
        new Promise((r) => setTimeout(r, END_SEND_TIMEOUT_MS)),
      ]);
    } else {
      // spec §4.4: 제출 중인 사진이 있으면 끝날 때까지(성공·실패) 기다린다
      await Promise.allSettled([...endGuardsRef.current].map((g) => Promise.resolve().then(g)));
    }
    onLeave();
  }, [role, sendAndWait, onLeave]);

  // 환자: 의사의 call:end 를 받으면 이동
  useEffect(() => {
    if (role !== "patient") return;
    return on((ev) => {
      if (ev.type === "call:end") void leave();
    });
  }, [role, on, leave]);

  const setPatientLayout = useCallback(
    (mode: "call" | "capture") => {
      if (role === "patient") setPatientLayoutState(mode);
    },
    [role],
  );
  const registerEndGuard = useCallback((guard: () => Promise<void>) => {
    endGuardsRef.current.add(guard);
    return () => {
      endGuardsRef.current.delete(guard);
    };
  }, []);
  const sendEvent = useCallback((ev: RoomEvent) => send(ev), [send]);

  const ctx = useMemo<RoomContext>(
    () => ({
      sessionId,
      role,
      uiLang: role === "doctor" ? "ko" : uiLang,
      localStream,
      remoteAudio: audioEl,
      peerPresent,
      micMuted,
      testMode,
      demoMode,
      send: sendEvent,
      on,
      setPatientLayout,
      registerEndGuard,
    }),
    [sessionId, role, uiLang, localStream, audioEl, peerPresent, micMuted, testMode, demoMode, sendEvent, on, setPatientLayout, registerEndGuard],
  );

  const retryMedia = () => {
    // 환자는 새 joinedAt 으로 다시 알려서 의사가 내 영상까지 담아 다시 제안하게 한다
    if (role === "patient") setJoinedAt(Date.now());
    retry();
  };

  const captureMode = role === "patient" && patientLayout === "capture";
  const deviceMessage =
    media.status === "error"
      ? { denied: t.deviceDenied, notFound: t.deviceNotFound, inUse: t.deviceInUse }[media.error]
      : null;
  const realtimeErrorText =
    role === "doctor" ? "실시간 연결에 실패했습니다. 새로고침해 주세요" : (uiLang === "ko" ? koAlert : jaAlert).realtimeError;
  const canRetry = media.status === "error" && media.error !== "notFound";

  const status = (
    <>
      <span
        className={`flex items-center gap-2 truncate rounded-full px-3 py-1 text-sm ${
          peerPresent ? "bg-emerald-900/60 text-emerald-200" : "bg-neutral-800 text-neutral-300"
        }`}
      >
        <span className={`h-2 w-2 shrink-0 rounded-full ${peerPresent ? "bg-emerald-400" : "bg-neutral-500"}`} />
        {peerPresent ? t.peerConnected : t.peerWaiting}
      </span>
      {demoMode && (
        <span className="shrink-0 rounded-full bg-amber-500/90 px-3 py-1 text-xs font-semibold text-neutral-950">{t.demoBadge}</span>
      )}
    </>
  );

  return (
    <main className="flex h-dvh flex-col">
      {renderHeader(status)}
      {channelError && (
        <p role="alert" className="shrink-0 bg-red-900/80 px-4 py-2 text-center text-sm text-red-100">
          {realtimeErrorText}
        </p>
      )}

      <div className="flex min-h-0 flex-1 flex-col gap-3 p-3 lg:flex-row">
        {/* 무대 + 상대 자막 */}
        <section className="flex min-h-0 flex-1 flex-col gap-2">
          <div className="relative min-h-0 flex-1 overflow-hidden rounded-xl bg-black">
            {!captureMode && (
              <>
                <StreamVideo stream={remoteStream} className="object-contain" />
                {!remoteStream && (
                  <div className="absolute inset-0 flex items-center justify-center text-sm text-neutral-500">
                    {peerPresent ? "…" : t.peerWaiting}
                  </div>
                )}
              </>
            )}
            {/* 촬영 자리: call 배치에서는 무대 위에 겹치는 패널, capture 배치에서는 무대 전체 */}
            <div className={captureMode ? "absolute inset-0" : "pointer-events-none absolute inset-0 *:pointer-events-auto"}>
              <CaptureSlot ctx={ctx} area="stage" />
            </div>
            {!captureMode && media.status !== "ready" && (
              <div className="absolute inset-x-0 bottom-0 z-10 m-3 rounded-lg bg-neutral-900/90 p-4 text-sm leading-relaxed">
                <p>{deviceMessage ?? t.preparingDevice}</p>
                {canRetry && (
                  <button
                    type="button"
                    onClick={retryMedia}
                    className="mt-3 rounded-md bg-neutral-100 px-4 py-2 font-medium text-neutral-900 hover:bg-white"
                  >
                    {t.retry}
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="shrink-0">
            <InterpSlot ctx={ctx} area="remoteCaption" />
          </div>
        </section>

        {/* 작은 영상 + 내 발화 */}
        <aside className="flex shrink-0 flex-row gap-2 lg:w-80 lg:flex-col">
          <div className="relative aspect-video w-36 shrink-0 overflow-hidden rounded-xl bg-neutral-900 sm:w-48 lg:w-full">
            {captureMode ? (
              <StreamVideo stream={remoteStream} />
            ) : (
              <StreamVideo stream={localStream} mirrored />
            )}
            <span className="absolute left-2 top-2 rounded bg-black/60 px-2 py-0.5 text-xs">
              {captureMode ? t.remoteLabel : name || t.selfLabel}
            </span>
            {!captureMode && micMuted && (
              <span className="absolute bottom-2 left-2 rounded bg-red-700/90 px-2 py-0.5 text-xs">{t.micMutedBadge}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <InterpSlot ctx={ctx} area="selfCaption" />
          </div>
        </aside>
      </div>

      {/* 컨트롤 줄 */}
      <footer className="flex flex-wrap items-center gap-2 border-t border-neutral-800 px-4 py-3">
        <button
          type="button"
          aria-pressed={micMuted}
          onClick={() => setMicMuted((m) => !m)}
          disabled={!localStream}
          className={`rounded-full px-4 py-2 text-sm font-medium disabled:opacity-40 ${
            micMuted ? "bg-red-700 text-white" : "bg-neutral-800 text-neutral-100 hover:bg-neutral-700"
          }`}
        >
          {micMuted ? t.micOn : t.micOff}
        </button>
        <InterpSlot ctx={ctx} area="controls" />
        {needsSoundTap && remoteStream && !demoMode && (
          <button
            type="button"
            onClick={() => audioRef.current?.play().then(() => setNeedsSoundTap(false), () => {})}
            className="rounded-full bg-amber-500 px-4 py-2 text-sm font-medium text-neutral-950"
          >
            {t.enableSound}
          </button>
        )}
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => void leave()}
          disabled={ending}
          className="rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-60"
        >
          {ending ? t.ending : t.endCall}
        </button>
      </footer>

      <audio ref={attachAudio} autoPlay />
    </main>
  );
}
