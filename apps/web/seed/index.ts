// 데모 시드 — 모든 행·사진을 지우고 가상 데이터로 다시 채운다 (멱등)
// 실행: pnpm seed  (로컬 Supabase가 떠 있어야 함: pnpm db:start)
// 주의: 같은 DB를 쓰는 다른 레인 작업 데이터도 지워진다.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../lib/supabase/database.types";
import {
  DEMO_AFTERCARE_BOOKING_ID,
  DEMO_CLINIC_ID,
  DEMO_DOCTOR_ID,
  DEMO_PATIENT_EMAIL,
  DEMO_PATIENT_ID,
  DEMO_PATIENT_PASSWORD,
  DEMO_VIDEO_SESSION_ID,
} from "../lib/demo";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("apps/web/.env.local に NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が必要です");
// 전부 지우는 스크립트라 로컬 DB에서만 돈다. 클라우드에 넣을 땐 SEED_ALLOW_REMOTE=1을 명시
if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:|\/|$)/.test(url) && process.env.SEED_ALLOW_REMOTE !== "1") {
  throw new Error(`ローカル以外の DB (${url}) には seed しません。必要なら SEED_ALLOW_REMOTE=1`);
}

// lib/supabase/server.ts는 server-only라 스크립트에서 import할 수 없다
const db = createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const BUCKET = "photos";
const ASSETS = path.join(import.meta.dirname, "assets");

// 로컬 날짜 기준 YYYY-MM-DD (toISOString은 UTC라 KST 오전에 하루 밀린다)
const day = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const hoursFromNow = (h: number) => new Date(Date.now() + h * 3600_000).toISOString();

// select 없는 insert·delete는 data가 null — 반환값을 쓰는 곳은 모두 .select()를 붙인다
async function must<T>(p: PromiseLike<{ data: T; error: unknown }>, label: string): Promise<NonNullable<T>> {
  const { data, error } = await p;
  if (error) throw new Error(`${label}: ${JSON.stringify(error)}`);
  return data as NonNullable<T>;
}

// FK 역순으로 전부 삭제
async function wipe() {
  const tables = [
    "followups",
    "bookings",
    "quotes",
    "consultations",
    "photos",
    "intakes",
    "patients",
    "doctors",
    "clinics",
  ] as const;
  for (const t of tables) {
    await must(db.from(t).delete().not("id", "is", null), `wipe ${t}`);
  }
  await must(db.storage.emptyBucket(BUCKET), "empty bucket");
  // 로컬 Auth 사용자도 전부 삭제 (가입 테스트 계정이 남으면 같은 이메일 재가입이 막힌다)
  const list = await db.auth.admin.listUsers({ perPage: 1000 });
  if (list.error) throw new Error(`list users: ${list.error.message}`);
  for (const u of list.data.users) {
    const { error } = await db.auth.admin.deleteUser(u.id);
    if (error) throw new Error(`delete user ${u.email}: ${error.message}`);
  }
}

async function uploadSample(patientId: string, angle: "front" | "left" | "right" | "followup") {
  const file = await readFile(path.join(ASSETS, `${angle}.png`));
  const storagePath = `patients/${patientId}/seed-${angle}-${crypto.randomUUID()}.png`;
  await must(db.storage.from(BUCKET).upload(storagePath, file, { contentType: "image/png" }), `upload ${angle}`);
  return storagePath;
}

async function addPhotos(patientId: string, intakeId: string, created_at?: string) {
  for (const angle of ["front", "left", "right"] as const) {
    const storage_path = await uploadSample(patientId, angle);
    await must(
      db.from("photos").insert({ patient_id: patientId, intake_id: intakeId, angle, storage_path, quality_ok: true, created_at }),
      `photo ${angle}`,
    );
  }
}

