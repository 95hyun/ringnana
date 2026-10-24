import Link from "next/link";
import { notFound } from "next/navigation";
import { lang as rootLang } from "next/root-params";
import { Suspense } from "react";
import { PatientStepper } from "@/components/shell/patient-stepper";
import { buttonVariants } from "@/components/ui/button";
import { AutoRefresh } from "@/app/[lang]/clinic/_components/auto-refresh";
import { fmt, type H3Dict } from "@/app/[lang]/clinic/_components/labels";
import { requestOrigin } from "@/app/[lang]/clinic/_components/origin";
import { getDict, href, htmlLang, isLang, type Lang } from "@/lib/i18n";
import { localized } from "@/lib/localize";
import { formatAppointment } from "@/lib/format";
import type { Dict } from "@/dictionaries/jp";
import { supabaseServer } from "@/lib/supabase/server";
import { buildRoomUrl, platformUrl } from "@/lib/video";

async function ConsultRoom({ params, lang, t, dict }: { params: Promise<{ id: string }>; lang: Lang; t: H3Dict["consult"]; dict: Pick<Dict, "common"> }) {
  const { id } = await params;
  const { data: c } = await supabaseServer()
    .from("consultations")
    .select("id, status, scheduled_at, video_session_id, patients(name), doctors(name_ja, name, specialty, clinics(name, name_ja))")
    .eq("id", id)
    .maybeSingle();
  if (!c) notFound();

  const origin = await requestOrigin();
  // 통화 종료 후 견적 화면으로 — /quote/[id]의 id = consultation id (H4 구현과 일치)
  const roomUrl = buildRoomUrl({
    sessionId: c.video_session_id,
    role: "patient",
    name: c.patients?.name ?? undefined,
    lang: htmlLang(lang) === "ko" ? "ko" : "ja",
    returnUrl: platformUrl(href(lang, `/quote/${c.id}`), origin),
  });
  const doctor = localized(c.doctors, lang);
  const clinic = localized(c.doctors?.clinics, lang);
  // specialty는 _ja 컬럼이 없는 한국어 원문 — 사전에 있으면 현지화
  const specialty = c.doctors?.specialty ? (t.specialties[c.doctors.specialty] ?? c.doctors.specialty) : null;
  const contactHref = `mailto:${t.contactEmail}?subject=${encodeURIComponent(fmt(t.contactSubject, { id: c.id.slice(0, 8) }))}`;

  return (
    <div className="flex flex-1 flex-col gap-6 py-4" data-consultation={c.id} data-status={c.status}>
      {c.status !== "done" ? <AutoRefresh /> : null}
      <PatientStepper lang={lang} current="consult" />
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold">{t.title}</h1>
      </div>

      {c.status !== "done" ? (
        <div className="flex flex-col gap-1 rounded-lg border bg-muted/30 p-3" data-schedule>
          <span className="text-xs text-muted-foreground">{t.scheduleTitle}</span>
          <span className="font-medium">{c.scheduled_at ? formatAppointment(c.scheduled_at, lang, dict) : t.schedulePending}</span>
        </div>
      ) : null}

      {doctor ? (
        <div className="flex items-center gap-3 rounded-lg border p-3" data-doctor-profile>
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-muted text-lg font-bold" aria-hidden>
            {doctor.slice(0, 1)}
          </div>
          <div className="flex flex-col text-sm">
            <span className="font-medium">{fmt(t.doctor, { name: doctor })}</span>
            {specialty ? <span className="text-muted-foreground">{specialty}</span> : null}
            {clinic ? <span className="text-muted-foreground">{clinic}</span> : null}
          </div>
        </div>
      ) : null}

      {c.status === "done" ? (
        <div className="flex flex-col gap-3 rounded-lg border p-4">
          <p>{t.doneText}</p>
          <Link href={href(lang, `/quote/${c.id}`)} className={buttonVariants({ size: "lg" })}>
            {t.viewQuote}
          </Link>
        </div>
      ) : c.status === "in_call" ? (
        <div className="flex flex-col gap-3 rounded-lg border border-primary p-4">
          <p className="font-medium">{t.ready}</p>
          {roomUrl ? (
            <a href={roomUrl} className={buttonVariants({ size: "lg" })} data-join>
              {t.join}
            </a>
          ) : (
            <p className="text-sm text-destructive" data-video-missing>
              {t.videoMissing}
            </p>
          )}
          <p className="text-xs text-muted-foreground">{t.interpreterNote}</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3 rounded-lg border p-4" data-waiting>
          <p className="font-medium">{t.waitingTitle}</p>
          <p className="text-sm text-muted-foreground">{t.waitingBody}</p>
          <span className="inline-flex h-10 items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground">{t.waiting}</span>
        </div>
      )}

      {c.status !== "done" ? (
        <a href={contactHref} className="text-center text-sm text-muted-foreground underline underline-offset-4" data-contact>
          {t.contact}
        </a>
      ) : null}
    </div>
  );
}

export default async function PatientConsultPage({ params }: PageProps<"/[lang]/consult/[id]">) {
  const lang = await rootLang();
  if (!isLang(lang)) notFound();
  const dict = await getDict(lang);
  const t = dict.h3.consult;
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">{t.loading}</p>}>
      <ConsultRoom params={params} lang={lang} t={t} dict={dict} />
    </Suspense>
  );
}
