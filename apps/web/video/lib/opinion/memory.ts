import type { ConsultationRow } from "@/video/lib/supabase/types";
import type { OpinionStore } from "./types";

export type OpinionRow = Pick<ConsultationRow, "notes" | "notes_ja" | "notes_ja_source" | "notes_translation_status">;

export type MemoryOpinionStore = OpinionStore & {
  rows: Map<string, OpinionRow>; // key = consultation id
  fail: Partial<Record<"read" | "pending" | "write", boolean>>;
};

// 테스트용 메모리 저장소. 조건부 갱신(notes 일치)을 실제 DB처럼 흉내 낸다.
export function createMemoryOpinionStore(init: Record<string, OpinionRow> = {}): MemoryOpinionStore {
  const store: MemoryOpinionStore = {
    rows: new Map(Object.entries(init).map(([id, row]) => [id, { ...row }])),
    fail: {},
    async readNotes(id) {
      if (store.fail.read) throw new Error("read failed");
      const row = store.rows.get(id);
      return row ? { notes: row.notes } : null;
    },
    async markPending(id) {
      if (store.fail.pending) throw new Error("pending failed");
      const row = store.rows.get(id);
      if (row) row.notes_translation_status = "pending";
    },
    async writeDoneIfSource(id, source, notesJa) {
      if (store.fail.write) throw new Error("write failed");
      const row = store.rows.get(id);
      if (!row || row.notes !== source) return false;
      Object.assign(row, { notes_ja: notesJa, notes_ja_source: source, notes_translation_status: "done" });
      return true;
    },
    async markFailedIfSource(id, source) {
      if (store.fail.write) throw new Error("write failed");
      const row = store.rows.get(id);
      if (!row || row.notes !== source) return false;
      row.notes_translation_status = "failed";
      return true;
    },
  };
  return store;
}
