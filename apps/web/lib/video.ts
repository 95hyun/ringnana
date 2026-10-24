// 화상 앱 입장 URL — docs/video-integration.md §1 계약 구현. 팀원 구현이 바뀌면 이 파일만 고친다.

// 통역은 video 앱의 자막으로 제공 — interpreter 역할 입장은 쓰지 않는다
export type VideoRole = "patient" | "doctor";

export type RoomUrlInput = {
  sessionId: string;
  role: VideoRole;
  name?: string;
  lang?: "ja" | "ko";
  returnUrl?: string;
};

// 화상 진료는 이 앱의 /video 아래에 있다. NEXT_PUBLIC_VIDEO_BASE_URL이 있으면 그 주소(별도로 띄운 화상 앱)를 쓴다
export function videoBaseUrl(origin: string): string {
  return process.env.NEXT_PUBLIC_VIDEO_BASE_URL || new URL("/video", origin).toString();
}

export function buildRoomUrl({ sessionId, role, name, lang, returnUrl }: RoomUrlInput, origin: string): string {
  const base = videoBaseUrl(origin);
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
