import { describe, expect, it, vi } from "vitest";
import type { RoomEvent } from "@/lib/contracts";
import { config } from "@/lib/config";
import { createInterpStore } from "./store";
import { submitUtterance } from "./submit";

describe("submitUtterance", () => {
  it("환자 예시 문장은 일본어→한국어로 번역되어 방송된다", async () => {
    const store = createInterpStore();
    const sent: RoomEvent[] = [];
    const translate = vi.fn(async () => ({ text: "시술 후에 붉은기가 생기나요?", failed: false }));
    const phrase = config.demo.phrases.patient[0];
    await submitUtterance({ srcText: phrase, role: "patient", store, send: (e) => sent.push(e), translate, maxLines: 3, newId: () => "id1" });
    expect(translate).toHaveBeenCalledWith(phrase, "ja", "ko");
    expect(sent).toEqual([
      {
        type: "interp:caption",
        payload: { id: "id1", speaker: "patient", srcLang: "ja", srcText: phrase, dstLang: "ko", dstText: "시술 후에 붉은기가 생기나요?", failed: false },
      },
    ]);
    expect(store.get().self).toEqual([{ id: "id1", srcText: phrase, dstText: "시술 후에 붉은기가 생기나요?", pending: false, failed: false }]);
    expect(store.get().pendingCount).toBe(0);
  });

  it("의사 문장은 한국어→일본어", async () => {
    const translate = vi.fn(async (text: string) => ({ text, failed: true }));
    const sent: RoomEvent[] = [];
    await submitUtterance({ srcText: config.demo.phrases.doctor[1], role: "doctor", store: createInterpStore(), send: (e) => sent.push(e), translate, maxLines: 3 });
    expect(translate).toHaveBeenCalledWith(config.demo.phrases.doctor[1], "ko", "ja");
    expect(sent[0]).toMatchObject({ type: "interp:caption", payload: { speaker: "doctor", failed: true } });
  });

  it("번역을 기다리는 사이 [통역]을 끄면 방송하지 않는다", async () => {
    const store = createInterpStore();
    const send = vi.fn();
    let resolve!: (v: { text: string; failed: boolean }) => void;
    const p = submitUtterance({ srcText: "あ", role: "patient", store, send, translate: () => new Promise((r) => (resolve = r)), maxLines: 3 });
    expect(store.get().pendingCount).toBe(1);
    store.set({ enabled: false });
    resolve({ text: "아", failed: false });
    await p;
    expect(send).not.toHaveBeenCalled();
  });
});
