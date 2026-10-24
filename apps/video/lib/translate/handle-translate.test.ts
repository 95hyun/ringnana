import { describe, expect, it } from "vitest";
import { config } from "@/lib/config";
import { createFakeTranslator } from "./fake";
import { handleTranslate } from "./handle-translate";
import { TranslationError } from "./types";

const ok = createFakeTranslator({ utterance: ({ text, to }) => `[${to}] ${text}` });

describe("handleTranslate (POST /api/translate)", () => {
  it("성공하면 번역문을 돌려준다", async () => {
    const res = await handleTranslate({ text: "레이저 토닝 5회, 2주 간격", from: "ko", to: "ja" }, ok);
    expect(res).toEqual({ status: 200, body: { text: "[ja] 레이저 토닝 5회, 2주 간격", failed: false } });
  });

  it("번역기 오류면 원문 + failed", async () => {
    const t = createFakeTranslator({
      utterance: () => {
        throw new Error("network");
      },
    });
    const res = await handleTranslate({ text: "こんにちは", from: "ja", to: "ko" }, t);
    expect(res).toEqual({ status: 200, body: { text: "こんにちは", failed: true } });
  });

  it("거절이면 원문 + failed", async () => {
    const t = createFakeTranslator({
      utterance: () => {
        throw new TranslationError("refusal", "refused");
      },
    });
    const res = await handleTranslate({ text: "안녕하세요", from: "ko", to: "ja" }, t);
    expect(res.body).toEqual({ text: "안녕하세요", failed: true });
  });

  it("시간 초과면 원문 + failed", async () => {
    const t = createFakeTranslator({ utterance: () => new Promise<string>(() => {}) });
    const started = Date.now();
    const res = await handleTranslate({ text: "안녕하세요", from: "ko", to: "ja" }, t, { timeoutMs: 30 });
    expect(res).toEqual({ status: 200, body: { text: "안녕하세요", failed: true } });
    expect(Date.now() - started).toBeLessThan(1000);
  });

  it("기본 시간 제한은 설정값(3초)을 쓴다", async () => {
    expect(config.interp.timeoutMs).toBe(3000);
  });

  it(`${config.interp.maxChars}자를 넘으면 잘라서 번역한다`, async () => {
    const seen: string[] = [];
    const t = createFakeTranslator({
      utterance: ({ text }) => {
        seen.push(text);
        return "訳";
      },
    });
    const long = "가".repeat(config.interp.maxChars + 50);
    const res = await handleTranslate({ text: long, from: "ko", to: "ja" }, t);
    expect(seen[0]).toHaveLength(config.interp.maxChars);
    expect(res.body).toEqual({ text: "訳", failed: false });
  });

  it("잘린 입력이 실패하면 잘린 원문을 돌려준다", async () => {
    const t = createFakeTranslator({
      utterance: () => {
        throw new Error("x");
      },
    });
    const long = "あ".repeat(config.interp.maxChars + 1);
    const res = await handleTranslate({ text: long, from: "ja", to: "ko" }, t);
    expect(res.body).toEqual({ text: "あ".repeat(config.interp.maxChars), failed: true });
  });

  it.each([
    ["빈 문자열", { text: "", from: "ko", to: "ja" }],
    ["공백뿐", { text: "   ", from: "ko", to: "ja" }],
    ["text 없음", { from: "ko", to: "ja" }],
    ["text가 문자열 아님", { text: 1, from: "ko", to: "ja" }],
    ["from 틀림", { text: "a", from: "en", to: "ja" }],
    ["to 틀림", { text: "a", from: "ko", to: "en" }],
    ["from = to", { text: "a", from: "ko", to: "ko" }],
    ["객체 아님", "hello"],
    ["null", null],
  ])("잘못된 입력은 400 (%s)", async (_name, body) => {
    let called = false;
    const t = createFakeTranslator({
      utterance: () => {
        called = true;
        return "x";
      },
    });
    const res = await handleTranslate(body, t);
    expect(res.status).toBe(400);
    expect(called).toBe(false);
  });
});
