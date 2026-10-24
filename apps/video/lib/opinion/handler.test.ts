import { describe, expect, it } from "vitest";
import { createFakeTranslator } from "@/lib/translate/fake";
import { TranslationError } from "@/lib/translate/types";
import { handleOpinionPreflight, handleOpinionTranslate, parseAllowedOrigins } from "./handler";
import { createMemoryOpinionStore } from "./memory";

const ID = "33333333-3333-4333-8333-333333333333";
const OTHER_ID = "44444444-4444-4444-8444-444444444444";
const ALLOWED = "https://platform.example";
const opts = { allowedOrigins: [ALLOWED], timeoutMs: 50 };

const storeWith = (notes: string | null) =>
  createMemoryOpinionStore({
    [ID]: { notes, notes_ja: null, notes_ja_source: null, notes_translation_status: null },
  });

const hasCors = (headers: Record<string, string>) =>
  Object.keys(headers).some((k) => k.toLowerCase().startsWith("access-control-"));

describe("handleOpinionTranslate", () => {
  it("성공하면 done + 번역문 + 원문을 저장한다", async () => {
    const store = storeWith("레이저 토닝 5회");
    const translator = createFakeTranslator({ opinion: (ko) => `JA:${ko}` });
    const res = await handleOpinionTranslate({ consultationId: ID }, ALLOWED, store, translator, opts);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "done" });
    expect(store.rows.get(ID)).toMatchObject({
      notes_ja: "JA:레이저 토닝 5회",
      notes_ja_source: "레이저 토닝 5회",
      notes_translation_status: "done",
    });
  });

  it("번역 중에는 pending 으로 바뀐다", async () => {
    const store = storeWith("소견");
    let seen: string | null | undefined;
    const translator = createFakeTranslator({
      opinion: () => {
        seen = store.rows.get(ID)?.notes_translation_status;
        return "訳";
      },
    });
    await handleOpinionTranslate({ consultationId: ID }, ALLOWED, store, translator, opts);
    expect(seen).toBe("pending");
  });

  it("번역기가 throw 하면 failed 로 저장한다", async () => {
    const store = storeWith("소견");
    const translator = createFakeTranslator({
      opinion: () => {
        throw new Error("network");
      },
    });
    const res = await handleOpinionTranslate({ consultationId: ID }, ALLOWED, store, translator, opts);
    expect(res.body).toEqual({ status: "failed" });
    expect(store.rows.get(ID)).toMatchObject({ notes_translation_status: "failed", notes_ja: null, notes_ja_source: null });
  });

  it("거절이면 failed", async () => {
    const store = storeWith("소견");
    const translator = createFakeTranslator({
      opinion: () => {
        throw new TranslationError("refusal", "refused");
      },
    });
    const res = await handleOpinionTranslate({ consultationId: ID }, ALLOWED, store, translator, opts);
    expect(res.body).toEqual({ status: "failed" });
    expect(store.rows.get(ID)?.notes_translation_status).toBe("failed");
  });

  it("시간 초과면 failed", async () => {
    const store = storeWith("소견");
    const translator = createFakeTranslator({ opinion: () => new Promise<string>(() => {}) });
    const res = await handleOpinionTranslate({ consultationId: ID }, ALLOWED, store, translator, opts);
    expect(res.body).toEqual({ status: "failed" });
    expect(store.rows.get(ID)?.notes_translation_status).toBe("failed");
  });

  it("번역 중 원문이 바뀌면 stale 이고 아무것도 쓰지 않는다 (pending 유지)", async () => {
    const store = storeWith("원래 소견");
    const translator = createFakeTranslator({
      opinion: () => {
        store.rows.get(ID)!.notes = "고친 소견";
        return "訳";
      },
    });
    const res = await handleOpinionTranslate({ consultationId: ID }, ALLOWED, store, translator, opts);
    expect(res.body).toEqual({ status: "stale" });
    expect(store.rows.get(ID)).toEqual({
      notes: "고친 소견",
      notes_ja: null,
      notes_ja_source: null,
      notes_translation_status: "pending",
    });
  });

  it("실패했는데 원문이 바뀌었으면 stale 이고 failed 를 쓰지 않는다", async () => {
    const store = storeWith("원래 소견");
    const translator = createFakeTranslator({
      opinion: () => {
        store.rows.get(ID)!.notes = "고친 소견";
        throw new Error("network");
      },
    });
    const res = await handleOpinionTranslate({ consultationId: ID }, ALLOWED, store, translator, opts);
    expect(res.body).toEqual({ status: "stale" });
    expect(store.rows.get(ID)?.notes_translation_status).toBe("pending");
  });

  it.each([[""], ["   \n\t"], [null]])("빈 소견(%j)은 409 이고 상태를 바꾸지 않는다", async (notes) => {
    const store = storeWith(notes);
    const res = await handleOpinionTranslate({ consultationId: ID }, ALLOWED, store, createFakeTranslator(), opts);
    expect(res.status).toBe(409);
    expect(store.rows.get(ID)?.notes_translation_status).toBeNull();
  });

  it.each([[{ consultationId: "not-a-uuid" }], [{}], [null], ["x"], [{ consultationId: 1 }]])(
    "잘못된 요청(%j)은 400",
    async (body) => {
      const res = await handleOpinionTranslate(body, ALLOWED, storeWith("소견"), createFakeTranslator(), opts);
      expect(res.status).toBe(400);
    },
  );

  it("없는 진료는 404", async () => {
    const res = await handleOpinionTranslate({ consultationId: OTHER_ID }, ALLOWED, storeWith("소견"), createFakeTranslator(), opts);
    expect(res.status).toBe(404);
  });

  it("DB 오류는 500 {error}", async () => {
    for (const op of ["read", "pending", "write"] as const) {
      const store = storeWith("소견");
      store.fail[op] = true;
      const res = await handleOpinionTranslate({ consultationId: ID }, ALLOWED, store, createFakeTranslator(), opts);
      expect(res.status, op).toBe(500);
      expect(res.body, op).toHaveProperty("error");
      expect(hasCors(res.headers), op).toBe(true);
    }
  });

  it("허용 안 된 출처에는 CORS 헤더를 붙이지 않는다", async () => {
    const res = await handleOpinionTranslate(
      { consultationId: ID },
      "https://evil.example",
      storeWith("소견"),
      createFakeTranslator(),
      opts,
    );
    expect(res.status).toBe(200);
    expect(hasCors(res.headers)).toBe(false);
    const noOrigin = await handleOpinionTranslate({ consultationId: ID }, null, storeWith("소견"), createFakeTranslator(), opts);
    expect(hasCors(noOrigin.headers)).toBe(false);
  });

  it("허용된 출처에는 성공·오류 응답 모두 CORS 헤더를 붙인다", async () => {
    const cases = [
      await handleOpinionTranslate({ consultationId: ID }, ALLOWED, storeWith("소견"), createFakeTranslator(), opts),
      await handleOpinionTranslate({ consultationId: "bad" }, ALLOWED, storeWith("소견"), createFakeTranslator(), opts),
      await handleOpinionTranslate({ consultationId: OTHER_ID }, ALLOWED, storeWith("소견"), createFakeTranslator(), opts),
      await handleOpinionTranslate({ consultationId: ID }, ALLOWED, storeWith(" "), createFakeTranslator(), opts),
    ];
    expect(cases.map((c) => c.status)).toEqual([200, 400, 404, 409]);
    for (const c of cases) expect(c.headers["Access-Control-Allow-Origin"]).toBe(ALLOWED);
  });
});

