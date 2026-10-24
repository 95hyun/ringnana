import type { UiLang } from "@/video/lib/contracts";

export type KeyValueStorage = Pick<Storage, "getItem" | "setItem">;

export const langStorageKey = (sessionId: string) => `ringnana-video:uiLang:${sessionId}`;

// spec §4.2: 고른 언어는 그 방(sessionId) 안에서만 기억, 새 방은 lang 으로 시작
export function initialUiLang(storage: KeyValueStorage | null, sessionId: string, queryLang: UiLang): UiLang {
  try {
    const v = storage?.getItem(langStorageKey(sessionId));
    return v === "ja" || v === "ko" ? v : queryLang;
  } catch {
    return queryLang;
  }
}

export function saveUiLang(storage: KeyValueStorage | null, sessionId: string, lang: UiLang): void {
  try {
    storage?.setItem(langStorageKey(sessionId), lang);
  } catch {
    // 저장이 막힌 브라우저(사생활 보호 모드 등)에서는 이번 화면에서만 바뀐다
  }
}
