import "server-only";
import { headers } from "next/headers";

// video 앱에 넘길 returnUrl용 — 요청 호스트 기준 플랫폼 origin
export async function requestOrigin() {
  const h = await headers();
  // 프록시가 여러 단을 거치면 "a, b" 목록으로 온다 — 첫 값이 클라이언트 쪽
  const first = (v: string | null) => v?.split(",")[0].trim() || null;
  const host = first(h.get("x-forwarded-host")) ?? h.get("host") ?? "localhost:3000";
  const proto = first(h.get("x-forwarded-proto")) ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
