import { describe, expect, it } from "vitest";
import { bcp47Of, channelName, speechLangOf } from "./contracts";

describe("contracts", () => {
  it("역할별 통역 언어는 고정이다", () => {
    expect(speechLangOf("doctor")).toBe("ko");
    expect(speechLangOf("patient")).toBe("ja");
    expect(bcp47Of("ja")).toBe("ja-JP");
  });
  it("채널 이름", () => {
    expect(channelName("abc")).toBe("video:abc");
  });
});
