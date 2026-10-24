import { describe, expect, it } from "vitest";
import { classifyMediaError, mediaConstraintsChain } from "./media";

describe("mediaConstraintsChain", () => {
  it("1920×1080 → 1280×720 → 카메라 기본값", () => {
    const chain = mediaConstraintsChain([1920, 1280]);
    expect(chain).toHaveLength(3);
    expect(chain[0]).toMatchObject({ audio: true, video: { width: { ideal: 1920 }, height: { ideal: 1080 } } });
    expect(chain[1]).toMatchObject({ video: { width: { ideal: 1280 }, height: { ideal: 720 } } });
    expect(chain[2]).toEqual({ audio: true, video: true });
  });
});

describe("classifyMediaError", () => {
  const err = (name: string) => Object.assign(new Error(name), { name });
  it("권한 거부", () => {
    expect(classifyMediaError(err("NotAllowedError"))).toBe("denied");
    expect(classifyMediaError(err("SecurityError"))).toBe("denied");
  });
  it("장치 없음", () => {
    expect(classifyMediaError(err("NotFoundError"))).toBe("notFound");
  });
  it("다른 프로그램이 사용 중 (그 밖의 오류도 다시 시도 안내)", () => {
    expect(classifyMediaError(err("NotReadableError"))).toBe("inUse");
    expect(classifyMediaError(err("AbortError"))).toBe("inUse");
    expect(classifyMediaError("weird")).toBe("inUse");
  });
});
