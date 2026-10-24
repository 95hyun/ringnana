// 화상 앱 입장 URL — docs/video-integration.md §1 계약 구현. 팀원 구현이 바뀌면 이 파일만 고친다.
import { href, type Lang } from "@/lib/i18n";

// 통역은 video 앱의 자막으로 제공 — interpreter 역할 입장은 쓰지 않는다
export type VideoRole = "patient" | "doctor";

export type RoomUrlInput = {
  sessionId: string;
  role: VideoRole;
  name?: string;
  lang?: "ja" | "ko";
  returnUrl?: string;
};

// NEXT_PUBLIC_VIDEO_BASE_URL 미설정이면 null — 화면은 입장 버튼을 끄고 안내만 한다
export function buildRoomUrl({ sessionId, role, name, lang, returnUrl }: RoomUrlInput): string | null {
  const base = process.env.NEXT_PUBLIC_VIDEO_BASE_URL;
  if (!base) return null;
  const url = new URL(`room/${encodeURIComponent(sessionId)}`, base.endsWith("/") ? base : `${base}/`);
  url.searchParams.set("role", role);
  if (name) url.searchParams.set("name", name);
  if (lang) url.searchParams.set("lang", lang);
  if (returnUrl) url.searchParams.set("returnUrl", returnUrl);
  return url.toString();
}

// returnUrl은 video 앱이 다른 origin에서 이동시키므로 절대 URL이어야 한다
export function platformUrl(path: string, origin: string): string {
  return new URL(path, origin).toString();
}

// 통화 종료 후 돌아올 경로(언어 구간 포함, docs/video-integration.md §1). 환자 = 진료 완료 화면, 의사 = 진료 상세
// 의사의 ?ended=1 은 종료 신호(§2 (A)) — 콘솔이 이를 보고 in_call → done 처리한다
export function returnPath(role: VideoRole, consultationId: string, lang: Lang): string {
  return href(lang, role === "patient" ? `/consult/${consultationId}/done` : `/clinic/consult/${consultationId}?ended=1`);
}
