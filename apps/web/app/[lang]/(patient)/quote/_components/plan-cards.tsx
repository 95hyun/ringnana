import { TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { fill, formatDateShort } from "@/lib/format";
import type { Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { H4Dict } from "./i18n";

// S3·S6 공용 조각 (서버 컴포넌트)

export function SectionTitle({ className, children }: { className?: string; children: React.ReactNode }) {
  return <h2 className={cn("text-base font-bold", className)}>{children}</h2>;
}

// 문진 금기 플래그 — 빨강 금지, warning 계열 (docs/design.md 적용 규칙). 판단 문구가 아니라 "의사가 확인" 안내
export function FlagsBox({ flags, t }: { flags: string[]; t: H4Dict }) {
  if (!flags.length) return null;
  const labels = flags.map((f) => (f in t.flags ? t.flags[f as keyof H4Dict["flags"]] : f));
  return (
    <div role="note" className="flex flex-col gap-2 rounded-lg border border-warning-border bg-warning-tint p-4 text-warning-foreground">
      <p className="flex items-start gap-2 text-[13px] font-semibold leading-relaxed">
        <TriangleAlert className="mt-0.5 size-[18px] shrink-0" strokeWidth={1.75} aria-hidden />
        {fill(t.note.flagsTitle, { flags: labels.join("・") })}
      </p>
      <p className="text-[15px] leading-[1.7]">{t.note.flagsBody}</p>
    </div>
  );
}

type Checkin = { day: number; date: string | null; status: string | null };

// 예약 있으면 followups 상태, 없으면 추천일 기준 예정일(표시만)
export function CheckinRows({
  checkins,
  lang,
  t,
  variant,
}: {
  checkins: readonly Checkin[];
  lang: Lang;
  t: H4Dict;
  variant: "divided" | "compact";
}) {
  return (
    <ul className={cn("flex flex-col", variant === "compact" && "gap-4")}>
      {checkins.map((c) => {
        const label = t.note.checkinLabel[c.day as keyof H4Dict["note"]["checkinLabel"]] ?? `D+${c.day}`;
        const status = c.status && c.status in t.aftercare.status ? t.aftercare.status[c.status as keyof H4Dict["aftercare"]["status"]] : t.note.planned;
        return (
          <li
            key={c.day}
            className={cn("flex items-center gap-3", variant === "divided" && "min-h-13 border-t border-border py-3 last:pb-0")}
          >
            <span className="flex flex-1 flex-col gap-0.5">
              <span className="text-sm font-medium">{label}</span>
              {c.date && <span className="text-xs text-muted-foreground tabular-nums">{fill(t.aftercare.around, { date: formatDateShort(c.date, lang) })}</span>}
            </span>
            <Badge variant={c.status === "reviewed" ? "doctor-confirmed" : "outline"} className={c.status === "reviewed" ? undefined : "border-border-strong text-muted-foreground"}>
              {status}
            </Badge>
          </li>
        );
      })}
    </ul>
  );
}
