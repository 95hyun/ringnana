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
  roles: {
    patient: "환자",
    doctor: "의사",
  },
  switchView: {
    toClinic: "의원 화면으로",
    toPatient: "환자 화면으로",
  },
  disclaimer: "비대면 진료는 내원 전 사전 상담입니다. 시술의 최종 판단은 내원 시 의사가 합니다.",
  sampleImage: "샘플 이미지",
  aiLabel: "AI 이미지",
  doctorConfirmed: "의사 확정",
  loadingCaption: "보통 30초 정도 걸립니다.",
  steps: {
    intake: "문진",
    photos: "사진",
    consult: "진료",
    quote: "견적",
    aftercare: "사후관리",
  },
  flowSteps: {
    intake: "문진",
    review: "의사 검토",
    note: "소견·견적",
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
    botox_eye: "보톡스(눈가 주름)",
  },
  states: {
    loading: "불러오는 중…",
    error: "오류가 발생했습니다. 다시 시도해 주세요.",
  },
} satisfies typeof jp;

export default common;
