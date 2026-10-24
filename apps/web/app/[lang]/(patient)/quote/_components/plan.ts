import "server-only";
import { notFound } from "next/navigation";
import { DEMO_CLINIC_ID } from "@/lib/demo";
import { supabaseServer } from "@/lib/supabase/server";
import { DUE_DAYS, dueDate } from "../../aftercare/_components/checkin";
import { daysBetween, parseItems, suggestedDates, totalSessions, type QuoteItem } from "./format";
import { viewerPatientId } from "./viewer";

// 견적(S3)·여행 일정(S6) 공용 데이터 — [id] = consultation_id. 본인 진료가 아니면 404
export async function loadPlan(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const db = supabaseServer();
  const { data: consult } = await db
    .from("consultations")
    .select(
      "id, patient_id, intake_id, notes, patients(name, country), doctors(name_ja, name, clinics(name, name_ja, address))",
    )
    .eq("id", id)
    .maybeSingle();
  if (!consult || consult.patient_id !== (await viewerPatientId())) notFound();

  const { data: quote } = await db
    .from("quotes")
    .select("id, items, total_krw, valid_until, status, created_at")
    .eq("consultation_id", id)
    .in("status", ["confirmed", "accepted"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!quote) return { consult, quote: null } as const;

  const [{ data: intake }, { data: booking }] = await Promise.all([
    consult.intake_id
      ? db.from("intakes").select("trip_start, trip_end, flags").eq("id", consult.intake_id).maybeSingle()
      : Promise.resolve({ data: null }),
    db
      .from("bookings")
      .select("id, visit_dates, clinics(name, name_ja, address), followups(due_day, status)")
      .eq("quote_id", quote.id)
      .maybeSingle(),
  ]);

  // 담당의 미배정 진료는 예약도 데모 의원으로 잡힌다 (actions.ts와 같은 규칙)
  let clinic = booking?.clinics ?? consult.doctors?.clinics ?? null;
  if (!clinic) {
    const { data } = await db.from("clinics").select("name, name_ja, address").eq("id", DEMO_CLINIC_ID).maybeSingle();
    clinic = data;
  }

  const items = parseItems(quote.items);
  const sessions = totalSessions(items);
  const trip = intake?.trip_start && intake.trip_end ? { start: intake.trip_start, end: intake.trip_end } : null;
  const suggested = trip ? suggestedDates(items, trip.start, trip.end, sessions) : [];
  // 예약 전에는 의사 추천일로 일정을 보여준다 (표시만, 예약은 BookingPicker)
  const visitDates = booking ? [...booking.visit_dates].sort() : suggested;
  const checkins = DUE_DAYS.map((day) => ({
    day,
    date: dueDate(visitDates, day),
    status: booking?.followups.find((f) => f.due_day === day)?.status ?? null,
  }));

  return {
    consult,
    quote,
    items,
    sessions,
    trip,
    suggested,
    booking,
    visitDates,
    checkins,
    clinic,
    flags: intake?.flags ?? [],
  } as const;
}

export type PlanDay = {
  date: string;
  n: number;
  kind: "arrive" | "visit" | "free" | "flyHome";
  visit: number | null; // 몇 번째 내원인지 (1부터)
};

// 체류 일자별 구분 — 첫날 도착, 마지막 날 귀국, 그 사이 내원일/자유일
export function planDays(trip: { start: string; end: string }, visitDates: string[]): PlanDay[] {
  const days = daysBetween(trip.start, trip.end);
  return days.map((date, i) => {
    const order = visitDates.indexOf(date);
    const kind = i === days.length - 1 ? "flyHome" : i === 0 ? "arrive" : order >= 0 ? "visit" : "free";
    return { date, n: i + 1, kind, visit: order >= 0 ? order + 1 : null };
  });
}

// 그날 받을 시술 — 의사 추천일(visit_days)이 그날을 가리키는 항목, 없으면(다른 날로 예약) 항목 순서대로 회차를 이어 붙인 매핑
export function treatmentsOn(day: PlanDay, items: QuoteItem[]): QuoteItem[] {
  if (day.visit === null) return [];
  const matched = items.filter((i) => Array.isArray(i.visit_days) && i.visit_days.includes(day.n));
  if (matched.length) return matched;
  const byOrder = items.flatMap((i) => Array.from({ length: Number.isInteger(i.sessions) && i.sessions! > 0 ? i.sessions! : 0 }, () => i));
  const item = byOrder[day.visit - 1];
  return item ? [item] : [];
}
