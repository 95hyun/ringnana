import { TriangleAlert } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { lang as rootLang } from "next/root-params";
import { Suspense } from "react";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DisclaimerBar } from "@/components/ui/disclaimer-bar";
import { getDict, href, isLang, type Lang } from "@/lib/i18n";
import { CONTRAINDICATION_KEYS, type ContraindicationKey } from "@/lib/intake";
import { requirePatient } from "../../../login/_lib/session";
import { BookingSummary } from "../../../reservations/_components/booking-summary";
import { loadBooking } from "../../../reservations/_lib/booking";

// 신청 완료 — S1/S3 hero + 좌7(다음 흐름·금기 안내) / 우5(S6 Clinic 카드 패턴 예약 요약)
async function RequestedBody({ lang, params }: { lang: Lang; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [patient, dict] = await Promise.all([requirePatient(lang, `/consult/${id}/requested`), getDict(lang)]);
  const booking = await loadBooking(id, patient.id);
  if (!booking) notFound();
  if (booking.status === "draft") redirect(href(lang, `/consult/${id}/intake`));
  const t = dict.booking.requested;
  const ti = dict.h2.intake;
  // 금기 플래그는 lib/intake가 제출 때 계산해 저장한 값 그대로 — 여기서 판단하지 않는다
  const flags = (booking.intakes?.flags ?? []).filter((f): f is ContraindicationKey => (CONTRAINDICATION_KEYS as readonly string[]).includes(f));

  return (
    <div className="flex flex-col gap-6" data-consultation={booking.id} data-status={booking.status}>
      <section className="flex flex-col gap-3 rounded-xl border border-blush/15 bg-blush-tint p-5 md:p-6">
        <p className="text-[11px] font-semibold tracking-wide text-blush uppercase">{t.eyebrow}</p>
        <h1 className="text-[22px] font-bold leading-tight md:text-[26px]">{t.title}</h1>
        <p className="text-[13px] leading-relaxed text-muted-foreground">{t.lead}</p>
      </section>

      <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-12">
        <div className="flex flex-col gap-6 md:col-span-7">
          <Card className="gap-4 p-5 md:p-6">
            <h2 className="text-lg font-semibold">{t.nextTitle}</h2>
            <ol className="flex flex-col gap-4">
              {t.next.map((line, i) => (
                <li key={line} className="flex items-start gap-3">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary-tint text-[13px] font-semibold text-primary tabular-nums">
                    {i + 1}
                  </span>
                  <span className="pt-0.5 text-[15px] leading-relaxed">{line}</span>
                </li>
              ))}
            </ol>
            <Link href={href(lang, "/reservations")} className={buttonVariants({ size: "lg", className: "w-full rounded-[10px] md:w-fit" })} data-testid="to-reservations">
              {t.toReservations}
            </Link>
          </Card>

          {flags.length > 0 && (
            <div role="note" className="flex flex-col gap-2 rounded-lg border border-warning-border bg-warning-tint p-4 text-warning-foreground" data-testid="intake-flag-notice">
              <p className="flex items-start gap-2 text-[13px] font-semibold leading-relaxed">
                <TriangleAlert className="mt-0.5 size-[18px] shrink-0" strokeWidth={1.75} aria-hidden />
                {ti.flagTitle} · {flags.map((k) => ti.flagLabels[k]).join("・")}
              </p>
              <p className="text-[15px] leading-[1.7]">{ti.flagBody}</p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-6 md:col-span-5">
          <BookingSummary booking={booking} lang={lang} dict={dict} />
        </div>
      </div>

      <DisclaimerBar>{dict.common.disclaimer}</DisclaimerBar>
    </div>
  );
}

export default async function RequestedPage({ params }: PageProps<"/[lang]/consult/[id]/requested">) {
  // params는 Suspense 밖에서 읽으면 Cache Components 프리렌더 오류 — 언어는 root param으로
  const lang = await rootLang();
  if (!isLang(lang)) notFound();
  const dict = await getDict(lang);
  return (
    <div data-layout="wide" className="flex flex-1 flex-col gap-6">
      <Suspense fallback={<p className="text-sm text-muted-foreground">{dict.common.states.loading}</p>}>
        <RequestedBody lang={lang} params={params} />
      </Suspense>
    </div>
  );
}
