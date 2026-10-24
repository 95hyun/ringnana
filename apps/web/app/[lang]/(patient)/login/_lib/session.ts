import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { href, type Lang } from "@/lib/i18n";
import { supabaseServer } from "@/lib/supabase/server";

// 환자 세션 = patientId를 SESSION_SECRET으로 HMAC 서명한 httpOnly 쿠키. Supabase 토큰(1시간 만료)을 들고 다니지 않아 데모 도중 만료가 없다.
// TODO(H1): @supabase/ssr 기반 공용 세션으로 승격되면 이 파일을 대체한다.
const COOKIE = "rn_patient";
const MAX_AGE = 60 * 60 * 24 * 7;

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s) throw new Error("SESSION_SECRET が未設定です (apps/web/.env.local)");
  return s;
}

export function sign(value: string): string {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

export function verify(token: string): string | null {
  const [value, mac] = token.split(".");
  if (!value || !mac) return null;
  const a = Buffer.from(mac);
  const b = Buffer.from(sign(value));
  return a.length === b.length && timingSafeEqual(a, b) ? value : null;
}

export async function setPatientSession(patientId: string) {
  (await cookies()).set(COOKIE, `${patientId}.${sign(patientId)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearPatientSession() {
  (await cookies()).delete(COOKIE);
}

export async function currentPatientId(): Promise<string | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  return token ? verify(token) : null;
}

export type CurrentPatient = { id: string; name: string };

// 페이지용: 로그인 안 했으면 /{lang}/login?next=... 으로 보낸다. path는 언어 구간 없는 경로("/intake")
export async function requirePatient(lang: Lang, path: string): Promise<CurrentPatient> {
  const id = await currentPatientId();
  const { data } = id ? await supabaseServer().from("patients").select("id, name").eq("id", id).maybeSingle() : { data: null };
  if (!data) redirect(href(lang, `/login?next=${encodeURIComponent(href(lang, path))}`));
  return data;
}

// 로그인 후 이동 경로 — 앱 내부 경로만 허용 (브라우저는 '/\\host'를 '//host'로 해석하므로 백슬래시도 거부)
export function safeNext(v: unknown, lang: Lang): string {
  const s = typeof v === "string" ? v : "";
  return s.startsWith("/") && !s.startsWith("//") && !s.includes("\\") ? s : href(lang, "/doctors");
}

// 비밀번호 검증 전용 anon 클라이언트 (DB 접근 없음)
export function supabaseAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY が未設定です");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
