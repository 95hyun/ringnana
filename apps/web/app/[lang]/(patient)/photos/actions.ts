"use server";

import { DEFAULT_LANG, getDict, isLang } from "@/lib/i18n";
import { isConcernKey, PREVIEW_GOALS } from "@/lib/intake";
import { supabaseServer } from "@/lib/supabase/server";
import { after } from "next/server";
import { PHOTO_BUCKET, signedPhotoUrls, uploadPhoto } from "@/lib/supabase/storage";
import { currentPatientId, sign, verify } from "../login/_lib/session";
import { bbananaConfigured, createGeneration, getTask, type TaskResult } from "./_lib/bbanana";

export type UploadResult = { ok: true; consultationId: string } | { ok: false; error: string };
// reason: 생성 불가 사유(로그·화면 분기용). 화면은 어떤 사유든 끊기지 않고 진행 버튼을 보여준다
// ticket = 이 환자가 만든 task임을 증명하는 서명값 — 남의 taskId로 결과 이미지를 조회하지 못하게
export type StartResult = { ok: true; taskId: string; ticket: string } | { ok: false; reason: string };

async function ownedIntake(intakeId: string) {
  const patientId = await currentPatientId();
  if (!patientId) return null;
  const { data } = await supabaseServer()
    .from("intakes")
    .select("id, patient_id, concerns")
    .eq("id", intakeId)
    .eq("patient_id", patientId)
    .maybeSingle();
  return data;
}

// 셀카 업로드 → photos(angle=front, 의원 콘솔이 정면 사진으로 보여준다) → consultations(requested) 생성
// consultation 생성 주체 = H2 (docs/requests.md [H3→H2])
export async function uploadSelfie(fd: FormData): Promise<UploadResult> {
  const langValue = String(fd.get("lang") ?? "");
  const t = (await getDict(isLang(langValue) ? langValue : DEFAULT_LANG)).h2.photos.errors;
  const intakeId = fd.get("intakeId");
  const photo = fd.get("photo");
  if (typeof intakeId !== "string") return { ok: false, error: t.intakeNotFound };
  if (!(photo instanceof Blob) || photo.size === 0) return { ok: false, error: t.noPhoto };
  if (photo.type !== "image/jpeg") return { ok: false, error: t.badFormat };

  const intake = await ownedIntake(intakeId);
  if (!intake) return { ok: false, error: t.intakeRelogin };

  const db = supabaseServer();
  let storagePath: string;
  try {
    storagePath = await uploadPhoto(intake.patient_id, photo, { ext: "jpg", contentType: "image/jpeg" });
  } catch (e) {
    console.error("selfie upload failed", e);
    return { ok: false, error: t.uploadFailed };
  }
  const { error: pErr } = await db
    .from("photos")
    .insert({ patient_id: intake.patient_id, intake_id: intake.id, angle: "front", storage_path: storagePath });
  if (pErr) {
    console.error("photo insert failed", pErr);
    return { ok: false, error: t.photoSaveFailed };
  }

  // 재업로드해도 진료 요청은 문진당 하나
  // TODO(H1): consultations.intake_id unique 제약이 없어 동시 업로드면 중복 생성 가능 — 조회는 최신 1건으로 버틴다
  const { data: existing } = await db
    .from("consultations")
    .select("id")
    .eq("intake_id", intake.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (existing) return { ok: true, consultationId: existing.id };
  const { data: c, error: cErr } = await db
    .from("consultations")
    .insert({ patient_id: intake.patient_id, intake_id: intake.id, status: "requested" })
    .select("id")
    .single();
  if (cErr || !c) {
    console.error("consultation insert failed", cErr);
    return { ok: false, error: t.consultFailed };
  }
  return { ok: true, consultationId: c.id };
}

function previewPrompt(goal: string) {
  return [
    "Edit this photo of the same person to visualize the person's desired skin goal:",
    `${goal}.`,
    "Keep the identity, face shape, expression, pose, hair, lighting, camera angle and background exactly the same.",
    "Subtle and natural. Keep natural skin texture. No makeup, no beauty filter, no reshaping, no exaggeration.",
  ].join(" ");
}

export async function startPreview(intakeId: string, concern: string): Promise<StartResult> {
  if (!bbananaConfigured()) return { ok: false, reason: "not_configured" };
  if (!isConcernKey(concern)) return { ok: false, reason: "bad_concern" };
  const intake = await ownedIntake(intakeId);
  if (!intake) return { ok: false, reason: "not_found" };

  const { data: photo } = await supabaseServer()
    .from("photos")
    .select("storage_path")
    .eq("intake_id", intake.id)
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
  return { ok: true, taskId: res.taskId, ticket: sign(`${intake.patient_id}:${intake.id}:${res.taskId}`) };
}

export async function pollPreview(taskId: string, intakeId: string, ticket: string): Promise<TaskResult> {
  const patientId = await currentPatientId();
  if (!patientId) return { status: "failed", code: "unauthenticated" };
  if (!/^tsk_[\w-]+$/.test(taskId) || verify(`${patientId}:${intakeId}:${taskId}.${ticket}`) === null) {
    return { status: "failed", code: "bad_task" };
  }
  const t = await getTask(taskId);
  // 저장은 응답 뒤에 — 환자 화면은 BBANANA URL로 바로 보여준다
  if (t.status === "succeeded") after(() => savePreview(patientId, intakeId, taskId, t.url));
  return t;
}

const PREVIEW_TYPES: Record<string, string> = { "image/png": "png", "image/webp": "webp", "image/jpeg": "jpg" };
const PREVIEW_MAX_BYTES = 10 * 1024 * 1024;

// 생성 결과를 우리 버킷에 복사해 photos(angle=preview)로 남긴다 — 의원 콘솔(H3)이 진료 상세에 표시 (ux-review C6).
// 경로에 taskId를 넣고 upsert 없이 올려서, 같은 task를 다시 저장하려 하면 업로드 단계에서 중복으로 멈춘다(멱등)
async function savePreview(patientId: string, intakeId: string, taskId: string, url: string) {
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
    const { error } = await db
      .from("photos")
      .insert({ patient_id: patientId, intake_id: intakeId, angle: "preview", storage_path: storagePath });
    if (error) throw error;
  } catch (e) {
    console.error("preview save failed", e);
  }
}
