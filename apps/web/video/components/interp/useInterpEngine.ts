"use client";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { bcp47Of, speechLangOf, type CaptionPayload, type RoomContext } from "@/video/lib/contracts";
import { config } from "@/video/lib/config";
import { addCaption } from "@/video/lib/interp/captions";
import { voiceLangOf } from "@/video/lib/interp/lang";
import { createListenLock, type ListenLock } from "@/video/lib/interp/listenLock";
import { collectResults, getRecognitionCtor } from "@/video/lib/interp/recognition";
import { createBrowserSpeaker } from "@/video/lib/interp/speaker";
import { getInterpStore, type InterpStore } from "@/video/lib/interp/store";
import { submitUtterance } from "@/video/lib/interp/submit";
import { translateSentence } from "@/video/lib/interp/translateClient";
import { openLocalLink } from "@/video/lib/room/demo";
import { TtsQueue } from "@/video/lib/interp/ttsQueue";

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
  const { role, micMuted, remoteAudio, on, demoMode, sessionId } = ctx;
  const sendRef = useRef(ctx.send);
  useEffect(() => {
    sendRef.current = ctx.send;
  }, [ctx.send]);
  const queueRef = useRef<TtsQueue | null>(null);
  const lockRef = useRef<ListenLock | null>(null);
  const [windowId] = useState(() => crypto.randomUUID());
  const state = useSyncExternalStore(store.subscribe, store.get, store.get);
  const { enabled, voiceOn, support, speaking, talkRequested } = state;

  // 확정 문장 → 번역 → 방송. 예시 문장 버튼도 이 길로 보낸다.
  const say = useCallback(
    (srcText: string) =>
      submitUtterance({
        srcText,
        role,
        store,
        send: (ev) => sendRef.current(ev),
        translate: translateSentence,
        maxLines: config.interp.captionLines,
      }),
    [role, store],
  );

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

  // 음성 인식 — 통역 켬 + 마이크 켬 + 지원 브라우저일 때만. 시연 모드는 아래 [말하기]가 맡는다.
  useEffect(() => {
    if (!active || demoMode || !enabled || micMuted || support !== "supported") return;
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = bcp47Of(speechLangOf(role));
    rec.continuous = true;
    rec.interimResults = true;
    let stopped = false;
    let fatal = false;
    let restartTimer: ReturnType<typeof setTimeout> | undefined;

    const handleFinal = (srcText: string) => {
      if (queueRef.current?.shouldDiscardRecognition()) return;
      void say(srcText);
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
  }, [active, demoMode, enabled, micMuted, support, role, store, say]);

  // 시연 모드: 같은 브라우저의 창 사이 듣기 잠금 (spec §16)
  useEffect(() => {
    if (!active) return;
    if (!demoMode) {
      store.set({ talkRequested: false, talkLocked: false });
      return;
    }
    const link = openLocalLink(sessionId);
    if (!link) return;
    const lock = createListenLock({
      link,
      tabId: windowId,
      maxMs: config.demo.listenLockMaxMs,
      onChange: (locked) => store.set({ talkLocked: locked }),
      onPreempted: () => store.set({ talkRequested: false }),
    });
    lockRef.current = lock;
    return () => {
      lockRef.current = null;
      lock.dispose();
      link.close();
      store.set({ talkRequested: false, talkLocked: false });
    };
  }, [active, demoMode, sessionId, windowId, store]);

  // 시연 모드 [말하기]: 한 문장만 듣고 멈춘다
  useEffect(() => {
    if (!active || !demoMode || !talkRequested) return;
    const Ctor = getRecognitionCtor();
    const lock = lockRef.current;
    if (!enabled || micMuted || !Ctor || (lock && !lock.acquire())) {
      store.set({ talkRequested: false });
      return;
    }
    const rec = new Ctor();
    rec.lang = bcp47Of(speechLangOf(role));
    rec.continuous = false;
    rec.interimResults = true;
    let done = false;
    rec.onstart = () => store.set({ listening: true });
    rec.onresult = (ev) => {
      const { finals, interim } = collectResults(ev);
      store.set({ interim });
      if (finals.length === 0 || done) return;
      done = true;
      finals.forEach((f) => void say(f));
      store.set({ talkRequested: false });
    };
    rec.onend = () => store.set({ talkRequested: false });
    try {
      rec.start();
    } catch {
      store.set({ talkRequested: false });
    }
    return () => {
      rec.onstart = rec.onresult = rec.onerror = rec.onend = null;
      try {
        rec.abort();
      } catch {
        // 무시
      }
      lock?.release();
      store.set({ listening: false, interim: "" });
    };
  }, [active, demoMode, talkRequested, enabled, micMuted, role, store, say]);

  return { say };
}
