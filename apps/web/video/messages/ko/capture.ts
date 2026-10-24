import type { Messages } from "../types";
import type { capture as ja } from "../ja/capture";

// 환자 화면 문구 (한국어판) — ja와 같은 키
export const capture: Messages<typeof ja> = {
  title: "얼굴 사진 촬영",
  consentLead: "의사가 얼굴 사진 촬영을 요청했습니다",
  consentText: "얼굴 사진을 진료 목적으로 수집·이용하는 것에 동의합니다. 사진은 담당 의사만 확인합니다.",
  start: "촬영 시작",
  testStart: "촬영 테스트",
  preparing: "준비 중…",
  steps: { front: "정면", left: "왼쪽", right: "오른쪽" },
  instruction: {
    front: "정면을 봐 주세요",
    left: "얼굴을 왼쪽으로 돌려 주세요",
    right: "얼굴을 오른쪽으로 돌려 주세요",
  },
  hint: {
    noFace: "얼굴을 테두리 안에 맞춰 주세요",
    multipleFaces: "한 분만 화면에 나오게 해 주세요",
    tooSmall: "조금 더 가까이 와 주세요",
    tooLarge: "조금 떨어져 주세요",
    offCenter: "얼굴을 가운데에 맞춰 주세요",
    angleOver: "조금만 되돌려 주세요",
    dark: "조금 더 밝은 곳으로 이동해 주세요",
  },
  manual: "수동 촬영",
  previewTitle: "찍은 사진을 확인해 주세요",
  retake: "다시 찍기",
  submit: "제출하기",
  submitting: "전송 중…",
  submitFailed: "전송에 실패했습니다. 인터넷 연결을 확인해 주세요",
  resubmit: "다시 제출",
  submitted: "의사가 사진을 확인하고 있습니다",
  close: "닫기",
  noCamera: "카메라 영상이 없습니다",
};
