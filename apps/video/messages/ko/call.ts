import type { Messages } from "../types";
import type { call as ja } from "../ja/call";

// 환자 화면 문구 (한국어판) — ja와 같은 키
export const call: Messages<typeof ja> = {
  preparingDevice: "카메라와 마이크를 준비하고 있습니다…",
  deviceDenied: "카메라·마이크 권한이 필요합니다. 주소창의 카메라 아이콘에서 허용해 주세요",
  deviceNotFound: "카메라를 찾을 수 없습니다",
  deviceInUse: "다른 프로그램에서 카메라를 사용 중입니다. 종료 후 다시 시도해 주세요",
  peerWaiting: "의사를 기다려 주세요",
  peerConnected: "의사와 연결되었습니다",
  micOff: "마이크 끄기",
  micOn: "마이크 켜기",
  micMutedBadge: "마이크 꺼짐",
  enableSound: "소리 켜기",
  endCall: "통화 종료",
  ending: "통화를 종료하고 있습니다…",
  callEnded: "통화가 종료되었습니다",
  remoteLabel: "의사",
  selfLabel: "나",
};
