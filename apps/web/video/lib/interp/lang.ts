import { bcp47Of, speechLangOf, type Role, type SpeechLang } from "@/video/lib/contracts";

// 통역 언어는 역할로 고정 (spec §4.2) — 화면 언어와 무관
export function translatePairOf(role: Role): { from: SpeechLang; to: SpeechLang } {
  const from = speechLangOf(role);
  return { from, to: from === "ko" ? "ja" : "ko" };
}

// 듣는 쪽은 자기 언어로 읽는다 (환자 ja-JP, 의사 ko-KR)
export const voiceLangOf = (role: Role) => bcp47Of(speechLangOf(role));
