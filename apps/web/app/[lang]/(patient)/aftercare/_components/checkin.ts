// 귀국 후 체크인 공용 정의 (환자 /aftercare + 의원 /clinic/aftercare)
import { addDays } from "../../quote/_components/format";

// 증상 자가 체크 키 — 진단이 아니라 환자 자가 보고. 하나라도 체크하면 alert=true. 문구는 사전 h4.symptoms·h4.clinic.symptoms
export const SYMPTOM_KEYS = ["redness", "itch", "pain", "darker", "blister", "swelling"] as const;

export type SymptomKey = (typeof SYMPTOM_KEYS)[number];

const KEY_SET = new Set<string>(SYMPTOM_KEYS);

// followups.symptoms(text[])에서 아는 키만 남긴다
export function parseSymptoms(values: string[] | null | undefined): SymptomKey[] {
  return (values ?? []).filter((s): s is SymptomKey => KEY_SET.has(s));
}

// D+n 예정일 = 마지막 시술일 + n
export function dueDate(visitDates: string[], dueDay: number): string | null {
  const last = [...visitDates].sort().at(-1);
  return last ? addDays(last, dueDay) : null;
}

export const DUE_DAYS = [3, 14, 30] as const;
