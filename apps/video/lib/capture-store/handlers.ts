import { config } from "@/lib/config";
import type {
  ApiError,
  CaptureLatestOk,
  CaptureMetaItem,
  CaptureMode,
  CaptureSubmitOk,
  LatestPhoto,
  PhotoAngle,
} from "@/lib/contracts";
import { callPhotoPath, type CallPhotoInsert } from "@/lib/supabase/types";
import type { CaptureStore } from "./types";

export type HandlerResult<T> = { status: number; body: T | ApiError };

export const PHOTO_ANGLES: readonly PhotoAngle[] = ["front", "left", "right"];
const CAPTURE_MODES: readonly CaptureMode[] = ["auto", "manual"];
const JPEG = "image/jpeg";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d{1,9})?)?(Z|[+-]\d{2}:?\d{2})$/;

export const isUuid = (v: unknown): v is string => typeof v === "string" && UUID_RE.test(v);
export const isIsoTime = (v: unknown): v is string =>
  typeof v === "string" && ISO_RE.test(v) && !Number.isNaN(Date.parse(v));

const fail = (status: number, error: string): HandlerResult<never> => ({ status, body: { error } });

export type CaptureSubmission = {
  sessionId: string;
  batchId: string;
  consentedAt: string;
  items: (CaptureMetaItem & { file: Blob })[]; // front·left·right 순서
};

const isNullableNumber = (v: unknown): v is number | null =>
  v === null || (typeof v === "number" && Number.isFinite(v));

function parseMeta(raw: FormDataEntryValue | null): Map<PhotoAngle, CaptureMetaItem> | string {
  if (typeof raw !== "string") return "invalid_meta";
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return "invalid_meta";
  }
  if (!Array.isArray(parsed) || parsed.length !== PHOTO_ANGLES.length) return "invalid_meta";
  const byAngle = new Map<PhotoAngle, CaptureMetaItem>();
  for (const item of parsed as unknown[]) {
    if (typeof item !== "object" || item === null) return "invalid_meta";
    const { angle, captureMode, yaw, pitch } = item as Record<string, unknown>;
    if (!PHOTO_ANGLES.includes(angle as PhotoAngle)) return "invalid_angle";
    if (!CAPTURE_MODES.includes(captureMode as CaptureMode)) return "invalid_capture_mode";
    if (!isNullableNumber(yaw) || !isNullableNumber(pitch)) return "invalid_meta";
    if (byAngle.has(angle as PhotoAngle)) return "duplicate_angle";
    byAngle.set(angle as PhotoAngle, { angle: angle as PhotoAngle, captureMode: captureMode as CaptureMode, yaw, pitch });
  }
  return byAngle;
}

// spec §7.2 검사. 통과하면 제출 내용, 아니면 오류 코드
export function parseCaptureSubmission(formData: FormData): CaptureSubmission | string {
  const sessionId = formData.get("sessionId");
  const batchId = formData.get("batchId");
  const consentedAt = formData.get("consentedAt");
  if (!isUuid(sessionId)) return "invalid_session_id";
  if (!isUuid(batchId)) return "invalid_batch_id";
  if (!isIsoTime(consentedAt)) return "invalid_consented_at";

  const meta = parseMeta(formData.get("meta"));
  if (typeof meta === "string") return meta;

  const items: CaptureSubmission["items"] = [];
  for (const angle of PHOTO_ANGLES) {
    const files = formData.getAll(angle);
    if (files.length !== 1) return "invalid_files";
    const file = files[0];
    if (typeof file === "string" || file.size === 0 || file.type !== JPEG) return "invalid_files";
    const m = meta.get(angle);
    if (!m) return "invalid_meta";
    items.push({ ...m, file });
  }
  return { sessionId, batchId, consentedAt, items };
}

export async function handleCaptureSubmit(
  formData: FormData,
  store: CaptureStore,
): Promise<HandlerResult<CaptureSubmitOk>> {
  const sub = parseCaptureSubmission(formData);
  if (typeof sub === "string") return fail(400, sub);

  try {
    const consultation = await store.findConsultationBySession(sub.sessionId);
    if (!consultation) return fail(404, "consultation_not_found");

    // 제출된 회차는 바뀌지 않는다 — 응답만 끊긴 재전송은 그대로 성공 처리
    const existing = await store.countBatchPhotos(consultation.id, sub.batchId);
    if (existing >= PHOTO_ANGLES.length) {
      return { status: 200, body: { batchId: sub.batchId, status: "already_saved" } };
    }

    const rows: CallPhotoInsert[] = sub.items.map((item) => ({
      patient_id: consultation.patientId,
      intake_id: consultation.intakeId,
      consultation_id: consultation.id,
      source: "call",
      capture_batch_id: sub.batchId,
      angle: item.angle,
      storage_path: callPhotoPath(consultation.id, sub.batchId, item.angle),
      capture_mode: item.captureMode,
      quality_ok: item.captureMode === "auto",
      yaw: item.yaw,
      pitch: item.pitch,
      consented_at: sub.consentedAt,
    }));

    try {
      await Promise.all(rows.map((r, i) => store.uploadPhoto(r.storage_path, sub.items[i].file, JPEG)));
    } catch (e) {
      console.error("[api/capture] upload failed", e);
      return fail(500, "upload_failed");
    }
    try {
      await store.insertCallPhotos(rows);
    } catch (e) {
      console.error("[api/capture] insert failed", e);
      return fail(500, "save_failed");
    }
    return { status: 200, body: { batchId: sub.batchId, status: "saved" } };
  } catch (e) {
    console.error("[api/capture] failed", e);
    return fail(500, "internal_error");
  }
}

export async function handleCaptureLatest(
  sessionId: string | null,
  store: CaptureStore,
): Promise<HandlerResult<CaptureLatestOk>> {
  if (!isUuid(sessionId)) return fail(400, "invalid_session_id");
  try {
    const consultation = await store.findConsultationBySession(sessionId);
    if (!consultation) return fail(404, "consultation_not_found");

    const rows = await store.findLatestCallBatch(consultation.id);
    if (rows.length === 0) return { status: 200, body: { batch: null } };

    const ordered = PHOTO_ANGLES.flatMap((a) => rows.filter((r) => r.angle === a).slice(0, 1));
    const urls = await store.signPhotoUrls(
      ordered.map((r) => r.storage_path),
      config.photos.signedUrlSeconds,
    );
    const photos: LatestPhoto[] = ordered.map((r, i) => ({
      angle: r.angle,
      url: urls[i],
      captureMode: r.capture_mode,
      yaw: r.yaw,
      pitch: r.pitch,
    }));
    const createdAt = ordered.reduce((max, r) => (r.created_at > max ? r.created_at : max), ordered[0].created_at);
    return { status: 200, body: { batch: { batchId: ordered[0].capture_batch_id, createdAt, photos } } };
  } catch (e) {
    console.error("[api/capture/latest] failed", e);
    return fail(500, "internal_error");
  }
}
