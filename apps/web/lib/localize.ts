// DB 데이터 현지화 (docs/ux-review.md A2·A6). 화면은 name/name_ja를 직접 고르지 말고 여기를 거친다.
import type { Dict } from "@/dictionaries/jp";
import type { Lang } from "@/lib/i18n";

// DB 다국어 컬럼 규칙: 기본 컬럼(name) = 한국어, `${field}_ja` = 일본어. 언어를 늘리면 여기에 접미사 한 줄
const COLUMN_SUFFIX: Record<Lang, string> = { jp: "_ja", ko: "" };

type Row = Record<string, unknown> | null | undefined;

function pick(row: Row, key: string): string | undefined {
  const v = row?.[key];
  return typeof v === "string" && v.trim() !== "" ? v : undefined;
}

// localized(clinic, "jp") → clinic.name_ja ?? clinic.name. 없으면 다른 언어 컬럼으로 폴백
export function localized(row: Row, lang: Lang, field = "name"): string | undefined {
  const own = pick(row, `${field}${COLUMN_SUFFIX[lang]}`);
  if (own) return own;
  for (const suffix of Object.values(COLUMN_SUFFIX)) {
    const v = pick(row, `${field}${suffix}`);
    if (v) return v;
  }
  return undefined;
}

// 시술 코드 — DB(quotes.items[].code)에는 코드, 화면 이름은 dictionaries/*/common.ts treatments
export const TREATMENT_CODES = [
  "pico_toning",
  "laser_toning",
  "fraxel",
  "rejuran",
  "aqua_peel",
  "botox_jaw",
  "botox_eye",
] as const;
export type TreatmentCode = (typeof TREATMENT_CODES)[number];

export function isTreatmentCode(v: unknown): v is TreatmentCode {
  return typeof v === "string" && (TREATMENT_CODES as readonly string[]).includes(v);
}

// 코드가 있으면 사전 이름, 없으면(자유 입력 항목) name/name_ja를 localized로
export function treatmentName(
  item: { code?: string | null; name?: string | null; name_ja?: string | null },
  lang: Lang,
  dict: Pick<Dict, "common">,
): string | undefined {
  if (isTreatmentCode(item.code)) return dict.common.treatments[item.code];
  return localized(item, lang);
}

// 의원 콘솔용 환자 표기: "Takahashi Emi (高橋 恵美)". 로마자가 없으면 원래 이름
export function patientName(p: { name?: string | null; name_latin?: string | null } | null | undefined): string {
  const name = p?.name?.trim() || "—";
  const latin = p?.name_latin?.trim();
  return latin ? `${latin} (${name})` : name;
}