describe("handleOpinionPreflight", () => {
  it("허용된 출처의 OPTIONS 에 응답한다", () => {
    const res = handleOpinionPreflight(ALLOWED, opts);
    expect(res.status).toBe(204);
    expect(res.headers["Access-Control-Allow-Origin"]).toBe(ALLOWED);
    expect(res.headers["Access-Control-Allow-Methods"]).toContain("POST");
    expect(res.headers["Access-Control-Allow-Headers"].toLowerCase()).toContain("content-type");
  });

  it("허용 안 된 출처의 OPTIONS 에는 CORS 헤더가 없다", () => {
    const res = handleOpinionPreflight("https://evil.example", opts);
    expect(hasCors(res.headers)).toBe(false);
  });
});

describe("parseAllowedOrigins", () => {
  it("쉼표로 나누고 공백·빈 항목을 버린다", () => {
    expect(parseAllowedOrigins(" https://a.example , https://b.example:3000,,")).toEqual([
      "https://a.example",
      "https://b.example:3000",
    ]);
    expect(parseAllowedOrigins(undefined)).toEqual([]);
  });

  it("정확히 같은 출처만 허용한다 (접두사 일치 금지)", () => {
    const res = handleOpinionPreflight("https://platform.example.evil.com", opts);
    expect(hasCors(res.headers)).toBe(false);
  });
});
