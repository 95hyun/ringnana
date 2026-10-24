import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import type { Dict } from "@/dictionaries/jp";
import { fill, formatAppointment } from "@/lib/format";
import { href, type Lang } from "@/lib/i18n";
import { localized } from "@/lib/localize";
import { cn } from "@/lib/utils";
import { canJoin, type Booking } from "../_lib/booking";

type Status = keyof Dict["booking"]["reservations"]["status"];
const MUTED = "border-border-strong text-muted-foreground";
// 빨강 금지 — 見送り는 warning 계열(hold), 확정·진료 중은 의사 확정 배지 (docs/design.md)
const BADGE: Record<Status, { variant: "outline" | "role-doctor" | "doctor-confirmed" | "hold"; className?: string }> = {
  draft: { variant: "outline", className: MUTED },
  requested: { variant: "role-doctor" },
  scheduled: { variant: "doctor-confirmed" },
  in_call: { variant: "doctor-confirmed" },
  done: { variant: "outline", className: MUTED },
  declined: { variant: "hold" },
  cancelled: { variant: "outline", className: MUTED },
};

function isStatus(v: string): v is Status {
  return v in BADGE;
}

// buttonVariants의 className 인자는 병합(tailwind-merge) 없이 덧붙여져 border 색이 안 바뀐다 — cn으로 합친다
const ACTION = "h-10 w-full rounded-[10px] px-4 text-[13px] font-semibold sm:w-fit";
const action = cn(buttonVariants(), ACTION);
const actionOutline = cn(buttonVariants({ variant: "outline" }), ACTION);

// S6 "Upcoming check-ins" 행 패턴 — 제목·보조 줄 + 오른쪽 상태 칩, 아래에 상태별 행동
export function ReservationRow({ booking, lang, dict, now }: { booking: Booking; lang: Lang; dict: Pick<Dict, "common" | "booking">; now: number }) {
  const t = dict.booking.reservations;
  const ts = dict.booking.summary;
  const status = isStatus(booking.status) ? booking.status : null;
  const doctor = localized(booking.doctors, lang);
  const clinic = localized(booking.doctors?.clinics, lang);
  const joinable = canJoin(booking, now);
  return (
    <li className="flex flex-col gap-3 border-t border-border py-4 first:border-t-0 first:pt-0 last:pb-0" data-reservation={booking.id} data-status={booking.status}>
      <div className="flex items-start gap-3">
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-sm font-medium">{doctor ? fill(ts.doctor, { name: doctor }) : ts.doctorFallback}</span>
          <span className="text-xs text-muted-foreground">{clinic ?? ts.clinicFallback}</span>
          <span className="text-xs text-muted-foreground tabular-nums">
            {booking.scheduled_at ? formatAppointment(booking.scheduled_at, lang, dict) : ts.timePending}
          </span>
        </span>
        {status && (
          <Badge variant={BADGE[status].variant} className={BADGE[status].className} data-status-badge>
            {t.status[status]}
          </Badge>
        )}
      </div>

      {booking.status === "draft" && (
        <Link href={href(lang, `/consult/${booking.id}/intake`)} className={actionOutline} data-action="continue">
          {t.continueIntake}
        </Link>
      )}
      {(booking.status === "scheduled" || booking.status === "in_call") &&
        (joinable ? (
          <Link href={href(lang, `/consult/${booking.id}`)} className={action} data-action="join">
            {t.join}
          </Link>
        ) : (
          <p className="text-xs text-muted-foreground" data-action="join-soon">
            {t.joinSoon}
          </p>
        ))}
      {booking.status === "done" && (
        <Link href={href(lang, `/consult/${booking.id}/done`)} className={actionOutline} data-action="done">
          {t.viewDone}
        </Link>
      )}
      {booking.status === "declined" && (
        <div className="flex flex-col gap-1 rounded-lg bg-warning-tint p-3 text-[13px] leading-relaxed text-warning-foreground" data-action="declined">
          {booking.decline_reason && <p className="font-semibold">{fill(t.declineReason, { reason: booking.decline_reason })}</p>}
          <p>{t.declineNote}</p>
        </div>
      )}
    </li>
  );
}
