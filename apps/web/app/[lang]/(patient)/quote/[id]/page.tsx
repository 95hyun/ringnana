import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PatientStepper } from "@/components/shell/patient-stepper";
import { DisclaimerBar } from "@/components/ui/disclaimer-bar";
import { Separator } from "@/components/ui/separator";
import { href } from "@/lib/i18n";
import { localized, treatmentName } from "@/lib/localize";
import { supabaseServer } from "@/lib/supabase/server";
import { viewerPatientId } from "../_components/viewer";
import { fill, formatDate, formatMoney, formatQuotePrice } from "@/lib/format";
import { CLINIC_CURRENCY } from "@/lib/market";
import {
  parseItems,
  suggestedDates,
  totalSessions,
  todaySeoul,
} from "../_components/format";
import { h4Context } from "../_components/i18n";
import { BookingPicker } from "./_components/booking-picker";

// [id] = consultation_id — 화상 통화 직후 returnUrl로 돌아올 때는 견적이 아직 없을 수 있다
export default async function QuotePage({ params }: PageProps<"/[lang]/quote/[id]">) {
  const { lang, t, common } = await h4Context();
  return (
    <div className="flex flex-col gap-4">
      <PatientStepper lang={lang} current="quote" />
      <h1 className="text-xl font-bold">{t.quote.title}</h1>
      <Suspense fallback={<p className="text-sm text-muted-foreground">{common.states.loading}</p>}>
        <QuoteContent params={params} />
      </Suspense>
    </div>
  );
}

async function QuoteContent({ params }: { params: Promise<{ id: string }> }) {
  await connection();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { lang, t, common } = await h4Context();

  const db = supabaseServer();
  const { data: consult } = await db
    .from("consultations")
    .select("id, patient_id, intake_id, notes, doctors(name_ja, name, clinics(name, name_ja))")
    .eq("id", id)
    .maybeSingle();
  // 본인 진료만 보여준다
  if (!consult || consult.patient_id !== (await viewerPatientId())) notFound();

  const { data: quote } = await db
    .from("quotes")
    .select("id, items, total_krw, valid_until, status")
    .eq("consultation_id", id)
    .in("status", ["confirmed", "accepted"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!quote) {
    return (
      <Card>
        <CardContent className="flex flex-col gap-2 py-6 text-center">
          <p className="font-medium">{t.quote.waitingTitle}</p>
          <p className="text-sm text-muted-foreground">{t.quote.waitingBody}</p>
        </CardContent>
      </Card>
    );
  }

  const [{ data: intake }, { data: booking }] = await Promise.all([
    consult.intake_id
      ? db.from("intakes").select("trip_start, trip_end").eq("id", consult.intake_id).maybeSingle()
      : Promise.resolve({ data: null }),
    db.from("bookings").select("visit_dates").eq("quote_id", quote.id).maybeSingle(),
  ]);

  const items = parseItems(quote.items);
  const sessions = totalSessions(items);
  const today = todaySeoul();
  const expired = quote.status === "confirmed" && !!quote.valid_until && quote.valid_until < today;
  const doctor = consult.doctors;
  const price = formatQuotePrice(quote.total_krw, lang, { common });

  return (
    <>
      {/* 소견 = consultations.notes (H3 견적 작성 화면에서 의사가 입력한 원문, 번역은 범위 밖) */}
      {consult.notes?.trim() && (
        <Card>
          <CardHeader>
            {/* 의사 판단이 주인공 (design.md 원칙 2) */}
            <CardTitle className="text-lg font-bold">{t.quote.doctorNotes}</CardTitle>
            <CardDescription>{t.quote.doctorNotesHint}</CardDescription>
          </CardHeader>
          <CardContent className="whitespace-pre-wrap text-sm">{consult.notes}</CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <CardTitle>{localized(doctor?.clinics, lang) ?? t.quote.clinicFallback}</CardTitle>
          <CardDescription>{fill(t.quote.doctor, { name: localized(doctor, lang) ?? "—" })}</CardDescription>
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
            <CardTitle className="flex items-center gap-2">
              {t.quote.booked} <Badge variant="outline">{t.quote.bookedBadge}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <ol className="flex flex-col gap-1 text-sm">
              {[...booking.visit_dates].sort().map((d, i) => (
                <li key={d}>
                  {fill(t.quote.visitN, { n: i + 1 })}: <span className="font-medium">{formatDate(d, lang)}</span>
                </li>
              ))}
            </ol>
            <p className="text-xs text-muted-foreground">{t.quote.aftercareNote}</p>
            <Link
              href={href(lang, "/aftercare")}
              className="text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              {t.quote.toAftercare}
            </Link>
          </CardContent>
        </Card>
      ) : expired ? (
        <Card>
          <CardContent className="py-4 text-sm">{t.quote.expired}</CardContent>
        </Card>
      ) : intake?.trip_start && intake.trip_end && sessions > 0 ? (
        <BookingPicker
          quoteId={quote.id}
          tripStart={intake.trip_start}
          tripEnd={intake.trip_end}
          sessions={sessions}
          suggested={suggestedDates(items, intake.trip_start, intake.trip_end, sessions)}
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
    </>
  );
}
