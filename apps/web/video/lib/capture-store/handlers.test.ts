import { describe, expect, it } from "vitest";
import type { CaptureMetaItem } from "@/video/lib/contracts";
import type { CallPhotoRow } from "@/video/lib/supabase/types";
import { handleCaptureLatest, handleCaptureSubmit } from "./handlers";
import { createMemoryCaptureStore } from "./memory";

const SESSION = "00000000-0000-4000-8000-000000005001";
const BATCH = "11111111-1111-4111-8111-111111111111";
const CONSULT = "22222222-2222-4222-8222-222222222222";
const CONSENTED = "2026-10-24T09:30:00.000Z";

const consultations = { [SESSION]: { id: CONSULT, patientId: "patient-1", intakeId: "intake-1" } };

const defaultMeta: CaptureMetaItem[] = [
  { angle: "front", captureMode: "auto", yaw: 1.5, pitch: -2 },
  { angle: "left", captureMode: "auto", yaw: 44, pitch: 3 },
  { angle: "right", captureMode: "manual", yaw: null, pitch: null },
];

const jpeg = (name: string) => new File([new Uint8Array([0xff, 0xd8, 0xff, 1, 2, 3])], `${name}.jpg`, { type: "image/jpeg" });

function form(overrides: { meta?: unknown; omit?: string[]; set?: Record<string, string | File> } = {}) {
  const fd = new FormData();
  const fields: Record<string, string | File> = {
    sessionId: SESSION,
    batchId: BATCH,
    consentedAt: CONSENTED,
    front: jpeg("front"),
    left: jpeg("left"),
    right: jpeg("right"),
    meta: JSON.stringify(overrides.meta ?? defaultMeta),
    ...overrides.set,
  };
  for (const [k, v] of Object.entries(fields)) if (!overrides.omit?.includes(k)) fd.append(k, v);
  return fd;
}

function row(batch: string, angle: "front" | "left" | "right", createdAt: string): CallPhotoRow {
  return {
    id: `${batch}-${angle}`,
    created_at: createdAt,
    patient_id: "patient-1",
    intake_id: "intake-1",
    consultation_id: CONSULT,
    source: "call",
    capture_batch_id: batch,
    angle,
    storage_path: `call/${CONSULT}/${batch}/${angle}.jpg`,
    capture_mode: "auto",
    quality_ok: true,
    yaw: 0,
    pitch: 0,
    consented_at: CONSENTED,
  };
}

