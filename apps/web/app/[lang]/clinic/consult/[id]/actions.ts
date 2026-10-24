"use server";

import { refresh } from "next/cache";
import { DEMO_DOCTOR_ID } from "@/lib/demo";
import { isTreatmentCode } from "@/lib/localize";
import { supabaseServer } from "@/lib/supabase/server";
import type { QuoteItem } from "../../_components/quote-types";

// 로그인 없음(P2) — 데모 의사로 고정. TODO: Auth 도입 시 세션의 의사 확인

export async function startCall(consultationId: string) {
  const { error } = await supabaseServer()
    .from("consultations")
    .update({ status: "in_call", doctor_id: DEMO_DOCTOR_ID })
    .eq("id", consultationId)
    .neq("status", "done");
  if (error) throw new Error(error.message);
  refresh();
}

// in_call → done 만 허용 (returnUrl 복귀가 반복돼도 무해). 실제로 바뀌었으면 true
export async function endCall(consultationId: string): Promise<boolean> {
  const { data, error } = await supabaseServer()
    .from("consultations")
    .update({ status: "done" })
    .eq("id", consultationId)
    .eq("status", "in_call")
    .select("id");
  if (error) throw new Error(error.message);
  refresh();
  return (data?.length ?? 0) > 0;
}

export type QuoteInput = {
  notes: string;
  items: QuoteItem[];
  validUntil: string | null;
  confirm: boolean;
};

// 문구는 클라이언트가 사전(h3.clinic.quote.errors)으로 바꾼다 — Server Action은 lang을 모른다
export type ActionResult = { ok: true } | { ok: false; code: "noItems" | "locked" | "db"; detail?: string };

export async function saveQuote(consultationId: string, input: QuoteInput): Promise<ActionResult> {
  const items = input.items
    .map((i) => ({
      ...(isTreatmentCode(i.code) ? { code: i.code } : {}),
      name: i.name.trim(),
      name_ja: i.name_ja.trim(),
      sessions: Math.max(1, Math.floor(Number(i.sessions) || 1)),
      price_krw: Math.max(0, Math.floor(Number(i.price_krw) || 0)),
      visit_days: [...new Set((i.visit_days ?? []).map(Number))].filter((d) => Number.isInteger(d) && d >= 1).sort((a, b) => a - b),
    }))
    .filter((i) => i.name);
  if (input.confirm && items.length === 0) return { ok: false, code: "noItems" };

  const db = supabaseServer();
  const { data: existing, error: findError } = await db
    .from("quotes")
    .select("id, status")
    .eq("consultation_id", consultationId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (findError) return { ok: false, code: "db", detail: findError.message };
  // 확정 견적은 변경 불가 (docs/architecture.md quotes)
  if (existing && existing.status !== "draft") return { ok: false, code: "locked" };

  const { error: notesError } = await db.from("consultations").update({ notes: input.notes }).eq("id", consultationId);
  if (notesError) return { ok: false, code: "db", detail: notesError.message };
  // 견적을 쓰는 의사 = 담당의. 미배정 요청(H2 생성)도 여기서 배정해야 환자 견적에 의사·의원이 나온다 (ux-review E3)
  const { error: doctorError } = await db.from("consultations").update({ doctor_id: DEMO_DOCTOR_ID }).eq("id", consultationId).is("doctor_id", null);
  if (doctorError) return { ok: false, code: "db", detail: doctorError.message };

  const row = {
    items,
    total_krw: items.reduce((sum, i) => sum + i.sessions * i.price_krw, 0),
    valid_until: input.validUntil || null,
    status: input.confirm ? "confirmed" : "draft",
  };
  const { data: saved, error } = existing
    ? await db.from("quotes").update(row).eq("id", existing.id).eq("status", "draft").select("id")
    : await db.from("quotes").insert({ consultation_id: consultationId, ...row }).select("id");
  if (error) return { ok: false, code: "db", detail: error.message };
  // 다른 탭에서 먼저 확정된 경우 0행 갱신
  if (!saved?.length) return { ok: false, code: "locked" };

  refresh();
  return { ok: true };
}
