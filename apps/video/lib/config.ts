// 현장에서 조정하는 값은 모두 여기 모은다 (spec §12). 값만 바꾸면 되도록 다른 곳에 숫자를 직접 쓰지 않는다.
export const config = {
  capture: {
    front: { maxAbsYaw: 5, maxAbsPitch: 15 },
    side: { minYaw: 35, maxYaw: 55, maxAbsPitch: 15 },
    // 얼굴 크기 = 얼굴 상자 너비 ÷ 프레임 너비 (0~1)
    faceSize: { min: 0.18, max: 0.6 },
    // 얼굴 중심이 프레임 가운데에서 벗어나도 되는 정도 (0~1 좌표 기준, 가로·세로 각각)
    centerTolerance: { x: 0.15, y: 0.18 },
    // 얼굴 영역 평균 밝기(0~1)가 이 값보다 낮으면 어두움 안내 (막지 않음)
    darkBrightness: 0.25,
    holdMs: 1000,
    manualAfterMs: 15000,
    jpegQuality: 0.92,
  },
  media: {
    idealWidths: [1920, 1280] as const,
  },
  photos: {
    signedUrlSeconds: 600,
  },
  interp: {
    model: "claude-haiku-5-5",
    timeoutMs: 3000,
    maxChars: 500,
    captionLines: 3,
    duckVolume: 0.2,
  },
  opinion: {
    model: "claude-sonnet-5-5",
    effort: "medium" as const,
    timeoutMs: 30000,
  },
  ice: {
    publicStun: ["stun:stun.l.google.com:19302"],
  },
} as const;