async function main() {
  await wipe();

  await must(
    db.from("clinics").insert({
      id: DEMO_CLINIC_ID,
      name: "링나나 피부과의원 (가상)",
      name_ja: "リンナナ皮膚科クリニック（架空）",
      address: "서울특별시 강남구 가상로 123",
    }),
    "clinic",
  );
  await must(
    db.from("doctors").insert({
      id: DEMO_DOCTOR_ID,
      clinic_id: DEMO_CLINIC_ID,
      name: "김서연",
      name_ja: "キム・ソヨン",
      specialty: "피부과 전문의",
    }),
    "doctor",
  );

  // 데모 페르소나 — 새 문진(장면 1)은 H2 화면에서 라이브로 만든다. 로그인 계정 = DEMO_PATIENT_EMAIL
  const created = await db.auth.admin.createUser({
    email: DEMO_PATIENT_EMAIL,
    password: DEMO_PATIENT_PASSWORD,
    email_confirm: true,
  });
  if (created.error) throw new Error(`demo auth user: ${created.error.message}`);
  const demoUser = created.data.user;
  await must(
    db.from("patients").insert({
      id: DEMO_PATIENT_ID,
      user_id: demoUser.id,
      name: "佐藤 美咲",
      country: "JP",
      lang: "ja",
      birth_year: 1997,
    }),
    "demo patient",
  );

  // 진료 큐를 채울 다른 가상 환자들
  const queue = [
    { name: "田中 優子", birth_year: 1991, concerns: ["acne_scar"], flags: [], status: "scheduled", trip: [10, 13] },
    { name: "鈴木 花", birth_year: 2000, concerns: ["pores", "redness"], flags: [], status: "requested", trip: [21, 25] },
    { name: "高橋 恵美", birth_year: 1988, concerns: ["melasma", "wrinkles"], flags: ["anticoagulant"], status: "requested", trip: [30, 33] },
  ] as const;
  for (const q of queue) {
    const [p] = await must(
      db.from("patients").insert({ name: q.name, country: "JP", lang: "ja", birth_year: q.birth_year }).select("id"),
      `patient ${q.name}`,
    );
    const [intake] = await must(
      db
        .from("intakes")
        .insert({
          patient_id: p.id,
          concerns: [...q.concerns],
          contraindications: { pregnant: false, isotretinoin: false, anticoagulant: (q.flags as readonly string[]).includes("anticoagulant"), keloid: false, recent_sunburn: false },
          flags: [...q.flags],
          trip_start: day(q.trip[0]),
          trip_end: day(q.trip[1]),
        })
        .select("id"),
      `intake ${q.name}`,
    );
    await addPhotos(p.id, intake.id);
    await must(
      db.from("consultations").insert({
        patient_id: p.id,
        doctor_id: DEMO_DOCTOR_ID,
        intake_id: intake.id,
        status: q.status,
        scheduled_at: q.status === "scheduled" ? hoursFromNow(2) : null,
        ...(q.status === "scheduled" ? { video_session_id: DEMO_VIDEO_SESSION_ID } : {}),
      }),
      `consultation ${q.name}`,
    );
  }

  // 페르소나의 지난 방한: 진료 done → 견적 accepted → 시술 2회 done → 귀국 후 체크인
  // 마지막 시술일 = 14일 전 → 오늘이 D+14. created_at도 과거로 둬서 "최신 문진" 조회에 걸리지 않게 한다
  const at = (offset: number) => `${day(offset)}T10:00:00+09:00`;
  const [pastIntake] = await must(
    db
      .from("intakes")
      .insert({
        patient_id: DEMO_PATIENT_ID,
        concerns: ["melasma"],
        contraindications: { pregnant: false, isotretinoin: false, anticoagulant: false, keloid: false, recent_sunburn: false },
        flags: [],
        trip_start: day(-17),
        trip_end: day(-14),
        created_at: at(-31),
      })
      .select("id"),
    "past intake",
  );
  await addPhotos(DEMO_PATIENT_ID, pastIntake.id, at(-31));
  const [pastConsult] = await must(
    db
      .from("consultations")
      .insert({
        patient_id: DEMO_PATIENT_ID,
        doctor_id: DEMO_DOCTOR_ID,
        intake_id: pastIntake.id,
        status: "done",
        scheduled_at: at(-30),
        created_at: at(-31),
        notes: "양 볼 광대 부위 기미(표피형 위주). 피코토닝 2회 권장, 시술 후 자외선 차단 철저.",
      })
      .select("id"),
    "past consultation",
  );
  const [pastQuote] = await must(
    db
      .from("quotes")
      .insert({
        consultation_id: pastConsult.id,
        items: [{ name: "피코토닝", name_ja: "ピコトーニング", sessions: 2, price_krw: 150000 }],
        total_krw: 300000,
        valid_until: day(-10),
        status: "accepted",
        created_at: at(-30),
      })
      .select("id"),
    "past quote",
  );
  await must(
    db.from("bookings").insert({
      id: DEMO_AFTERCARE_BOOKING_ID,
      quote_id: pastQuote.id,
      clinic_id: DEMO_CLINIC_ID,
      visit_dates: [day(-16), day(-14)],
      status: "done",
      created_at: at(-29),
    }),
    "past booking",
  );
  const d3PhotoPath = await uploadSample(DEMO_PATIENT_ID, "followup");
  const [d3Photo] = await must(
    db
      .from("photos")
      .insert({ patient_id: DEMO_PATIENT_ID, angle: "followup", storage_path: d3PhotoPath, quality_ok: true, created_at: at(-11) })
      .select("id"),
    "d3 photo",
  );
  await must(
    db.from("followups").insert([
      {
        booking_id: DEMO_AFTERCARE_BOOKING_ID,
        due_day: 3,
        status: "reviewed",
        photo_id: d3Photo.id,
        patient_note: "少し赤みがありますが、痛みはありません。",
        doctor_note: "정상 경과. 보습·자외선 차단 유지.",
        alert: false,
      },
      { booking_id: DEMO_AFTERCARE_BOOKING_ID, due_day: 14, status: "pending", alert: false },
      { booking_id: DEMO_AFTERCARE_BOOKING_ID, due_day: 30, status: "pending", alert: false },
    ]),
    "followups",
  );

  const tables = ["clinics", "doctors", "patients", "intakes", "photos", "consultations", "quotes", "bookings", "followups"] as const;
  const counts: Record<string, number | null> = {};
  for (const t of tables) {
    const { count, error } = await db.from(t).select("*", { count: "exact", head: true });
    if (error) throw new Error(`count ${t}: ${JSON.stringify(error)}`);
    counts[t] = count;
  }
  console.log("seed 完了", counts);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
