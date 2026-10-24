"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// docs/design.md §5-5: 스켈레톤 + 단계 문구가 차례로 바뀜(페이드 200ms만, 다른 애니메이션 없음). 마지막 문구에서 멈춘다
export function LoadingCard({
  steps,
  caption,
  intervalMs = 1800,
  className,
}: {
  steps: string[];
  caption?: string;
  intervalMs?: number;
  className?: string;
}) {
  const [idx, setIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (idx >= steps.length - 1) return;
    const hide = setTimeout(() => setVisible(false), intervalMs);
    const next = setTimeout(() => {
      setIdx((i) => i + 1);
      setVisible(true);
    }, intervalMs + 200);
    return () => {
      clearTimeout(hide);
      clearTimeout(next);
    };
  }, [idx, steps.length, intervalMs]);

  return (
    <div
      role="status"
      aria-live="polite"
      data-slot="loading-card"
      className={cn("flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm md:p-5", className)}
    >
      <div className="h-4 w-2/3 rounded bg-muted" />
      <div className="h-4 w-1/2 rounded bg-muted" />
      <div className="aspect-[4/3] w-full rounded-lg bg-muted" />
      <p className={cn("text-[15px] font-medium transition-opacity duration-200", visible ? "opacity-100" : "opacity-0")}>
        {steps[idx]}
      </p>
      {caption && <p className="text-[13px] text-muted-foreground">{caption}</p>}
    </div>
  );
}
