"use server";

import { redirect } from "next/navigation";
import { getDict, href, type Lang } from "@/lib/i18n";
import { supabaseServer } from "@/lib/supabase/server";
import { requirePatient } from "../login/_lib/session";

// 슬롯 선택 → consultations(draft) 생성(또는 재사용) → 문진. 슬롯 점유(booked)는 신청 시점에 다른 작업자가 한다
export async function startBooking(
  lang: Lang,
  slotId: string,
): Promise<{ error: string } | void> {
  const t = (await getDict(lang)).doctors.errors;
  const db = supabaseServer();
  const { data: slot } = await db
    .from("doctor_slots")
    .select("id, doctor_id, starts_at, status")
    .eq("id", slotId)
    .maybeSingle();
  if (!slot) return { error: t.slotUnavailable };

  // 미로그인이면 프로필로 돌아올 next를 붙여 로그인으로 보낸다
  const patient = await requirePatient(lang, `/doctors/${slot.doctor_id}`);

  if (
    slot.status !== "open" ||
    new Date(slot.starts_at).getTime() <= Date.now()
  )
    return { error: t.slotUnavailable };

  const { data: existing } = await db
    .from("consultations")
    .select("id")
    .eq("patient_id", patient.id)
    .eq("slot_id", slot.id)
    .eq("status", "draft")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  let id = existing?.id;
  if (!id) {
    const { data: created, error } = await db
      .from("consultations")
      .insert({
        patient_id: patient.id,
        doctor_id: slot.doctor_id,
        slot_id: slot.id,
        status: "draft",
        scheduled_at: slot.starts_at,
      })
      .select("id")
      .single();
    if (error || !created) {
      console.error("draft consultation insert failed", error);
      return { error: t.failed };
    }
    id = created.id;
  }
  redirect(href(lang, `/consult/${id}/intake`));
}

// <form action>용 — 라디오 slot 값을 읽는다. 오류는 쿼리로 돌려보내지 않고 같은 화면 유지 대신 프로필로 redirect
export async function startBookingForm(
  lang: Lang,
  doctorId: string,
  fd: FormData,
): Promise<void> {
  const slotId = String(fd.get("slot") ?? "");
  const res = slotId ? await startBooking(lang, slotId) : { error: "" };
  if (res?.error !== undefined)
    redirect(href(lang, `/doctors/${doctorId}?error=1`));
}
