import { describe, expect, it } from "vitest";
import { acceptSignal, isSuperseded, validTabs } from "./presence";
import type { PresenceState } from "@/lib/contracts";

const d1: PresenceState = { role: "doctor", tabId: "d1", joinedAt: 100 };
const d2: PresenceState = { role: "doctor", tabId: "d2", joinedAt: 200 };
const p1: PresenceState = { role: "patient", tabId: "p1", joinedAt: 150 };

describe("validTabs — 같은 역할은 joinedAt 이 가장 늦은 창만 유효", () => {
  it("역할별 최신 창", () => {
    const v = validTabs({ doctor: [{ ...d2, presence_ref: "x" }, d1], patient: [p1] });
    expect(v.doctor?.tabId).toBe("d2");
    expect(v.patient?.tabId).toBe("p1");
  });
  it("순서와 상관없이 가장 늦은 창", () => {
    expect(validTabs({ doctor: [d1, d2] }).doctor?.tabId).toBe("d2");
    expect(validTabs({ doctor: [d2, d1] }).doctor?.tabId).toBe("d2");
  });
  it("비어 있으면 null, 이상한 값은 무시", () => {
    const v = validTabs({ doctor: [{ foo: 1 }], x: [{ role: "admin", tabId: "a", joinedAt: 999 }] });
    expect(v).toEqual({ doctor: null, patient: null });
  });
  it("키가 아니라 값의 role 로 판단", () => {
    expect(validTabs({ whatever: [p1] }).patient?.tabId).toBe("p1");
  });
});

describe("isSuperseded", () => {
  it("더 늦게 들어온 같은 역할 창이 있으면 밀려남", () => {
    expect(isSuperseded(d1, { doctor: [d1, d2] })).toBe(true);
    expect(isSuperseded(d2, { doctor: [d1, d2] })).toBe(false);
  });
  it("내 Presence 가 아직 반영되지 않아도 오래된 창 때문에 밀려나지 않음", () => {
    expect(isSuperseded(d2, { doctor: [d1] })).toBe(false);
  });
  it("다른 역할은 영향 없음", () => {
    expect(isSuperseded(p1, { doctor: [d1, d2] })).toBe(false);
  });
});

describe("acceptSignal — 상대의 유효한 창 신호만 받는다", () => {
  const valid = validTabs({ doctor: [d1, d2], patient: [p1] });
  it("유효한 상대 창이면 accept", () => {
    expect(acceptSignal({ from: "doctor", tabId: "d2" }, "patient", valid)).toBe("accept");
  });
  it("밀려난 창이면 ignore", () => {
    expect(acceptSignal({ from: "doctor", tabId: "d1" }, "patient", valid)).toBe("ignore");
  });
  it("내 역할에서 온 신호는 ignore", () => {
    expect(acceptSignal({ from: "patient", tabId: "p1" }, "patient", valid)).toBe("ignore");
  });
  it("아직 Presence 에 없는 역할이면 hold (Presence 반영 뒤 다시 판단)", () => {
    expect(acceptSignal({ from: "doctor", tabId: "d9" }, "patient", { doctor: null, patient: p1 })).toBe("hold");
  });
});
