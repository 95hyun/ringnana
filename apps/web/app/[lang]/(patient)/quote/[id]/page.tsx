import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { CalendarDays, Plane, PlaneLanding, Sun, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DisclaimerBar } from "@/components/ui/disclaimer-bar";
import { SampleImage } from "@/components/ui/sample-image";
import { Separator } from "@/components/ui/separator";
import { href, type Lang } from "@/lib/i18n";
import { localized, treatmentName } from "@/lib/localize";
import { fill, formatDate, formatDateShort, formatMoney, formatQuotePrice } from "@/lib/format";
import { CLINIC_CURRENCY } from "@/lib/market";
import { cn } from "@/lib/utils";
import { todaySeoul } from "../_components/format";
import { h4Context, type H4Dict } from "../_components/i18n";
import { CheckinRows, FlagsBox, SectionTitle } from "../_components/plan-cards";
import { loadPlan, planDays, type PlanDay } from "../_components/plan";
import { BookingPicker } from "./_components/booking-picker";
import { PrintButton } from "./_components/print-button";

// [id] = consultation_id — 화상 통화 직후 returnUrl로 돌아올 때는 견적이 아직 없을 수 있다
// 레이아웃 = Figma S3 (데스크톱 좌7/우5, 390px 1단). data-layout="wide"가 PatientShell 폭을 넓힌다
export default async function QuotePage({ params }: PageProps<"/[lang]/quote/[id]">) {
  const { common } = await h4Context();
  return (
    <div data-layout="wide" className="flex flex-col gap-6">
      <Suspense fallback={<p className="text-sm text-muted-foreground">{common.states.loading}</p>}>
        <QuoteContent params={params} />
      </Suspense>
    </div>
  );
}

