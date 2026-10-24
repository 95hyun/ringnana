import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFakeLocalBus } from "./demoFake";
import { isDemoMode, trackPeerWindow } from "./demo";

const opts = { heartbeatMs: 1000, timeoutMs: 3500 };

describe("isDemoMode", () => {
  it("demo=1 이거나 상대 역할 창이 있으면 시연 모드", () => {
    expect(isDemoMode(true, false)).toBe(true);
    expect(isDemoMode(false, true)).toBe(true);
    expect(isDemoMode(false, false)).toBe(false);
  });
});

describe("trackPeerWindow", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("나중에 열린 상대 역할 창을 양쪽 모두 바로 알아본다", () => {
    const bus = createFakeLocalBus();
    const doctor = vi.fn();
    const patient = vi.fn();
    trackPeerWindow({ link: bus.link(), role: "doctor", tabId: "d1", onChange: doctor, ...opts });
    trackPeerWindow({ link: bus.link(), role: "patient", tabId: "p1", onChange: patient, ...opts });
    expect(doctor).toHaveBeenLastCalledWith(true);
    expect(patient).toHaveBeenLastCalledWith(true);
  });

  it("같은 역할 창만 있으면 시연 모드가 아니다", () => {
    const bus = createFakeLocalBus();
    const a = vi.fn();
    trackPeerWindow({ link: bus.link(), role: "doctor", tabId: "d1", onChange: a, ...opts });
    trackPeerWindow({ link: bus.link(), role: "doctor", tabId: "d2", onChange: vi.fn(), ...opts });
    vi.advanceTimersByTime(5000);
    expect(a).not.toHaveBeenCalled();
  });

  it("상대 창이 닫히면 바로 일반 모드로 돌아간다", () => {
    const bus = createFakeLocalBus();
    const doctor = vi.fn();
    trackPeerWindow({ link: bus.link(), role: "doctor", tabId: "d1", onChange: doctor, ...opts });
    const stop = trackPeerWindow({ link: bus.link(), role: "patient", tabId: "p1", onChange: vi.fn(), ...opts });
    stop();
    expect(doctor).toHaveBeenLastCalledWith(false);
  });

  it("상대 창 신호가 끊기면 잠시 뒤 일반 모드로 돌아간다", () => {
    const bus = createFakeLocalBus();
    const doctor = vi.fn();
    trackPeerWindow({ link: bus.link(), role: "doctor", tabId: "d1", onChange: doctor, ...opts });
    const patientLink = bus.link();
    trackPeerWindow({ link: patientLink, role: "patient", tabId: "p1", onChange: vi.fn(), ...opts });
    vi.advanceTimersByTime(3000);
    expect(doctor).toHaveBeenLastCalledWith(true);
    bus.cut(patientLink); // 창이 멈춰 bye 도 못 보냄
    vi.advanceTimersByTime(5000);
    expect(doctor).toHaveBeenLastCalledWith(false);
  });
});
