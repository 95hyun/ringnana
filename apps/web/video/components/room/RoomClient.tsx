"use client";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { UiLang } from "@/video/lib/contracts";
import { initialUiLang, saveUiLang, type KeyValueStorage } from "@/video/lib/room/lang";
import type { RoomQuery } from "@/video/lib/room/query";
import { roomText } from "@/video/lib/room/text";
import { LiveRoom } from "./LiveRoom";
import { Notice } from "./Notice";
import { RoomHeader } from "./RoomHeader";

type Phase = "checking" | "notFound" | "live" | "superseded" | "ended" | "leaving";

function localStore(): KeyValueStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function RoomClient({ query }: { query: RoomQuery }) {
  const { sessionId, role, returnUrl } = query;
  const [phase, setPhase] = useState<Phase>("checking");
  const [uiLang, setUiLangState] = useState<UiLang>(() =>
    role === "doctor" ? "ko" : initialUiLang(localStore(), sessionId, query.lang),
  );
  const t = roomText(role, uiLang);

  const setUiLang = useCallback(
    (lang: UiLang) => {
      setUiLangState(lang);
      saveUiLang(localStore(), sessionId, lang);
    },
    [sessionId],
  );

  // spec §3: 진료가 있는지 먼저 확인 — 404 일 때만 들어가지 않는다
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/capture/latest?sessionId=${encodeURIComponent(sessionId)}`, { cache: "no-store" })
      .then(
        (r) => (r.status === 404 ? "notFound" : "live"),
        () => "live" as const,
      )
      .then((p) => {
        if (!cancelled) setPhase(p);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  // LiveRoom 을 내리면 카메라·마이크·연결·채널이 모두 정리된다
  const onLeave = useCallback(() => {
    if (returnUrl) {
      setPhase("leaving");
      window.location.assign(returnUrl);
    } else {
      setPhase("ended");
    }
  }, [returnUrl]);
  const onSuperseded = useCallback(() => setPhase("superseded"), []);

  const renderHeader = (status?: ReactNode) => (
    <RoomHeader role={role} uiLang={uiLang} onLangChange={setUiLang} text={t} status={status} />
  );

  if (phase === "live") {
    return (
      <LiveRoom query={query} uiLang={uiLang} text={t} renderHeader={renderHeader} onLeave={onLeave} onSuperseded={onSuperseded} />
    );
  }

  const message =
    phase === "checking" || phase === "leaving"
      ? t.checking
      : phase === "notFound"
        ? t.notFound
        : phase === "superseded"
          ? t.superseded
          : t.callEnded;
  return (
    <main className="flex h-dvh flex-col">
      {renderHeader()}
      <Notice>
        <p className={phase === "checking" || phase === "leaving" ? "text-neutral-400" : ""}>
          {phase === "leaving" ? t.ending : message}
        </p>
      </Notice>
    </main>
  );
}
