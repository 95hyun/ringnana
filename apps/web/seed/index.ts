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
  SEED_CLINIC_APGUJEONG_ID,
  SEED_CLINIC_MYEONGDONG_ID,
  SEED_DOCTOR_IDS,
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
    "doctor_slots",
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

  // 의원 3곳·의사 6명 (전부 가상). specialties = 문진 고민 코드, languages = 상담 가능 언어
  const clinics = [
    { id: DEMO_CLINIC_ID, name: "링나나 피부과의원 (가상)", name_ja: "リンナナ皮膚科クリニック（架空）", area: "gangnam",
      address: "서울특별시 강남구 가상로 123", address_ja: "ソウル特別市 江南区 架空路123", station: "강남역 3번 출구", station_ja: "江南駅 3番出口" },
    { id: SEED_CLINIC_MYEONGDONG_ID, name: "명동 서울빛 피부과 (가상)", name_ja: "明洞ソウルビッ皮膚科（架空）", area: "myeongdong",
      address: "서울특별시 중구 가상길 45", address_ja: "ソウル特別市 中区 架空キル45", station: "명동역 6번 출구", station_ja: "明洞駅 6番出口" },
    { id: SEED_CLINIC_APGUJEONG_ID, name: "압구정 하루 피부과 (가상)", name_ja: "狎鴎亭ハル皮膚科（架空）", area: "apgujeong",
      address: "서울특별시 강남구 가상대로 78", address_ja: "ソウル特別市 江南区 架空大路78", station: "압구정로데오역 5번 출구", station_ja: "狎鴎亭ロデオ駅 5番出口" },
  ];
  await must(db.from("clinics").insert(clinics), "clinics");

  const title = { title: "피부과 전문의", title_ja: "皮膚科専門医" };
  const doctors = [
    { id: DEMO_DOCTOR_ID, clinic_id: DEMO_CLINIC_ID, name: "김서연", name_ja: "キム・ソヨン", specialties: ["melasma", "freckles", "redness"], languages: ["ko", "ja"],
      bio: "색소 질환(기미·주근깨)과 홍조 치료를 주로 합니다. 일본어로 상담할 수 있습니다.", bio_ja: "シミ・そばかすなどの色素トラブルと赤ら顔の治療を中心に診療しています。日本語で相談できます。" },
    { id: SEED_DOCTOR_IDS[0], clinic_id: DEMO_CLINIC_ID, name: "박지훈", name_ja: "パク・ジフン", specialties: ["acne", "acne_scar", "pores"], languages: ["ko", "en"],
      bio: "여드름과 여드름 흉터, 모공 치료를 주로 합니다.", bio_ja: "ニキビとニキビ跡、毛穴の治療を中心に診療しています。" },
    { id: SEED_DOCTOR_IDS[1], clinic_id: SEED_CLINIC_MYEONGDONG_ID, name: "이하은", name_ja: "イ・ハウン", specialties: ["wrinkles", "sagging", "pores"], languages: ["ko", "ja", "en"],
      bio: "잔주름·탄력 저하 상담을 주로 합니다. 일본어·영어 상담이 가능합니다.", bio_ja: "小じわ・たるみのご相談を中心に診療しています。日本語・英語で相談できます。" },
    { id: SEED_DOCTOR_IDS[2], clinic_id: SEED_CLINIC_MYEONGDONG_ID, name: "최민준", name_ja: "チェ・ミンジュン", specialties: ["acne_scar", "redness"], languages: ["ko", "ja"],
      bio: "여드름 흉터와 붉은기 개선을 주로 합니다.", bio_ja: "ニキビ跡と赤みの改善を中心に診療しています。" },
    { id: SEED_DOCTOR_IDS[3], clinic_id: SEED_CLINIC_APGUJEONG_ID, name: "정유나", name_ja: "チョン・ユナ", specialties: ["sagging", "wrinkles", "melasma"], languages: ["ko", "ja"],
      bio: "탄력·주름과 기미를 함께 상담합니다.", bio_ja: "たるみ・しわとシミをあわせてご相談いただけます。" },
    { id: SEED_DOCTOR_IDS[4], clinic_id: SEED_CLINIC_APGUJEONG_ID, name: "한도윤", name_ja: "ハン・ドユン", specialties: ["freckles", "melasma", "acne"], languages: ["ko", "en"],
      bio: "주근깨·기미와 여드름 상담을 합니다.", bio_ja: "そばかす・シミとニキビのご相談を承っています。" },
  ].map((d) => ({ ...d, specialty: title.title, ...title }));
  await must(db.from("doctors").insert(doctors), "doctors");

  // 상담 가능 시간: 내일부터 21일, 의사별 요일·시간대를 다르게 (KST, 30분)
  const slotRows: { doctor_id: string; starts_at: string; ends_at: string }[] = [];
  doctors.forEach((d, i) => {
    for (let offset = 1; offset <= 21; offset++) {
      if ((offset + i) % 4 === 0) continue; // 의사마다 쉬는 날이 다르게
      const hours = i % 2 === 0 ? [10, 11, 14, 15, 16] : [9, 13, 17, 18];
      for (const h of hours) {
        const start = `${day(offset)}T${String(h).padStart(2, "0")}:00:00+09:00`;
        const end = `${day(offset)}T${String(h).padStart(2, "0")}:30:00+09:00`;
        slotRows.push({ doctor_id: d.id, starts_at: start, ends_at: end });
      }
    }
  });
  await must(db.from("doctor_slots").insert(slotRows), "slots");

  // 기존 진료에 붙일 예약 시간(booked). 데모 진행 중 진료는 "지금부터 2시간 뒤" 슬롯
  async function bookedSlot(doctorId: string, startsAt: string) {
    const endsAt = new Date(new Date(startsAt).getTime() + 30 * 60_000).toISOString();
    const [slot] = await must(
      db.from("doctor_slots").upsert({ doctor_id: doctorId, starts_at: startsAt, ends_at: endsAt, status: "booked" }, { onConflict: "doctor_id,starts_at" }).select("id"),
      `booked slot ${startsAt}`,
    );
    return slot.id;
  }

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
      name_latin: "Sato Misaki",
      consented_at: hoursFromNow(-24 * 32),
      country: "JP",
      lang: "ja",
      birth_year: 1997,
    }),
    "demo patient",
  );

  // 진료 큐를 채울 다른 가상 환자들
  const queue = [
    { name: "田中 優子", name_latin: "Tanaka Yuko", birth_year: 1991, concerns: ["acne_scar"], flags: [], status: "scheduled", trip: [10, 13] },
    { name: "鈴木 花", name_latin: "Suzuki Hana", birth_year: 2000, concerns: ["pores", "redness"], flags: [], status: "requested", trip: [21, 25] },
    { name: "高橋 恵美", name_latin: "Takahashi Emi", birth_year: 1988, concerns: ["melasma", "wrinkles"], flags: ["anticoagulant"], status: "requested", trip: [30, 33] },
  ] as const;
  for (const q of queue) {
    const [p] = await must(
      db
        .from("patients")
        .insert({
          name: q.name,
          name_latin: q.name_latin,
          consented_at: hoursFromNow(-24),
          country: "JP",
          lang: "ja",
          birth_year: q.birth_year,
        })
        .select("id"),
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
    const startsAt = q.status === "scheduled" ? hoursFromNow(2) : `${day(q.trip[0] - 7)}T14:00:00+09:00`;
    await must(
      db.from("consultations").insert({
        patient_id: p.id,
        doctor_id: DEMO_DOCTOR_ID,
        intake_id: intake.id,
        status: q.status,
        slot_id: await bookedSlot(DEMO_DOCTOR_ID, startsAt),
        scheduled_at: startsAt,
        requested_at: hoursFromNow(-3),
        decided_at: q.status === "scheduled" ? hoursFromNow(-1) : null,
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
        requested_at: at(-31),
        decided_at: at(-31),
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
        items: [{ code: "pico_toning", name: "피코토닝", name_ja: "ピコトーニング", sessions: 2, price_krw: 150000, visit_days: [1, 3] }],
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

  const tables = ["clinics", "doctors", "doctor_slots", "patients", "intakes", "photos", "consultations", "quotes", "bookings", "followups"] as const;
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
