// quotes.items jsonb 한 항목. price_krw = 1회 단가, visit_days = 체류 N일차(1부터) — H4 예약이 읽는다
// code = 프리셋 시술 코드(lib/localize TREATMENT_CODES, 화면 이름은 사전). 자유 입력은 code 없음 — name/name_ja는 폴백용으로 항상 저장
export type QuoteItem = {
  code?: string;
  name: string;
  name_ja: string;
  sessions: number;
  price_krw: number;
  visit_days: number[];
};

import { isTreatmentCode } from "@/lib/localize";

// 견적 프리셋 — 가상 메뉴·가격 (데모용, 의사가 폼에서 수정)
export const QUOTE_PRESETS: Omit<QuoteItem, "visit_days">[] = [
  { code: "pico_toning", name: "피코토닝", name_ja: "ピコトーニング", sessions: 2, price_krw: 150000 },
  { code: "laser_toning", name: "레이저토닝", name_ja: "レーザートーニング", sessions: 3, price_krw: 100000 },
  { code: "fraxel", name: "프락셀", name_ja: "フラクショナルレーザー", sessions: 1, price_krw: 250000 },
  { code: "rejuran", name: "리쥬란 힐러", name_ja: "リジュラン", sessions: 1, price_krw: 300000 },
  { code: "aqua_peel", name: "아쿠아필", name_ja: "アクアピール", sessions: 1, price_krw: 60000 },
  { code: "botox_jaw", name: "보톡스(사각턱)", name_ja: "ボトックス（エラ）", sessions: 1, price_krw: 120000 },
];

// jsonb → QuoteItem (seed의 visit_days 없는 항목도 받는다)
export function parseQuoteItems(raw: unknown): QuoteItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((r) => {
    if (!r || typeof r !== "object") return [];
    const o = r as Record<string, unknown>;
    return [
      {
        ...(isTreatmentCode(o.code) ? { code: o.code } : {}),
        name: String(o.name ?? ""),
        name_ja: String(o.name_ja ?? ""),
        sessions: Number(o.sessions ?? 1),
        price_krw: Number(o.price_krw ?? 0),
        visit_days: Array.isArray(o.visit_days) ? o.visit_days.map(Number) : [],
      },
    ];
  });
}
