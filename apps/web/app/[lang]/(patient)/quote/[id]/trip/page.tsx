import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { CalendarDays, Map as MapIcon, Plane, PlaneLanding, Sun } from "lucide-react";
import { Card } from "@/components/ui/card";
import { DisclaimerBar } from "@/components/ui/disclaimer-bar";
import { SampleImage } from "@/components/ui/sample-image";
import { Separator } from "@/components/ui/separator";
import { href, type Lang } from "@/lib/i18n";
import { localized, treatmentName } from "@/lib/localize";
import { fill, formatDateShort } from "@/lib/format";
import { daysBetween } from "../../_components/format";
import { h4Context, type H4Dict } from "../../_components/i18n";
import { CheckinRows, FlagsBox, SectionTitle } from "../../_components/plan-cards";
import { loadPlan, planDays, treatmentsOn, type PlanDay } from "../../_components/plan";
import { BringChecklist } from "./_components/bring-checklist";

// S6 여행 일정 — 문진 체류 기간 + 내원일(예약 있으면 bookings.visit_dates, 없으면 의사 추천일)
export default async function TripPage({ params }: PageProps<"/[lang]/quote/[id]/trip">) {
  const { common } = await h4Context();
  return (
    <div data-layout="wide" className="flex flex-col gap-6">
      <Suspense fallback={<p className="text-sm text-muted-foreground">{common.states.loading}</p>}>
        <TripContent params={params} />
      </Suspense>
    </div>
  );
}

const DAY_ICON = { arrive: PlaneLanding, visit: CalendarDays, free: Sun, flyHome: Plane } as const;

async function TripContent({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  const { lang, t, common } = await h4Context();
  const plan = await loadPlan(id);
  // 견적·여행 일정이 없으면 이 화면은 의미가 없다 → 노트 화면이 대기/안내를 맡는다
  if (!plan.quote || !plan.trip) notFound();

  const { consult, items, trip, booking, visitDates, checkins, clinic, flags } = plan;
  const days = planDays(trip, visitDates);
  const short = (d: string) => formatDateShort(d, lang);

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-1">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-2xl font-semibold">{t.trip.title}</h1>
          <p className="text-[13px] text-muted-foreground">{booking ? t.trip.subtitleBooked : t.trip.subtitleSuggested}</p>
        </div>
        <Link href={href(lang, `/quote/${id}`)} className="flex min-h-11 items-center text-[13px] font-medium text-primary underline-offset-4 hover:underline">
          {t.trip.back}
        </Link>
      </div>

      <section className="flex flex-col gap-2.5 rounded-xl bg-blush-tint p-5 md:p-6">
        <p className="text-xs font-semibold text-blush">{fill(t.trip.summaryEyebrow, { name: consult.patients?.name ?? "—" })}</p>
        <p className="text-xl font-semibold leading-snug md:text-2xl">
          {fill(t.trip.summary, { start: short(trip.start), end: short(trip.end), n: items.length })}
        </p>
        <p className="text-[13px] leading-relaxed text-muted-foreground">{t.trip.summaryNote}</p>
      </section>

      <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-12">
        <div className="flex flex-col gap-6 md:col-span-7">
          <Card className="gap-4 p-5 md:p-6">
            <h2 className="text-lg font-semibold">{fill(t.trip.planTitle, { n: days.length })}</h2>
            <ol className="flex flex-col">
              {days.map((d, i) => (
                <DayRow key={d.date} day={d} last={i === days.length - 1} items={items} lang={lang} t={t} common={common} />
              ))}
            </ol>
          </Card>

          {visitDates.length > 0 && (
            <Card className="gap-4 p-5 md:p-6">
              <h2 className="text-lg font-semibold">{t.trip.datesTitle}</h2>
              {items.map((item, i) => {
                // 이 시술의 내원일 = 그날 받을 시술에 이 항목이 들어가는 날
                const dates = days.filter((d) => treatmentsOn(d, items).includes(item)).map((d) => d.date);
                if (!dates.length) return null;
                return (
                  <div key={i} className="flex flex-col gap-3">
                    {i > 0 && <Separator />}
                    <div className="flex items-start justify-between gap-3">
                      <p className="flex-1 text-[13px] font-semibold leading-relaxed">
                        {treatmentName(item, lang, { common }) ?? t.quote.treatmentFallback}
                        {item.sessions ? <span className="ml-1 font-normal text-muted-foreground">{fill(t.quote.sessions, { n: item.sessions })}</span> : null}
                      </p>
                      <p className="text-xs whitespace-nowrap text-muted-foreground tabular-nums">
                        {fill(t.trip.datesRange, { first: short(dates[0]), last: short(dates.at(-1)!) })}
                      </p>
                    </div>
                    <SpanBar trip={trip} dates={dates} />
                  </div>
                );
              })}
              <p className="text-xs leading-relaxed text-muted-foreground">{t.trip.datesNote}</p>
            </Card>
          )}
        </div>

        <div className="flex flex-col gap-6 md:col-span-5">
          <Card className="gap-4 p-5">
            <SampleImage src="/figma/h4/clinic.jpg" alt="" label={common.sampleImage} ratio="16/9" className="rounded-lg" />
            <h2 className="text-lg font-semibold">{localized(clinic, lang) ?? t.trip.clinicFallback}</h2>
            <p className="text-[13px] leading-relaxed text-muted-foreground">{clinic?.address ?? t.trip.addressFallback}</p>
            {/* 지도는 이미지 대신 회색 placeholder (design.md §7) */}
            <div className="flex h-[110px] flex-col items-center justify-center gap-1.5 rounded-lg bg-muted text-[13px] text-muted-foreground">
              <MapIcon className="size-[18px]" strokeWidth={1.75} aria-hidden />
              {t.trip.map}
            </div>
            <p className="text-xs text-muted-foreground">{t.trip.clinicNote}</p>
          </Card>

          <Card className="gap-4 p-5">
            <div className="flex flex-col gap-1">
              <h2 className="text-lg font-semibold">{t.trip.bringTitle}</h2>
              <p className="text-[13px] leading-relaxed text-muted-foreground">{t.trip.bringIntro}</p>
            </div>
            <BringChecklist items={Object.entries(t.trip.bring).map(([key, label]) => ({ id: key, label }))} />
          </Card>

          {visitDates.length > 0 && (
            <Card className="gap-4 p-5">
              <div className="flex flex-col gap-1">
                <SectionTitle className="text-lg font-semibold">{t.trip.checkinsTitle}</SectionTitle>
                <p className="text-[13px] text-muted-foreground">{booking ? t.note.checkinsBooked : t.note.checkinsPlanned}</p>
              </div>
              <CheckinRows checkins={checkins} lang={lang} t={t} variant="compact" />
            </Card>
          )}

          <FlagsBox flags={flags} t={t} />
        </div>
      </div>

      <DisclaimerBar>{common.disclaimer}</DisclaimerBar>
    </>
  );
}

