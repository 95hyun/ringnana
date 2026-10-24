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
    // ✔ 표시 후 다음 단계 판단을 시작하기까지 쉬는 시간
    stepCooldownMs: 900,
    // 제출 요청 상한 — 멈추면 통화 종료 대기도 함께 막히므로 끊는다
    submitTimeoutMs: 30000,
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
  // spec §16 한 대 시연 모드
  demo: {
    heartbeatMs: 1000,
    // 상대 창 신호가 이 시간 동안 없으면 닫힌 것으로 본다
    peerTimeoutMs: 3500,
    // 듣기 잠금 해제 알림을 놓쳐도 이 시간 뒤에는 풀린다
    listenLockMaxMs: 15000,
    phrases: {
      patient: [
        "施術後に赤みは出ますか？",
        "何回くらい通えばいいですか？",
        "日焼け止めは使ってもいいですか？",
        "帰国してからのケアはどうすればいいですか？",
      ],
      doctor: [
        "시술 후 이틀 정도 붉은기가 있을 수 있습니다.",
        "레이저 토닝은 2주 간격으로 5회를 권합니다.",
        "시술 당일부터 자외선 차단제를 발라 주세요.",
      ],
    },
  },
  ice: {
    publicStun: ["stun:stun.l.google.com:19302"],
  },
} as const;
