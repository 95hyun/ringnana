// 작업 간 유일한 약속 (spec §7·§8, plan "끼움 약속"). 이 파일의 형식은 바꾸지 않는다.
import type { CaptureMode, PhotoAngle } from "./supabase/types";

export type { CaptureMode, PhotoAngle } from "./supabase/types";

export type Role = "doctor" | "patient";
export type UiLang = "ja" | "ko";
export type SpeechLang = "ko" | "ja";

/* ───────────── 얼굴 분석 (T2 → T1) ───────────── */

// 크기·위치·밝기는 0~1, 반전하지 않은 원본 프레임 기준. yaw 양수 = 환자 본인 왼쪽, pitch 양수 = 위.
export type FrameAnalysis = {
  faceCount: number;
  yaw: number | null;
  pitch: number | null;
  faceSize: number | null;
  faceCenter: { x: number; y: number } | null;
  brightness: number | null;
};

/* ───────────── 서버 API (spec §7) ───────────── */

// POST /api/capture (multipart) — meta 필드는 이 배열을 JSON 문자열로 보낸다
export type CaptureMetaItem = {
  angle: PhotoAngle;
  captureMode: CaptureMode;
  yaw: number | null;
  pitch: number | null;
};
export type CaptureSubmitOk = { batchId: string; status: "saved" | "already_saved" };
export type ApiError = { error: string };

// GET /api/capture/latest?sessionId=
export type LatestPhoto = {
  angle: PhotoAngle;
  url: string;
  captureMode: CaptureMode;
  yaw: number | null;
  pitch: number | null;
};
export type LatestBatch = { batchId: string; createdAt: string; photos: LatestPhoto[] };
export type CaptureLatestOk = { batch: LatestBatch | null };

// POST /api/translate
export type TranslateRequest = { text: string; from: SpeechLang; to: SpeechLang };
export type TranslateResponse = { text: string; failed: boolean };

// POST /api/opinion/translate
export type OpinionTranslateRequest = { consultationId: string };
export type OpinionTranslateResponse = { status: "done" | "failed" | "stale" };

// GET /api/ice
export type IceResponse = { iceServers: RTCIceServer[] };

/* ───────────── 실시간 채널 (spec §8) ───────────── */

export const channelName = (sessionId: string) => `video:${sessionId}`;

export type PresenceState = { role: Role; tabId: string; joinedAt: number };

export type SignalPayload =
  | { from: Role; tabId: string; kind: "offer" | "answer"; data: { type: RTCSdpType; sdp: string } }
  | { from: Role; tabId: string; kind: "ice"; data: RTCIceCandidateInit };

export type CaptionPayload = {
  id: string; // UUID
  speaker: Role;
  srcLang: SpeechLang;
  srcText: string;
  dstLang: SpeechLang;
  dstText: string;
  failed: boolean;
};

export type RoomEvent =
  | { type: "signal"; payload: SignalPayload }
  | { type: "capture:request"; payload: { batchId: string } }
  | { type: "capture:progress"; payload: { batchId: string; angle: PhotoAngle } }
  | { type: "capture:done"; payload: { batchId: string } }
  | { type: "capture:cancel"; payload: { batchId: string } }
  | { type: "call:end"; payload: Record<string, never> }
  | { type: "interp:caption"; payload: CaptionPayload };

export type RoomEventType = RoomEvent["type"];

/* ───────────── 방 화면 ↔ 촬영·통역 끼움 약속 (plan "끼움 약속") ───────────── */

export type RoomContext = {
  sessionId: string;
  role: Role;
  uiLang: UiLang; // 환자 화면 언어 (의사는 항상 ko)
  localStream: MediaStream | null; // 카메라+마이크 (반전 없는 원본)
  remoteAudio: HTMLMediaElement | null; // 상대 원음 — 통역 읽기 중 볼륨 조절용
  peerPresent: boolean; // 상대(유효한 창) 입장 여부
  micMuted: boolean;
  testMode: boolean; // ?test=1
  send: (event: RoomEvent) => void;
  on: (handler: (event: RoomEvent) => void) => () => void;
  setPatientLayout: (mode: "call" | "capture") => void;
  registerEndGuard: (guard: () => Promise<void>) => () => void;
};

export type CaptureSlotArea = "stage";
export type InterpSlotArea = "remoteCaption" | "selfCaption" | "controls";

// 통역 언어는 역할로 고정 (spec §4.2)
export const speechLangOf = (role: Role): SpeechLang => (role === "doctor" ? "ko" : "ja");
export const bcp47Of = (lang: SpeechLang) => (lang === "ko" ? "ko-KR" : "ja-JP");
