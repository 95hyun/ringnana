"use server";

import { refresh } from "next/cache";
import type { H4Dict } from "@/app/[lang]/(patient)/quote/_components/i18n";
import { DEMO_CLINIC_ID } from "@/lib/demo";
import { supabaseServer } from "@/lib/supabase/server";

// Server Action은 경로 언어를 모른다 → 오류는 사전 키로 돌려준다
export type ReviewResult = { ok: true } | { ok: false; error: keyof H4Dict["clinic"]["errors"] };

export async function reviewCheckin(followupId: string, doctorNote: string): Promise<ReviewResult> {
  const note = doctorNote.trim().slice(0, 2000);
  if (!note) return { ok: false, error: "noteRequired" };

  const db = supabaseServer();
  const { data: f } = await db
    .from("followups")
    .select("id, status, bookings!inner(clinic_id)")
    .eq("id", followupId)
    .maybeSingle();
  if (!f || f.bookings.clinic_id !== DEMO_CLINIC_ID) return { ok: false, error: "notFound" };
  if (f.status === "pending") return { ok: false, error: "notSubmitted" };

  // alert는 환자 자가 보고 기록이라 그대로 둔다
  const { error } = await db.from("followups").update({ status: "reviewed", doctor_note: note }).eq("id", followupId);
  if (error) return { ok: false, error: "saveFailed" };

  refresh();
  return { ok: true };
}
