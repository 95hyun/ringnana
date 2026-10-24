import type { Role, UiLang } from "@/lib/contracts";

// spec §3 입장 계약
export type RoomQuery = {
  ok: true;
  sessionId: string;
  role: Role;
  name: string;
  lang: UiLang;
  returnUrl: string | null;
  testMode: boolean;
  demo: boolean; // ?demo=1 — 상대 창 감지 없이도 시연 모드
};
export type RoomQueryResult = RoomQuery | { ok: false };

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const isUuid = (s: string) => UUID_RE.test(s);

// http(s) 절대 주소만 이동에 쓴다 — javascript: 같은 주소로 이동하지 않기 위해
function safeReturnUrl(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const u = new URL(raw);
    return u.protocol === "https:" || u.protocol === "http:" ? raw : null;
  } catch {
    return null;
  }
}

export function parseRoomQuery(sessionId: string, search: URLSearchParams | string): RoomQueryResult {
  const q = typeof search === "string" ? new URLSearchParams(search) : search;
  const role = q.get("role");
  if ((role !== "doctor" && role !== "patient") || !isUuid(sessionId)) return { ok: false };
  const lang = q.get("lang");
  return {
    ok: true,
    sessionId,
    role,
    name: q.get("name") ?? "",
    lang: lang === "ko" ? "ko" : "ja",
    returnUrl: safeReturnUrl(q.get("returnUrl")),
    testMode: q.get("test") === "1",
    demo: q.get("demo") === "1",
  };
}

// Next 의 searchParams 객체를 URLSearchParams 로 되돌린다 (값이 배열이면 모두 넣고 get 은 첫 값)
export function toSearchParams(sp: Record<string, string | string[] | undefined>): URLSearchParams {
  const out = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (Array.isArray(v)) v.forEach((x) => out.append(k, x));
    else if (v !== undefined) out.append(k, v);
  }
  return out;
}
