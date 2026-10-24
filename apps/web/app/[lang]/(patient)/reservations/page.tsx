import { CalendarDays } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { lang as rootLang } from "next/root-params";
import { Suspense } from "react";
import { AutoRefresh } from "@/app/[lang]/clinic/_components/auto-refresh";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DisclaimerBar } from "@/components/ui/disclaimer-bar";
import { getDict, href, isLang, type Lang } from "@/lib/i18n";
import { requirePatient } from "../login/_lib/session";
import { BookingSummary } from "./_components/booking-summary";
import { ReservationRow } from "./_components/reservation-row";
import { listBookings, requestTime } from "./_lib/booking";

// 우측 요약에 보여줄 '지금 가장 중요한' 예약 — 진료 중 > 확정 > 확인 중 > 작성 중
const FOCUS_ORDER = ["in_call", "scheduled", "requested", "draft"];

async function ReservationsBody({ lang }: { lang: Lang }) {
  const [patient, dict] = await Promise.all([requirePatient(lang, "/reservations"), getDict(lang)]);
  const bookings = await listBookings(patient.id);
  const t = dict.booking.reservations;
  // requirePatient(cookies) 뒤라 요청마다 렌더된다 — 입장 가능 시각 판정용
  const now = requestTime();
  const focus = FOCUS_ORDER.map((s) => bookings.find((b) => b.status === s)).find((b) => b !== undefined);

  return (
    <>
      {/* 의사 수락·진료 시작을 반영하려고 주기적으로 다시 받는다 (Realtime 대신 폴링) */}
      <AutoRefresh intervalMs={10_000} />
      <section className="flex flex-col gap-3 rounded-xl border border-blush/15 bg-blush-tint p-5 md:p-6">
        <p className="text-[11px] font-semibold tracking-wide text-blush uppercase">{t.eyebrow}</p>
        <h1 className="text-[22px] font-bold leading-tight md:text-[26px]">{t.title}</h1>
        <p className="text-[13px] leading-relaxed text-muted-foreground">{t.lead}</p>
      </section>

      {bookings.length === 0 ? (
        <Card className="items-start gap-3 p-5 md:p-6" data-testid="reservations-empty">
          <span className="flex size-10 items-center justify-center rounded-full bg-primary-tint text-primary">
            <CalendarDays className="size-[18px]" strokeWidth={1.75} aria-hidden />
          </span>
          <p className="text-[17px] font-semibold">{t.empty}</p>
          <p className="text-[13px] leading-relaxed text-muted-foreground">{t.emptyHint}</p>
          <Link href={href(lang, "/doctors")} className={buttonVariants({ size: "lg", className: "rounded-[10px]" })}>
            {t.findDoctor}
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-12">
          <Card className="gap-4 p-5 md:col-span-7 md:p-6">
            <h2 className="text-lg font-semibold">{t.listTitle}</h2>
            <ul className="flex flex-col" data-testid="reservations-list">
              {bookings.map((b) => (
                <ReservationRow key={b.id} booking={b} lang={lang} dict={dict} now={now} />
              ))}
            </ul>
          </Card>
          <div className="flex flex-col gap-6 md:col-span-5">
            {focus && <BookingSummary booking={focus} lang={lang} dict={dict} />}
            <Link href={href(lang, "/doctors")} className="flex min-h-11 items-center text-[13px] font-medium text-primary underline-offset-4 hover:underline">
              {t.findDoctor}
            </Link>
          </div>
        </div>
      )}

      <DisclaimerBar>{dict.common.disclaimer}</DisclaimerBar>
    </>
  );
}

export default async function ReservationsPage() {
  // params는 Suspense 밖에서 읽으면 Cache Components 프리렌더 오류 — 언어는 root param으로
  const lang = await rootLang();
  if (!isLang(lang)) notFound();
  const dict = await getDict(lang);
  return (
    <div data-layout="wide" className="flex flex-1 flex-col gap-6">
      <Suspense fallback={<p className="text-sm text-muted-foreground">{dict.common.states.loading}</p>}>
        <ReservationsBody lang={lang} />
      </Suspense>
    </div>
  );
}
