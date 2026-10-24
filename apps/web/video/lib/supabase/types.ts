// 플랫폼 스키마 중 화상 앱이 쓰는 칸만 손으로 적은 최소 타입 (spec §7.1).
// consented_at, notes_ja, notes_ja_source, notes_translation_status는 플랫폼 H1에 추가 요청한 칸이다.

export type PhotoAngle = "front" | "left" | "right";
export type CaptureMode = "auto" | "manual";
export type TranslationStatus = "pending" | "done" | "failed";

export type ConsultationRow = {
  id: string;
  patient_id: string;
  intake_id: string | null;
  video_session_id: string;
  notes: string | null;
  notes_ja: string | null;
  notes_ja_source: string | null;
  notes_translation_status: TranslationStatus | null;
};

export type CallPhotoInsert = {
  patient_id: string;
  intake_id: string | null;
  consultation_id: string;
  source: "call";
  capture_batch_id: string;
  angle: PhotoAngle;
  storage_path: string;
  capture_mode: CaptureMode;
  quality_ok: boolean;
  yaw: number | null;
  pitch: number | null;
  consented_at: string;
};

export type CallPhotoRow = CallPhotoInsert & {
  id: string;
  created_at: string;
};

export const PHOTO_BUCKET = "photos";
export const callPhotoPath = (consultationId: string, batchId: string, angle: PhotoAngle) =>
  `call/${consultationId}/${batchId}/${angle}.jpg`;
