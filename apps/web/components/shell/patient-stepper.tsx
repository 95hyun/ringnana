import type { Lang } from "@/lib/i18n";

export const PATIENT_STEPS = ["intake", "photos", "consult", "quote", "aftercare"] as const;
export type PatientStep = (typeof PATIENT_STEPS)[number];

// 진행 단계는 헤더의 3단계(FlowSteps, Figma 헤더)로 옮겼다. 기존 호출부를 깨지 않도록 API만 남긴 빈 컴포넌트
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- 호출부 호환용 시그니처
export async function PatientStepper(_props: { lang: Lang; current: PatientStep }) {
  return null;
}
