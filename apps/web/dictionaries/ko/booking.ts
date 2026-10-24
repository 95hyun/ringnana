// flow-v2 작업 3(문진 이동·신청 완료·내 예약) 소유
import type jp from "../jp/booking";

const booking = {
  nav: {
    reservations: "예약",
  },
  summary: {
    title: "예약 내용",
    doctor: "{name} 의사",
    doctorFallback: "담당의",
    clinicFallback: "의원",
    time: "상담 일시",
    timePending: "일시 조정 중",
    station: "가까운 역 · {station}",
  },
  intake: {
    eyebrow: "예약 문진",
    goal: {
      title: "원하는 피부 이미지(AI)",
      optional: "선택",
      lead: "셀카를 1장 보내면 선택한 고민에 맞춘 목표 이미지를 만들 수 있습니다. 보내지 않아도 신청할 수 있습니다.",
      needConcern: "먼저 문진에서 고민을 선택하면 이미지를 만들 수 있습니다.",
      sent: "사진을 받았습니다. 신청과 함께 의사에게 공유됩니다.",
    },
    slotTaken: {
      title: "이 시간은 이미 마감되었습니다",
      body: "죄송합니다. 다른 분의 신청이 먼저 접수되었습니다. 의사 프로필에서 다른 시간을 선택해 주세요.",
      cta: "의사 프로필로",
    },
    errors: {
      notDraft: "이 예약은 이미 신청되었습니다",
      failed: "신청에 실패했습니다. 다시 시도해 주세요",
    },
  },
  requested: {
    eyebrow: "신청 완료",
    title: "예약을 신청했습니다",
    lead: "의사가 문진을 확인한 뒤 예약이 확정됩니다. 확정되면 예약 목록에 '예약 확정'으로 표시됩니다.",
    nextTitle: "앞으로의 진행",
    next: ["의사가 문진 내용을 확인합니다", "예약이 확정되면 예약 목록에 표시됩니다", "상담 10분 전부터 진료실에 들어갈 수 있습니다"],
    toReservations: "예약 목록으로",
  },
  reservations: {
    eyebrow: "예약 목록",
    title: "내 예약",
    lead: "신청한 상담의 진행 상황을 확인할 수 있습니다. 의사가 문진을 확인하면 예약이 확정됩니다.",
    listTitle: "상담 예약",
    empty: "아직 예약이 없습니다.",
    emptyHint: "고민에 맞는 의사를 찾아 상담 시간을 선택해 보세요.",
    findDoctor: "의사 찾기",
    status: {
      draft: "작성 중",
      requested: "의사 확인 중",
      scheduled: "예약 확정",
      in_call: "진료 중",
      done: "진료 완료",
      declined: "보류",
      cancelled: "취소",
    },
    continueIntake: "문진 이어서 작성",
    join: "진료실 입장",
    joinSoon: "상담 10분 전부터 입장할 수 있습니다",
    viewDone: "진료 요약 보기",
    declineReason: "사유: {reason}",
    declineNote: "이 시간은 예약되지 않았습니다. 다른 의사·시간을 선택해 주세요.",
  },
} satisfies typeof jp;

export default booking;
