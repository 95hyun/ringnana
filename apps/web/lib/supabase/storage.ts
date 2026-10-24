import "server-only";
import { supabaseServer } from "./server";

export const PHOTO_BUCKET = "photos";

const PHOTO_EXTS = ["png", "jpg", "jpeg", "webp", "heic"];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 경로 규칙: patients/{patientId}/{uuid}.{ext} — 입력값이 경로를 바꾸지 못하게 검증
export function photoPath(patientId: string, ext: string): string {
  const e = ext.replace(/^\./, "").toLowerCase();
  if (!UUID_RE.test(patientId)) throw new Error(`invalid patientId: ${patientId}`);
  if (!PHOTO_EXTS.includes(e)) throw new Error(`unsupported photo ext: ${ext}`);
  return `patients/${patientId}/${crypto.randomUUID()}.${e}`;
}

export async function uploadPhoto(
  patientId: string,
  file: Blob | ArrayBuffer,
  { ext, contentType }: { ext: string; contentType: string },
): Promise<string> {
  const path = photoPath(patientId, ext);
  const { error } = await supabaseServer().storage.from(PHOTO_BUCKET).upload(path, file, { contentType });
  if (error) throw error;
  return path;
}

export async function signedPhotoUrl(path: string, expiresIn = 60 * 60): Promise<string> {
  const { data, error } = await supabaseServer().storage.from(PHOTO_BUCKET).createSignedUrl(path, expiresIn);
  if (error) throw error;
  return data.signedUrl;
}

// paths 순서대로 URL 배열을 돌려준다 (실패한 항목은 null)
export async function signedPhotoUrls(paths: string[], expiresIn = 60 * 60): Promise<(string | null)[]> {
  if (paths.length === 0) return [];
  const { data, error } = await supabaseServer().storage.from(PHOTO_BUCKET).createSignedUrls(paths, expiresIn);
  if (error) throw error;
  return data.map((d) => d.signedUrl ?? null);
}
