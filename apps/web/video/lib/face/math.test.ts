import { describe, expect, it } from "vitest";
import {
  buildFrameAnalysis,
  faceBox,
  meanLuminance,
  poseFromMatrix,
  type FaceMatrix,
} from "./math";

const rad = (deg: number) => (deg * Math.PI) / 180;

// 3x3 회전을 4x4 열 우선(column-major) 배열로 — MediaPipe Matrix.data 와 같은 배치
function toColumnMajor(r: number[][], t: [number, number, number] = [0, 0, -50]): FaceMatrix {
  const data: number[] = [];
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      if (col < 3 && row < 3) data.push(r[row][col]);
      else if (col === 3 && row < 3) data.push(t[row]);
      else data.push(row === 3 && col === 3 ? 1 : 0);
    }
  }
  return { rows: 4, columns: 4, data };
}

// Y축 회전 (오른손 좌표계): 얼굴 앞(+Z)이 +X 쪽으로 간다
const rotY = (deg: number) => {
  const c = Math.cos(rad(deg));
  const s = Math.sin(rad(deg));
  return [
    [c, 0, s],
    [0, 1, 0],
    [-s, 0, c],
  ];
};
// X축 회전: 양의 각도면 얼굴 앞(+Z)이 -Y 쪽(아래)으로 간다
const rotX = (deg: number) => {
  const c = Math.cos(rad(deg));
  const s = Math.sin(rad(deg));
  return [
    [1, 0, 0],
    [0, c, -s],
    [0, s, c],
  ];
};
const mul = (a: number[][], b: number[][]) =>
  a.map((row) => b[0].map((_, j) => row.reduce((sum, v, k) => sum + v * b[k][j], 0)));

describe("poseFromMatrix", () => {
  it("단위 행렬이면 정면 (yaw 0, pitch 0)", () => {
    const p = poseFromMatrix(toColumnMajor(rotY(0)));
    expect(p.yaw).toBeCloseTo(0, 6);
    expect(p.pitch).toBeCloseTo(0, 6);
  });

  it("얼굴 앞이 +X(환자 본인 왼쪽)로 돌면 yaw 양수", () => {
    expect(poseFromMatrix(toColumnMajor(rotY(40))).yaw).toBeCloseTo(40, 6);
    expect(poseFromMatrix(toColumnMajor(rotY(-45))).yaw).toBeCloseTo(-45, 6);
  });

  it("얼굴 앞이 +Y(위)로 가면 pitch 양수", () => {
    // rotX(-20): 앞이 위로 20°
    expect(poseFromMatrix(toColumnMajor(rotX(-20))).pitch).toBeCloseTo(20, 6);
    expect(poseFromMatrix(toColumnMajor(rotX(10))).pitch).toBeCloseTo(-10, 6);
  });

  it("yaw 와 pitch 가 섞여도 각각 분리된다", () => {
    const p = poseFromMatrix(toColumnMajor(mul(rotY(30), rotX(-10))));
    expect(p.yaw).toBeCloseTo(30, 6);
    expect(p.pitch).toBeCloseTo(10, 6);
  });

  it("행렬에 배율이 섞여 있어도 각도는 같다", () => {
    const scaled = rotY(35).map((row) => row.map((v) => v * 2.5));
    expect(poseFromMatrix(toColumnMajor(scaled)).yaw).toBeCloseTo(35, 6);
  });

  it("형식이 이상한 행렬은 null", () => {
    expect(poseFromMatrix({ rows: 3, columns: 3, data: [1, 0, 0, 0, 1, 0, 0, 0, 1] })).toEqual({
      yaw: null,
      pitch: null,
    });
    expect(poseFromMatrix(undefined)).toEqual({ yaw: null, pitch: null });
  });
});

describe("faceBox", () => {
  it("점들의 상자에서 크기(너비 비율)와 중심을 낸다", () => {
    const b = faceBox([
      { x: 0.4, y: 0.3 },
      { x: 0.6, y: 0.5 },
      { x: 0.5, y: 0.7 },
    ]);
    expect(b).not.toBeNull();
    expect(b!.size).toBeCloseTo(0.2, 6);
    expect(b!.center.x).toBeCloseTo(0.5, 6);
    expect(b!.center.y).toBeCloseTo(0.5, 6);
    expect(b!.minX).toBeCloseTo(0.4, 6);
    expect(b!.maxY).toBeCloseTo(0.7, 6);
  });

  it("프레임 밖으로 나간 점은 0~1 로 자른다", () => {
    const b = faceBox([
      { x: -0.1, y: 0.2 },
      { x: 0.3, y: 1.2 },
    ])!;
    expect(b.minX).toBe(0);
    expect(b.maxY).toBe(1);
    expect(b.size).toBeCloseTo(0.3, 6);
    expect(b.center.x).toBeCloseTo(0.15, 6);
    expect(b.center.y).toBeCloseTo(0.6, 6);
  });

  it("점이 없으면 null", () => {
    expect(faceBox([])).toBeNull();
  });
});

