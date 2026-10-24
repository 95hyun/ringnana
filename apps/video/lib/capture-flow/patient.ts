// 환자 촬영 흐름 상태 (spec §5.1·§5.3~§5.6) — 화면·카메라와 무관한 순수 리듀서.
// 사진 데이터는 형식에 얽매이지 않도록 제네릭 I(브라우저에서는 Blob 등)로 둔다.
import type { CaptureMetaItem, PhotoAngle } from "@/lib/contracts";

export const CAPTURE_ORDER: readonly PhotoAngle[] = ["front", "left", "right"];

export type Shot<I> = { meta: CaptureMetaItem; image: I };
export type ShotSet<I> = Record<PhotoAngle, Shot<I>>;
export type BatchSource = "doctor" | "test";

type Batch = { batchId: string; source: BatchSource };

export type PatientState<I> =
  | { phase: "idle" }
  | (Batch & { phase: "consent"; consentedAt: string | null })
  | (Batch & {
      phase: "shooting";
      consentedAt: string;
      step: PhotoAngle;
      photos: Partial<ShotSet<I>>;
      retake: boolean; // 미리보기에서 한 장만 다시 찍는 중
    })
  | (Batch & { phase: "preview"; consentedAt: string; photos: ShotSet<I>; error: boolean })
  | (Batch & { phase: "submitting"; consentedAt: string; photos: ShotSet<I> })
  | (Batch & { phase: "submitted" });

export type PatientAction<I> =
  | { type: "request"; batchId: string } // 의사 capture:request
  | { type: "testStart"; batchId: string } // [撮影テスト]
  | { type: "cancel"; batchId: string } // 의사 capture:cancel
  | { type: "agree"; checked: boolean; at: string }
  | { type: "start" }
  | { type: "shot"; shot: Shot<I> }
  | { type: "retake"; angle: PhotoAngle }
  | { type: "submit" }
  | { type: "submitOk"; batchId: string }
  | { type: "submitFail"; batchId: string }
  | { type: "dismiss" };

export const initialPatientState = <I>(): PatientState<I> => ({ phase: "idle" });

const isComplete = <I>(p: Partial<ShotSet<I>>): p is ShotSet<I> => CAPTURE_ORDER.every((a) => p[a]);

export function patientReducer<I>(state: PatientState<I>, action: PatientAction<I>): PatientState<I> {
  switch (action.type) {
    case "request": {
      // 같은 회차 요청이 다시 오면 무시, 다른 회차면 지금까지의 촬영분을 버리고 처음부터
      if (state.phase !== "idle" && state.phase !== "submitted" && state.batchId === action.batchId) return state;
      return { phase: "consent", batchId: action.batchId, source: "doctor", consentedAt: null };
    }
    case "testStart":
      if (state.phase !== "idle" && state.phase !== "submitted") return state;
      return { phase: "consent", batchId: action.batchId, source: "test", consentedAt: null };
    case "cancel":
      // 제출 중이면 곧 기록이 생기므로 버리지 않는다
      if (state.phase === "idle" || state.phase === "submitted" || state.phase === "submitting") return state;
      if (state.batchId !== action.batchId) return state;
      return initialPatientState();
    case "agree":
      if (state.phase !== "consent") return state;
      return { ...state, consentedAt: action.checked ? action.at : null };
    case "start":
      if (state.phase !== "consent" || state.consentedAt === null) return state;
      return {
        phase: "shooting",
        batchId: state.batchId,
        source: state.source,
        consentedAt: state.consentedAt,
        step: "front",
        photos: {},
        retake: false,
      };
    case "shot": {
      if (state.phase !== "shooting" || action.shot.meta.angle !== state.step) return state;
      const photos = { ...state.photos, [state.step]: action.shot };
      const next = CAPTURE_ORDER.find((a) => !photos[a]);
      if (!state.retake && next) return { ...state, photos, step: next };
      if (!isComplete(photos)) return { ...state, photos, step: next!, retake: false };
      const { batchId, source, consentedAt } = state;
      return { phase: "preview", batchId, source, consentedAt, photos, error: false };
    }
    case "retake":
      if (state.phase !== "preview") return state;
      return {
        phase: "shooting",
        batchId: state.batchId,
        source: state.source,
        consentedAt: state.consentedAt,
        step: action.angle,
        photos: state.photos,
        retake: true,
      };
    case "submit":
      if (state.phase !== "preview") return state;
      return {
        phase: "submitting",
        batchId: state.batchId,
        source: state.source,
        consentedAt: state.consentedAt,
        photos: state.photos,
      };
    case "submitOk":
      if (state.phase !== "submitting" || state.batchId !== action.batchId) return state;
      return { phase: "submitted", batchId: state.batchId, source: state.source };
    case "submitFail":
      if (state.phase !== "submitting" || state.batchId !== action.batchId) return state;
      return { ...state, phase: "preview", error: true };
    case "dismiss":
      return state.phase === "submitted" ? initialPatientState() : state;
  }
}

/** 제출용 meta 배열 (front·left·right 순서). */
export const metaOf = <I>(photos: ShotSet<I>): CaptureMetaItem[] => CAPTURE_ORDER.map((a) => photos[a].meta);
