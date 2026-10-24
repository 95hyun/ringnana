import { emptyCaptionList, type CaptionList, type SelfCaption } from "./captions";

export type InterpState = {
  enabled: boolean; // [통역] — 인식·번역·방송
  voiceOn: boolean; // [음성] — 읽기
  support: "unknown" | "supported" | "unsupported";
  listening: boolean;
  pendingCount: number; // 번역 응답 기다리는 문장 수
  interim: string; // 내 중간 결과 (내 화면에만 회색)
  self: SelfCaption[];
  remote: CaptionList;
  speaking: boolean;
  talkRequested: boolean; // 시연 모드 [말하기] — 한 문장만 듣는다
  talkLocked: boolean; // 시연 모드에서 다른 창이 듣는 중
};

export type InterpStore = {
  get: () => InterpState;
  set: (patch: Partial<InterpState> | ((s: InterpState) => Partial<InterpState>)) => void;
  subscribe: (fn: () => void) => () => void;
};

export function createInterpStore(): InterpStore {
  let state: InterpState = {
    enabled: true,
    voiceOn: true,
    support: "unknown",
    listening: false,
    pendingCount: 0,
    interim: "",
    self: [],
    remote: emptyCaptionList(),
    speaking: false,
    talkRequested: false,
    talkLocked: false,
  };
  const subs = new Set<() => void>();
  return {
    get: () => state,
    set(patch) {
      state = { ...state, ...(typeof patch === "function" ? patch(state) : patch) };
      subs.forEach((fn) => fn());
    },
    subscribe(fn) {
      subs.add(fn);
      return () => {
        subs.delete(fn);
      };
    },
  };
}

// 방 화면이 InterpSlot을 세 번 두므로 상태는 sessionId별 모듈 저장소에서 공유한다 (plan "끼움 약속")
const stores = new Map<string, InterpStore>();

export function getInterpStore(sessionId: string): InterpStore {
  let s = stores.get(sessionId);
  if (!s) {
    s = createInterpStore();
    stores.set(sessionId, s);
  }
  return s;
}
