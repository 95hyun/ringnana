import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { lang as rootLang } from "next/root-params";
import { connection } from "next/server";
import { Suspense } from "react";
import { TriangleAlert } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DisclaimerBar } from "@/components/ui/disclaimer-bar";
import { AutoRefresh } from "@/app/[lang]/clinic/_components/auto-refresh";
import { fmt } from "@/app/[lang]/clinic/_components/labels";
import { requestOrigin } from "@/app/[lang]/clinic/_components/origin";
import { getDict, href, htmlLang, isLang, type Lang } from "@/lib/i18n";
import { formatAppointment } from "@/lib/format";
import type { Dict } from "@/dictionaries/jp";
import { buildRoomUrl, platformUrl, returnPath } from "@/lib/video";
import { DoctorRowCard } from "./_components/doctor-row";
import { canJoin, loadVisit } from "./_components/visit";

type RoomDict = Pick<Dict, "common" | "h3" | "visit">;

async function ConsultRoom({ params, lang, dict }: { params: Promise<{ id: string }>; lang: Lang; dict: RoomDict }) {
  await connection();
  const { id } = await params;
  const c = await loadVisit(id);
  // 문진 작성 중이면 문진으로, 끝난 진료는 진료 완료 화면으로
  if (c.status === "draft") redirect(href(lang, `/consult/${c.id}/intake`));
  if (c.status === "done") redirect(href(lang, `/consult/${c.id}/done`));

  const t = dict.h3.consult;
  const v = dict.visit.room;
  const origin = await requestOrigin();
  const roomUrl = buildRoomUrl({
    sessionId: c.video_session_id,
    role: "patient",
    name: c.patients?.name ?? undefined,
    lang: htmlLang(lang) === "ko" ? "ko" : "ja",
    returnUrl: platformUrl(returnPath("patient", c.id, lang), origin),
  });
  // 서버 렌더 시각 기준 — AutoRefresh(5초)가 다시 그리므로 10분 전이 되면 버튼이 켜진다
  const joinable = canJoin(c.status, c.scheduled_at);
  const live = c.status === "requested" || c.status === "scheduled" || c.status === "in_call";
  const when = c.scheduled_at ? formatAppointment(c.scheduled_at, lang, dict) : t.schedulePending;
  const heroTitle =
    c.status === "requested"
      ? v.requestedTitle
      : c.status === "scheduled"
        ? v.scheduledTitle
        : c.status === "in_call"
          ? v.inCallTitle
          : c.status === "declined"
            ? v.declinedTitle
            : c.status === "cancelled"
              ? v.cancelledTitle
              : t.title;
  const contactHref = `mailto:${t.contactEmail}?subject=${encodeURIComponent(fmt(t.contactSubject, { id: c.id.slice(0, 8) }))}`;

  const joinButton = roomUrl ? (
    joinable ? (
      <a href={roomUrl} className={buttonVariants({ size: "lg", className: "h-12 w-full" })} data-join>
        {t.join}
      </a>
    ) : (
      <Button size="lg" className="h-12 w-full" disabled data-join-locked>
        {v.joinLocked}
      </Button>
    )
  ) : (
    <p className="text-sm text-muted-foreground" data-video-missing>
      {t.videoMissing}
    </p>
  );

  return (
    <div data-layout="wide" className="flex flex-col gap-6" data-consultation={c.id} data-status={c.status}>
      {live ? <AutoRefresh /> : null}

      <section className="flex flex-col gap-3 rounded-xl border border-blush/15 bg-blush-tint p-5 md:p-6" data-hero>
        <p className="text-[11px] font-semibold tracking-wide text-blush uppercase">{v.eyebrow}</p>
        <h1 className="text-[22px] font-bold leading-tight md:text-[26px]">{heroTitle}</h1>
        {c.status !== "declined" && c.status !== "cancelled" ? (
          <p className="text-[13px] font-medium text-blush tabular-nums" data-schedule>
            {when}
          </p>
        ) : null}
      </section>

      <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-12">
        <div className="flex flex-col gap-4 md:col-span-7">
          <Card className="gap-5 p-4 md:p-5">
            <DoctorRowCard doctor={c.doctors} lang={lang} titleFallback={v.doctorTitleFallback} />

            {c.status === "requested" ? (
              <div className="flex flex-col gap-3 border-t pt-4" data-waiting>
                <p className="text-[15px] leading-[1.8]">{v.requestedBody}</p>
                <Link href={href(lang, "/reservations")} className={buttonVariants({ variant: "outline", size: "lg", className: "w-full" })} data-reservations>
                  {v.toReservations}
                </Link>
              </div>
            ) : c.status === "scheduled" || c.status === "in_call" ? (
              <div className="flex flex-col gap-3 border-t pt-4" data-room>
                <p className="text-[15px] leading-[1.8]">{c.status === "in_call" ? t.ready : v.scheduledBody}</p>
                {joinButton}
                <p className="text-xs text-muted-foreground">{t.interpreterNote}</p>
              </div>
            ) : c.status === "declined" ? (
              <div className="flex flex-col gap-3 border-t pt-4" data-declined>
                {c.decline_reason ? (
                  // 거절은 경고 계열(빨강은 응급 안내 전용, docs/design.md)
                  <div className="flex flex-col gap-2 rounded-lg border border-warning-border bg-warning-tint p-4">
                    <p className="flex items-center gap-2 text-[13px] font-semibold text-warning-foreground">
                      <TriangleAlert className="size-4 shrink-0" aria-hidden />
                      {v.declinedReason}
                    </p>
                    <p className="text-[13px] leading-relaxed whitespace-pre-wrap text-warning" data-decline-reason>
                      {c.decline_reason}
                    </p>
                  </div>
                ) : null}
                <p className="text-[15px] leading-[1.8]">{v.declinedBody}</p>
                <Link href={href(lang, "/doctors")} className={buttonVariants({ size: "lg", className: "h-12 w-full" })} data-find-doctor>
                  {v.findDoctor}
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-3 border-t pt-4">
                <Link href={href(lang, "/reservations")} className={buttonVariants({ variant: "outline", size: "lg", className: "w-full" })}>
                  {v.toReservations}
                </Link>
              </div>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-4 md:col-span-5">
          {c.status !== "declined" && c.status !== "cancelled" ? (
            <Card className="gap-3 p-5 md:p-6">
              <h2 className="text-base font-semibold">{t.scheduleTitle}</h2>
              <p className="text-[15px] font-medium tabular-nums">{when}</p>
            </Card>
          ) : null}
          {live ? (
            <a href={contactHref} className="text-center text-sm text-muted-foreground underline underline-offset-4" data-contact>
              {t.contact}
            </a>
          ) : null}
        </div>
      </div>

      <DisclaimerBar>{dict.common.disclaimer}</DisclaimerBar>
    </div>
  );
}

export default async function PatientConsultPage({ params }: PageProps<"/[lang]/consult/[id]">) {
  const lang = await rootLang();
  if (!isLang(lang)) notFound();
  const dict = await getDict(lang);
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">{dict.h3.consult.loading}</p>}>
      <ConsultRoom params={params} lang={lang} dict={dict} />
    </Suspense>
  );
}
