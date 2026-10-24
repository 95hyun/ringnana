import type { Translator, UtteranceInput } from "./types";

// 테스트용 가짜 번역기 (네트워크 없음). 함수가 throw 하거나 끝나지 않는 Promise를 돌려주면 실패·시간 초과를 흉내 낸다.
export function createFakeTranslator(
  impl: {
    utterance?: (input: UtteranceInput) => string | Promise<string>;
    opinion?: (notesKo: string) => string | Promise<string>;
  } = {},
): Translator {
  return {
    translateUtterance: async (input) => (impl.utterance ? impl.utterance(input) : `[${input.to}] ${input.text}`),
    translateOpinion: async (notesKo) => (impl.opinion ? impl.opinion(notesKo) : `[ja] ${notesKo}`),
  };
}
