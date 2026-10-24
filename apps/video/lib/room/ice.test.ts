import { describe, expect, it } from "vitest";
import { buildIceServers } from "./ice";

const STUN = ["stun:stun.l.google.com:19302"];

describe("buildIceServers", () => {
  it("TURN 설정이 없으면 공개 STUN 만", () => {
    expect(buildIceServers({}, STUN)).toEqual([{ urls: STUN }]);
  });
  it("TURN_URLS(쉼표 구분)+계정이 있으면 TURN 항목을 더한다", () => {
    const list = buildIceServers(
      { TURN_URLS: "turn:t.example:3478, turns:t.example:5349?transport=tcp ,", TURN_USERNAME: "u", TURN_CREDENTIAL: "c" },
      STUN,
    );
    expect(list).toEqual([
      { urls: STUN },
      { urls: ["turn:t.example:3478", "turns:t.example:5349?transport=tcp"], username: "u", credential: "c" },
    ]);
  });
  it("TURN_URLS 가 비어 있으면 STUN 만", () => {
    expect(buildIceServers({ TURN_URLS: " , ", TURN_USERNAME: "u", TURN_CREDENTIAL: "c" }, STUN)).toEqual([{ urls: STUN }]);
  });
  it("계정이 빠지면 TURN 을 더하지 않는다", () => {
    expect(buildIceServers({ TURN_URLS: "turn:t.example:3478" }, STUN)).toEqual([{ urls: STUN }]);
  });
  it("항상 STUN 하나 이상", () => {
    expect(buildIceServers({}, [])[0].urls.length).toBeGreaterThan(0);
  });
});
