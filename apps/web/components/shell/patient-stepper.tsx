import { Check } from "lucide-react";
import { getDict, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export const PATIENT_STEPS = ["intake", "photos", "consult", "quote", "aftercare"] as const;
export type PatientStep = (typeof PATIENT_STEPS)[number];

// 환자 공통 진행 단계 (docs/ux-review.md C1). 각 레인이 자기 화면 상단에 <PatientStepper lang={lang} current="intake" />로 넣는다
export async function PatientStepper({ lang, current }: { lang: Lang; current: PatientStep }) {
  const { common } = await getDict(lang);
  const currentIdx = PATIENT_STEPS.indexOf(current);
  return (
    <ol aria-label={common.stepLabel} className="mb-4 flex items-start" data-stepper={current}>
      {PATIENT_STEPS.map((step, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <li key={step} className="flex flex-1 flex-col items-center gap-1 text-center" aria-current={active ? "step" : undefined}>
            <div className="flex w-full items-center">
              <span className={cn("h-0.5 flex-1", i === 0 ? "invisible" : done || active ? "bg-primary" : "bg-border")} />
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                  done && "border-primary bg-primary text-primary-foreground",
                  active && "border-primary bg-primary-tint text-primary-hover ring-4 ring-primary-tint",
                  !done && !active && "border-border bg-background text-muted-foreground",
                )}
              >
                {done ? <Check className="size-3.5" /> : i + 1}
              </span>
              <span className={cn("h-0.5 flex-1", i === PATIENT_STEPS.length - 1 ? "invisible" : done ? "bg-primary" : "bg-border")} />
            </div>
            <span className={cn("text-[11px] leading-tight", active ? "font-semibold text-foreground" : "text-muted-foreground")}>
              {common.steps[step]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
