import { describe, expect, it } from "vitest";
import { messages } from "./index";

// 값이 문자열인 키의 경로를 모두 모은다 (예: "capture.consent")
function keyPaths(obj: unknown, prefix = ""): string[] {
  if (typeof obj !== "object" || obj === null) return [prefix];
  return Object.entries(obj).flatMap(([k, v]) => keyPaths(v, prefix ? `${prefix}.${k}` : k));
}

describe("환자 화면 문구 파일", () => {
  it("ja와 ko의 키 집합이 같다", () => {
    expect(keyPaths(messages.ja).length).toBeGreaterThan(20);
    expect(keyPaths(messages.ko).sort()).toEqual(keyPaths(messages.ja).sort());
  });

  it("빈 문구가 없다", () => {
    for (const lang of ["ja", "ko"] as const) {
      const empty = keyPaths(messages[lang]).filter((path) => {
        const value = path.split(".").reduce<unknown>((o, k) => (o as Record<string, unknown>)[k], messages[lang]);
        return typeof value === "string" && value.trim() === "";
      });
      expect(empty, lang).toEqual([]);
    }
  });
});
