import { describe, expect, it } from "vitest";
import { acceptSignal, isSuperseded, knownTabs, validTabs } from "./presence";
import type { PresenceState } from "@/video/lib/contracts";

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
  const state = { doctor: [d1, d2], patient: [p1] };
  const valid = validTabs(state);
  const known = knownTabs(state);
  it("유효한 상대 창이면 accept", () => {
    expect(acceptSignal({ from: "doctor", tabId: "d2" }, "patient", valid, known)).toBe("accept");
  });
  it("Presence 에 있지만 밀려난 창이면 ignore", () => {
    expect(acceptSignal({ from: "doctor", tabId: "d1" }, "patient", valid, known)).toBe("ignore");
  });
  it("내 역할에서 온 신호는 ignore", () => {
    expect(acceptSignal({ from: "patient", tabId: "p1" }, "patient", valid, known)).toBe("ignore");
  });
  it("아직 Presence 에 없는 역할이면 hold (Presence 반영 뒤 다시 판단)", () => {
    const s = { patient: [p1] };
    expect(acceptSignal({ from: "doctor", tabId: "d9" }, "patient", validTabs(s), knownTabs(s))).toBe("hold");
  });
  it("유효한 창이 있어도 Presence 에 아직 없는 tabId 면 hold", () => {
    const s = { doctor: [d1], patient: [p1] };
    expect(acceptSignal({ from: "doctor", tabId: "d2" }, "patient", validTabs(s), knownTabs(s))).toBe("hold");
  });
  it("보류했던 새 창 신호는 그 창이 최신으로 반영되면 accept", () => {
    const before = { doctor: [d1], patient: [p1] };
    const sig = { from: "doctor" as const, tabId: "d2" };
    expect(acceptSignal(sig, "patient", validTabs(before), knownTabs(before))).toBe("hold");
    const after = { doctor: [d1, d2], patient: [p1] };
    expect(acceptSignal(sig, "patient", validTabs(after), knownTabs(after))).toBe("accept");
  });
});

describe("knownTabs", () => {
  it("역할별로 Presence 에 있는 모든 tabId", () => {
    expect(knownTabs({ doctor: [d1, d2], patient: [p1], x: [{ foo: 1 }] })).toEqual({ doctor: ["d1", "d2"], patient: ["p1"] });
  });
});
