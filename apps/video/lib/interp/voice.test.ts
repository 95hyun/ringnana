import { describe, expect, it } from "vitest";
import { pickVoice } from "./voice";

const v = (lang: string, name = lang) => ({ lang, name }) as SpeechSynthesisVoice;

describe("읽기 음성 고르기", () => {
  it("언어가 정확히 맞는 음성을 고른다", () => {
    expect(pickVoice([v("en-US"), v("ko-KR"), v("ja-JP")], "ja-JP")?.lang).toBe("ja-JP");
  });
  it("밑줄·대소문자 차이를 허용한다", () => {
    expect(pickVoice([v("ko_kr")], "ko-KR")?.lang).toBe("ko_kr");
  });
  it("지역이 달라도 같은 언어면 고른다", () => {
    expect(pickVoice([v("en-US"), v("ja")], "ja-JP")?.lang).toBe("ja");
  });
  it("맞는 음성이 없으면 null", () => {
    expect(pickVoice([v("en-US")], "ko-KR")).toBeNull();
    expect(pickVoice([], "ko-KR")).toBeNull();
  });
});
