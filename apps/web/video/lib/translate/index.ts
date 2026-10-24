import "server-only";
import { createClaudeTranslator } from "./claude";
import type { Translator } from "./types";

export type { Translator, UtteranceInput, TranslationErrorKind } from "./types";
export { TranslationError } from "./types";
export { createClaudeTranslator } from "./claude";

let current: Translator | undefined;

/** 서버 경로가 쓰는 기본 번역기 (Claude). 키가 없으면 호출 시점에 실패해 failed 로 이어진다. */
export function getTranslator(): Translator {
  current ??= createClaudeTranslator();
  return current;
}
