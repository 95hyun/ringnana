// 시장(국가) 설정 — 언어와 분리한다 (docs/ux-review.md A1). 서버·클라이언트 공용, 부수효과 없음.
// 경로 값(jp/ko)은 "보는 언어"일 뿐이다. /ko로 봐도 대상 시장은 그대로 일본이다.
// 시장은 배포 단위로 고른다(ACTIVE_MARKET). 시장 추가 = MARKETS에 한 줄 + 사전 common.countries에 국가명.

export type CountryCode = "JP" | "KR";

export type Market = {
  country: CountryCode; // 환자 거주국
  currency: "JPY"; // 환자에게 크게 보여 줄 통화 (판단 기준)
  timeZone: string; // 환자 현지 시간대
  defaultLang: "jp";
  // 결제 통화(KRW) → 표시 통화 참고 환율. 해커톤: 환율 API 없이 고정값 1곳
  krwRate: number;
  rateDate: string; // YYYY-MM-DD, 화면에 "기준일"로 표기
};

export const MARKETS = {
  JP: { country: "JP", currency: "JPY", timeZone: "Asia/Tokyo", defaultLang: "jp", krwRate: 0.11, rateDate: "2026-10-24" },
} as const satisfies Record<string, Market>;

export const ACTIVE_MARKET: Market = MARKETS.JP;

// 의원(서비스 제공지) 쪽 고정값 — 확정가·진료 시각의 기준
export const CLINIC_COUNTRY: CountryCode = "KR";
export const CLINIC_CURRENCY = "KRW";
export const CLINIC_TIME_ZONE = "Asia/Seoul";

export function getMarket(): Market {
  return ACTIVE_MARKET;
}

// KRW 확정가 → 시장 통화 참고 금액. 엔화는 100엔 단위 반올림
export function krwToMarket(krw: number, market: Market = ACTIVE_MARKET): number {
  const v = krw * market.krwRate;
  return market.currency === "JPY" ? Math.round(v / 100) * 100 : Math.round(v);
}
