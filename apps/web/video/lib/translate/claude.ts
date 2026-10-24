import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { config } from "@/video/lib/config";
import { interpSystemPrompt, opinionSystemPrompt } from "./prompts";
import { TranslationError, type Translator, type UtteranceInput } from "./types";

/** 테스트에서 SDK 클라이언트를 바꿔 끼우기 위한 최소 모양 */
export type MessagesClient = { messages: Pick<Anthropic["messages"], "create"> };

const INTERP_MAX_TOKENS = 1024;
const OPINION_MAX_TOKENS = 8000;

const OPINION_SCHEMA = {
  type: "object",
  properties: { notesJa: { type: "string" } },
  required: ["notesJa"],
  additionalProperties: false,
} as const;

type MessageLike = { content: Array<{ type: string; text?: string }>; stop_reason: string | null };

function textOf(message: MessageLike): string {
  if (message.stop_reason === "refusal") throw new TranslationError("refusal", "모델이 번역을 거절했습니다");
  if (message.stop_reason === "max_tokens") throw new TranslationError("truncated", "응답이 길이 제한으로 잘렸습니다");
  return message.content
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("")
    .trim();
}

export function createClaudeTranslator(opts: { client?: MessagesClient; apiKey?: string } = {}): Translator {
  let client = opts.client;
  const getClient = (): MessagesClient => {
    if (!client) {
      const apiKey = opts.apiKey ?? process.env.ANTHROPIC_API_KEY;
      if (!apiKey) throw new TranslationError("config", "ANTHROPIC_API_KEY 가 설정되지 않았습니다");
      client = new Anthropic({ apiKey });
    }
    return client;
  };

  return {
    async translateUtterance({ text, from, to }: UtteranceInput) {
      const message = await getClient().messages.create(
        {
          model: config.interp.model,
          max_tokens: INTERP_MAX_TOKENS,
          system: interpSystemPrompt(from, to),
          messages: [{ role: "user", content: text }],
        },
        // 3초 안에 못 받으면 원문으로 넘어가야 하므로 재시도하지 않는다
        { timeout: config.interp.timeoutMs, maxRetries: 0 },
      );
      const out = textOf(message as MessageLike);
      if (!out) throw new TranslationError("format", "빈 번역 응답");
      return out;
    },

    async translateOpinion(notesKo: string) {
      const message = await getClient().messages.create(
        {
          model: config.opinion.model,
          max_tokens: OPINION_MAX_TOKENS,
          system: opinionSystemPrompt(),
          messages: [{ role: "user", content: notesKo }],
          output_config: {
            effort: config.opinion.effort,
            format: { type: "json_schema", schema: OPINION_SCHEMA },
          },
        },
        { timeout: config.opinion.timeoutMs, maxRetries: 0 },
      );
      const raw = textOf(message as MessageLike);
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw);
      } catch (cause) {
        throw new TranslationError("format", "구조화 출력이 JSON이 아닙니다", { cause });
      }
      const notesJa = (parsed as { notesJa?: unknown } | null)?.notesJa;
      if (typeof notesJa !== "string" || !notesJa.trim()) {
        throw new TranslationError("format", "구조화 출력에 notesJa 문자열이 없습니다");
      }
      return notesJa.trim();
    },
  };
}
