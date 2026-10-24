"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { UiLang } from "@/video/lib/contracts";
import { messages } from "@/video/messages";
import { useLocalMedia } from "@/video/components/room/useLocalMedia";
import { StreamVideo } from "@/video/components/room/StreamVideo";
import { levelFromTimeDomain } from "./query";

type AudioCtor = typeof AudioContext;
const audioCtor = (): AudioCtor | null =>
  typeof window === "undefined"
    ? null
    : (window.AudioContext ?? (window as unknown as { webkitAudioContext?: AudioCtor }).webkitAudioContext ?? null);

// spec §10: 결과는 어디에도 보내지 않는다 — 이 화면 안에서만 보여 준다
export function CheckClient({ lang, returnUrl }: { lang: UiLang; returnUrl: string | null }) {
  const t = messages[lang].check;
  const { media, retry } = useLocalMedia();
  const ctxRef = useRef<AudioContext | null>(null);
  const [level, setLevel] = useState(0);

  const ensureCtx = useCallback(() => {
    if (!ctxRef.current) {
      const Ctor = audioCtor();
      if (!Ctor) return null;
      ctxRef.current = new Ctor();
    }
    if (ctxRef.current.state === "suspended") ctxRef.current.resume().catch(() => {});
    return ctxRef.current;
  }, []);

  // 마이크 레벨: 스피커로는 연결하지 않는다(하울링 방지)
  useEffect(() => {
    if (media.status !== "ready" || media.stream.getAudioTracks().length === 0) return;
    const ctx = ensureCtx();
    if (!ctx) return;
    const source = ctx.createMediaStreamSource(media.stream);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);
    const buf = new Uint8Array(analyser.fftSize);
    let raf = 0;
    const tick = () => {
      analyser.getByteTimeDomainData(buf);
      setLevel(levelFromTimeDomain(buf));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      source.disconnect();
      setLevel(0);
    };
  }, [media, ensureCtx]);

  useEffect(
    () => () => {
      ctxRef.current?.close().catch(() => {});
      ctxRef.current = null;
    },
    [],
  );

  const playTone = useCallback(() => {
    const ctx = ensureCtx();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const now = ctx.currentTime;
    osc.frequency.value = 660;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.3, now + 0.02);
    gain.gain.setValueAtTime(0.3, now + 0.5);
    gain.gain.linearRampToValueAtTime(0, now + 0.6);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.65);
    osc.onended = () => gain.disconnect();
  }, [ensureCtx]);

  const errorText =
    media.status === "error"
      ? { denied: t.deviceDenied, notFound: t.deviceNotFound, inUse: t.deviceInUse }[media.error]
      : null;
  // spec §4.1: 장치 없음에는 [다시 시도]가 없다
  const canRetry = media.status === "error" && media.error !== "notFound";

  return (
    <main lang={lang} className="mx-auto flex min-h-dvh max-w-xl flex-col gap-6 p-6" onPointerDown={() => ctxRef.current && ensureCtx()}>
      <h1 className="text-xl font-semibold">{t.title}</h1>

      <section className="space-y-2">
        <h2 className="font-medium">{t.cameraHeading}</h2>
        <div className="relative aspect-video overflow-hidden rounded-lg bg-neutral-900">
          {media.status === "ready" ? (
            <StreamVideo stream={media.stream} mirrored />
          ) : (
            <div className="flex h-full items-center justify-center p-6 text-center text-sm leading-relaxed text-neutral-300">
              {media.status === "pending" ? (
                <p>{t.preparing}</p>
              ) : (
                <div className="space-y-4">
                  <p role="alert">{errorText}</p>
                  {canRetry && (
                    <button
                      type="button"
                      onClick={retry}
                      className="rounded-md bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-900"
                    >
                      {t.retry}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
        <p className="text-sm text-neutral-400">{t.cameraHint}</p>
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">{t.micHeading}</h2>
        <div
          role="meter"
          aria-label={t.micLevelLabel}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(level * 100)}
          className="h-3 overflow-hidden rounded-full bg-neutral-800"
        >
          <div className="h-full bg-emerald-400 transition-[width] duration-75" style={{ width: `${level * 100}%` }} />
        </div>
        <p className="text-sm text-neutral-400">{t.micHint}</p>
      </section>

      <section className="space-y-2">
        <h2 className="font-medium">{t.speakerHeading}</h2>
        <button
          type="button"
          onClick={playTone}
          className="rounded-md bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-900"
        >
          {t.playTone}
        </button>
        <p className="text-sm text-neutral-400">{t.speakerHint}</p>
      </section>

      <p className="text-xs text-neutral-500">{t.privacyNote}</p>

      {returnUrl && (
        <a href={returnUrl} className="self-start rounded-md border border-neutral-600 px-4 py-2 text-sm">
          {t.back}
        </a>
      )}
    </main>
  );
}
