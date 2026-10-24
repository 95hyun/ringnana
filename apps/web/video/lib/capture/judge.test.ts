import { describe, expect, it } from "vitest";
import type { FrameAnalysis } from "../contracts";
import { config } from "../config";
import { createCaptureJudge, createJudgeState, evaluateFrame, judgeFrame, resetStep } from "./judge";

const { holdMs, manualAfterMs } = config.capture;

// 모든 막는 조건을 통과하는 기본 프레임 (정면)
const ok = (over: Partial<FrameAnalysis> = {}): FrameAnalysis => ({
  faceCount: 1,
  yaw: 0,
  pitch: 0,
  faceSize: 0.3,
  faceCenter: { x: 0.5, y: 0.5 },
  brightness: 0.6,
  ...over,
});

const noFace: FrameAnalysis = {
  faceCount: 0,
  yaw: null,
  pitch: null,
  faceSize: null,
  faceCenter: null,
  brightness: null,
};

describe("evaluateFrame — 각도 경계값", () => {
  it("정면: |yaw| ≤ 5 통과, 넘으면 막음", () => {
    expect(evaluateFrame(ok({ yaw: 5 }), "front").block).toBeNull();
    expect(evaluateFrame(ok({ yaw: -5 }), "front").block).toBeNull();
    expect(evaluateFrame(ok({ yaw: 5.1 }), "front").block).toBe("angleOver");
    expect(evaluateFrame(ok({ yaw: -5.1 }), "front").block).toBe("angleOver");
  });

  it("좌측: yaw 35~55 안은 통과, 밖은 부족/초과", () => {
    expect(evaluateFrame(ok({ yaw: 35 }), "left").block).toBeNull();
    expect(evaluateFrame(ok({ yaw: 55 }), "left").block).toBeNull();
    expect(evaluateFrame(ok({ yaw: 34.9 }), "left").block).toBe("angleShort");
    expect(evaluateFrame(ok({ yaw: 55.1 }), "left").block).toBe("angleOver");
  });

  it("우측: yaw −35~−55 안은 통과, 밖은 부족/초과", () => {
    expect(evaluateFrame(ok({ yaw: -35 }), "right").block).toBeNull();
    expect(evaluateFrame(ok({ yaw: -55 }), "right").block).toBeNull();
    expect(evaluateFrame(ok({ yaw: -34.9 }), "right").block).toBe("angleShort");
    expect(evaluateFrame(ok({ yaw: -55.1 }), "right").block).toBe("angleOver");
  });

  it("pitch ±15 안은 통과, 넘으면 막음 (모든 단계)", () => {
    for (const [step, yaw] of [["front", 0], ["left", 45], ["right", -45]] as const) {
      expect(evaluateFrame(ok({ yaw, pitch: 15 }), step).block).toBeNull();
      expect(evaluateFrame(ok({ yaw, pitch: -15 }), step).block).toBeNull();
      expect(evaluateFrame(ok({ yaw, pitch: 15.1 }), step).block).toBe("angleOver");
      expect(evaluateFrame(ok({ yaw, pitch: -15.1 }), step).block).toBe("angleOver");
    }
  });
});

describe("evaluateFrame — 좌우 부호", () => {
  it("yaw 양수는 left를 만족하고 right는 만족하지 않는다", () => {
    expect(evaluateFrame(ok({ yaw: 45 }), "left").block).toBeNull();
    expect(evaluateFrame(ok({ yaw: 45 }), "right").block).toBe("angleShort");
  });

  it("yaw 음수는 right를 만족하고 left는 만족하지 않는다", () => {
    expect(evaluateFrame(ok({ yaw: -45 }), "right").block).toBeNull();
    expect(evaluateFrame(ok({ yaw: -45 }), "left").block).toBe("angleShort");
  });
});

