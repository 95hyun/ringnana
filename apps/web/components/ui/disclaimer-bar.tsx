import { Info } from "lucide-react";
import { cn } from "@/lib/utils";

// docs/design.md §5-6. 문구는 사전 common.disclaimer를 children으로 넘긴다
export function DisclaimerBar({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <p
      role="note"
      data-slot="disclaimer"
      className={cn("flex items-start gap-2 rounded-lg bg-disclaimer-bg px-4 py-3 text-[13px] leading-normal text-muted-foreground", className)}
    >
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}
