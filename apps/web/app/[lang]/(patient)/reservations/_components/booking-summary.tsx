import { CalendarDays } from "lucide-react";
import { Card } from "@/components/ui/card";
import { SampleImage } from "@/components/ui/sample-image";
import type { Dict } from "@/dictionaries/jp";
import { fill, formatAppointment } from "@/lib/format";
import type { Lang } from "@/lib/i18n";
import { localized } from "@/lib/localize";
import { cn } from "@/lib/utils";
import type { Booking } from "../_lib/booking";

type Props = { booking: Booking; lang: Lang; dict: Pick<Dict, "common" | "booking">; className?: string; compact?: boolean };

// 예약 요약 — S6 우측 Clinic 카드 패턴(quote/[id]/trip)에 의사·상담 시각을 더한 것
// compact = 사진 없이 한 줄(문진 화면 상단용)
export function BookingSummary({ booking, lang, dict, className, compact = false }: Props) {
  const t = dict.booking.summary;
  const doctor = localized(booking.doctors, lang);
  const clinic = booking.doctors?.clinics ?? null;
  const address = localized(clinic, lang, "address");
  const station = localized(clinic, lang, "station");
  return (
    <Card className={cn("gap-4 p-5", compact && "md:flex-row md:items-center md:justify-between", className)} data-booking-summary>
      {!compact && <SampleImage src="/figma/h4/clinic.jpg" alt="" label={dict.common.sampleImage} ratio="16/9" className="rounded-lg" />}
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold text-blush">{t.title}</p>
        <h2 className="text-lg font-semibold" data-doctor>
          {doctor ? fill(t.doctor, { name: doctor }) : t.doctorFallback}
        </h2>
        <p className="text-[13px] font-medium">{localized(clinic, lang) ?? t.clinicFallback}</p>
      </div>
      {!compact && (address || station) && (
        <div className="flex flex-col gap-0.5 text-[13px] leading-relaxed text-muted-foreground">
          {address && <p>{address}</p>}
          {station && <p>{fill(t.station, { station })}</p>}
        </div>
      )}
      <div className="flex items-start gap-3 rounded-lg bg-primary-tint p-3.5">
        <CalendarDays className="mt-0.5 size-[18px] shrink-0 text-primary" strokeWidth={1.75} aria-hidden />
        <div className="flex flex-col gap-0.5">
          <span className="text-xs text-muted-foreground">{t.time}</span>
          <span className="text-[13px] font-semibold text-primary-hover tabular-nums" data-scheduled-at>
            {booking.scheduled_at ? formatAppointment(booking.scheduled_at, lang, dict) : t.timePending}
          </span>
        </div>
      </div>
    </Card>
  );
}