describe("evaluateFrame — 막는 조건과 어두움", () => {
  it("얼굴 없음은 막는다", () => {
    expect(evaluateFrame(noFace, "front").block).toBe("noFace");
  });

  it("얼굴이 있다고 해도 분석값이 비어 있으면 얼굴 없음으로 막는다", () => {
    expect(evaluateFrame(ok({ yaw: null }), "front").block).toBe("noFace");
    expect(evaluateFrame(ok({ faceSize: null }), "front").block).toBe("noFace");
    expect(evaluateFrame(ok({ faceCenter: null }), "front").block).toBe("noFace");
  });

  it("얼굴 2개 이상은 막는다", () => {
    expect(evaluateFrame(ok({ faceCount: 2 }), "front").block).toBe("multipleFaces");
    expect(evaluateFrame(ok({ faceCount: 3 }), "front").block).toBe("multipleFaces");
  });

  it("너무 작거나 크면 막는다", () => {
    const { min, max } = config.capture.faceSize;
    expect(evaluateFrame(ok({ faceSize: min }), "front").block).toBeNull();
    expect(evaluateFrame(ok({ faceSize: max }), "front").block).toBeNull();
    expect(evaluateFrame(ok({ faceSize: min - 0.01 }), "front").block).toBe("tooSmall");
    expect(evaluateFrame(ok({ faceSize: max + 0.01 }), "front").block).toBe("tooLarge");
  });

  it("가운데에서 벗어나면 막는다 (가로·세로)", () => {
    const { x, y } = config.capture.centerTolerance;
    expect(evaluateFrame(ok({ faceCenter: { x: 0.5 + x - 0.001, y: 0.5 - y + 0.001 } }), "front").block).toBeNull();
    expect(evaluateFrame(ok({ faceCenter: { x: 0.5 + x + 0.01, y: 0.5 } }), "front").block).toBe("offCenter");
    expect(evaluateFrame(ok({ faceCenter: { x: 0.5 - x - 0.01, y: 0.5 } }), "front").block).toBe("offCenter");
    expect(evaluateFrame(ok({ faceCenter: { x: 0.5, y: 0.5 + y + 0.01 } }), "front").block).toBe("offCenter");
    expect(evaluateFrame(ok({ faceCenter: { x: 0.5, y: 0.5 - y - 0.01 } }), "front").block).toBe("offCenter");
  });

  it("어두우면 안내하지만 막지 않는다", () => {
    const dark = config.capture.darkBrightness;
    const r = evaluateFrame(ok({ brightness: dark - 0.01 }), "front");
    expect(r.dark).toBe(true);
    expect(r.block).toBeNull();
    expect(evaluateFrame(ok({ brightness: dark }), "front").dark).toBe(false);
    expect(evaluateFrame(noFace, "front").dark).toBe(false);
  });

  it("어두워도 유지 타이머가 진행되어 촬영된다", () => {
    let s = createJudgeState("front", 0);
    const frame = ok({ brightness: 0.05 });
    s = judgeFrame(s, frame, 100).state;
    const r = judgeFrame(s, frame, 100 + holdMs);
    expect(r.verdict.captureNow).toBe(true);
  });
});

describe("evaluateFrame — 안내 우선순위", () => {
  it("여러 조건이 겹치면 표의 위쪽 하나만 안내한다", () => {
    // 2명 + 작음 + 벗어남 + 각도 → 2명
    expect(
      evaluateFrame(ok({ faceCount: 2, faceSize: 0.05, faceCenter: { x: 0, y: 0 }, yaw: 80 }), "front").block,
    ).toBe("multipleFaces");
    // 작음 + 벗어남 + 각도 → 작음
    expect(evaluateFrame(ok({ faceSize: 0.05, faceCenter: { x: 0, y: 0 }, yaw: 80 }), "front").block).toBe(
      "tooSmall",
    );
    // 큼 + 벗어남 → 큼
    expect(evaluateFrame(ok({ faceSize: 0.9, faceCenter: { x: 0, y: 0 } }), "front").block).toBe("tooLarge");
    // 벗어남 + 각도 부족 → 벗어남
    expect(evaluateFrame(ok({ faceCenter: { x: 0, y: 0 }, yaw: 0 }), "left").block).toBe("offCenter");
    // 얼굴 0개는 다른 값과 무관하게 최우선
    expect(evaluateFrame({ ...ok({ faceSize: 0.05 }), faceCount: 0 }, "front").block).toBe("noFace");
  });
});

describe("evaluateFrame — 진행바", () => {
  it("측면: 목표 각도까지 돌린 정도 (0~1)", () => {
    const { minYaw } = config.capture.side;
    expect(evaluateFrame(ok({ yaw: 0 }), "left").progress).toBe(0);
    expect(evaluateFrame(ok({ yaw: minYaw / 2 }), "left").progress).toBeCloseTo(0.5);
    expect(evaluateFrame(ok({ yaw: minYaw }), "left").progress).toBe(1);
    expect(evaluateFrame(ok({ yaw: 70 }), "left").progress).toBe(1);
    expect(evaluateFrame(ok({ yaw: -20 }), "left").progress).toBe(0);
    expect(evaluateFrame(ok({ yaw: -minYaw / 2 }), "right").progress).toBeCloseTo(0.5);
    expect(evaluateFrame(ok({ yaw: 20 }), "right").progress).toBe(0);
  });

  it("정면: 정면에 가까울수록 1", () => {
    expect(evaluateFrame(ok({ yaw: 0 }), "front").progress).toBe(1);
    expect(evaluateFrame(ok({ yaw: -5 }), "front").progress).toBe(1);
    const p10 = evaluateFrame(ok({ yaw: 10 }), "front").progress;
    const p20 = evaluateFrame(ok({ yaw: -20 }), "front").progress;
    expect(p10).toBeLessThan(1);
    expect(p20).toBeLessThan(p10);
    expect(evaluateFrame(ok({ yaw: 90 }), "front").progress).toBe(0);
  });

  it("얼굴이 없으면 0", () => {
    expect(evaluateFrame(noFace, "front").progress).toBe(0);
    expect(evaluateFrame(noFace, "left").progress).toBe(0);
  });
});

