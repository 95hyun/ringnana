import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { config } from "@/lib/config";
import { createClaudeTranslator, type MessagesClient } from "./claude";
import { TranslationError } from "./types";

type Call = { body: Record<string, unknown>; options: Record<string, unknown> | undefined };

function fakeClient(response: unknown) {
  const calls: Call[] = [];
  const client: MessagesClient = {
    messages: {
      create: (async (body: unknown, options?: unknown) => {
        calls.push({ body: body as Record<string, unknown>, options: options as Record<string, unknown> });
        if (response instanceof Error) throw response;
        return response;
      }) as MessagesClient["messages"]["create"],
    },
  };
  return { client, calls };
}

const msg = (text: string, stop_reason = "end_turn") => ({
  content: [{ type: "text", text }],
  stop_reason,
});

describe("Claude 번역기 — 통역", () => {
  it("모델·시간 제한·지시를 설정대로 보내고 샘플링 값은 보내지 않는다", async () => {
    const { client, calls } = fakeClient(msg(" レーザートーニング5回です。 "));
    const t = createClaudeTranslator({ client });
    const out = await t.translateUtterance({ text: "레이저 토닝 5회요", from: "ko", to: "ja" });
    expect(out).toBe("レーザートーニング5回です。");
    const { body, options } = calls[0];
    expect(body.model).toBe(config.interp.model);
    expect(body).not.toHaveProperty("temperature");
    expect(body).not.toHaveProperty("top_p");
    expect(body).not.toHaveProperty("top_k");
    expect(String(body.system)).toContain("레이저 토닝");
    expect(String(body.system)).toContain("です・ます");
    expect(options?.timeout).toBe(config.interp.timeoutMs);
    expect(options?.maxRetries).toBe(0);
  });

  it("거절(refusal)은 실패다", async () => {
    const { client } = fakeClient(msg("", "refusal"));
    const t = createClaudeTranslator({ client });
    await expect(t.translateUtterance({ text: "a", from: "ko", to: "ja" })).rejects.toBeInstanceOf(TranslationError);
  });

  it("빈 응답은 실패다", async () => {
    const { client } = fakeClient(msg("   "));
    const t = createClaudeTranslator({ client });
    await expect(t.translateUtterance({ text: "a", from: "ko", to: "ja" })).rejects.toBeInstanceOf(TranslationError);
  });

  it("SDK 오류는 실패로 전달된다", async () => {
    const { client } = fakeClient(new Error("network"));
    const t = createClaudeTranslator({ client });
    await expect(t.translateUtterance({ text: "a", from: "ko", to: "ja" })).rejects.toThrow();
  });
});

describe("Claude 번역기 — 소견", () => {
  it("구조화 출력 {notesJa}를 문자열로 돌려준다", async () => {
    const { client, calls } = fakeClient(msg(JSON.stringify({ notesJa: "シミの治療をおすすめします。" })));
    const t = createClaudeTranslator({ client });
    await expect(t.translateOpinion("기미 치료를 권합니다.")).resolves.toBe("シミの治療をおすすめします。");
    const { body, options } = calls[0];
    expect(body.model).toBe(config.opinion.model);
    expect(body).not.toHaveProperty("temperature");
    const oc = body.output_config as { effort: string; format: { type: string; schema: Record<string, unknown> } };
    expect(oc.effort).toBe(config.opinion.effort);
    expect(oc.format.type).toBe("json_schema");
    expect(oc.format.schema).toMatchObject({ required: ["notesJa"], additionalProperties: false });
    expect(options?.timeout).toBe(config.opinion.timeoutMs);
  });

  it("거절은 실패다", async () => {
    const { client } = fakeClient(msg("", "refusal"));
    await expect(createClaudeTranslator({ client }).translateOpinion("x")).rejects.toMatchObject({ kind: "refusal" });
  });

  it.each([["not json"], [JSON.stringify({ other: 1 })], [JSON.stringify({ notesJa: 3 })], [JSON.stringify({ notesJa: "  " })]])(
    "형식 오류는 실패다 (%s)",
    async (text) => {
      const { client } = fakeClient(msg(text));
      await expect(createClaudeTranslator({ client }).translateOpinion("x")).rejects.toMatchObject({ kind: "format" });
    },
  );

  it("max_tokens로 잘린 응답은 실패다", async () => {
    const { client } = fakeClient(msg('{"notesJa":"途中', "max_tokens"));
    await expect(createClaudeTranslator({ client }).translateOpinion("x")).rejects.toBeInstanceOf(TranslationError);
  });
});
