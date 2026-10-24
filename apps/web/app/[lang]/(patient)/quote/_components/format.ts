// 견적·예약·사후관리 화면 공용 포맷터 (서버·클라이언트 공용, 부수효과 없음)

// 참고 환율 고정값 — 확정가는 KRW, 엔화는 참고 표기만 (해커톤: 환율 API 없음)
export const KRW_TO_JPY = 0.11;

// visit_days = 의사가 제안한 체류 N일차(1부터) — H3가 쓴다 (docs/requests.md)
export type QuoteItem = { name?: string; name_ja?: string; sessions?: number; price_krw?: number; visit_days?: number[] };

// quotes.items(jsonb)는 H3가 쓴다 — 필드가 빠져도 화면이 깨지지 않게 관대하게 읽는다
export function parseItems(items: unknown): QuoteItem[] {
  if (!Array.isArray(items)) return [];
  return items.filter((i): i is QuoteItem => typeof i === "object" && i !== null);
}

export function totalSessions(items: QuoteItem[]): number {
  return items.reduce((sum, i) => sum + (Number.isInteger(i.sessions) && i.sessions! > 0 ? i.sessions! : 0), 0);
}

// 의사 제안일을 날짜로 바꾼다 — 체류 기간 밖·중복은 버리고 회차 수까지만
export function suggestedDates(items: QuoteItem[], tripStart: string, tripEnd: string, sessions: number): string[] {
  const visible = daysBetween(tripStart, tripEnd);
  const days = items.flatMap((i) => (Array.isArray(i.visit_days) ? i.visit_days : []));
  const dates = days
    .filter((n) => Number.isInteger(n) && n >= 1)
    .map((n) => addDays(tripStart, n - 1))
    .filter((d) => d <= tripEnd && visible.includes(d));
  return [...new Set(dates)].sort().slice(0, sessions);
}

// 사전 문구의 {key} 자리표시자를 채운다
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));
}

export function formatKrw(krw: number): string {
  return `₩${krw.toLocaleString("en-US")}`;
}

// 100엔 단위 반올림한 참고 금액 (문구는 사전 quote.approxJpy)
export function approxJpy(krw: number): string {
  return (Math.round((krw * KRW_TO_JPY) / 100) * 100).toLocaleString("en-US");
}

// 날짜는 YYYY-MM-DD 문자열로만 다룬다 — 계산은 UTC 고정이라 타임존으로 하루 밀리지 않는다
export function addDays(ymd: string, n: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export function daysBetween(start: string, end: string): string[] {
  const days: string[] = [];
  for (let d = start; d <= end && days.length < 60; d = addDays(d, 1)) days.push(d);
  return days;
}

// locale = htmlLang(lang) — ja: "11月3日(火)", ko: "11월 3일 (화)"
export function formatDate(locale: string, ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, { month: "long", day: "numeric", weekday: "short", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, d)),
  );
}

// 의원 표·요약용 짧은 표기 (언어 무관)
export function formatShortDate(ymd: string): string {
  const [, m, d] = ymd.split("-").map(Number);
  return `${m}/${d}`;
}

// 의원 소재지 기준 오늘 — 서버에서만 호출 (connection() 이후)
export function todaySeoul(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(new Date());
}

// 2026-02-30 같은 값은 왕복 변환에서 걸러진다
export function isYmd(s: unknown): s is string {
  return typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && addDays(s, 0) === s;
}
