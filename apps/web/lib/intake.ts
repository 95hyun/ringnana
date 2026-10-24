// 문진 코드값·금기 플래그 규칙. 의료 판단은 하지 않는다 — 플래그는 의사 확인용 표시일 뿐 진행을 막지 않는다.
// 키는 의원 콘솔 라벨(app/clinic/_components/labels.ts)·seed와 같은 코드값을 쓴다. 화면 문구는 dictionaries/*/h2.ts.

export const CONCERN_KEYS = ["melasma", "freckles", "acne", "acne_scar", "pores", "redness", "wrinkles", "sagging"] as const;
export type ConcernKey = (typeof CONCERN_KEYS)[number];

// 금기 문항 — docs/product/plan.md 문진·스크리닝 행
export const CONTRAINDICATION_KEYS = ["pregnant", "isotretinoin", "anticoagulant", "keloid", "recent_sunburn", "recent_procedure"] as const;
export type ContraindicationKey = (typeof CONTRAINDICATION_KEYS)[number];
export type ContraindicationAnswers = Record<ContraindicationKey, boolean>;

export function isConcernKey(v: string): v is ConcernKey {
  return (CONCERN_KEYS as readonly string[]).includes(v);
}

// 응답 원본 → 플래그. "はい"인 문항이 그대로 플래그가 된다 (가중치·차단 판단 없음)
export function computeFlags(answers: Partial<ContraindicationAnswers>): ContraindicationKey[] {
  return CONTRAINDICATION_KEYS.filter((k) => answers[k] === true);
}

export function normalizeAnswers(answers: Partial<ContraindicationAnswers>): ContraindicationAnswers {
  return Object.fromEntries(CONTRAINDICATION_KEYS.map((k) => [k, answers[k] === true])) as ContraindicationAnswers;
}

// 고민 → 기대 이미지 생성 프롬프트(영문, 모델 입력용). 시술 표시명은 사전의 procedures — 참고 예시일 뿐 실제 시술은 의사가 정한다
export const PREVIEW_EFFECTS: Record<ConcernKey, string> = {
  melasma: "pigmentation and melasma patches look noticeably lighter and more even",
  freckles: "freckles look lighter and the skin tone is more even",
  acne: "active acne and inflammation are calmer and reduced",
  acne_scar: "acne scars look shallower and the skin texture is smoother",
  pores: "pores look tighter and the skin texture is smoother",
  redness: "facial redness and visible capillaries are reduced",
  wrinkles: "fine lines are softened and the skin looks more hydrated and supple",
  sagging: "the skin looks firmer, more elastic and better hydrated",
};

// 체류 일정 검증: 둘 다 있거나 둘 다 없고, 종료 ≥ 시작 (DB check 제약과 동일)
export function validTrip(start: string | null, end: string | null): boolean {
  if (!start && !end) return true;
  if (!start || !end) return false;
  const re = /^\d{4}-\d{2}-\d{2}$/;
  // 2026-02-30 같은 없는 날짜는 Date가 넘겨서 다른 날이 되므로 왕복 비교로 거른다
  const real = (d: string) => {
    const t = new Date(`${d}T00:00:00Z`);
    return re.test(d) && !Number.isNaN(t.getTime()) && t.toISOString().startsWith(d);
  };
  return real(start) && real(end) && end >= start;
}
