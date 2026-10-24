"use client";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { bcp47Of, speechLangOf, type CaptionPayload, type RoomContext } from "@/lib/contracts";
import { config } from "@/lib/config";
import { addCaption, upsertSelfCaption } from "@/lib/interp/captions";
import { translatePairOf, voiceLangOf } from "@/lib/interp/lang";
import { collectResults, getRecognitionCtor } from "@/lib/interp/recognition";
import { createBrowserSpeaker } from "@/lib/interp/speaker";
import { getInterpStore, type InterpStore } from "@/lib/interp/store";
import { translateSentence } from "@/lib/interp/translateClient";
import { TtsQueue } from "@/lib/interp/ttsQueue";

const RESTART_DELAY_MS = 300; // onend 직후 바로 start하면 실패하는 경우가 있어 잠깐 쉰다
const ECHO_TAIL_MS = 600; // 읽기 끝난 직후 늦게 확정된 내 인식 결과도 스피커 소리로 보고 버린다

export function useInterpState(sessionId: string) {
  const store = getInterpStore(sessionId);
  const state = useSyncExternalStore(store.subscribe, store.get, store.get);
  return { store, state };
}

// 방 화면이 넘겨준 단일 <audio>의 볼륨만 바꾼다 (ctx.remoteAudio)
function setVolume(el: HTMLMediaElement, v: number) {
  el.volume = v;
}

function isCaption(p: unknown): p is CaptionPayload {
  const c = p as CaptionPayload | null;
  return (
    !!c &&
    typeof c.id === "string" &&
    typeof c.srcText === "string" &&
    typeof c.dstText === "string" &&
    typeof c.failed === "boolean" &&
    (c.speaker === "doctor" || c.speaker === "patient")
  );
}

// 부수효과(인식·구독·읽기)는 controls 인스턴스 하나만 맡는다 — 인식이 두 번 돌지 않게
export function useInterpEngine(ctx: RoomContext, store: InterpStore, active: boolean) {
  const { role, micMuted, remoteAudio, on } = ctx;
  const sendRef = useRef(ctx.send);
  useEffect(() => {
    sendRef.current = ctx.send;
  }, [ctx.send]);
  const queueRef = useRef<TtsQueue | null>(null);
  const state = useSyncExternalStore(store.subscribe, store.get, store.get);
  const { enabled, voiceOn, support, speaking } = state;

  // 브라우저 지원 확인
  useEffect(() => {
    if (!active) return;
    store.set({ support: getRecognitionCtor() ? "supported" : "unsupported" });
  }, [active, store]);

  // 읽기 대기열
  useEffect(() => {
    if (!active) return;
    const speaker = createBrowserSpeaker();
    const q = new TtsQueue(speaker, (s) => store.set({ speaking: s }), { tailMs: ECHO_TAIL_MS });
    queueRef.current = q;
    return () => {
      q.clear();
      speaker.dispose();
      queueRef.current = null;
      store.set({ speaking: false });
    };
  }, [active, store]);

  // [음성] 끄면 읽기만 멈춘다
  useEffect(() => {
    if (active && !voiceOn) queueRef.current?.clear();
  }, [active, voiceOn]);

  // 읽는 동안 상대 원음 볼륨을 낮춘다 (spec §6.3)
  useEffect(() => {
    if (!active || !remoteAudio) return;
    setVolume(remoteAudio, speaking ? config.interp.duckVolume : 1);
  }, [active, remoteAudio, speaking]);
  useEffect(() => {
    if (!active || !remoteAudio) return;
    return () => {
      setVolume(remoteAudio, 1);
    };
  }, [active, remoteAudio]);

  // 상대 자막 받기 — [통역]이 꺼져도 계속 받는다
  useEffect(() => {
    if (!active) return;
    return on((ev) => {
      if (ev.type !== "interp:caption" || !isCaption(ev.payload)) return;
      const cap = ev.payload;
      if (cap.speaker === role) return;
      const { list, added } = addCaption(store.get().remote, cap, config.interp.captionLines);
      if (!added) return;
      store.set({ remote: list });
      if (!cap.failed && store.get().voiceOn && cap.dstText.trim()) {
        queueRef.current?.enqueue({ text: cap.dstText, lang: voiceLangOf(role) });
      }
    });
  }, [active, on, role, store]);

  // 음성 인식 — 통역 켬 + 마이크 켬 + 지원 브라우저일 때만
  useEffect(() => {
    if (!active || !enabled || micMuted || support !== "supported") return;
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    const { from, to } = translatePairOf(role);
    const rec = new Ctor();
    rec.lang = bcp47Of(speechLangOf(role));
    rec.continuous = true;
    rec.interimResults = true;
    let stopped = false;
    let fatal = false;
    let restartTimer: ReturnType<typeof setTimeout> | undefined;

    const handleFinal = (srcText: string) => {
      if (queueRef.current?.shouldDiscardRecognition()) return;
      const id = crypto.randomUUID();
      const max = config.interp.captionLines;
      store.set((s) => ({
        self: upsertSelfCaption(s.self, { id, srcText, pending: true }, max),
        pendingCount: s.pendingCount + 1,
      }));
      void translateSentence(srcText, from, to).then(({ text, failed }) => {
        store.set((s) => ({
          self: upsertSelfCaption(s.self, { id, srcText, dstText: text, pending: false, failed }, max, { insert: false }),
          pendingCount: Math.max(0, s.pendingCount - 1),
        }));
        // 응답을 기다리는 사이 [통역]을 껐으면 방송하지 않는다
        if (!store.get().enabled) return;
        sendRef.current({
          type: "interp:caption",
          payload: { id, speaker: role, srcLang: from, srcText, dstLang: to, dstText: text, failed },
        });
      });
    };

    const start = () => {
      if (stopped || fatal) return;
      try {
        rec.start();
      } catch {
        // 이미 시작된 상태 등 — onend에서 다시 시도된다
      }
    };
    rec.onstart = () => store.set({ listening: true });
    rec.onresult = (ev) => {
      const { finals, interim } = collectResults(ev);
      store.set({ interim: queueRef.current?.shouldDiscardRecognition() ? "" : interim });
      finals.forEach(handleFinal);
    };
    rec.onerror = (ev) => {
      if (ev.error === "not-allowed" || ev.error === "service-not-allowed") fatal = true;
    };
    rec.onend = () => {
      store.set({ listening: false, interim: "" });
      if (!stopped && !fatal) restartTimer = setTimeout(start, RESTART_DELAY_MS);
    };
    start();

    return () => {
      stopped = true;
      clearTimeout(restartTimer);
      rec.onstart = rec.onresult = rec.onerror = rec.onend = null;
      try {
        rec.abort();
      } catch {
        // 무시
      }
      store.set({ listening: false, interim: "" });
    };
  }, [active, enabled, micMuted, support, role, store]);
}
