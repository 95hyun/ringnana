import { describe, expect, it } from "vitest";
import type { LatestBatch } from "@/video/lib/contracts";
import { doctorReducer, initialDoctorState, type DoctorAction, type DoctorState } from "./doctor";

const B0 = "00000000-0000-4000-8000-000000000000";
const B1 = "11111111-1111-4111-8111-111111111111";
const B2 = "22222222-2222-4222-8222-222222222222";
const B3 = "33333333-3333-4333-8333-333333333333";

const batch = (batchId: string): LatestBatch => ({ batchId, createdAt: "2026-10-24T10:00:00Z", photos: [] });

const run = (actions: DoctorAction[], from: DoctorState = initialDoctorState()) =>
  actions.reduce(doctorReducer, from);

describe("doctorReducer", () => {
  it("처음에는 최신 회차를 불러오고(reloadToken 1) 결과를 담는다", () => {
    const s0 = initialDoctorState();
    expect(s0.reloadToken).toBe(1);
    expect(run([{ type: "loaded", batch: batch(B0) }]).latest?.batchId).toBe(B0);
  });

  it("요청하면 촬영 중 0/3", () => {
    const s = run([{ type: "loaded", batch: batch(B0) }, { type: "request", batchId: B1 }]);
    expect(s).toMatchObject({ mode: "active", batchId: B1, angles: [] });
  });

  it("진행 수는 방향 기준으로 센다 (재촬영 중복 제외)", () => {
    const s = run([
      { type: "request", batchId: B1 },
      { type: "event", event: { type: "capture:progress", payload: { batchId: B1, angle: "front" } } },
      { type: "event", event: { type: "capture:progress", payload: { batchId: B1, angle: "left" } } },
      { type: "event", event: { type: "capture:progress", payload: { batchId: B1, angle: "left" } } },
    ]);
    expect(s.angles).toEqual(["front", "left"]);
  });

  it("진행 중에는 다른 batchId 이벤트를 무시한다", () => {
    const s1 = run([{ type: "request", batchId: B1 }]);
    const s2 = run(
      [
        { type: "event", event: { type: "capture:progress", payload: { batchId: B2, angle: "front" } } },
        { type: "event", event: { type: "capture:done", payload: { batchId: B2 } } },
      ],
      s1,
    );
    expect(s2).toEqual(s1);
  });

  it("done 이 오면 대기로 돌아가 최신 회차를 다시 불러온다", () => {
    const s1 = run([{ type: "request", batchId: B1 }]);
    const s2 = run([{ type: "event", event: { type: "capture:done", payload: { batchId: B1 } } }], s1);
    expect(s2).toMatchObject({ mode: "idle", batchId: null, angles: [] });
    expect(s2.reloadToken).toBe(s1.reloadToken + 1);
  });

  it("취소하면 진행을 지우고 최신 회차로 돌아간다", () => {
    const s1 = run([{ type: "loaded", batch: batch(B0) }, { type: "request", batchId: B1 }]);
    const s2 = run([{ type: "cancel" }], s1);
    expect(s2).toMatchObject({ mode: "idle", batchId: null, angles: [] });
    expect(s2.latest?.batchId).toBe(B0);
    expect(s2.reloadToken).toBe(s1.reloadToken + 1);
  });

  it("취소한 회차의 늦은 이벤트는 대기 중이어도 채택하지 않는다", () => {
    const s1 = run([{ type: "request", batchId: B1 }, { type: "cancel" }]);
    const s2 = run([{ type: "event", event: { type: "capture:progress", payload: { batchId: B1, angle: "front" } } }], s1);
    expect(s2).toEqual(s1);
  });

  it("취소한 회차라도 대기 중 done 이 오면 기록이 생긴 것이므로 다시 불러온다", () => {
    const s1 = run([{ type: "request", batchId: B1 }, { type: "cancel" }]);
    const s2 = run([{ type: "event", event: { type: "capture:done", payload: { batchId: B1 } } }], s1);
    expect(s2).toMatchObject({ mode: "idle", batchId: null });
    expect(s2.reloadToken).toBe(s1.reloadToken + 1);
  });

  it("제출 전 재요청은 새 회차로 처음부터", () => {
    const s = run([
      { type: "request", batchId: B1 },
      { type: "event", event: { type: "capture:progress", payload: { batchId: B1, angle: "front" } } },
      { type: "request", batchId: B2 },
      { type: "event", event: { type: "capture:progress", payload: { batchId: B1, angle: "left" } } },
    ]);
    expect(s).toMatchObject({ mode: "active", batchId: B2, angles: [] });
  });

  it("환자가 촬영 중에 나가면 진행을 지우고 최신 회차로", () => {
    const s1 = run([{ type: "request", batchId: B1 }]);
    const s2 = run([{ type: "peerLeft" }], s1);
    expect(s2).toMatchObject({ mode: "idle", batchId: null, angles: [] });
    expect(s2.reloadToken).toBe(s1.reloadToken + 1);
    // 대기 중 퇴장은 아무 일 없음
    expect(run([{ type: "peerLeft" }], s2)).toBe(s2);
  });

  it("대기 중에는 새 batchId 의 진행 이벤트를 채택한다 (테스트 진입)", () => {
    const s = run([
      { type: "loaded", batch: batch(B0) },
      { type: "event", event: { type: "capture:progress", payload: { batchId: B3, angle: "front" } } },
    ]);
    expect(s).toMatchObject({ mode: "active", batchId: B3, angles: ["front"] });
  });

  it("대기 중 새 batchId 의 done 은 최신 회차를 다시 불러온다", () => {
    const s1 = run([{ type: "loaded", batch: batch(B0) }]);
    const s2 = run([{ type: "event", event: { type: "capture:done", payload: { batchId: B3 } } }], s1);
    expect(s2).toMatchObject({ mode: "idle" });
    expect(s2.reloadToken).toBe(s1.reloadToken + 1);
  });

  it("대기 중 이미 보고 있는 회차의 done 이나 취소 이벤트는 무시한다", () => {
    const s1 = run([{ type: "loaded", batch: batch(B0) }]);
    expect(run([{ type: "event", event: { type: "capture:done", payload: { batchId: B0 } } }], s1)).toBe(s1);
    expect(run([{ type: "event", event: { type: "capture:cancel", payload: { batchId: B3 } } }], s1)).toBe(s1);
  });

  it("채택한 테스트 회차를 환자가 취소 이벤트로 끝내면 대기로", () => {
    const s1 = run([{ type: "event", event: { type: "capture:progress", payload: { batchId: B3, angle: "front" } } }]);
    const s2 = run([{ type: "event", event: { type: "capture:cancel", payload: { batchId: B3 } } }], s1);
    expect(s2).toMatchObject({ mode: "idle", batchId: null });
  });

  it("capture:request 이벤트는 의사 화면에서 무시한다", () => {
    const s1 = initialDoctorState();
    expect(run([{ type: "event", event: { type: "capture:request", payload: { batchId: B1 } } }], s1)).toBe(s1);
  });
});
