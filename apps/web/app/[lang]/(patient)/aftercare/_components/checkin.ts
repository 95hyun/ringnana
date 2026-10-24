// 귀국 후 체크인 공용 정의 (환자 /aftercare + 의원 /clinic/aftercare)
import { addDays } from "../../quote/_components/format";

// 증상 자가 체크 키 — 진단이 아니라 환자 자가 보고. 하나라도 체크하면 alert=true. 문구는 사전 h4.symptoms·h4.clinic.symptoms
export const SYMPTOM_KEYS = ["redness", "itch", "pain", "darker", "blister", "swelling"] as const;

export type SymptomKey = (typeof SYMPTOM_KEYS)[number];

const KEY_SET = new Set<string>(SYMPTOM_KEYS);

// TODO(H1 요청): followups.symptoms 컬럼이 생기면 이 인코딩을 걷어낸다. 지금은 patient_note 첫 줄에 넣는다
const PREFIX = "[symptoms:";

export function encodeNote(symptoms: string[], memo: string): string | null {
  const keys = symptoms.filter((s) => KEY_SET.has(s));
  const body = memo.trim();
  // 메모가 우연히 접두어로 시작해도 증상으로 읽히지 않게 빈 목록을 명시한다
  if (keys.length === 0) return body.startsWith(PREFIX) ? `${PREFIX}]\n${body}` : body || null;
  return `${PREFIX}${keys.join(",")}]${body ? `\n${body}` : ""}`;
}

export function decodeNote(note: string | null): { symptoms: SymptomKey[]; memo: string } {
  if (!note) return { symptoms: [], memo: "" };
  if (!note.startsWith(PREFIX)) return { symptoms: [], memo: note };
  const end = note.indexOf("]");
  if (end < 0) return { symptoms: [], memo: note };
  const keys = note.slice(PREFIX.length, end).split(",").filter((s): s is SymptomKey => KEY_SET.has(s));
  return { symptoms: keys, memo: note.slice(end + 1).trim() };
}

// D+n 예정일 = 마지막 시술일 + n
export function dueDate(visitDates: string[], dueDay: number): string | null {
  const last = [...visitDates].sort().at(-1);
  return last ? addDays(last, dueDay) : null;
}

export const DUE_DAYS = [3, 14, 30] as const;
