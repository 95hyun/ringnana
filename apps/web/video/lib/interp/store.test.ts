import { describe, expect, it } from "vitest";
import { createInterpStore, getInterpStore } from "./store";

describe("통역 상태 저장소", () => {
  it("기본값: 통역·음성 켬", () => {
    const s = createInterpStore().get();
    expect(s.enabled).toBe(true);
    expect(s.voiceOn).toBe(true);
    expect(s.remote.items).toEqual([]);
  });
  it("set은 새 객체를 만들고 구독자에게 알린다", () => {
    const store = createInterpStore();
    const before = store.get();
    let calls = 0;
    const off = store.subscribe(() => calls++);
    store.set({ enabled: false });
    store.set((s) => ({ pendingCount: s.pendingCount + 1 }));
    expect(calls).toBe(2);
    expect(store.get()).not.toBe(before);
    expect(store.get()).toMatchObject({ enabled: false, pendingCount: 1 });
    off();
    store.set({ voiceOn: false });
    expect(calls).toBe(2);
  });
  it("같은 sessionId는 같은 저장소를 공유한다", () => {
    expect(getInterpStore("s1")).toBe(getInterpStore("s1"));
    expect(getInterpStore("s1")).not.toBe(getInterpStore("s2"));
  });
});
