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
  steps: {
    intake: "문진",
    photos: "사진",
    consult: "진료",
    quote: "견적",
    aftercare: "사후관리",
  },
  stepLabel: "단계",
  langSwitcher: "언어 전환",
  countries: {
    JP: "일본",
    KR: "한국",
  },
  timeZones: {
    "Asia/Tokyo": "일본 시간",
    "Asia/Seoul": "한국 시간",
  },
  money: {
    approx: "약 {amount}",
    rateNote: "{date} 기준 환율({rate}) · 결제는 원화 확정 금액입니다",
  },
  treatments: {
    pico_toning: "피코토닝",
    laser_toning: "레이저토닝",
    fraxel: "프락셀",
    rejuran: "리쥬란 힐러",
    aqua_peel: "아쿠아필",
    botox_jaw: "보톡스(사각턱)",
  },
  states: {
    loading: "불러오는 중…",
    error: "오류가 발생했습니다. 다시 시도해 주세요.",
  },
} satisfies typeof jp;

export default common;
