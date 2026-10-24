import type { SpeechLang, TranslateRequest, TranslateResponse } from "@/lib/contracts";

// 서버는 3초에 끊고 원문을 돌려주므로, 응답이 아예 없을 때만 대비하는 여유 시간
const CLIENT_TIMEOUT_MS = 6000;

// 실패해도 throw하지 않고 원문 + failed:true 를 돌려준다 (spec §7.4와 같은 모양)
export async function translateSentence(text: string, from: SpeechLang, to: SpeechLang): Promise<TranslateResponse> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), CLIENT_TIMEOUT_MS);
  try {
    const body: TranslateRequest = { text, from, to };
    const res = await fetch("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) return { text, failed: true };
    const data = (await res.json()) as Partial<TranslateResponse>;
    if (typeof data.text !== "string" || typeof data.failed !== "boolean") return { text, failed: true };
    return { text: data.text, failed: data.failed };
  } catch {
    return { text, failed: true };
  } finally {
    clearTimeout(timer);
  }
}
