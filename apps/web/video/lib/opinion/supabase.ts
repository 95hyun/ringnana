import "server-only";
import { supabaseServer } from "@/video/lib/supabase/server";
import type { OpinionStore } from "./types";

// 플랫폼 Supabase(서버 전용 키) 구현. 번역 칸이 아직 없으면 갱신이 오류를 내고 500 으로 이어진다.
export function createSupabaseOpinionStore(): OpinionStore {
  const db = supabaseServer();

  // notes = source 조건을 한 번의 UPDATE 로 건다 — 읽고 쓰는 사이 경합이 없다
  async function updateIfSource(id: string, source: string, patch: Record<string, string>): Promise<boolean> {
    const { data, error } = await db.from("consultations").update(patch).eq("id", id).eq("notes", source).select("id");
    if (error) throw error;
    return (data?.length ?? 0) > 0;
  }

  return {
    async readNotes(id) {
      const { data, error } = await db
        .from("consultations")
        .select("notes")
        .eq("id", id)
        .maybeSingle<{ notes: string | null }>();
      if (error) throw error;
      return data ? { notes: data.notes } : null;
    },
    async markPending(id) {
      const { error } = await db.from("consultations").update({ notes_translation_status: "pending" }).eq("id", id);
      if (error) throw error;
    },
    writeDoneIfSource: (id, source, notesJa) =>
      updateIfSource(id, source, { notes_ja: notesJa, notes_ja_source: source, notes_translation_status: "done" }),
    markFailedIfSource: (id, source) => updateIfSource(id, source, { notes_translation_status: "failed" }),
  };
}
