import type { Messages } from "../types";
import type { check as ja } from "../ja/check";

// 환자 화면 문구 (한국어판) — ja와 같은 키
export const check: Messages<typeof ja> = {
  title: "카메라·마이크 점검",
  preparing: "카메라와 마이크를 준비하고 있습니다…",
  cameraHeading: "카메라",
  cameraHint: "얼굴이 잘 보이는지 확인해 주세요",
  micHeading: "마이크",
  micHint: "말을 하면 막대가 움직입니다",
  micLevelLabel: "마이크 입력 레벨",
  speakerHeading: "스피커",
  speakerHint: "버튼을 누르면 테스트음이 납니다",
  playTone: "테스트음 재생",
  deviceDenied: "카메라·마이크 권한이 필요합니다. 주소창의 카메라 아이콘에서 허용해 주세요",
  deviceNotFound: "카메라를 찾을 수 없습니다",
  deviceInUse: "다른 프로그램에서 카메라를 사용 중입니다. 종료 후 다시 시도해 주세요",
  retry: "다시 시도",
  privacyNote: "점검 결과는 어디에도 보내지 않습니다",
  back: "돌아가기",
};