describe("POST /api/capture 처리", () => {
  it("성공: 사진 3장 덮어쓰기 업로드 후 3행을 한 번에 넣는다", async () => {
    const store = createMemoryCaptureStore({ consultations });
    const res = await handleCaptureSubmit(form(), store);
    expect(res).toEqual({ status: 200, body: { batchId: BATCH, status: "saved" } });
    expect(store.uploads.map((u) => u.path).sort()).toEqual(
      ["front", "left", "right"].map((a) => `call/${CONSULT}/${BATCH}/${a}.jpg`).sort(),
    );
    expect(store.uploads.every((u) => u.contentType === "image/jpeg" && u.size > 0)).toBe(true);
    expect(store.insertCalls).toHaveLength(1);
    const rows = store.insertCalls[0];
    expect(rows).toHaveLength(3);
    const byAngle = Object.fromEntries(rows.map((r) => [r.angle, r]));
    expect(byAngle.front).toEqual({
      patient_id: "patient-1",
      intake_id: "intake-1",
      consultation_id: CONSULT,
      source: "call",
      capture_batch_id: BATCH,
      angle: "front",
      storage_path: `call/${CONSULT}/${BATCH}/front.jpg`,
      capture_mode: "auto",
      quality_ok: true,
      yaw: 1.5,
      pitch: -2,
      consented_at: CONSENTED,
    });
    expect(byAngle.left.quality_ok).toBe(true);
    expect(byAngle.right).toMatchObject({ capture_mode: "manual", quality_ok: false, yaw: null, pitch: null });
  });

  it("intake_id가 없는 진료는 null로 넣는다", async () => {
    const store = createMemoryCaptureStore({
      consultations: { [SESSION]: { id: CONSULT, patientId: "patient-1", intakeId: null } },
    });
    await handleCaptureSubmit(form(), store);
    expect(store.insertCalls[0].every((r) => r.intake_id === null)).toBe(true);
  });

  it("이미 3행이 있으면 already_saved이고 아무것도 쓰지 않는다", async () => {
    const t = "2026-10-24T09:00:00.000Z";
    const store = createMemoryCaptureStore({
      consultations,
      photos: [row(BATCH, "front", t), row(BATCH, "left", t), row(BATCH, "right", t)],
    });
    const res = await handleCaptureSubmit(form(), store);
    expect(res).toEqual({ status: 200, body: { batchId: BATCH, status: "already_saved" } });
    expect(store.uploads).toHaveLength(0);
    expect(store.insertCalls).toHaveLength(0);
  });

  it("일부 행만 있으면 다시 저장하되 기존 행은 건드리지 않는다", async () => {
    const t = "2026-10-24T09:00:00.000Z";
    const existing = { ...row(BATCH, "front", t), yaw: 99 };
    const store = createMemoryCaptureStore({ consultations, photos: [existing] });
    const res = await handleCaptureSubmit(form(), store);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ batchId: BATCH, status: "saved" });
    expect(store.photos).toHaveLength(3);
    expect(store.photos.find((p) => p.angle === "front")?.yaw).toBe(99);
  });

  it("같은 회차를 두 번 제출하면 기록은 하나다", async () => {
    const store = createMemoryCaptureStore({ consultations });
    await handleCaptureSubmit(form(), store);
    const second = await handleCaptureSubmit(form(), store);
    expect(second.body).toEqual({ batchId: BATCH, status: "already_saved" });
    expect(store.photos).toHaveLength(3);
  });

  it("진료가 없으면 404", async () => {
    const store = createMemoryCaptureStore({});
    const res = await handleCaptureSubmit(form(), store);
    expect(res).toEqual({ status: 404, body: { error: "consultation_not_found" } });
    expect(store.uploads).toHaveLength(0);
  });

  const bad400: [string, Parameters<typeof form>[0]][] = [
    ["파일 누락", { omit: ["left"] }],
    ["meta 누락", { omit: ["meta"] }],
    ["meta 방향 누락(2개)", { meta: defaultMeta.slice(0, 2) }],
    ["meta 방향 중복", { meta: [defaultMeta[0], defaultMeta[0], defaultMeta[2]] }],
    ["meta 4개", { meta: [...defaultMeta, defaultMeta[0]] }],
    ["잘못된 angle", { meta: [defaultMeta[0], defaultMeta[1], { ...defaultMeta[2], angle: "back" }] }],
    ["잘못된 captureMode", { meta: [{ ...defaultMeta[0], captureMode: "burst" }, defaultMeta[1], defaultMeta[2]] }],
    ["yaw가 문자열", { meta: [{ ...defaultMeta[0], yaw: "3" }, defaultMeta[1], defaultMeta[2]] }],
    ["meta가 JSON이 아님", { set: { meta: "not json" } }],
    ["meta가 배열이 아님", { meta: { angle: "front" } }],
    ["sessionId 형식 오류", { set: { sessionId: "abc" } }],
    ["batchId 형식 오류", { set: { batchId: "1234" } }],
    ["consentedAt 형식 오류", { set: { consentedAt: "yesterday" } }],
    ["consentedAt 날짜만", { set: { consentedAt: "2026-10-24" } }],
    ["파일이 JPEG가 아님", { set: { front: new File([new Uint8Array([1])], "f.png", { type: "image/png" }) } }],
    ["파일 자리에 문자열", { set: { front: "x" } }],
    ["빈 파일", { set: { front: new File([], "f.jpg", { type: "image/jpeg" }) } }],
  ];
  it.each(bad400)("400: %s", async (_name, overrides) => {
    const store = createMemoryCaptureStore({ consultations });
    const res = await handleCaptureSubmit(form(overrides), store);
    expect(res.status).toBe(400);
    expect(typeof (res.body as { error: string }).error).toBe("string");
    expect(store.uploads).toHaveLength(0);
    expect(store.insertCalls).toHaveLength(0);
  });

  it("400: 같은 방향 파일이 두 개", async () => {
    const store = createMemoryCaptureStore({ consultations });
    const fd = form();
    fd.append("front", jpeg("front2"));
    const res = await handleCaptureSubmit(fd, store);
    expect(res.status).toBe(400);
  });

  it("업로드 실패는 500이고 행을 넣지 않는다", async () => {
    const store = createMemoryCaptureStore({ consultations });
    store.fail.upload = true;
    const res = await handleCaptureSubmit(form(), store);
    expect(res.status).toBe(500);
    expect(store.insertCalls).toHaveLength(0);
  });

  it("행 저장 실패는 500", async () => {
    const store = createMemoryCaptureStore({ consultations });
    store.fail.insert = true;
    const res = await handleCaptureSubmit(form(), store);
    expect(res.status).toBe(500);
  });
});

