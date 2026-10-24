// 환자 브라우저 전용 얼굴 분석 어댑터. MediaPipe 는 함수 안에서만 불러와 SSR·빌드에 영향을 주지 않는다.
import type { FaceLandmarker } from "@mediapipe/tasks-vision";
import type { FrameAnalysis } from "@/video/lib/contracts";
import { buildFrameAnalysis, EMPTY_ANALYSIS, meanLuminance, type FaceBox } from "./math";

export type FaceAnalyzer = {
  /** video 의 현재 프레임(반전 없는 원본)을 분석한다. nowMs 는 performance.now() 같은 증가하는 시각. */
  analyze(video: HTMLVideoElement, nowMs: number): FrameAnalysis;
  close(): void;
};

// wasm·모델은 public/mediapipe/ 에서만 제공 (외부 CDN 금지, spec §11-3)
const WASM_BASE = "/mediapipe";
const MODEL_PATH = "/mediapipe/face_landmarker.task";
// 2명 이상 감지 안내를 위해 최소 2
const NUM_FACES = 2;
// 밝기는 얼굴 상자를 이 크기로 줄여 평균 낸다
const SAMPLE_SIZE = 32;

export async function createFaceAnalyzer(): Promise<FaceAnalyzer> {
  if (typeof window === "undefined") throw new Error("createFaceAnalyzer: browser only");
  const { FaceLandmarker, FilesetResolver } = await import("@mediapipe/tasks-vision");
  const fileset = await FilesetResolver.forVisionTasks(WASM_BASE);

  const make = (delegate: "GPU" | "CPU") =>
    FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: MODEL_PATH, delegate },
      runningMode: "VIDEO",
      numFaces: NUM_FACES,
      outputFacialTransformationMatrixes: true,
      outputFaceBlendshapes: false,
    });
  let landmarker: FaceLandmarker;
  try {
    landmarker = await make("GPU");
  } catch {
    landmarker = await make("CPU");
  }

  const canvas = document.createElement("canvas");
  canvas.width = SAMPLE_SIZE;
  canvas.height = SAMPLE_SIZE;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  let lastTs = -Infinity;
  let closed = false;

  const brightnessOf = (video: HTMLVideoElement) => (box: FaceBox) => {
    if (!ctx) return null;
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const sx = box.minX * vw;
    const sy = box.minY * vh;
    const sw = (box.maxX - box.minX) * vw;
    const sh = (box.maxY - box.minY) * vh;
    if (sw < 1 || sh < 1) return null;
    try {
      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
      return meanLuminance(ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE).data);
    } catch {
      return null;
    }
  };

  return {
    analyze(video, nowMs) {
      if (closed || video.readyState < 2 || video.videoWidth === 0 || video.videoHeight === 0) {
        return EMPTY_ANALYSIS;
      }
      // detectForVideo 는 시각이 반드시 증가해야 한다
      const ts = nowMs > lastTs ? nowMs : lastTs + 1;
      lastTs = ts;
      const result = landmarker.detectForVideo(video, ts);
      return buildFrameAnalysis(result, brightnessOf(video));
    },
    close() {
      if (closed) return;
      closed = true;
      landmarker.close();
    },
  };
}
