"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { DEFAULT_LANG, getDict, href, isLang } from "@/lib/i18n";
import { computeFlags, isConcernKey, normalizeAnswers, PREVIEW_GOALS, validTrip } from "@/lib/intake";
import { supabaseServer } from "@/lib/supabase/server";
import { PHOTO_BUCKET, signedPhotoUrls, uploadPhoto } from "@/lib/supabase/storage";
import { currentPatientId, sign, verify } from "../../../login/_lib/session";
import { bbananaConfigured, createGeneration, getTask, type TaskResult } from "./_lib/bbanana";

// slot_taken = 같은 시간에 이미 다른 신청이 있음 → 화면이 의사 프로필 링크를 보여준다
export type RequestResult = { ok: false; error: string; slotTaken?: { doctorPath: string } };
export type UploadResult = { ok: true } | { ok: false; error: string };
// reason: 생성 불가 사유(로그·화면 분기용). 화면은 어떤 사유든 끊기지 않고 진행 버튼을 보여준다
// ticket = 이 환자가 만든 task임을 증명하는 서명값 — 남의 taskId로 결과 이미지를 조회하지 못하게
export type StartResult = { ok: true; taskId: string; ticket: string } | { ok: false; reason: string };

const ACTIVE = ["requested", "scheduled", "in_call"];

async function langOf(fd: FormData) {
  const v = String(fd.get("lang") ?? "");
  return isLang(v) ? v : DEFAULT_LANG;
}

// 본인 + draft 진료만 작성·업로드 대상
async function ownedDraft(consultationId: string) {
  const patientId = await currentPatientId();
  if (!patientId) return null;
  const { data } = await supabaseServer()
    .from("consultations")
    .select("id, patient_id, doctor_id, slot_id, status")
    .eq("id", consultationId)
    .eq("patient_id", patientId)
    .maybeSingle();
  return data?.status === "draft" ? data : null;
}

// 문진 제출 = intake 생성 → 진료 신청(requested) → 슬롯 점유. 성공하면 신청 완료 화면으로 redirect
export async function submitRequest(fd: FormData): Promise<RequestResult> {
  const lang = await langOf(fd);
  const dict = await getDict(lang);
  const t = dict.h2.intake.errors;
  const tb = dict.booking.intake.errors;
  const patientId = await currentPatientId();
  if (!patientId) return { ok: false, error: t.sessionExpired };

  const c = await ownedDraft(String(fd.get("consultationId") ?? ""));
  if (!c) return { ok: false, error: tb.notDraft };

  const concerns = [...new Set(fd.getAll("concerns").map(String))].filter(isConcernKey);
  if (concerns.length === 0) return { ok: false, error: t.noConcern };
  const tripStart = String(fd.get("trip_start") ?? "") || null;
  const tripEnd = String(fd.get("trip_end") ?? "") || null;
  if (!validTrip(tripStart, tripEnd)) return { ok: false, error: t.badTrip };
  const answers = normalizeAnswers(Object.fromEntries(fd.getAll("yes").map((k) => [String(k), true])));
  const flags = computeFlags(answers);

  const db = supabaseServer();
  const slotTaken: RequestResult = {
    ok: false,
    error: dict.booking.intake.slotTaken.title,
    slotTaken: { doctorPath: href(lang, c.doctor_id ? `/doctors/${c.doctor_id}` : "/doctors") },
  };

  // 슬롯 점유: open→booked 조건부 업데이트(원자적). 이미 booked면 다른 활성 신청이 있는지로 판정
  // 남는 경합 창(동시 제출 + stale booked 슬롯)은 데모 범위 밖 — spec "슬롯 점유" 결정
  let flipped = false;
  if (c.slot_id) {
    const { data: booked } = await db.from("doctor_slots").update({ status: "booked" }).eq("id", c.slot_id).eq("status", "open").select("id");
    flipped = (booked?.length ?? 0) > 0;
    const { data: others } = await db
      .from("consultations")
      .select("id")
      .eq("slot_id", c.slot_id)
      .neq("id", c.id)
      .in("status", ACTIVE)
      .limit(1);
    // 다른 활성 신청이 있으면 슬롯은 그 신청 몫 — booked 그대로 둔다
    if (others && others.length > 0) return slotTaken;
  }
  const releaseSlot = async () => {
    if (flipped && c.slot_id) await db.from("doctor_slots").update({ status: "open" }).eq("id", c.slot_id);
  };

  const { data: intake, error: iErr } = await db
    .from("intakes")
    .insert({ patient_id: patientId, concerns, contraindications: answers, flags, trip_start: tripStart, trip_end: tripEnd })
    .select("id")
    .single();
  if (iErr || !intake) {
    console.error("intake insert failed", iErr);
    await releaseSlot();
    return { ok: false, error: t.saveFailed };
  }

  const { data: updated, error: uErr } = await db
    .from("consultations")
    .update({ intake_id: intake.id, status: "requested", requested_at: new Date().toISOString() })
    .eq("id", c.id)
    .eq("status", "draft")
    .select("id");
  if (uErr || !updated?.length) {
    console.error("consultation request failed", uErr);
    await releaseSlot();
    return { ok: false, error: uErr ? tb.failed : tb.notDraft };
  }

  // 문진 작성 중 올린 셀카·AI 이미지(consultation_id만 있음)를 이 문진에 붙인다 — 의원 콘솔은 intake_id로 사진을 찾는다
  const { error: pErr } = await db
    .from("photos")
    .update({ intake_id: intake.id })
    .eq("consultation_id", c.id)
    .eq("source", "intake")
    .is("intake_id", null);
  if (pErr) console.error("photo link failed", pErr);

  redirect(href(lang, `/consult/${c.id}/requested`));
}

