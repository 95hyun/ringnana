"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { channelName, type PresenceState, type RoomEvent, type RoomEventType } from "@/lib/contracts";
import { supabaseBrowser } from "@/lib/supabase/browser";
import { isSuperseded, knownTabs, validTabs } from "@/lib/room/presence";

const EVENT_TYPES: RoomEventType[] = [
  "signal",
  "capture:request",
  "capture:progress",
  "capture:done",
  "capture:cancel",
  "call:end",
  "interp:caption",
];

type RawPresence = Record<string, Array<Record<string, unknown>>>;

// spec §8 채널: Presence(키 = 역할) + Broadcast(RoomEvent)
export function useRoomChannel({ sessionId, self }: { sessionId: string; self: PresenceState }) {
  const [presence, setPresence] = useState<RawPresence>({});
  const [error, setError] = useState<string | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const joinedRef = useRef(false);
  const queueRef = useRef<RoomEvent[]>([]);
  const listenersRef = useRef(new Set<(e: RoomEvent) => void>());
  const selfRef = useRef(self);
  const { role, tabId, joinedAt } = self;

  useEffect(() => {
    selfRef.current = { role, tabId, joinedAt };
    const ch = channelRef.current;
    if (ch && joinedRef.current) void ch.track(selfRef.current);
  }, [role, tabId, joinedAt]);

  const sendNow = useCallback((ch: RealtimeChannel, ev: RoomEvent) => {
    return ch.send({ type: "broadcast", event: ev.type, payload: ev.payload });
  }, []);

  useEffect(() => {
    let cancelled = false;
    let ch: RealtimeChannel | null = null;
    let sb: ReturnType<typeof supabaseBrowser>;
    try {
      sb = supabaseBrowser();
    } catch (e) {
      queueMicrotask(() => !cancelled && setError(String(e)));
      return;
    }
    const topic = channelName(sessionId);
    // 같은 이름의 채널이 아직 닫히는 중이면 재사용되므로(supabase-js) 먼저 정리하고 새로 만든다
    const start = async () => {
      const stale = sb.getChannels().filter((c) => c.topic === `realtime:${topic}`);
      await Promise.all(stale.map((c) => sb.removeChannel(c)));
      if (cancelled) return;
      ch = sb.channel(topic, {
        config: { presence: { key: selfRef.current.role, enabled: true }, broadcast: { self: false } },
      });
      ch.on("presence", { event: "sync" }, () => {
        if (!cancelled && ch) setPresence({ ...(ch.presenceState() as RawPresence) });
      });
      for (const type of EVENT_TYPES) {
        ch.on("broadcast", { event: type }, (msg: { payload?: unknown }) => {
          const ev = { type, payload: msg.payload ?? {} } as RoomEvent;
          listenersRef.current.forEach((h) => h(ev));
        });
      }
      ch.subscribe((status) => {
        if (cancelled || !ch) return;
        if (status === "SUBSCRIBED") {
          joinedRef.current = true;
          setError(null);
          void ch.track(selfRef.current);
          const pending = queueRef.current.splice(0);
          pending.forEach((ev) => void sendNow(ch!, ev));
        } else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          setError(status);
        }
      });
      channelRef.current = ch;
    };
    // 개발 모드의 effect 두 번 실행에서 채널을 두 번 만들지 않도록 한 박자 늦춘다
    const timer = setTimeout(() => void start(), 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      joinedRef.current = false;
      channelRef.current = null;
      if (ch) {
        const closing = ch;
        void closing.untrack().finally(() => sb.removeChannel(closing));
      }
    };
  }, [sessionId, sendNow]);

  const send = useCallback(
    (ev: RoomEvent) => {
      const ch = channelRef.current;
      if (ch && joinedRef.current) void sendNow(ch, ev);
      else queueRef.current.push(ev);
    },
    [sendNow],
  );

  // 보낸 뒤 이동해야 하는 경우(통화 종료)를 위해 전송 완료를 기다릴 수 있는 버전
  const sendAndWait = useCallback(
    async (ev: RoomEvent) => {
      const ch = channelRef.current;
      if (ch && joinedRef.current) await sendNow(ch, ev);
    },
    [sendNow],
  );

  const on = useCallback((handler: (e: RoomEvent) => void) => {
    listenersRef.current.add(handler);
    return () => {
      listenersRef.current.delete(handler);
    };
  }, []);

  const valid = useMemo(() => validTabs(presence), [presence]);
  const known = useMemo(() => knownTabs(presence), [presence]);
  const superseded = useMemo(
    () => isSuperseded({ role, tabId, joinedAt }, presence),
    [presence, role, tabId, joinedAt],
  );

  return { valid, known, superseded, error, send, sendAndWait, on };
}

export type RoomChannel = ReturnType<typeof useRoomChannel>;
