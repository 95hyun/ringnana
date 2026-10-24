import { describe, expect, it } from "vitest";
import type { CaptionPayload } from "@/video/lib/contracts";
import { addCaption, emptyCaptionList, upsertSelfCaption } from "./captions";

const cap = (id: string, over: Partial<CaptionPayload> = {}): CaptionPayload => ({
  id,
  speaker: "doctor",
  srcLang: "ko",
  srcText: `원문 ${id}`,
  dstLang: "ja",
  dstText: `訳 ${id}`,
  failed: false,
  ...over,
});

describe("상대 자막 목록", () => {
  it("최근 3문장만 남기고 오래된 것부터 밀어낸다", () => {
    let list = emptyCaptionList();
    for (const id of ["a", "b", "c", "d"]) list = addCaption(list, cap(id), 3).list;
    expect(list.items.map((c) => c.id)).toEqual(["b", "c", "d"]);
  });

  it("같은 id는 한 번만 넣고 added=false를 돌려준다", () => {
    let list = emptyCaptionList();
    const first = addCaption(list, cap("a"), 3);
    expect(first.added).toBe(true);
    list = first.list;
    const dup = addCaption(list, cap("a", { dstText: "다른 값" }), 3);
    expect(dup.added).toBe(false);
    expect(dup.list).toBe(list);
    expect(dup.list.items).toHaveLength(1);
  });

  it("밀려나서 안 보이는 id가 다시 와도 무시한다", () => {
    let list = emptyCaptionList();
    for (const id of ["a", "b", "c", "d"]) list = addCaption(list, cap(id), 3).list;
    const again = addCaption(list, cap("a"), 3);
    expect(again.added).toBe(false);
    expect(again.list.items.map((c) => c.id)).toEqual(["b", "c", "d"]);
  });

  it("원본 목록을 바꾸지 않는다", () => {
    const list = emptyCaptionList();
    addCaption(list, cap("a"), 3);
    expect(list.items).toHaveLength(0);
  });
});

describe("내 발화 목록", () => {
  it("원문을 먼저 넣고 같은 id로 번역을 채운다 (3개 유지)", () => {
    let items = upsertSelfCaption([], { id: "a", srcText: "안녕", pending: true }, 3);
    expect(items).toEqual([{ id: "a", srcText: "안녕", pending: true }]);
    items = upsertSelfCaption(items, { id: "a", srcText: "안녕", dstText: "こんにちは", pending: false, failed: false }, 3);
    expect(items).toEqual([{ id: "a", srcText: "안녕", dstText: "こんにちは", pending: false, failed: false }]);
    for (const id of ["b", "c", "d"]) items = upsertSelfCaption(items, { id, srcText: id, pending: true }, 3);
    expect(items.map((i) => i.id)).toEqual(["b", "c", "d"]);
  });

  it("목록에서 밀려난 id의 번역 결과는 다시 넣지 않는다", () => {
    let items = upsertSelfCaption([], { id: "a", srcText: "a", pending: true }, 1);
    items = upsertSelfCaption(items, { id: "b", srcText: "b", pending: true }, 1);
    items = upsertSelfCaption(items, { id: "a", srcText: "a", dstText: "A", pending: false, failed: false }, 1, { insert: false });
    expect(items.map((i) => i.id)).toEqual(["b"]);
  });
});
