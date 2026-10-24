import { describe, expect, it } from "vitest";
import { levelFromTimeDomain, parseCheckQuery, safeReturnUrl } from "./query";

describe("parseCheckQuery", () => {
  it("lang 기본값은 ja, ko 만 인정", () => {
    expect(parseCheckQuery({}).lang).toBe("ja");
    expect(parseCheckQuery({ lang: "ko" }).lang).toBe("ko");
    expect(parseCheckQuery({ lang: "en" }).lang).toBe("ja");
    expect(parseCheckQuery({ lang: ["ko", "ja"] }).lang).toBe("ko");
  });
  it("returnUrl 은 http(s) 절대 주소만", () => {
    expect(parseCheckQuery({ returnUrl: "http://192.168.0.2:3000/ja/consult/1" }).returnUrl).toBe(
      "http://192.168.0.2:3000/ja/consult/1",
    );
    expect(safeReturnUrl("https://a.example/x")).toBe("https://a.example/x");
    expect(safeReturnUrl("javascript:alert(1)")).toBeNull();
    expect(safeReturnUrl("/relative")).toBeNull();
    expect(safeReturnUrl("")).toBeNull();
    expect(safeReturnUrl(undefined)).toBeNull();
  });
});

describe("levelFromTimeDomain", () => {
  it("무음은 0, 큰 소리는 1 로 자른다", () => {
    expect(levelFromTimeDomain(new Uint8Array(64).fill(128))).toBe(0);
    expect(levelFromTimeDomain(new Uint8Array(64).fill(255))).toBe(1);
    expect(levelFromTimeDomain([])).toBe(0);
  });
  it("작은 소리는 0 과 1 사이", () => {
    const l = levelFromTimeDomain(Uint8Array.from({ length: 64 }, (_, i) => (i % 2 ? 138 : 118)));
    expect(l).toBeGreaterThan(0);
    expect(l).toBeLessThan(1);
  });
});
