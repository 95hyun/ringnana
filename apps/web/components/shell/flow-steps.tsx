"use client";

import { usePathname } from "next/navigation";
import { Fragment, Suspense } from "react";
import { cn } from "@/lib/utils";

export const FLOW_STEPS = ["intake", "review", "note"] as const;
export type FlowStep = (typeof FLOW_STEPS)[number];

// 경로 → 헤더 3단계 (Figma 헤더: 1 문진 · 2 의사 검토 · 3 소견서). 해당 없는 화면은 강조 없이 표시
function stepOf(pathname: string): FlowStep | null {
  const rest = "/" + pathname.split("/").slice(2).join("/");
  // flow-v2: 문진은 예약에 귀속(/consult/{id}/intake). 예약 확정 전 화면(requested)도 문진 단계로 본다
  if (/^\/(intake|photos)(\/|$)/.test(rest) || /^\/consult\/[^/]+\/(intake|requested)(\/|$)/.test(rest)) return "intake";
  if (/^\/consult\/[^/]+\/done(\/|$)/.test(rest)) return "note"; // 진료 완료 → 소견서 단계
  if (/^\/(consult|clinic\/consult)(\/|$)/.test(rest)) return "review";
  if (/^\/(quote|aftercare|clinic\/aftercare)(\/|$)/.test(rest)) return "note";
  return null;
}

// bar = 데스크톱 헤더 가운데(60px 높이 + 현재 단계 밑줄), inline = 모바일 헤더 둘째 줄
type Props = { labels: Record<FlowStep, string>; ariaLabel: string; variant: "bar" | "inline"; className?: string };

// usePathname은 동적 경로에서 Suspense가 필요하다(Cache Components) — 대기 중에는 강조 없이
export function FlowSteps(props: Props) {
  return (
    <Suspense fallback={<StepList {...props} current={null} />}>
      <CurrentFlowSteps {...props} />
    </Suspense>
  );
}

function CurrentFlowSteps(props: Props) {
  return <StepList {...props} current={stepOf(usePathname())} />;
}

function StepList({ labels, ariaLabel, variant, className, current }: Props & { current: FlowStep | null }) {
  return (
    <ol aria-label={ariaLabel} data-flow-step={current ?? "none"} className={cn("flex items-center whitespace-nowrap text-[13px]", className)}>
      {FLOW_STEPS.map((step, i) => {
        const active = step === current;
        return (
          <Fragment key={step}>
            {i > 0 && (
              <li aria-hidden className={cn("text-muted-foreground", variant === "inline" && "px-1.5")}>
                ·
              </li>
            )}
            <li
              aria-current={active ? "step" : undefined}
              className={cn(
                "relative flex items-center",
                variant === "bar" && "h-15 px-4",
                active ? "font-semibold text-primary" : "text-muted-foreground",
              )}
            >
              {i + 1} {labels[step]}
              {active && variant === "bar" && <span aria-hidden className="absolute bottom-0 left-0 h-0.5 w-12 rounded-full bg-primary" />}
            </li>
          </Fragment>
        );
      })}
    </ol>
  );
}
