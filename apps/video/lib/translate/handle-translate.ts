import { config } from "@/lib/config";
import type { SpeechLang, TranslateResponse } from "@/lib/contracts";
import { TranslationError, type Translator } from "./types";

export type HandleTranslateResult =
  | { status: 200; body: TranslateResponse }
  | { status: 400; body: { error: string } };

const isLang = (v: unknown): v is SpeechLang => v === "ko" || v === "ja";

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new TranslationError("timeout", `번역 ${ms}ms 초과`)), ms);
  });
  return Promise.race([p, timeout]).finally(() => clearTimeout(timer));
}

/** POST /api/translate 본문 처리 (spec §7.4). 번역 실패는 200 + 원문 + failed:true 로 바꾼다. */
export async function handleTranslate(
  body: unknown,
  translator: Translator,
  opts: { timeoutMs?: number } = {},
): Promise<HandleTranslateResult> {
  if (typeof body !== "object" || body === null) return { status: 400, body: { error: "invalid body" } };
  const { text, from, to } = body as Record<string, unknown>;
  if (typeof text !== "string" || !text.trim()) return { status: 400, body: { error: "text is required" } };
  if (!isLang(from) || !isLang(to) || from === to) return { status: 400, body: { error: "invalid from/to" } };

  const input = text.slice(0, config.interp.maxChars);
  try {
    // SDK 시간 제한과 별개로 번역기 종류와 무관하게 3초를 보장한다
    const translated = await withTimeout(
      translator.translateUtterance({ text: input, from, to }),
      opts.timeoutMs ?? config.interp.timeoutMs,
    );
    return { status: 200, body: { text: translated, failed: false } };
  } catch (err) {
    console.warn("[translate] 실패, 원문을 돌려줍니다:", err instanceof Error ? err.message : err);
    return { status: 200, body: { text: input, failed: true } };
  }
}
