import { describe, expect, it } from "vitest";
import { initialUiLang, langStorageKey, saveUiLang, type KeyValueStorage } from "./lang";

function memStorage(): KeyValueStorage {
  const m = new Map<string, string>();
  return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => void m.set(k, v) };
}

describe("환자 화면 언어 — 방(sessionId)마다 기억", () => {
  it("처음에는 lang 으로 시작", () => {
    const s = memStorage();
    expect(initialUiLang(s, "room-a", "ja")).toBe("ja");
    expect(initialUiLang(s, "room-a", "ko")).toBe("ko");
  });
  it("고른 언어는 같은 방에서 유지 (새로고침)", () => {
    const s = memStorage();
    saveUiLang(s, "room-a", "ko");
    expect(initialUiLang(s, "room-a", "ja")).toBe("ko");
  });
  it("새 방은 다시 lang 으로 시작", () => {
    const s = memStorage();
    saveUiLang(s, "room-a", "ko");
    expect(initialUiLang(s, "room-b", "ja")).toBe("ja");
  });
  it("방마다 다른 키", () => {
    expect(langStorageKey("a")).not.toBe(langStorageKey("b"));
  });
  it("저장소가 없거나 깨진 값이면 lang", () => {
    expect(initialUiLang(null, "room-a", "ko")).toBe("ko");
    const s = memStorage();
    s.setItem(langStorageKey("room-a"), "en");
    expect(initialUiLang(s, "room-a", "ja")).toBe("ja");
    const broken: KeyValueStorage = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(initialUiLang(broken, "room-a", "ja")).toBe("ja");
    expect(() => saveUiLang(broken, "room-a", "ko")).not.toThrow();
  });
});