describe("meanLuminance", () => {
  it("흰색은 1, 검정은 0", () => {
    expect(meanLuminance(new Uint8ClampedArray([255, 255, 255, 255]))).toBeCloseTo(1, 6);
    expect(meanLuminance(new Uint8ClampedArray([0, 0, 0, 255]))).toBeCloseTo(0, 6);
  });

  it("RGBA 픽셀들의 평균 휘도 (알파 무시)", () => {
    const px = new Uint8ClampedArray([255, 255, 255, 0, 0, 0, 0, 255]);
    expect(meanLuminance(px)).toBeCloseTo(0.5, 6);
  });

  it("초록이 빨강·파랑보다 밝게 계산된다 (BT.601)", () => {
    const g = meanLuminance(new Uint8ClampedArray([0, 255, 0, 255]))!;
    const r = meanLuminance(new Uint8ClampedArray([255, 0, 0, 255]))!;
    const b = meanLuminance(new Uint8ClampedArray([0, 0, 255, 255]))!;
    expect(g).toBeCloseTo(0.587, 3);
    expect(r).toBeCloseTo(0.299, 3);
    expect(b).toBeCloseTo(0.114, 3);
  });

  it("픽셀이 없으면 null", () => {
    expect(meanLuminance(new Uint8ClampedArray([]))).toBeNull();
  });
});

describe("buildFrameAnalysis", () => {
  const face = (cx: number, w: number) => [
    { x: cx - w / 2, y: 0.4 },
    { x: cx + w / 2, y: 0.6 },
  ];

  it("얼굴이 없으면 faceCount 0 이고 나머지는 null", () => {
    expect(
      buildFrameAnalysis({ faceLandmarks: [], facialTransformationMatrixes: [] }, () => 0.5),
    ).toEqual({
      faceCount: 0,
      yaw: null,
      pitch: null,
      faceSize: null,
      faceCenter: null,
      brightness: null,
    });
  });

  it("얼굴 하나면 각도·크기·위치·밝기를 모두 채운다", () => {
    const a = buildFrameAnalysis(
      { faceLandmarks: [face(0.5, 0.3)], facialTransformationMatrixes: [toColumnMajor(rotY(40))] },
      () => 0.42,
    );
    expect(a.faceCount).toBe(1);
    expect(a.yaw).toBeCloseTo(40, 6);
    expect(a.pitch).toBeCloseTo(0, 6);
    expect(a.faceSize).toBeCloseTo(0.3, 6);
    expect(a.faceCenter!.x).toBeCloseTo(0.5, 6);
    expect(a.faceCenter!.y).toBeCloseTo(0.5, 6);
    expect(a.brightness).toBe(0.42);
  });

  it("얼굴이 여러 개면 개수를 세고, 값은 가장 큰 얼굴 기준", () => {
    const a = buildFrameAnalysis(
      {
        faceLandmarks: [face(0.2, 0.1), face(0.7, 0.3)],
        facialTransformationMatrixes: [toColumnMajor(rotY(-10)), toColumnMajor(rotY(25))],
      },
      (box) => box.center.x,
    );
    expect(a.faceCount).toBe(2);
    expect(a.faceSize).toBeCloseTo(0.3, 6);
    expect(a.yaw).toBeCloseTo(25, 6);
    expect(a.brightness).toBeCloseTo(0.7, 6);
  });

  it("행렬이 빠져 있으면 각도만 null", () => {
    const a = buildFrameAnalysis(
      { faceLandmarks: [face(0.5, 0.3)], facialTransformationMatrixes: [] },
      () => 0.5,
    );
    expect(a.faceCount).toBe(1);
    expect(a.yaw).toBeNull();
    expect(a.pitch).toBeNull();
    expect(a.faceSize).toBeCloseTo(0.3, 6);
  });
});
