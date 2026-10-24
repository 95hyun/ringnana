import "server-only";
import { supabaseServer } from "@/lib/supabase/server";

// 예약 요약(의사·의원·시각) 조회 — 문진·신청 완료·내 예약 화면 공용
const SELECT =
  "id, status, doctor_id, slot_id, scheduled_at, created_at, requested_at, decline_reason, intake_id, intakes(flags), doctors(name, name_ja, clinics(name, name_ja, address, address_ja, station, station_ja))";

export type Booking = NonNullable<Awaited<ReturnType<typeof loadBooking>>>;

// 본인 진료만 — 남의 id면 null
export async function loadBooking(id: string, patientId: string) {
  const { data, error } = await supabaseServer().from("consultations").select(SELECT).eq("id", id).eq("patient_id", patientId).maybeSingle();
  if (error) console.error("booking load failed", error);
  return data;
}

export async function listBookings(patientId: string) {
  const { data, error } = await supabaseServer()
    .from("consultations")
    .select(SELECT)
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });
  if (error) console.error("booking list failed", error);
  return data ?? [];
}

// 기존 /intake·/photos 리다이렉트용 — 최신 draft 진료
export async function latestDraftId(patientId: string): Promise<string | null> {
  const { data } = await supabaseServer()
    .from("consultations")
    .select("id")
    .eq("patient_id", patientId)
    .eq("status", "draft")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data?.id ?? null;
}

// 입장 버튼: in_call은 즉시, scheduled는 상담 10분 전부터 (spec 결정)
export const JOIN_LEAD_MS = 10 * 60 * 1000;
export function canJoin(b: { status: string; scheduled_at: string | null }, now: number): boolean {
  if (b.status === "in_call") return true;
  if (b.status !== "scheduled" || !b.scheduled_at) return false;
  return now >= new Date(b.scheduled_at).getTime() - JOIN_LEAD_MS;
}

// 서버 렌더 시각 — 컴포넌트 본문에서 Date.now()를 직접 부르지 않게(react-hooks/purity). 동적 렌더(cookies 이후)에서만 쓴다
export function requestTime(): number {
  return Date.now();
}
