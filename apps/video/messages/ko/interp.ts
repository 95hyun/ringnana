import type { Messages } from "../types";
import type { interp as ja } from "../ja/interp";

// 환자 화면 문구 (한국어판) — ja와 같은 키
export const interp: Messages<typeof ja> = {
  interpToggle: "통역",
  voiceToggle: "음성",
  listening: "듣는 중…",
  translating: "번역 중…",
  unsupported: "이 브라우저는 통역을 지원하지 않습니다 (Chrome을 사용해 주세요)",
  aiBadge: "AI 번역",
  translateFailed: "번역하지 못했습니다",
  selfLabel: "내 발화",
};
