import type { SpeechLang } from "@/lib/contracts";

export type UtteranceInput = { text: string; from: SpeechLang; to: SpeechLang };

// 번역 호출부를 바꿔 끼울 수 있게 하는 경계. 실패(네트워크·시간 초과·거절·형식 오류)는 모두 throw 한다.
export interface Translator {
  /** 통역 한 문장 번역. 번역문만 돌려준다. */
  translateUtterance(input: UtteranceInput): Promise<string>;
  /** 한국어 의사 소견 → 일본어 환자용 문장. */
  translateOpinion(notesKo: string): Promise<string>;
}

export type TranslationErrorKind = "refusal" | "format" | "truncated" | "timeout" | "config";

export class TranslationError extends Error {
  readonly kind: TranslationErrorKind;
  constructor(kind: TranslationErrorKind, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "TranslationError";
    this.kind = kind;
  }
}
