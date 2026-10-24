import { describe, expect, it } from "vitest";
import { parseRoomQuery } from "./query";

const SID = "00000000-0000-4000-8000-000000005001";

describe("parseRoomQuery", () => {
  it("올바른 의사 입장", () => {
    const q = parseRoomQuery(SID, new URLSearchParams("role=doctor&name=%EA%B9%80+%EC%9D%98%EC%82%AC&returnUrl=https%3A%2F%2Fa.example%2Fko%2Fclinic%2Fconsult%2F1%3Fended%3D1"));
    expect(q).toEqual({
      ok: true,
      sessionId: SID,
      role: "doctor",
      name: "김 의사",
      lang: "ja",
      returnUrl: "https://a.example/ko/clinic/consult/1?ended=1",
      testMode: false,
    });
  });
  it("공백은 + 로 읽는다", () => {
    const q = parseRoomQuery(SID, "role=patient&name=Hanako+Yamada&lang=ko&test=1");
    expect(q.ok && q.name).toBe("Hanako Yamada");
    expect(q.ok && q.lang).toBe("ko");
    expect(q.ok && q.testMode).toBe(true);
  });
  it("lang 이 없거나 잘못되면 ja", () => {
    expect(parseRoomQuery(SID, "role=patient").ok && parseRoomQuery(SID, "role=patient")).toMatchObject({ lang: "ja" });
    expect(parseRoomQuery(SID, "role=patient&lang=en")).toMatchObject({ ok: true, lang: "ja" });
  });
  it("role 이 doctor·patient 가 아니면 거절", () => {
    expect(parseRoomQuery(SID, "role=admin").ok).toBe(false);
    expect(parseRoomQuery(SID, "").ok).toBe(false);
  });
  it("sessionId 가 UUID 가 아니면 거절", () => {
    expect(parseRoomQuery("abc", "role=doctor").ok).toBe(false);
    expect(parseRoomQuery(`${SID}x`, "role=doctor").ok).toBe(false);
  });
  it("returnUrl 은 http(s) 절대 주소만 쓰고 나머지는 없음으로 본다", () => {
    expect(parseRoomQuery(SID, "role=patient&returnUrl=javascript%3Aalert(1)")).toMatchObject({ returnUrl: null });
    expect(parseRoomQuery(SID, "role=patient&returnUrl=%2Fjp%2Fquote%2F1")).toMatchObject({ returnUrl: null });
    expect(parseRoomQuery(SID, "role=patient")).toMatchObject({ returnUrl: null, name: "" });
  });
});