// 셀카 업로드 → photos(angle=front, consultation_id). 진료는 만들지 않는다 — 이미 있는 draft 진료에 붙인다
export async function uploadSelfie(fd: FormData): Promise<UploadResult> {
  const t = (await getDict(await langOf(fd))).h2.photos.errors;
  const photo = fd.get("photo");
  if (!(photo instanceof Blob) || photo.size === 0) return { ok: false, error: t.noPhoto };
  if (photo.type !== "image/jpeg") return { ok: false, error: t.badFormat };
  const c = await ownedDraft(String(fd.get("consultationId") ?? ""));
  if (!c) return { ok: false, error: t.intakeRelogin };

  let storagePath: string;
  try {
    storagePath = await uploadPhoto(c.patient_id, photo, { ext: "jpg", contentType: "image/jpeg" });
  } catch (e) {
    console.error("selfie upload failed", e);
    return { ok: false, error: t.uploadFailed };
  }
  const { error } = await supabaseServer()
    .from("photos")
    .insert({ patient_id: c.patient_id, consultation_id: c.id, angle: "front", storage_path: storagePath });
  if (error) {
    console.error("photo insert failed", error);
    return { ok: false, error: t.photoSaveFailed };
  }
  return { ok: true };
}

function previewPrompt(goal: string) {
  return [
    "Edit this photo of the same person to visualize the person's desired skin goal:",
    `${goal}.`,
    "Keep the identity, face shape, expression, pose, hair, lighting, camera angle and background exactly the same.",
    "Subtle and natural. Keep natural skin texture. No makeup, no beauty filter, no reshaping, no exaggeration.",
  ].join(" ");
}

export async function startPreview(consultationId: string, concern: string): Promise<StartResult> {
  if (!bbananaConfigured()) return { ok: false, reason: "not_configured" };
  if (!isConcernKey(concern)) return { ok: false, reason: "bad_concern" };
  const c = await ownedDraft(consultationId);
  if (!c) return { ok: false, reason: "not_found" };

  const { data: photo } = await supabaseServer()
    .from("photos")
    .select("storage_path")
    .eq("consultation_id", c.id)
    .eq("source", "intake")
    .eq("angle", "front")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!photo) return { ok: false, reason: "no_photo" };

  const [url] = await signedPhotoUrls([photo.storage_path], 10 * 60).catch(() => [null]);
  // BBANANA는 공개 https URL만 받는다 — 로컬 Supabase(http://127.0.0.1)면 호출하지 않고 대체 표시로 넘긴다
  if (!url || !url.startsWith("https://")) return { ok: false, reason: "input_not_public" };

  const res = await createGeneration({
    prompt: previewPrompt(PREVIEW_GOALS[concern]),
    imageUrl: url,
    idempotencyKey: crypto.randomUUID(),
  });
  if (!res.ok) {
    console.error("bbanana create failed", res.code);
    return { ok: false, reason: res.code };
  }
  return { ok: true, taskId: res.taskId, ticket: sign(`${c.patient_id}:${c.id}:${res.taskId}`) };
}

export async function pollPreview(taskId: string, consultationId: string, ticket: string): Promise<TaskResult> {
  const patientId = await currentPatientId();
  if (!patientId) return { status: "failed", code: "unauthenticated" };
  if (!/^tsk_[\w-]+$/.test(taskId) || verify(`${patientId}:${consultationId}:${taskId}.${ticket}`) === null) {
    return { status: "failed", code: "bad_task" };
  }
  const t = await getTask(taskId);
  // 저장은 응답 뒤에 — 환자 화면은 BBANANA URL로 바로 보여준다
  if (t.status === "succeeded") after(() => savePreview(patientId, consultationId, taskId, t.url));
  return t;
}

const PREVIEW_TYPES: Record<string, string> = { "image/png": "png", "image/webp": "webp", "image/jpeg": "jpg" };
const PREVIEW_MAX_BYTES = 10 * 1024 * 1024;

// 생성 결과를 우리 버킷에 복사해 photos(angle=preview)로 남긴다 — 의원 콘솔이 진료 상세에 표시 (ux-review C6).
// 경로에 taskId를 넣고 upsert 없이 올려서, 같은 task를 다시 저장하려 하면 업로드 단계에서 중복으로 멈춘다(멱등)
// 이미 신청이 끝나 intake_id가 있으면 바로 붙이고, 아니면 제출 시 submitRequest가 붙인다
async function savePreview(patientId: string, consultationId: string, taskId: string, url: string) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
    const type = (res.headers.get("content-type") ?? "").split(";")[0].trim();
    const ext = PREVIEW_TYPES[type];
    if (!res.ok || !ext) throw new Error(`fetch ${res.status} ${type}`);
    if (Number(res.headers.get("content-length")) > PREVIEW_MAX_BYTES) throw new Error("too large (content-length)");
    const blob = await res.blob();
    if (blob.size > PREVIEW_MAX_BYTES) throw new Error(`too large ${blob.size}`);
    const db = supabaseServer();
    const storagePath = `patients/${patientId}/preview-${taskId}.${ext}`;
    const { error: upErr } = await db.storage.from(PHOTO_BUCKET).upload(storagePath, blob, { contentType: type, upsert: false });
    if (upErr) {
      if (/exists|duplicate/i.test(upErr.message)) return;
      throw upErr;
    }
    const { data: c } = await db.from("consultations").select("intake_id").eq("id", consultationId).eq("patient_id", patientId).maybeSingle();
    const { error } = await db
      .from("photos")
      .insert({ patient_id: patientId, consultation_id: consultationId, intake_id: c?.intake_id ?? null, angle: "preview", storage_path: storagePath });
    if (error) throw error;
  } catch (e) {
    console.error("preview save failed", e);
  }
}
