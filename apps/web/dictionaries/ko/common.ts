import type jp from "../jp/common";

const common = {
  brand: "Ringnana",
  patientTagline: "한국 피부과 비대면 진료",
  clinicConsole: "의원 콘솔",
  nav: {
    queue: "진료 큐",
    aftercare: "사후관리",
  },
  actions: {
    next: "다음",
    back: "뒤로",
    submit: "제출",
    save: "저장",
    cancel: "취소",
  },
  states: {
    loading: "불러오는 중…",
    error: "오류가 발생했습니다. 다시 시도해 주세요.",
  },
} satisfies typeof jp;

export default common;
