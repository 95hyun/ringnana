// MediaPipe 결과 → FrameAnalysis 변환 순수 함수 (브라우저·MediaPipe 의존 없음, spec §5.4 표기 약속)
import type { FrameAnalysis } from "@/lib/contracts";

export type FaceMatrix = { rows: number; columns: number; data: ArrayLike<number> };
export type FacePoint = { x: number; y: number };
export type FaceBox = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  size: number;
  center: { x: number; y: number };
};
export type FaceResultLike = {
  faceLandmarks: FacePoint[][];
  facialTransformationMatrixes?: FaceMatrix[];
};

// 웹캠 점검에서 좌우·상하가 반대로 나오면 이 두 값만 -1 로 바꾼다.
export const YAW_SIGN = 1;
export const PITCH_SIGN = 1;

const toDeg = (r: number) => (r * 180) / Math.PI;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

export const EMPTY_ANALYSIS: FrameAnalysis = {
  faceCount: 0,
  yaw: null,
  pitch: null,
  faceSize: null,
  faceCenter: null,
  brightness: null,
};

/**
 * 얼굴 변환 행렬(4x4, 열 우선) → yaw/pitch(도).
 * 얼굴 앞 방향(정준 얼굴의 +Z)이 행렬로 어디를 향하는지(3번째 열)로 계산한다.
 * MediaPipe 정준 얼굴 좌표: +X = 환자 본인 왼쪽(원본 화면의 오른쪽), +Y = 위, +Z = 카메라 쪽.
 */
export function poseFromMatrix(m: FaceMatrix | undefined): { yaw: number | null; pitch: number | null } {
  if (!m || m.rows !== 4 || m.columns !== 4 || m.data.length < 16) return { yaw: null, pitch: null };
  // 열 우선: R[row][col] = data[col * 4 + row] → 3번째 열 = data[8..10]
  const fx = m.data[8];
  const fy = m.data[9];
  const fz = m.data[10];
  if (![fx, fy, fz].every(Number.isFinite) || (fx === 0 && fy === 0 && fz === 0)) {
    return { yaw: null, pitch: null };
  }
  // 부호 변환(앞 방향 +X → yaw 양수 = 환자 본인 왼쪽, +Y → pitch 양수 = 위)은 추측이므로 실제 웹캠으로 반드시 확인할 것 (사람 점검표).
  const yaw = YAW_SIGN * toDeg(Math.atan2(fx, fz));
  const pitch = PITCH_SIGN * toDeg(Math.atan2(fy, Math.hypot(fx, fz)));
  return { yaw, pitch };
}

/** 정규화 랜드마크(0~1, 원본 프레임) → 얼굴 상자. 크기 = 상자 너비 ÷ 프레임 너비. */
export function faceBox(points: ArrayLike<FacePoint>): FaceBox | null {
  if (points.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < points.length; i++) {
    const { x, y } = points[i];
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  if (![minX, minY, maxX, maxY].every(Number.isFinite)) return null;
  minX = clamp01(minX);
  maxX = clamp01(maxX);
  minY = clamp01(minY);
  maxY = clamp01(maxY);
  return {
    minX,
    minY,
    maxX,
    maxY,
    size: maxX - minX,
    center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 },
  };
}

/** RGBA 픽셀 → 평균 휘도 0~1 (BT.601, 알파 무시). 픽셀이 없으면 null. */
export function meanLuminance(rgba: ArrayLike<number>): number | null {
  const n = Math.floor(rgba.length / 4);
  if (n === 0) return null;
  let sum = 0;
  for (let i = 0; i < n * 4; i += 4) {
    sum += 0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2];
  }
  return clamp01(sum / n / 255);
}

/** 한 프레임 결과 → FrameAnalysis. 얼굴이 여럿이면 개수만 세고 값은 가장 큰 얼굴 기준. */
export function buildFrameAnalysis(
  result: FaceResultLike,
  brightnessOf: (box: FaceBox) => number | null,
): FrameAnalysis {
  const faceCount = result.faceLandmarks.length;
  let best = -1;
  let bestBox: FaceBox | null = null;
  result.faceLandmarks.forEach((points, i) => {
    const box = faceBox(points);
    if (box && (!bestBox || box.size > bestBox.size)) {
      best = i;
      bestBox = box;
    }
  });
  const box = bestBox as FaceBox | null;
  if (!box) return { ...EMPTY_ANALYSIS, faceCount };
  const { yaw, pitch } = poseFromMatrix(result.facialTransformationMatrixes?.[best]);
  return {
    faceCount,
    yaw,
    pitch,
    faceSize: box.size,
    faceCenter: box.center,
    brightness: brightnessOf(box),
  };
}
