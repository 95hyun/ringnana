import "server-only";
import { supabaseServer } from "@/video/lib/supabase/server";
import { PHOTO_BUCKET, type CallPhotoRow, type ConsultationRow } from "@/video/lib/supabase/types";
import type { CaptureStore } from "./types";

const PHOTO_COLUMNS =
  "id, created_at, patient_id, intake_id, consultation_id, source, capture_batch_id, angle, storage_path, capture_mode, quality_ok, yaw, pitch";

// numeric 칸은 문자열로 올 수도 있어 숫자로 맞춘다
const num = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));

// 플랫폼 Supabase(서버 전용 키) 구현
export function createSupabaseCaptureStore(): CaptureStore {
  const db = supabaseServer();
  return {
    async findConsultationBySession(sessionId) {
      const { data, error } = await db
        .from("consultations")
        .select("id, patient_id, intake_id")
        .eq("video_session_id", sessionId)
        .limit(1)
        .maybeSingle<Pick<ConsultationRow, "id" | "patient_id" | "intake_id">>();
      if (error) throw error;
      return data ? { id: data.id, patientId: data.patient_id, intakeId: data.intake_id } : null;
    },
    async countBatchPhotos(consultationId, batchId) {
      const { count, error } = await db
        .from("photos")
        .select("id", { count: "exact", head: true })
        .eq("consultation_id", consultationId)
        .eq("capture_batch_id", batchId);
      if (error) throw error;
      return count ?? 0;
    },
    async uploadPhoto(path, body, contentType) {
      const { error } = await db.storage.from(PHOTO_BUCKET).upload(path, body, { contentType, upsert: true });
      if (error) throw error;
    },
    async insertCallPhotos(rows) {
      const { error } = await db
        .from("photos")
        .upsert(rows, { onConflict: "capture_batch_id,angle", ignoreDuplicates: true });
      if (error) throw error;
    },
    async findLatestCallBatch(consultationId) {
      const { data: latest, error } = await db
        .from("photos")
        .select("capture_batch_id")
        .eq("consultation_id", consultationId)
        .eq("source", "call")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle<{ capture_batch_id: string }>();
      if (error) throw error;
      if (!latest) return [];
      const { data, error: rowsError } = await db
        .from("photos")
        .select(PHOTO_COLUMNS)
        .eq("consultation_id", consultationId)
        .eq("source", "call")
        .eq("capture_batch_id", latest.capture_batch_id)
        .returns<CallPhotoRow[]>();
      if (rowsError) throw rowsError;
      return (data ?? []).map((r) => ({ ...r, yaw: num(r.yaw), pitch: num(r.pitch) }));
    },
    async signPhotoUrls(paths, expiresInSeconds) {
      const { data, error } = await db.storage.from(PHOTO_BUCKET).createSignedUrls(paths, expiresInSeconds);
      if (error) throw error;
      return paths.map((p) => {
        const hit = data.find((d) => d.path === p);
        if (!hit?.signedUrl) throw new Error(`signed url failed: ${p} ${hit?.error ?? ""}`);
        return hit.signedUrl;
      });
    },
  };
}
