import type { CallPhotoInsert, CallPhotoRow } from "@/lib/supabase/types";
import type { CaptureStore, ConsultationRef } from "./types";

export type MemoryCaptureStore = CaptureStore & {
  consultations: Map<string, ConsultationRef>; // key = video_session_id
  photos: CallPhotoRow[];
  uploads: { path: string; size: number; contentType: string }[];
  insertCalls: CallPhotoInsert[][];
  fail: Partial<Record<"upload" | "insert" | "sign" | "lookup", boolean>>;
};

// 테스트·로컬 확인용 메모리 저장소. 실제 DB의 유일 제약과 중복 무시 동작을 흉내 낸다.
export function createMemoryCaptureStore(
  init: { consultations?: Record<string, ConsultationRef>; photos?: CallPhotoRow[] } = {},
): MemoryCaptureStore {
  let clock = Date.parse("2026-10-24T00:00:00Z");
  const nextTime = () => new Date((clock += 1000)).toISOString();
  const store: MemoryCaptureStore = {
    consultations: new Map(Object.entries(init.consultations ?? {})),
    photos: [...(init.photos ?? [])],
    uploads: [],
    insertCalls: [],
    fail: {},
    async findConsultationBySession(sessionId) {
      if (store.fail.lookup) throw new Error("lookup failed");
      return store.consultations.get(sessionId) ?? null;
    },
    async countBatchPhotos(consultationId, batchId) {
      if (store.fail.lookup) throw new Error("lookup failed");
      return store.photos.filter((p) => p.consultation_id === consultationId && p.capture_batch_id === batchId).length;
    },
    async uploadPhoto(path, body, contentType) {
      if (store.fail.upload) throw new Error("upload failed");
      store.uploads.push({ path, size: body.size, contentType });
    },
    async insertCallPhotos(rows) {
      if (store.fail.insert) throw new Error("insert failed");
      store.insertCalls.push(rows);
      const createdAt = nextTime();
      for (const row of rows) {
        const dup = store.photos.some((p) => p.capture_batch_id === row.capture_batch_id && p.angle === row.angle);
        if (!dup) store.photos.push({ ...row, id: crypto.randomUUID(), created_at: createdAt });
      }
    },
    async findLatestCallBatch(consultationId) {
      if (store.fail.lookup) throw new Error("lookup failed");
      const rows = store.photos.filter((p) => p.consultation_id === consultationId && p.source === "call");
      if (rows.length === 0) return [];
      const latest = rows.reduce((a, b) => (Date.parse(b.created_at) > Date.parse(a.created_at) ? b : a));
      return rows.filter((p) => p.capture_batch_id === latest.capture_batch_id);
    },
    async signPhotoUrls(paths, expiresInSeconds) {
      if (store.fail.sign) throw new Error("sign failed");
      return paths.map((p) => `https://signed.test/${p}?expires=${expiresInSeconds}`);
    },
  };
  return store;
}
