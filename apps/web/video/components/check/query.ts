import type { UiLang } from "@/video/lib/contracts";

export type CheckQuery = { lang: UiLang; returnUrl: string | null };

// http(s) 절대 주소만 링크로 쓴다 — javascript: 같은 주소를 막기 위해
export function safeReturnUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    return u.protocol === "https:" || u.protocol === "http:" ? raw : null;
  } catch {
    return null;
  }
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export function parseCheckQuery(sp: Record<string, string | string[] | undefined>): CheckQuery {
  return {
    lang: first(sp.lang) === "ko" ? "ko" : "ja",
    returnUrl: safeReturnUrl(first(sp.returnUrl)),
  };
}

// AnalyserNode 의 시간 영역 바이트(128 = 무음)로 RMS 를 구해 0..1 로 키운다
export function levelFromTimeDomain(data: ArrayLike<number>, gain = 3): number {
  if (data.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    const v = (data[i] - 128) / 128;
    sum += v * v;
  }
  return Math.min(1, Math.sqrt(sum / data.length) * gain);
}
