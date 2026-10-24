import { describe, expect, it } from "vitest";
import { translatePairOf, voiceLangOf } from "./lang";

describe("역할별 통역 언어", () => {
  it("의사는 ko→ja로 번역한다", () => {
    expect(translatePairOf("doctor")).toEqual({ from: "ko", to: "ja" });
  });
  it("환자는 ja→ko로 번역한다", () => {
    expect(translatePairOf("patient")).toEqual({ from: "ja", to: "ko" });
  });
  it("읽기 음성은 내 언어 (환자 ja-JP, 의사 ko-KR)", () => {
    expect(voiceLangOf("patient")).toBe("ja-JP");
    expect(voiceLangOf("doctor")).toBe("ko-KR");
  });
});
