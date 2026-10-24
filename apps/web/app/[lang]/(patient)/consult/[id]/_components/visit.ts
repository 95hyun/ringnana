import "server-only";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
// 본인 확인은 견적 화면과 같은 규칙(로그인 환자, 없으면 데모 페르소나) — H4 소유 파일을 읽기만 한다
import { viewerPatientId } from "@/app/[lang]/(patient)/quote/_components/viewer";

// 대기실·진료 완료 공용 — 본인 진료가 아니면 404
export async function loadVisit(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { data: c } = await supabaseServer()
    .from("consultations")
    .select(
      "id, status, patient_id, scheduled_at, decline_reason, video_session_id, patients(name), doctors(name, name_ja, title, title_ja, clinics(name, name_ja))",
    )
    .eq("id", id)
    .maybeSingle();
  if (!c || c.patient_id !== (await viewerPatientId())) notFound();
  return c;
}

// 입장 가능 = 의사가 진료 시작(in_call), 또는 확정(scheduled) 후 예약 10분 전부터 (flow-v2 결정)
export const JOIN_LEAD_MS = 10 * 60 * 1000;
// 서버 컴포넌트 렌더 중 Date.now() 직접 호출은 react-hooks/purity가 막아 여기서 읽는다(요청마다 렌더되는 동적 경로)
export function canJoin(status: string, scheduledAt: string | null, now: number = Date.now()): boolean {
  if (status === "in_call") return true;
  return status === "scheduled" && !!scheduledAt && now >= Date.parse(scheduledAt) - JOIN_LEAD_MS;
}