async function QuoteContent({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const { lang, t, common } = await h4Context();
  const plan = await loadPlan(id);

  if (!plan.quote) {
    return (
      <Card>
        <CardContent className="flex flex-col gap-2 py-6 text-center">
          <p className="font-medium">{t.quote.waitingTitle}</p>
          <p className="text-sm text-muted-foreground">{t.quote.waitingBody}</p>
        </CardContent>
      </Card>
    );
  }

  const { consult, quote, items, sessions, trip, suggested, booking, visitDates, checkins, clinic, flags } = plan;
  const today = todaySeoul();
  const expired = quote.status === "confirmed" && !!quote.valid_until && quote.valid_until < today;
  const doctor = consult.doctors;
  const clinicName = localized(clinic, lang) ?? t.quote.clinicFallback;
  const price = formatQuotePrice(quote.total_krw, lang, { common });
  const patient = consult.patients;
  const country = patient?.country && patient.country in common.countries ? common.countries[patient.country as keyof typeof common.countries] : patient?.country ?? "";
  // 예약 버튼이 화면의 Primary — 예약 전에는 노트 저장을 outline으로 (design.md §5-1 화면당 Primary 1개)
  const canBook = !booking && !expired && !!trip && sessions > 0;

  return (
    <>
      {/* Hero — 언어 전환은 셸 헤더 LangSwitcher가 맡는다 */}
      <section className="flex flex-col gap-3 rounded-xl border border-blush/15 bg-blush-tint p-5 md:p-6">
        <p className="text-[11px] font-semibold tracking-wide text-blush uppercase">{t.note.eyebrow}</p>
        <h1 className="text-[22px] font-bold leading-tight md:text-[26px]">{t.note.heroTitle}</h1>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <p className="text-[13px] font-medium text-blush">
            {trip
              ? fill(t.note.context, { name: patient?.name ?? "—", country, start: formatDateShort(trip.start, lang), end: formatDateShort(trip.end, lang) })
              : fill(t.note.contextNoTrip, { name: patient?.name ?? "—", country })}
          </p>
          {trip && (
            <Link href={href(lang, `/quote/${id}/trip`)} className="flex min-h-11 items-center text-[13px] font-medium text-primary underline-offset-4 hover:underline">
              {t.note.toTrip}
            </Link>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-12">
        <div className="flex flex-col gap-4 md:col-span-7">
          {/* 의사 노트 — 의사 판단이 주인공 (design.md 원칙 2) */}
          <Card className="gap-5 p-4 md:p-5">
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <Badge variant="doctor-confirmed" className="h-auto px-2.5 py-1">
                  {common.doctorConfirmed}
                </Badge>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {fill(t.note.confirmedOn, { date: formatDate(quote.created_at, lang) })}
                </span>
              </div>
              <h2 className="text-[22px] font-bold leading-snug">{t.note.title}</h2>
              <p className="text-[13px] text-muted-foreground">
                {fill(t.note.byDoctor, { doctor: localized(doctor, lang) ?? "—", clinic: clinicName })}
              </p>
            </div>
            <Separator />
            {/* 소견 = consultations.notes (H3에서 의사가 입력한 원문, 번역은 범위 밖) */}
            <p className="whitespace-pre-wrap text-[15px] leading-[1.8]">{consult.notes?.trim() || t.note.notesFallback}</p>
            {items.map((item, i) => {
              const days = (Array.isArray(item.visit_days) ? item.visit_days : []).filter((n) => Number.isInteger(n) && n >= 1);
              return (
                <div key={i} className="flex flex-col gap-2">
                  {i > 0 && <Separator className="mb-3" />}
                  <h3 className="flex items-center gap-2 text-base font-semibold">
                    <span className="h-5 w-[3px] rounded-[2px] bg-primary" aria-hidden />
                    {treatmentName(item, lang, { common }) ?? t.quote.treatmentFallback}
                    {item.sessions ? <span className="text-sm font-normal text-muted-foreground">{fill(t.quote.sessions, { n: item.sessions })}</span> : null}
                  </h3>
                  {days.length > 0 && (
                    <p className="text-[15px] leading-[1.8]">
                      {fill(t.note.suggestedDays, { days: days.map((n) => fill(t.note.tripDayN, { n })).join("・") })}
                    </p>
                  )}
                  <p className="text-[15px] leading-[1.8]">{t.note.recoveryNote}</p>
                </div>
              );
            })}
            {booking && (
              <p className="text-[15px] leading-[1.8]">
                {fill(t.note.bookedDays, { dates: visitDates.map((d) => formatDateShort(d, lang)).join("・") })}
              </p>
            )}
            <FlagsBox flags={flags} t={t} />
            <PrintButton label={t.note.download} variant={canBook ? "outline" : "default"} />
          </Card>

          {/* 확정 견적 — 의사가 확정한 개인 견적 금액은 유지 (design.md 적용 규칙) */}
          <Card>
            <CardHeader>
              <CardTitle className="font-semibold">{t.quote.title}</CardTitle>
              <CardDescription>{clinicName}</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <ul className="flex flex-col gap-2">
                {items.map((item, i) => (
                  <li key={i} className="flex items-baseline justify-between gap-2 text-sm">
                    <span>
                      {treatmentName(item, lang, { common }) ?? t.quote.treatmentFallback}
                      {item.sessions ? (
                        <span className="ml-1 text-muted-foreground">{fill(t.quote.sessions, { n: item.sessions })}</span>
                      ) : null}
                    </span>
                    {typeof item.price_krw === "number" && (
                      <span className="tabular-nums">
                        {formatMoney(item.price_krw, CLINIC_CURRENCY, lang)}
                        <span className="text-muted-foreground">{t.quote.perSession}</span>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              <Separator />
              <div className="flex items-baseline justify-between">
                <span className="flex flex-col items-start gap-1">
                  <span className="font-medium">{t.quote.total}</span>
                  <Badge variant="doctor-confirmed">{common.doctorConfirmed}</Badge>
                </span>
                {/* 시장 통화 참고가를 크게, 결제 통화 확정가를 병기 (ux-review A3) */}
                <span className="text-right">
                  <span className="block text-2xl font-bold tabular-nums">{price.primary}</span>
                  <span className="text-sm text-muted-foreground">
                    {t.quote.settlementLabel} <span className="font-medium tabular-nums text-foreground">{price.settlement}</span>
                  </span>
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {t.quote.priceNote} {price.rateNote}
              </p>
              {quote.valid_until && (
                <p className="text-xs text-muted-foreground">
                  {fill(t.quote.validUntil, { date: formatDate(quote.valid_until, lang) })}
                </p>
              )}
            </CardContent>
          </Card>

          {booking ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-semibold">
                  {t.quote.booked} <Badge variant="outline">{t.quote.bookedBadge}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <ol className="flex flex-col gap-1 text-sm">
                  {visitDates.map((d, i) => (
                    <li key={d}>
                      {fill(t.quote.visitN, { n: i + 1 })}: <span className="font-medium">{formatDate(d, lang)}</span>
                    </li>
                  ))}
                </ol>
                <p className="text-xs text-muted-foreground">{t.quote.aftercareNote}</p>
                <div className="flex flex-wrap gap-x-4">
                  <Link href={href(lang, `/quote/${id}/trip`)} className="text-sm font-medium text-primary underline-offset-4 hover:underline">
                    {t.note.toTrip}
                  </Link>
                  <Link href={href(lang, "/aftercare")} className="text-sm font-medium text-primary underline-offset-4 hover:underline">
                    {t.quote.toAftercare}
                  </Link>
                </div>
              </CardContent>
            </Card>
          ) : expired ? (
            <Card>
              <CardContent className="py-4 text-sm">{t.quote.expired}</CardContent>
            </Card>
          ) : canBook ? (
            <BookingPicker
              quoteId={quote.id}
              tripStart={trip.start}
              tripEnd={trip.end}
              sessions={sessions}
              suggested={suggested}
              lang={lang}
              t={t.booking}
              errors={t.errors}
            />
          ) : (
            <Card>
              <CardContent className="py-4 text-sm text-muted-foreground">{t.quote.cannotBook}</CardContent>
            </Card>
          )}
          <DisclaimerBar>{common.disclaimer}</DisclaimerBar>
        </div>

        <div className="flex flex-col gap-6 md:col-span-5">
          {trip && (
            <Card className="gap-4 p-5 md:p-6">
              <div className="flex flex-col gap-1">
                <SectionTitle>{t.note.timelineTitle}</SectionTitle>
                <p className="text-[13px] text-muted-foreground">{booking ? t.note.timelineBooked : t.note.timelineSuggested}</p>
              </div>
              <CompactTimeline days={planDays(trip, visitDates)} lang={lang} t={t} />
              <p className="text-[13px] leading-[1.7] text-muted-foreground">{t.note.timelineNote}</p>
              <Link href={href(lang, `/quote/${id}/trip`)} className="text-[13px] font-medium text-primary underline-offset-4 hover:underline">
                {t.note.toTrip}
              </Link>
            </Card>
          )}
          {visitDates.length > 0 && (
            <Card className="gap-4 p-5 md:p-6">
              <div className="flex flex-col gap-1">
                <SectionTitle>{t.note.checkinsTitle}</SectionTitle>
                <p className="text-[13px] text-muted-foreground">{booking ? t.note.checkinsBooked : t.note.checkinsPlanned}</p>
              </div>
              <CheckinRows checkins={checkins} lang={lang} t={t} variant="divided" />
            </Card>
          )}
        </div>
      </div>

      <CheckinDemo lang={lang} t={t} sampleLabel={common.sampleImage} />
    </>
  );
}

const DAY_ICON = { arrive: PlaneLanding, visit: CalendarDays, free: Sun, flyHome: Plane } as const;

// S3 오른쪽 요약 타임라인 — 연속된 자유일은 한 줄(범위)로 묶는다
function CompactTimeline({ days, lang, t }: { days: PlanDay[]; lang: Lang; t: H4Dict }) {
  const rows: { kind: PlanDay["kind"]; from: string; to: string; visit: number | null }[] = [];
  for (const d of days) {
    const last = rows.at(-1);
    if (d.kind === "free" && last?.kind === "free") last.to = d.date;
    else rows.push({ kind: d.kind, from: d.date, to: d.date, visit: d.visit });
  }
  return (
    <ol className="flex flex-col">
      {rows.map((r, i) => {
        const Icon = r.visit ? CalendarDays : DAY_ICON[r.kind];
        const title =
          r.kind === "arrive" ? (r.visit ? t.trip.arriveVisit : t.trip.arrive)
          : r.kind === "flyHome" ? (r.visit ? t.trip.flyHomeVisit : t.trip.flyHome)
          : r.kind === "visit" ? t.trip.visit
          : t.trip.free;
        const hint = r.visit ? fill(t.quote.visitN, { n: r.visit }) : r.kind === "flyHome" ? t.trip.flyDesc : r.kind === "free" ? t.trip.freeDesc : "";
        const date = r.from === r.to ? formatDateShort(r.from, lang) : `${formatDateShort(r.from, lang)}〜${formatDateShort(r.to, lang)}`;
        const isLast = i === rows.length - 1;
        return (
          <li key={r.from} className="flex gap-3">
            <div className="flex w-9 shrink-0 flex-col items-center">
              <span className="flex size-9 items-center justify-center rounded-full bg-primary-tint text-primary">
                <Icon className="size-4" strokeWidth={1.75} aria-hidden />
              </span>
              {!isLast && <span className="min-h-6 w-px flex-1 bg-border" aria-hidden />}
            </div>
            <div className={cn("flex flex-1 flex-col gap-0.5 pt-0.5", !isLast && "pb-6")}>
              <p className="flex flex-wrap items-baseline gap-x-3">
                <span className="text-[13px] font-semibold text-primary tabular-nums">{date}</span>
                <span className="text-[15px] font-medium">{title}</span>
              </p>
              {hint && <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// 완료된 체크인 예시 — 정적 샘플(가상 인물 사진), 실제 체크인은 /aftercare
function CheckinDemo({ lang, t, sampleLabel }: { lang: Lang; t: H4Dict; sampleLabel: string }) {
  return (
    <Card className="gap-4 p-5 md:p-6 print:hidden">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <SectionTitle>{t.note.demoTitle}</SectionTitle>
        <Link href={href(lang, "/aftercare")} className={cn(buttonVariants({ variant: "outline" }), "w-full sm:w-auto")}>
          <Upload strokeWidth={1.75} aria-hidden />
          {t.note.demoUpload}
        </Link>
      </div>
      <p className="text-[13px] leading-relaxed text-muted-foreground">{t.note.demoIntro}</p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,448px)_1fr] md:gap-6">
        <div className="grid grid-cols-2 gap-3">
          {[
            { src: "/figma/h4/checkin-day0.jpg", caption: t.note.demoRight },
            { src: "/figma/h4/checkin-day3.jpg", caption: t.note.demoD3 },
          ].map((p) => (
            <figure key={p.src} className="flex flex-col gap-2">
              <SampleImage src={p.src} alt={p.caption} label={sampleLabel} className="rounded-lg" />
              <figcaption className="text-center text-[13px] font-medium">{p.caption}</figcaption>
            </figure>
          ))}
        </div>
        <div className="flex flex-col items-start gap-3 self-start rounded-lg border border-border bg-background p-4">
          <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{t.note.demoEyebrow}</p>
          <Badge variant="ai-label">{t.note.demoBadge}</Badge>
          <p className="text-[15px] font-semibold leading-relaxed">{t.note.demoSummary}</p>
          <p className="text-[13px] text-muted-foreground">{t.note.demoCaption}</p>
        </div>
      </div>
    </Card>
  );
}
