"use server";

import { redirect } from "next/navigation";
import { DEFAULT_LANG, getDict, href, isLang, type Lang } from "@/lib/i18n";
import { supabaseServer } from "@/lib/supabase/server";
import { clearPatientSession, safeNext, setPatientSession, supabaseAuthClient } from "./_lib/session";

export type AuthState = { error?: string };

// Server Action은 root params를 못 읽으므로 폼의 hidden lang으로 받는다
function langOf(fd: FormData): Lang {
  const v = String(fd.get("lang") ?? "");
  return isLang(v) ? v : DEFAULT_LANG;
}

function credentials(fd: FormData) {
  return {
    email: String(fd.get("email") ?? "").trim().toLowerCase(),
    password: String(fd.get("password") ?? ""),
  };
}

export async function login(_: AuthState, fd: FormData): Promise<AuthState> {
  const lang = langOf(fd);
  const t = (await getDict(lang)).h2.login.errors;
  const { email, password } = credentials(fd);
  if (!email || !password) return { error: t.missing };

  const { data, error } = await supabaseAuthClient().auth.signInWithPassword({ email, password });
  if (error || !data.user) return { error: t.invalid };

  const { data: patient } = await supabaseServer().from("patients").select("id").eq("user_id", data.user.id).maybeSingle();
  if (!patient) return { error: t.noPatient };

  await setPatientSession(patient.id);
  redirect(safeNext(fd.get("next"), lang));
}

export async function signup(_: AuthState, fd: FormData): Promise<AuthState> {
  const lang = langOf(fd);
  const t = (await getDict(lang)).h2.login.errors;
  const { email, password } = credentials(fd);
  const name = String(fd.get("name") ?? "").trim().slice(0, 50);
  const birthYear = Number(fd.get("birth_year")) || null;
  if (!name) return { error: t.nameRequired };
  if (!email.includes("@")) return { error: t.emailInvalid };
  if (password.length < 6) return { error: t.passwordShort };

  const db = supabaseServer();
  // admin API로 만들어 이메일 확인 단계를 건너뛴다 (데모 동선에서 메일함을 열지 않기 위해)
  const { data: created, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !created.user) {
    return { error: error?.code === "email_exists" ? t.emailExists : t.signupFailed };
  }

  const { data: patient, error: pErr } = await db
    .from("patients")
    .insert({ user_id: created.user.id, name, country: "JP", lang: "ja", birth_year: birthYear })
    .select("id")
    .single();
  if (pErr || !patient) {
    const { error: dErr } = await db.auth.admin.deleteUser(created.user.id);
    if (dErr) console.error("orphan auth user (patients insert failed)", created.user.id, dErr);
    return { error: t.signupFailed };
  }

  await setPatientSession(patient.id);
  redirect(safeNext(fd.get("next"), lang));
}

export async function logout(fd: FormData) {
  await clearPatientSession();
  redirect(href(langOf(fd), "/"));
}
