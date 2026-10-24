import { describe, expect, it } from "vitest";
import { initialPatientState, patientReducer, type PatientAction, type PatientState, type Shot } from "./patient";

const B1 = "11111111-1111-4111-8111-111111111111";
const B2 = "22222222-2222-4222-8222-222222222222";
const AT = "2026-10-24T10:00:00.000Z";

const shot = (angle: Shot<string>["meta"]["angle"], image = `${angle}.jpg`): Shot<string> => ({
  meta: { angle, captureMode: "auto", yaw: 0, pitch: 0 },
  image,
});

const run = (actions: PatientAction<string>[], from: PatientState<string> = initialPatientState()) =>
  actions.reduce(patientReducer<string>, from);

const toPreview: PatientAction<string>[] = [
  { type: "request", batchId: B1 },
  { type: "agree", checked: true, at: AT },
  { type: "start" },
  { type: "shot", shot: shot("front") },
  { type: "shot", shot: shot("left") },
  { type: "shot", shot: shot("right") },
];

describe("patientReducer", () => {
  it("요청 → 동의 대기 (동의 전에는 시작하지 않는다)", () => {
    const s = run([{ type: "request", batchId: B1 }, { type: "start" }]);
    expect(s).toMatchObject({ phase: "consent", batchId: B1, source: "doctor", consentedAt: null });
  });

  it("체크 시각이 동의 시각이 되고, 체크를 풀면 지워진다", () => {
    const s1 = run([{ type: "request", batchId: B1 }, { type: "agree", checked: true, at: AT }]);
    expect(s1).toMatchObject({ phase: "consent", consentedAt: AT });
    const s2 = run([{ type: "agree", checked: false, at: AT }], s1);
    expect(s2).toMatchObject({ phase: "consent", consentedAt: null });
  });

  it("동의 후 정면 → 좌 → 우 순서로 찍고 미리보기로 간다", () => {
    const s1 = run(toPreview.slice(0, 3));
    expect(s1).toMatchObject({ phase: "shooting", step: "front", retake: false });
    const s2 = run(toPreview.slice(3, 4), s1);
    expect(s2).toMatchObject({ phase: "shooting", step: "left" });
    const s3 = run(toPreview.slice(4), s2);
    expect(s3.phase).toBe("preview");
    if (s3.phase !== "preview") return;
    expect(Object.keys(s3.photos).sort()).toEqual(["front", "left", "right"]);
    expect(s3.consentedAt).toBe(AT);
    expect(s3.error).toBe(false);
  });

  it("현재 단계와 다른 방향의 촬영분은 무시한다", () => {
    const s = run([...toPreview.slice(0, 3), { type: "shot", shot: shot("left") }]);
    expect(s).toMatchObject({ phase: "shooting", step: "front" });
  });

  it("재촬영은 그 방향만 다시 찍고 미리보기로 돌아온다", () => {
    const s1 = run([...toPreview, { type: "retake", angle: "left" }]);
    expect(s1).toMatchObject({ phase: "shooting", step: "left", retake: true });
    const s2 = run([{ type: "shot", shot: shot("left", "left2.jpg") }], s1);
    expect(s2.phase).toBe("preview");
    if (s2.phase !== "preview") return;
    expect(s2.photos.left.image).toBe("left2.jpg");
    expect(s2.photos.front.image).toBe("front.jpg");
    expect(s2.photos.right.image).toBe("right.jpg");
  });

  it("제출 성공 → 제출됨 (같은 batchId 만)", () => {
    const s1 = run([...toPreview, { type: "submit" }]);
    expect(s1).toMatchObject({ phase: "submitting", batchId: B1 });
    expect(run([{ type: "submitOk", batchId: B2 }], s1).phase).toBe("submitting");
    expect(run([{ type: "submitOk", batchId: B1 }], s1)).toMatchObject({ phase: "submitted", batchId: B1 });
  });

  it("제출 실패는 사진을 그대로 두고 같은 batchId 로 다시 제출할 수 있다", () => {
    const s1 = run([...toPreview, { type: "submit" }, { type: "submitFail", batchId: B1 }]);
    expect(s1).toMatchObject({ phase: "preview", batchId: B1, error: true });
    if (s1.phase !== "preview") return;
    expect(s1.photos.front.image).toBe("front.jpg");
    const s2 = run([{ type: "submit" }], s1);
    expect(s2).toMatchObject({ phase: "submitting", batchId: B1 });
  });

  it("제출 중에는 재촬영·재제출을 받지 않는다", () => {
    const s1 = run([...toPreview, { type: "submit" }]);
    expect(run([{ type: "retake", angle: "front" }], s1).phase).toBe("submitting");
    expect(run([{ type: "submit" }], s1)).toBe(s1);
  });

  it("같은 batchId 의 취소는 촬영분을 버린다 (동의·촬영·미리보기)", () => {
    for (const n of [1, 3, 4, toPreview.length]) {
      const s = run([...toPreview.slice(0, n), { type: "cancel", batchId: B1 }]);
      expect(s).toEqual(initialPatientState());
    }
  });

  it("다른 batchId 의 취소는 무시한다", () => {
    const s1 = run(toPreview);
    expect(run([{ type: "cancel", batchId: B2 }], s1)).toBe(s1);
  });

  it("제출 중 취소는 무시한다 (곧 기록이 생기므로)", () => {
    const s1 = run([...toPreview, { type: "submit" }]);
    expect(run([{ type: "cancel", batchId: B1 }], s1)).toBe(s1);
  });

  it("새 요청은 촬영분을 버리고 새 회차의 동의부터 시작한다", () => {
    const s = run([...toPreview, { type: "request", batchId: B2 }]);
    expect(s).toEqual({ phase: "consent", batchId: B2, source: "doctor", consentedAt: null });
  });

  it("제출 중 새 요청이 오면 새 회차로 가고, 늦게 온 이전 회차 결과는 무시한다", () => {
    const s1 = run([...toPreview, { type: "submit" }, { type: "request", batchId: B2 }]);
    expect(s1).toMatchObject({ phase: "consent", batchId: B2 });
    expect(run([{ type: "submitOk", batchId: B1 }], s1)).toBe(s1);
    expect(run([{ type: "submitFail", batchId: B1 }], s1)).toBe(s1);
  });

  it("같은 batchId 의 중복 요청은 무시한다", () => {
    const s1 = run(toPreview.slice(0, 4));
    expect(run([{ type: "request", batchId: B1 }], s1)).toBe(s1);
  });

  it("테스트 진입은 대기 중일 때만 자기 회차를 만든다", () => {
    const s1 = run([{ type: "testStart", batchId: B1 }]);
    expect(s1).toMatchObject({ phase: "consent", batchId: B1, source: "test" });
    expect(run([{ type: "testStart", batchId: B2 }], s1)).toBe(s1);
    const done = run([...toPreview, { type: "submit" }, { type: "submitOk", batchId: B1 }]);
    expect(run([{ type: "testStart", batchId: B2 }], done)).toMatchObject({ phase: "consent", batchId: B2 });
  });

  it("제출됨 상태에서 그 회차의 늦은 취소는 무시하고, 새 요청은 받는다", () => {
    const done = run([...toPreview, { type: "submit" }, { type: "submitOk", batchId: B1 }]);
    expect(run([{ type: "cancel", batchId: B1 }], done)).toBe(done);
    expect(run([{ type: "request", batchId: B2 }], done)).toMatchObject({ phase: "consent", batchId: B2 });
  });

  it("dismiss 는 제출됨 안내를 닫는다", () => {
    const done = run([...toPreview, { type: "submit" }, { type: "submitOk", batchId: B1 }]);
    expect(run([{ type: "dismiss" }], done)).toEqual(initialPatientState());
  });
});
