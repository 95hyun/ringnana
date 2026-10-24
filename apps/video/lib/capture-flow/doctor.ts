// 의사 촬영 패널 상태 (spec §5.2·§5.6·§9) — 순수 리듀서.
import type { LatestBatch, PhotoAngle, RoomEvent } from "@/lib/contracts";

export type DoctorState = {
  mode: "idle" | "active"; // active = 요청했거나(또는 테스트 회차를 채택해) 제출을 기다리는 중
  batchId: string | null;
  angles: PhotoAngle[]; // 찍힌 방향 (중복 없음)
  latest: LatestBatch | null; // 서버의 최신 제출 회차
  reloadToken: number; // 값이 바뀌면 화면이 최신 회차를 다시 불러온다
  closed: string[]; // 취소·퇴장으로 끝낸 회차 — 늦게 온 알림을 채택하지 않기 위해
};

export type DoctorAction =
  | { type: "request"; batchId: string }
  | { type: "cancel" }
  | { type: "peerLeft" }
  | { type: "loaded"; batch: LatestBatch | null }
  | { type: "event"; event: RoomEvent };

export const initialDoctorState = (): DoctorState => ({
  mode: "idle",
  batchId: null,
  angles: [],
  latest: null,
  reloadToken: 1,
  closed: [],
});

const toIdle = (s: DoctorState, close: boolean): DoctorState => ({
  ...s,
  mode: "idle",
  batchId: null,
  angles: [],
  reloadToken: s.reloadToken + 1,
  closed: close && s.batchId ? [...s.closed, s.batchId] : s.closed,
});

export function doctorReducer(state: DoctorState, action: DoctorAction): DoctorState {
  switch (action.type) {
    case "request":
      return {
        ...state,
        mode: "active",
        batchId: action.batchId,
        angles: [],
        closed: state.batchId ? [...state.closed, state.batchId] : state.closed,
      };
    case "cancel":
      return state.mode === "active" ? toIdle(state, true) : state;
    case "peerLeft":
      return state.mode === "active" ? toIdle(state, true) : state;
    case "loaded":
      return { ...state, latest: action.batch };
    case "event":
      return onEvent(state, action.event);
  }
}

function onEvent(state: DoctorState, ev: RoomEvent): DoctorState {
  if (ev.type !== "capture:progress" && ev.type !== "capture:done" && ev.type !== "capture:cancel") return state;
  const { batchId } = ev.payload;

  if (state.mode === "active") {
    if (batchId !== state.batchId) return state;
    if (ev.type === "capture:progress") {
      return state.angles.includes(ev.payload.angle)
        ? state
        : { ...state, angles: [...state.angles, ev.payload.angle] };
    }
    return toIdle(state, ev.type === "capture:cancel");
  }

  // 대기 중: 테스트 진입처럼 의사 요청 없이 생긴 새 회차만 따라간다 (spec §9)
  if (batchId === state.latest?.batchId) return state;
  // done 은 기록이 생겼다는 뜻이므로 취소한 회차였더라도 다시 불러온다
  if (ev.type === "capture:done") return { ...state, reloadToken: state.reloadToken + 1 };
  if (ev.type === "capture:progress" && !state.closed.includes(batchId)) {
    return { ...state, mode: "active", batchId, angles: [ev.payload.angle] };
  }
  return state;
}