function DayRow({
  day,
  last,
  items,
  lang,
  t,
  common,
}: {
  day: PlanDay;
  last: boolean;
  items: Parameters<typeof treatmentsOn>[1];
  lang: Lang;
  t: H4Dict;
  common: Parameters<typeof treatmentName>[2]["common"];
}) {
  const Icon = day.visit ? CalendarDays : DAY_ICON[day.kind];
  const visit = day.visit !== null;
  const title =
    day.kind === "arrive" ? (visit ? t.trip.arriveVisit : t.trip.arrive)
    : day.kind === "flyHome" ? (visit ? t.trip.flyHomeVisit : t.trip.flyHome)
    : visit ? t.trip.visit
    : t.trip.free;
  const names = treatmentsOn(day, items)
    .map((i) => treatmentName(i, lang, { common }) ?? t.quote.treatmentFallback)
    .join(" + ");
  const desc = visit ? fill(t.trip.visitDesc, { treatments: names, n: day.visit! }) : day.kind === "flyHome" ? t.trip.flyDesc : day.kind === "free" ? t.trip.freeDesc : "";
  const hint = visit ? t.trip.visitHint : day.kind === "flyHome" ? t.trip.flyHint : day.kind === "free" ? t.trip.freeHint : "";
  return (
    <li className="flex gap-4">
      <div className="flex w-10 shrink-0 flex-col items-center">
        <span className="flex size-10 items-center justify-center rounded-full bg-primary-tint text-primary">
          <Icon className="size-[18px]" strokeWidth={1.75} aria-hidden />
        </span>
        {!last && <span className="w-px flex-1 bg-border" aria-hidden />}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 pb-6">
        <div className="flex items-start justify-between gap-2">
          <span className="text-[13px] font-semibold text-primary tabular-nums">{formatDateShort(day.date, lang)}</span>
          <span className="text-xs text-muted-foreground">{fill(t.trip.dayN, { n: day.n })}</span>
        </div>
        <p className="text-[17px] font-semibold leading-snug">{title}</p>
        {desc && <p className="text-[13px] leading-relaxed">{desc}</p>}
        {hint && <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>}
      </div>
    </li>
  );
}

// 체류 기간 중 첫 내원일~마지막 내원일 구간 막대 (날짜 표시용, 회복 기간이 아니다)
function SpanBar({ trip, dates }: { trip: { start: string; end: string }; dates: string[] }) {
  const all = daysBetween(trip.start, trip.end);
  const from = Math.max(0, all.indexOf(dates[0]));
  const to = Math.max(from, all.indexOf(dates.at(-1)!));
  const left = (from / all.length) * 100;
  const width = ((to - from + 1) / all.length) * 100;
  return (
    <div className="relative h-3 w-full overflow-hidden rounded-full bg-muted" aria-hidden>
      <div className="absolute inset-y-0 rounded-full bg-primary" style={{ left: `${left}%`, width: `${width}%` }} />
    </div>
  );
}