describe("GET /api/capture/latest 처리", () => {
  it("잘못된 sessionId는 400", async () => {
    const store = createMemoryCaptureStore({ consultations });
    expect((await handleCaptureLatest("nope", store)).status).toBe(400);
    expect((await handleCaptureLatest(null, store)).status).toBe(400);
  });

  it("진료가 없으면 404", async () => {
    const res = await handleCaptureLatest(SESSION, createMemoryCaptureStore({}));
    expect(res).toEqual({ status: 404, body: { error: "consultation_not_found" } });
  });

  it("회차가 없으면 batch: null", async () => {
    const res = await handleCaptureLatest(SESSION, createMemoryCaptureStore({ consultations }));
    expect(res).toEqual({ status: 200, body: { batch: null } });
  });

  it("가장 늦은 회차를 front·left·right 순서와 임시 주소로 돌려준다", async () => {
    const OLD = "33333333-3333-4333-8333-333333333333";
    const tOld = "2026-10-24T08:00:00.000Z";
    const tNew = "2026-10-24T09:00:00.000Z";
    const store = createMemoryCaptureStore({
      consultations,
      photos: [
        row(OLD, "front", tOld),
        row(OLD, "left", tOld),
        row(OLD, "right", tOld),
        { ...row(BATCH, "right", tNew), capture_mode: "manual", quality_ok: false, yaw: null, pitch: null },
        { ...row(BATCH, "left", tNew), yaw: 40 },
        row(BATCH, "front", tNew),
      ],
    });
    const res = await handleCaptureLatest(SESSION, store);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      batch: {
        batchId: BATCH,
        createdAt: tNew,
        photos: [
          { angle: "front", url: `https://signed.test/call/${CONSULT}/${BATCH}/front.jpg?expires=600`, captureMode: "auto", yaw: 0, pitch: 0 },
          { angle: "left", url: `https://signed.test/call/${CONSULT}/${BATCH}/left.jpg?expires=600`, captureMode: "auto", yaw: 40, pitch: 0 },
          { angle: "right", url: `https://signed.test/call/${CONSULT}/${BATCH}/right.jpg?expires=600`, captureMode: "manual", yaw: null, pitch: null },
        ],
      },
    });
  });

  it("주소 발급 실패는 500", async () => {
    const t = "2026-10-24T09:00:00.000Z";
    const store = createMemoryCaptureStore({ consultations, photos: [row(BATCH, "front", t)] });
    store.fail.sign = true;
    expect((await handleCaptureLatest(SESSION, store)).status).toBe(500);
  });
});
