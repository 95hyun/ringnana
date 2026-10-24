// 소견 번역의 데이터 접근 경계 (spec §7.5). 모든 DB 오류는 throw 한다.
export interface OpinionStore {
  /** 진료의 현재 소견. 진료가 없으면 null. */
  readNotes(consultationId: string): Promise<{ notes: string | null } | null>;
  /** notes_translation_status = 'pending' */
  markPending(consultationId: string): Promise<void>;
  /** notes 가 source 와 같을 때만 notes_ja·notes_ja_source·status='done'을 한 번에 쓴다. 갱신됐으면 true. */
  writeDoneIfSource(consultationId: string, source: string, notesJa: string): Promise<boolean>;
  /** notes 가 source 와 같을 때만 status='failed'. 갱신됐으면 true. */
  markFailedIfSource(consultationId: string, source: string): Promise<boolean>;
}
