import { describe, expect, it } from "vitest";
import { collectResults, type RecognitionResultEvent } from "./recognition";

const res = (transcript: string, isFinal: boolean) => Object.assign([{ transcript }], { isFinal });

describe("음성 인식 결과 나누기", () => {
  it("resultIndex부터 확정 문장과 중간 결과를 나눈다", () => {
    const ev: RecognitionResultEvent = {
      resultIndex: 1,
      results: [res("이미 처리됨", true), res(" 안녕하세요 ", true), res("오늘", false), res(" 어디가", false)],
    };
    expect(collectResults(ev)).toEqual({ finals: ["안녕하세요"], interim: "오늘 어디가" });
  });
  it("빈 확정 문장은 버린다", () => {
    const ev: RecognitionResultEvent = { resultIndex: 0, results: [res("  ", true)] };
    expect(collectResults(ev)).toEqual({ finals: [], interim: "" });
  });
});
