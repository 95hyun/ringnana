import type { Role, UiLang } from "@/lib/contracts";
import { messagesFor } from "@/messages";
import type { Messages } from "@/messages/types";
import type { interp } from "@/messages/ja/interp";

export type InterpText = Messages<typeof interp>;

// 의사 화면은 한국어 고정 (spec §4.2, §6.4)
const doctorText: InterpText = {
  interpToggle: "통역",
  voiceToggle: "음성",
  listening: "듣는 중…",
  translating: "번역 중…",
  unsupported: "이 브라우저는 통역을 지원하지 않습니다 (Chrome 사용)",
  aiBadge: "AI 번역",
  translateFailed: "번역하지 못했습니다",
  selfLabel: "내 발화",
};

export const interpText = (role: Role, uiLang: UiLang): InterpText =>
  role === "doctor" ? doctorText : messagesFor(uiLang).interp;