describe("judgeFrame — 유지 타이머와 자동 촬영", () => {
  it("1초 동안 끊기지 않고 통과하면 '지금 촬영'을 한 번 낸다", () => {
    let s = createJudgeState("left", 0);
    const f = ok({ yaw: 45 });
    let r = judgeFrame(s, f, 1000);
    expect(r.verdict.captureNow).toBe(false);
    expect(r.verdict.holding).toBe(true);
    expect(r.verdict.holdProgress).toBe(0);
    s = r.state;
    r = judgeFrame(s, f, 1000 + holdMs / 2);
    expect(r.verdict.captureNow).toBe(false);
    expect(r.verdict.holdProgress).toBeCloseTo(0.5);
    s = r.state;
    r = judgeFrame(s, f, 1000 + holdMs - 1);
    expect(r.verdict.captureNow).toBe(false);
    s = r.state;
    r = judgeFrame(s, f, 1000 + holdMs);
    expect(r.verdict.captureNow).toBe(true);
    expect(r.verdict.holdProgress).toBe(1);
    s = r.state;
    // 이미 찍었으므로 같은 단계에서는 다시 내지 않는다
    r = judgeFrame(s, f, 1000 + holdMs * 3);
    expect(r.verdict.captureNow).toBe(false);
  });

  it("중간에 하나라도 벗어나면 타이머를 0으로 되돌린다", () => {
    let s = createJudgeState("front", 0);
    s = judgeFrame(s, ok(), 0).state;
    s = judgeFrame(s, ok(), 900).state;
    const broken = judgeFrame(s, ok({ faceCount: 2 }), 950);
    expect(broken.verdict.holding).toBe(false);
    expect(broken.verdict.holdProgress).toBe(0);
    s = broken.state;
    // 다시 통과 시작 시점부터 1초가 필요하다
    s = judgeFrame(s, ok(), 1000).state;
    let r = judgeFrame(s, ok(), 1999);
    expect(r.verdict.captureNow).toBe(false);
    r = judgeFrame(r.state, ok(), 2000);
    expect(r.verdict.captureNow).toBe(true);
  });

  it("상태를 직접 바꾸지 않는다 (순수 함수)", () => {
    const s = createJudgeState("front", 0);
    const snapshot = JSON.stringify(s);
    judgeFrame(s, ok(), 500);
    expect(JSON.stringify(s)).toBe(snapshot);
  });
});

describe("judgeFrame — 수동 촬영", () => {
  it("단계 시작 후 15초가 지나면 수동 촬영이 가능해진다", () => {
    let s = createJudgeState("left", 10_000);
    let r = judgeFrame(s, noFace, 10_000 + manualAfterMs - 1);
    expect(r.verdict.manualAvailable).toBe(false);
    s = r.state;
    r = judgeFrame(s, noFace, 10_000 + manualAfterMs);
    expect(r.verdict.manualAvailable).toBe(true);
  });

  it("단계 초기화(새 단계·재촬영)하면 15초를 다시 센다", () => {
    let s = createJudgeState("front", 0);
    s = judgeFrame(s, noFace, manualAfterMs).state;
    s = resetStep("left", 20_000);
    expect(s.step).toBe("left");
    const r = judgeFrame(s, noFace, 20_000 + manualAfterMs - 1);
    expect(r.verdict.manualAvailable).toBe(false);
    expect(judgeFrame(r.state, noFace, 20_000 + manualAfterMs).verdict.manualAvailable).toBe(true);
  });

  it("자동 촬영이 된 단계에서는 수동 버튼을 내지 않는다", () => {
    let s = createJudgeState("front", 0);
    s = judgeFrame(s, ok(), 14_000).state;
    const r = judgeFrame(s, ok(), 14_000 + holdMs);
    expect(r.verdict.captureNow).toBe(true);
    expect(judgeFrame(r.state, ok(), 20_000).verdict.manualAvailable).toBe(false);
  });
});

describe("createCaptureJudge — 상태를 품은 래퍼", () => {
  it("update로 프레임을 넣고 reset으로 단계를 바꾼다", () => {
    const judge = createCaptureJudge("front", 0);
    judge.update(ok(), 0);
    expect(judge.update(ok(), holdMs).captureNow).toBe(true);
    judge.reset("left", 5000);
    expect(judge.state.step).toBe("left");
    const v = judge.update(ok({ yaw: 10 }), 5000);
    expect(v.block).toBe("angleShort");
    expect(v.captureNow).toBe(false);
  });
});
