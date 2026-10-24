import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeLocalBus } from "@/lib/room/demoFake";
import { createListenLock } from "./listenLock";

function makeLock(bus: ReturnType<typeof createFakeLocalBus>, tabId: string) {
  const onChange = vi.fn();
  const onPreempted = vi.fn();
  const lock = createListenLock({ link: bus.link(), tabId, maxMs: 15000, onChange, onPreempted });
  return { lock, onChange, onPreempted };
}

describe("createListenLock", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("한 창이 듣는 동안 다른 창은 잠기고, 멈추면 풀린다", () => {
    const bus = createFakeLocalBus();
    const a = makeLock(bus, "a");
    const b = makeLock(bus, "b");
    expect(a.lock.acquire()).toBe(true);
    expect(b.lock.lockedByOther()).toBe(true);
    expect(b.onChange).toHaveBeenLastCalledWith(true);
    expect(b.lock.acquire()).toBe(false);
    a.lock.release();
    expect(b.lock.lockedByOther()).toBe(false);
    expect(b.lock.acquire()).toBe(true);
    expect(a.lock.lockedByOther()).toBe(true);
  });

  it("듣던 창이 닫히면 잠금이 풀린다", () => {
    const bus = createFakeLocalBus();
    const a = makeLock(bus, "a");
    const b = makeLock(bus, "b");
    a.lock.acquire();
    a.lock.dispose();
    expect(b.lock.lockedByOther()).toBe(false);
  });

  it("해제 알림을 놓쳐도 최대 시간이 지나면 풀린다", () => {
    const bus = createFakeLocalBus();
    const a = makeLock(bus, "a");
    const b = makeLock(bus, "b");
    a.lock.acquire();
    vi.advanceTimersByTime(15001);
    expect(b.lock.lockedByOther()).toBe(false);
    expect(b.onChange).toHaveBeenLastCalledWith(false);
  });

  it("동시에 누르면 한 창만 남는다", () => {
    const bus = createFakeLocalBus();
    const a = makeLock(bus, "a");
    const b = makeLock(bus, "b");
    // 서로의 알림이 닿기 전에 둘 다 잡았다고 가정: b 가 먼저 보내고 a 가 이어서 보냄
    expect(b.lock.acquire()).toBe(true);
    // a 는 이미 잠겨 있어 못 잡는다 — 알림이 즉시 전달되는 경우
    expect(a.lock.acquire()).toBe(false);
  });

  it("알림이 엇갈리면 tabId 가 작은 창은 큰 창의 알림에 밀리지 않는다", () => {
    const bus = createFakeLocalBus();
    const linkA = bus.link();
    const a = { onPreempted: vi.fn() };
    const lockA = createListenLock({ link: linkA, tabId: "a", maxMs: 15000, onChange: vi.fn(), onPreempted: a.onPreempted });
    const b = makeLock(bus, "b");
    bus.cut(linkA);
    lockA.acquire(); // a 의 알림이 b 에 닿지 않음
    expect(b.lock.acquire()).toBe(true); // b 알림은 a 에 닿는다 → a 가 이김, b 무시
    expect(a.onPreempted).not.toHaveBeenCalled();
    expect(lockA.lockedByOther()).toBe(false);
  });
});
