// 날짜·시각·통화 표시를 한 곳에서 (docs/ux-review.md A4). Intl 기반, 서버·클라이언트 공용.
import type { Dict } from "@/dictionaries/jp";
import { htmlLang, type Lang } from "@/lib/i18n";
import { ACTIVE_MARKET, CLINIC_CURRENCY, CLINIC_TIME_ZONE, krwToMarket, type Market } from "@/lib/market";

export function localeOf(lang: Lang): string {
  return htmlLang(lang) === "ja" ? "ja-JP" : "ko-KR";
}

// "2026-11-23" 같은 날짜 전용 값은 시간대 이동 없이 그 날짜로 읽는다
function toDate(value: string | Date): { date: Date; dateOnly: boolean } {
  if (value instanceof Date) return { date: value, dateOnly: false };
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return { date: new Date(`${value}T00:00:00Z`), dateOnly: true };
  return { date: new Date(value), dateOnly: false };
}

// 2026年11月23日(月) / 2026년 11월 23일 (월)
export function formatDate(value: string | Date, lang: Lang, timeZone: string = ACTIVE_MARKET.timeZone): string {
  const { date, dateOnly } = toDate(value);
  return new Intl.DateTimeFormat(localeOf(lang), {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "short",
    timeZone: dateOnly ? "UTC" : timeZone,
  }).format(date);
}

// 11/23(月) / 11. 23. (월) — 목록·칩용
export function formatDateShort(value: string | Date, lang: Lang, timeZone: string = ACTIVE_MARKET.timeZone): string {
  const { date, dateOnly } = toDate(value);
  return new Intl.DateTimeFormat(localeOf(lang), {
    month: "numeric",
    day: "numeric",
    weekday: "short",
    timeZone: dateOnly ? "UTC" : timeZone,
  }).format(date);
}

export function formatTime(value: string | Date, lang: Lang, timeZone: string = ACTIVE_MARKET.timeZone): string {
  return new Intl.DateTimeFormat(localeOf(lang), { hour: "2-digit", minute: "2-digit", hour12: false, timeZone }).format(
    toDate(value).date,
  );
}

export function formatDateTime(value: string | Date, lang: Lang, timeZone: string = ACTIVE_MARKET.timeZone): string {
  return `${formatDate(value, lang, timeZone)} ${formatTime(value, lang, timeZone)}`;
}

function offsetMinutes(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset" }).formatToParts(date);
  const m = parts.find((p) => p.type === "timeZoneName")?.value.match(/GMT([+-])(\d{2}):?(\d{2})?/);
  return m ? (m[1] === "-" ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] ?? 0)) : 0;
}

// 진료 시각: 환자 현지 + KST 병기. 시차가 없으면(일본·한국) 한 번만 쓰고 두 시간대 이름을 함께 붙인다
// 예) 2026年11月23日(月) 14:30（日本時間・韓国時間）/ 다른 시차면 "... 14:30（現地）/ 15:30（韓国時間）"
export function formatAppointment(
  value: string | Date,
  lang: Lang,
  dict: Pick<Dict, "common">,
  market: Market = ACTIVE_MARKET,
): string {
  const { date } = toDate(value);
  const tz = dict.common.timeZones;
  const localLabel = tz[market.timeZone as keyof typeof tz] ?? market.timeZone;
  const local = formatDateTime(date, lang, market.timeZone);
  if (offsetMinutes(date, market.timeZone) === offsetMinutes(date, CLINIC_TIME_ZONE)) {
    return `${local} (${localLabel}・${tz[CLINIC_TIME_ZONE]})`;
  }
  return `${local} (${localLabel}) / ${formatTime(date, lang, CLINIC_TIME_ZONE)} (${tz[CLINIC_TIME_ZONE]})`;
}

export function formatMoney(amount: number, currency: string, lang: Lang): string {
  return new Intl.NumberFormat(localeOf(lang), { style: "currency", currency, currencyDisplay: "narrowSymbol", maximumFractionDigits: 0 }).format(amount);
}

// 견적 금액 (docs/ux-review.md A3): 시장 통화 참고가를 크게, 결제 통화(KRW) 확정가를 병기, 환율 기준일
export function formatQuotePrice(
  krw: number,
  lang: Lang,
  dict: Pick<Dict, "common">,
  market: Market = ACTIVE_MARKET,
): { primary: string; settlement: string; rateNote: string } {
  return {
    primary: fill(dict.common.money.approx, { amount: formatMoney(krwToMarket(krw, market), market.currency, lang) }),
    settlement: formatMoney(krw, CLINIC_CURRENCY, lang),
    rateNote: fill(dict.common.money.rateNote, {
      date: formatDate(market.rateDate, lang),
      rate: `${formatMoney(1, CLINIC_CURRENCY, lang)} = ${new Intl.NumberFormat(localeOf(lang), {
        style: "currency",
        currency: market.currency,
        currencyDisplay: "narrowSymbol",
        maximumFractionDigits: 2,
      }).format(market.krwRate)}`,
    }),
  };
}

// 사전 문구의 {key} 자리표시자를 채운다
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? ""));
}
