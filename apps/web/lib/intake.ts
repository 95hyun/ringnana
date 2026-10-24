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

// 고민 → 목표 이미지 생성 프롬프트(영문, 모델 입력용). '시술 후 예측'이 아니라 환자가 원하는 피부(목표)를 의사에게 전달하는 용도 —
// 효과를 예측·보장하는 표현을 쓰지 않는다 (docs/design.md 적용 규칙)
export const PREVIEW_GOALS: Record<ConcernKey, string> = {
  melasma: "a more even skin tone with softer-looking dark patches",
  freckles: "a more even skin tone with softer-looking freckles",
  acne: "calmer, clearer-looking skin with less visible blemishes",
  acne_scar: "smoother-looking skin texture with softer-looking scars",
  pores: "smoother-looking skin with less noticeable pores",
  redness: "a calmer, more even skin tone with less visible redness",
  wrinkles: "softer-looking fine lines and a well-hydrated look",
  sagging: "a firmer, well-hydrated and healthy-looking skin",
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
