import type { CallPhotoInsert, CallPhotoRow } from "@/lib/supabase/types";

export type ConsultationRef = { id: string; patientId: string; intakeId: string | null };

// 사진 제출·조회가 쓰는 데이터 접근. 실패는 예외로 던지고 처리기가 500으로 바꾼다.
export interface CaptureStore {
  findConsultationBySession(sessionId: string): Promise<ConsultationRef | null>;
  countBatchPhotos(consultationId: string, batchId: string): Promise<number>;
  // 같은 경로가 있으면 덮어쓴다 (이전 실패의 잔여 파일 정리)
  uploadPhoto(path: string, body: Blob, contentType: string): Promise<void>;
  // 한 번의 호출, onConflict capture_batch_id,angle, 이미 있는 행은 건드리지 않는다
  insertCallPhotos(rows: CallPhotoInsert[]): Promise<void>;
  // 그 진료의 source='call' 행 중 가장 최근 회차의 행들 (없으면 빈 배열)
  findLatestCallBatch(consultationId: string): Promise<CallPhotoRow[]>;
  // paths와 같은 순서의 임시 주소
  signPhotoUrls(paths: string[], expiresInSeconds: number): Promise<string[]>;
}
