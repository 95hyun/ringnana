"use server";

import { DEFAULT_LANG, getDict, isLang } from "@/lib/i18n";
import { computeFlags, isConcernKey, normalizeAnswers, validTrip, type ContraindicationKey } from "@/lib/intake";
import { supabaseServer } from "@/lib/supabase/server";
import { currentPatientId } from "../login/_lib/session";

export type IntakeResult = { ok: true; intakeId: string; flags: ContraindicationKey[] } | { ok: false; error: string };

export async function submitIntake(fd: FormData): Promise<IntakeResult> {
  const langValue = String(fd.get("lang") ?? "");
  const t = (await getDict(isLang(langValue) ? langValue : DEFAULT_LANG)).h2.intake.errors;
  const patientId = await currentPatientId();
  if (!patientId) return { ok: false, error: t.sessionExpired };

  const concerns = [...new Set(fd.getAll("concerns").map(String))].filter(isConcernKey);
  if (concerns.length === 0) return { ok: false, error: t.noConcern };

  const tripStart = String(fd.get("trip_start") ?? "") || null;
  const tripEnd = String(fd.get("trip_end") ?? "") || null;
  if (!validTrip(tripStart, tripEnd)) return { ok: false, error: t.badTrip };

  const answers = normalizeAnswers(Object.fromEntries(fd.getAll("yes").map((k) => [String(k), true])));
  const flags = computeFlags(answers);

  const { data, error } = await supabaseServer()
    .from("intakes")
    .insert({ patient_id: patientId, concerns, contraindications: answers, flags, trip_start: tripStart, trip_end: tripEnd })
    .select("id")
    .single();
  if (error || !data) {
    console.error("intake insert failed", error);
    return { ok: false, error: t.saveFailed };
  }
  return { ok: true, intakeId: data.id, flags };
}
