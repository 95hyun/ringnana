import type jp from "../jp/legal";

const legal = {
  draftNotice: "※ 해커톤용 초안입니다. 사업자 정보·번호는 모두 가상입니다.",
  footer: {
    operator: "운영: 주식회사 링나나(가상)",
    registration: "외국인환자 유치업자 등록번호: 제0000-000호(가)",
    partner: "제휴 의료기관: 링나나 피부과의원(가상·서울)",
    contact: "문의",
    contactEmail: "support@ringnana.example",
    terms: "이용약관",
    privacy: "개인정보처리방침",
    tokushoho: "특정상거래법 표기(일본)",
  },
  terms: {
    title: "이용약관",
    sections: [
      { heading: "제1조 (서비스)", body: "본 서비스는 한국 제휴 의료기관 의사의 비대면 진료, 확정 견적 제시, 시술 예약, 귀국 후 관리를 중개합니다. 진단·시술 판단은 의사가 합니다." },
      { heading: "제2조 (회원가입)", body: "회원가입에는 본 약관, 민감정보 수집, 국외 이전(한국) 동의가 필요합니다." },
      { heading: "제3조 (요금)", body: "시술 요금은 의사가 확정한 원화 금액입니다. 엔화 표기는 참고값이며 환율에 따라 달라집니다." },
      { heading: "제4조 (면책)", body: "비대면 진료는 대면 진료를 완전히 대신하지 않습니다. 내원 시 의사가 시술 가능 여부를 최종 판단합니다." },
    ],
  },
  privacy: {
    title: "개인정보처리방침",
    sections: [
      { heading: "1. 수집 항목", body: "이름, 출생 연도, 연락처, 문진 내용(건강정보), 얼굴 사진. 건강정보·얼굴 사진은 민감정보로 취급합니다." },
      { heading: "2. 이용 목적", body: "의사의 진료·견적·시술·귀국 후 관리에만 이용합니다." },
      { heading: "3. 국외 이전", body: "제휴 의료기관(대한민국)에 제공합니다. 대한민국 개인정보 보호법(PIPA)을 따릅니다." },
      { heading: "4. 보관과 삭제", body: "정보는 암호화된 저장소에 보관하며, 요청 시 삭제합니다." },
      { heading: "5. 문의", body: "support@ringnana.example (가상)" },
    ],
  },
  tokushoho: {
    title: "특정상거래법 표기(일본)",
    rows: [
      { label: "사업자", value: "주식회사 링나나(가상)" },
      { label: "소재지", value: "도쿄도 지요다구 가상정 1-2-3(가)" },
      { label: "연락처", value: "support@ringnana.example" },
      { label: "판매 가격", value: "각 시술의 확정 견적에 표시(원화)" },
      { label: "결제 방법·시기", value: "내원 시 제휴 의료기관에서 결제" },
      { label: "취소", value: "예약일 전날까지 무료(가)" },
    ],
  },
} satisfies typeof jp;

export default legal;
