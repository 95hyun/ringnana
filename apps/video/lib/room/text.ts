import type { Role, UiLang } from "@/lib/contracts";
import { messagesFor } from "@/messages";
import type { Messages } from "@/messages/types";
import type { common } from "@/messages/ja/common";
import type { call } from "@/messages/ja/call";

export type RoomText = Messages<typeof common & typeof call>;

// 의사 화면은 한국어 고정 (spec §4.2) — 환자 문구와 같은 키로 둔다
const doctorText: RoomText = {
  langJa: "日本語",
  langKo: "한국어",
  langToggleLabel: "표시 언어",
  invalidLink: "입장 주소가 올바르지 않습니다. 의원 콘솔에서 다시 입장해 주세요.",
  checking: "진료를 확인하고 있습니다…",
  notFound: "진료를 찾을 수 없습니다",
  superseded: "다른 창에서 입장했습니다",
  retry: "다시 시도",
  preparingDevice: "카메라와 마이크를 준비하고 있습니다…",
  deviceDenied: "카메라·마이크 권한이 필요합니다. 주소창의 카메라 아이콘에서 허용해 주세요",
  deviceNotFound: "카메라를 찾을 수 없습니다",
  deviceInUse: "다른 프로그램에서 카메라를 사용 중입니다. 종료 후 다시 시도해 주세요",
  peerWaiting: "환자 대기 중",
  peerConnected: "환자 연결됨",
  micOff: "마이크 끄기",
  micOn: "마이크 켜기",
  micMutedBadge: "마이크 꺼짐",
  enableSound: "소리 켜기",
  endCall: "통화 종료",
  ending: "통화를 종료하고 있습니다…",
  callEnded: "통화가 종료되었습니다",
  remoteLabel: "환자",
  selfLabel: "나",
};

export function roomText(role: Role, uiLang: UiLang): RoomText {
  if (role === "doctor") return doctorText;
  const m = messagesFor(uiLang);
  return { ...m.common, ...m.call };
}
