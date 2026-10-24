// flow-v2 작업 2(의사 탐색·프로필·시간 선택) 소유
import type jp from "../jp/doctors";

const doctors = {
  list: {
    eyebrow: "의사 찾기",
    title: "고민에 맞는 의사 고르기",
    lead: "고민·상담 가능 날짜·언어·지역으로 좁힐 수 있습니다. 정렬은 \"가장 빠른 상담 가능 시간\" 순입니다.",
    filterConcern: "고민",
    filterDate: "상담 가능 날짜",
    dateFrom: "시작일",
    dateTo: "종료일",
    filterLang: "진료 언어",
    filterArea: "지역",
    any: "선택 안 함",
    apply: "이 조건으로 찾기",
    reset: "조건 초기화",
    count: "의사 {n}명을 찾았습니다",
    empty: "조건에 맞는 의사가 없습니다.",
    emptyHint: "조건을 줄여서 다시 시도해 주세요.",
    earliest: "가장 빠른 상담 시간",
    noSlot: "현재 빈 시간이 없습니다",
    viewProfile: "프로필 보기",
    loading: "불러오는 중…",
  },
  areas: {
    gangnam: "강남",
    myeongdong: "명동",
    apgujeong: "압구정",
  },
  languages: {
    ja: "일본어",
    ko: "한국어",
    en: "영어",
  },
  profile: {
    back: "의사 목록으로",
    about: "소개",
    specialties: "주요 분야",
    languages: "진료 언어",
    clinic: "의원",
    address: "주소",
    station: "가까운 역",
    map: "Map",
    slotsTitle: "상담 가능 시간",
    slotsLead: "원하는 시간을 선택하세요(일본 시간·한국 시간).",
    slotsEmpty: "앞으로 14일간 빈 시간이 없습니다.",
    book: "이 시간으로 예약하기",
    pickSlot: "시간을 선택하면 예약으로 진행됩니다",
    noBio: "소개문을 준비 중입니다.",
  },
  errors: {
    slotUnavailable: "이 시간은 더 이상 예약할 수 없습니다. 다른 시간을 선택해 주세요.",
    failed: "예약 준비에 실패했습니다. 다시 시도해 주세요.",
  },
} satisfies typeof jp;

export default doctors;
