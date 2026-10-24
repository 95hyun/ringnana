"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { config } from "@/lib/config";
import { classifyMediaError, mediaConstraintsChain, shouldTryNextConstraints, type MediaErrorKind } from "@/lib/room/media";

export type LocalMedia =
  | { status: "pending"; stream: null; error: null }
  | { status: "ready"; stream: MediaStream; error: null }
  | { status: "error"; stream: null; error: MediaErrorKind };

async function acquire(): Promise<MediaStream | MediaErrorKind> {
  let lastErr: unknown = null;
  for (const c of mediaConstraintsChain(config.media.idealWidths)) {
    try {
      return await navigator.mediaDevices.getUserMedia(c);
    } catch (e) {
      lastErr = e;
      if (!shouldTryNextConstraints(e)) break;
    }
  }
  return classifyMediaError(lastErr);
}

// spec §4.1: 카메라·마이크는 방에 들어올 때 한 번만 요청한다 (실패했을 때만 [다시 시도])
export function useLocalMedia() {
  const [media, setMedia] = useState<LocalMedia>({ status: "pending", stream: null, error: null });
  const [attempt, setAttempt] = useState(0);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let cancelled = false;
    acquire().then((r) => {
      if (typeof r === "string") {
        if (!cancelled) setMedia({ status: "error", stream: null, error: r });
        return;
      }
      if (cancelled) {
        r.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = r;
      setMedia({ status: "ready", stream: r, error: null });
    });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  // 화면을 떠날 때(밀려남·종료 포함) 카메라·마이크를 끈다
  useEffect(
    () => () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    },
    [],
  );

  const retry = useCallback(() => {
    setMedia({ status: "pending", stream: null, error: null });
    setAttempt((n) => n + 1);
  }, []);

  return { media, retry };
}
