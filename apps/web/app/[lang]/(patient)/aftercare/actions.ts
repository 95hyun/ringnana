"use server";

import { refresh } from "next/cache";
import type { H4Dict } from "../quote/_components/i18n";
import { supabaseServer } from "@/lib/supabase/server";
import { viewerPatientId } from "../quote/_components/viewer";
import { uploadPhoto } from "@/lib/supabase/storage";
import { parseSymptoms } from "./_components/checkin";

// Server Action은 경로 언어를 모른다 → 오류는 사전 키로 돌려준다
export type CheckinResult = { ok: true } | { ok: false; error: keyof H4Dict["errors"] };

export async function submitCheckin(fd: FormData): Promise<CheckinResult> {
  const followupId = fd.get("followupId");
  const photo = fd.get("photo");
  const memo = String(fd.get("memo") ?? "").slice(0, 1000);
  const symptoms = parseSymptoms(fd.getAll("symptoms").map(String));
  if (typeof followupId !== "string") return { ok: false, error: "checkinNotFound" };
  if (!(photo instanceof Blob) || photo.size === 0) return { ok: false, error: "needPhoto" };
  if (!["image/jpeg", "image/png", "image/webp"].includes(photo.type)) return { ok: false, error: "badType" };

  const db = supabaseServer();
  const patientId = await viewerPatientId();
  const { data: f } = await db
    .from("followups")
    .select("id, status, bookings!inner(quotes!inner(consultations!inner(patient_id)))")
    .eq("id", followupId)
    .maybeSingle();
  if (!f || f.bookings.quotes.consultations.patient_id !== patientId) return { ok: false, error: "checkinNotFound" };
  if (f.status !== "pending") return { ok: false, error: "alreadySent" };

  let storagePath: string;
  try {
    storagePath = await uploadPhoto(patientId, photo, { ext: photo.type.split("/")[1].replace("jpeg", "jpg"), contentType: photo.type });
  } catch (e) {
    console.error("checkin upload failed", e);
    return { ok: false, error: "uploadFailed" };
  }

  const { data: row, error: photoError } = await db
    .from("photos")
    .insert({ patient_id: patientId, angle: "followup", storage_path: storagePath })
    .select("id")
    .single();
  if (photoError || !row) return { ok: false, error: "sendFailed" };

  // alert = 환자 자가 보고 여부일 뿐 의료 판단이 아니다 — 의사가 검토한다
  const { data: updated } = await db
    .from("followups")
    .update({ status: "submitted", photo_id: row.id, patient_note: memo.trim() || null, symptoms, alert: symptoms.length > 0 })
    .eq("id", followupId)
    .eq("status", "pending")
    .select("id");
  if (!updated?.length) return { ok: false, error: "alreadySent" };

  refresh();
  return { ok: true };
}
