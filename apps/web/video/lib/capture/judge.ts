// 촬영 판단 (spec §5.4) — 화면·카메라와 무관한 순수 로직. T7이 영상 프레임마다 호출한다.
import { config } from "../config";
import type { FrameAnalysis, PhotoAngle } from "../contracts";

export type CaptureStep = PhotoAngle;

// 막는 조건 — 배열 순서가 곧 안내 우선순위다 (spec §5.4 표 위에서부터)
export const BLOCK_REASONS = [
  "noFace",
  "multipleFaces",
  "tooSmall",
  "tooLarge",
  "offCenter",
  "angleShort",
  "angleOver",
] as const;
export type BlockReason = (typeof BLOCK_REASONS)[number];

export type FrameEvaluation = {
  block: BlockReason | null; // 첫 번째 막는 조건 하나 (없으면 null = 가이드 초록)
  dark: boolean; // 어두움 안내 (막지 않음)
  progress: number; // 진행바 0~1
};

export type CaptureJudgeState = {
  step: CaptureStep;
  stepStartedAt: number; // 단계 시작 시각 (수동 버튼 기준)
  holdStartedAt: number | null; // 막는 조건을 모두 통과하기 시작한 시각
  captured: boolean; // 이 단계에서 자동 촬영을 이미 냈는지
};

export type CaptureVerdict = FrameEvaluation & {
  holding: boolean; // 유지 타이머 진행 중
  holdProgress: number; // 유지 타이머 0~1
  captureNow: boolean; // 이번 프레임에서 자동 촬영
  manualAvailable: boolean; // [手動で撮影] 노출
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** 한 프레임만 보고 막는 조건·어두움·진행바를 계산한다 (상태 없음). */
export function evaluateFrame(frame: FrameAnalysis, step: CaptureStep): FrameEvaluation {
  const c = config.capture;
  const { faceCount, yaw, pitch, faceSize, faceCenter, brightness } = frame;
  const dark = faceCount >= 1 && brightness !== null && brightness < c.darkBrightness;

  // 분석값이 비면 판단할 수 없으므로 얼굴 없음으로 본다
  if (faceCount < 1 || yaw === null || pitch === null || faceSize === null || faceCenter === null) {
    return { block: "noFace", dark: false, progress: 0 };
  }

  const progress = angleProgress(yaw, step);
  const result = (block: BlockReason | null): FrameEvaluation => ({ block, dark, progress });

  if (faceCount > 1) return result("multipleFaces");
  if (faceSize < c.faceSize.min) return result("tooSmall");
  if (faceSize > c.faceSize.max) return result("tooLarge");
  if (
    Math.abs(faceCenter.x - 0.5) > c.centerTolerance.x ||
    Math.abs(faceCenter.y - 0.5) > c.centerTolerance.y
  ) {
    return result("offCenter");
  }

  if (step === "front") {
    // 정면은 화살표가 없으므로 yaw·pitch 이탈은 모두 '되돌리기' 안내
    if (Math.abs(yaw) > c.front.maxAbsYaw || Math.abs(pitch) > c.front.maxAbsPitch) {
      return result("angleOver");
    }
    return result(null);
  }

  // 목표 방향으로 돌린 각도 (left는 yaw 그대로, right는 부호 반전)
  const turned = step === "left" ? yaw : -yaw;
  if (turned < c.side.minYaw) return result("angleShort");
  // pitch 이탈은 별도 문구가 없어 '조금만 되돌리기'로 안내한다
  if (turned > c.side.maxYaw || Math.abs(pitch) > c.side.maxAbsPitch) return result("angleOver");
  return result(null);
}

function angleProgress(yaw: number, step: CaptureStep): number {
  const c = config.capture;
  if (step === "front") {
    // 허용 범위 안이면 1, 측면 목표 시작 각도에 이르면 0
    const over = Math.abs(yaw) - c.front.maxAbsYaw;
    return clamp01(1 - over / (c.side.minYaw - c.front.maxAbsYaw));
  }
  const turned = step === "left" ? yaw : -yaw;
  return clamp01(turned / c.side.minYaw);
}

/** 새 단계 진입·재촬영 시의 초기 상태. */
export function resetStep(step: CaptureStep, now: number): CaptureJudgeState {
  return { step, stepStartedAt: now, holdStartedAt: null, captured: false };
}

export const createJudgeState = resetStep;

/** 순수 리듀서: 이전 상태 + 프레임 + 시각 → 다음 상태와 판단 결과. */
export function judgeFrame(
  state: CaptureJudgeState,
  frame: FrameAnalysis,
  now: number,
): { state: CaptureJudgeState; verdict: CaptureVerdict } {
  const { holdMs, manualAfterMs } = config.capture;
  const evaluation = evaluateFrame(frame, state.step);

  let holdStartedAt: number | null = null;
  let captured = state.captured;
  let captureNow = false;
  let holdProgress = 0;

  if (evaluation.block === null && !state.captured) {
    holdStartedAt = state.holdStartedAt ?? now;
    const elapsed = now - holdStartedAt;
    holdProgress = clamp01(elapsed / holdMs);
    if (elapsed >= holdMs) {
      captureNow = true;
      captured = true;
    }
  }

  const next: CaptureJudgeState = { ...state, holdStartedAt, captured };
  const verdict: CaptureVerdict = {
    ...evaluation,
    holding: holdStartedAt !== null && !captureNow,
    holdProgress,
    captureNow,
    manualAvailable: !captured && now - state.stepStartedAt >= manualAfterMs,
  };
  return { state: next, verdict };
}

export type CaptureJudge = {
  readonly state: CaptureJudgeState;
  update: (frame: FrameAnalysis, now: number) => CaptureVerdict;
  reset: (step: CaptureStep, now: number) => void;
};

/** 상태를 내부에 품은 편의 래퍼 (React ref 등에 담아 쓴다). */
export function createCaptureJudge(step: CaptureStep, now: number): CaptureJudge {
  let state = resetStep(step, now);
  return {
    get state() {
      return state;
    },
    update(frame, t) {
      const r = judgeFrame(state, frame, t);
      state = r.state;
      return r.verdict;
    },
    reset(nextStep, t) {
      state = resetStep(nextStep, t);
    },
  };
}
