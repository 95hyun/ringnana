"use server";

import { refresh } from "next/cache";
import type { H4Dict } from "../_components/i18n";
import { DEMO_CLINIC_ID } from "@/lib/demo";
import { supabaseServer } from "@/lib/supabase/server";
import { viewerPatientId } from "../_components/viewer";
import { DUE_DAYS } from "../../aftercare/_components/checkin";
import { isYmd, parseItems, totalSessions, todaySeoul } from "../_components/format";

// Server Action은 경로 언어를 모른다 → 오류는 사전 키로 돌려주고 클라이언트가 문구로 바꾼다
export type BookResult = { ok: true } | { ok: false; error: keyof H4Dict["errors"]; n?: number };

export async function bookQuote(quoteId: string, dates: string[]): Promise<BookResult> {
  const db = supabaseServer();

  const { data: quote } = await db
    .from("quotes")
    .select("id, items, valid_until, status, consultations(patient_id, intake_id, doctors(clinic_id))")
    .eq("id", quoteId)
    .maybeSingle();
  const consult = quote?.consultations;
  if (!quote || !consult || consult.patient_id !== (await viewerPatientId())) return { ok: false, error: "quoteNotFound" };
  if (quote.status !== "confirmed") return { ok: false, error: "alreadyBooked" };
  if (quote.valid_until && quote.valid_until < todaySeoul()) return { ok: false, error: "expired" };

  const { data: intake } = consult.intake_id
    ? await db.from("intakes").select("trip_start, trip_end").eq("id", consult.intake_id).maybeSingle()
    : { data: null };
  if (!intake?.trip_start || !intake.trip_end) return { ok: false, error: "noTrip" };

  // 검증은 개수·범위·중복만 — 회차 간격 같은 의료 판단은 하지 않는다
  const unique = [...new Set(dates)].sort();
  const sessions = totalSessions(parseItems(quote.items));
  if (sessions < 1) return { ok: false, error: "noSessions" };
  if (unique.length !== dates.length || unique.length !== sessions) return { ok: false, error: "pickN", n: sessions };
  if (!unique.every((d) => isYmd(d) && d >= intake.trip_start! && d <= intake.trip_end!)) {
    return { ok: false, error: "outOfRange" };
  }

  // 상태 전이를 먼저 잡아 이중 제출을 막는다 (confirmed인 행만 accepted로)
  const { data: locked } = await db
    .from("quotes")
    .update({ status: "accepted" })
    .eq("id", quoteId)
    .eq("status", "confirmed")
    .select("id");
  if (!locked?.length) return { ok: false, error: "alreadyBooked" };

  const { data: booking, error: bookingError } = await db
    .from("bookings")
    // 담당의 미배정 진료 = 데모 의원
    .insert({ quote_id: quoteId, clinic_id: consult.doctors?.clinic_id ?? DEMO_CLINIC_ID, visit_dates: unique })
    .select("id")
    .single();
  if (bookingError || !booking) {
    await db.from("quotes").update({ status: "confirmed" }).eq("id", quoteId);
    return { ok: false, error: "bookFailed" };
  }

  const { error: followupError } = await db
    .from("followups")
    .insert(DUE_DAYS.map((due_day) => ({ booking_id: booking.id, due_day })));
  if (followupError) {
    // 체크인 없는 예약은 사후관리가 끊기므로 예약 자체를 되돌린다
    console.error("followups insert failed", followupError);
    await db.from("bookings").delete().eq("id", booking.id);
    await db.from("quotes").update({ status: "confirmed" }).eq("id", quoteId);
    return { ok: false, error: "bookFailed" };
  }

  refresh();
  return { ok: true };
}
