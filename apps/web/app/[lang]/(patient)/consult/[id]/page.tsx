import Link from "next/link";
import { notFound } from "next/navigation";
import { lang as rootLang } from "next/root-params";
import { Suspense } from "react";
import { buttonVariants } from "@/components/ui/button";
import { AutoRefresh } from "@/app/[lang]/clinic/_components/auto-refresh";
import { fmt, type H3Dict } from "@/app/[lang]/clinic/_components/labels";
import { requestOrigin } from "@/app/[lang]/clinic/_components/origin";
import { getDict, href, htmlLang, isLang, type Lang } from "@/lib/i18n";
import { supabaseServer } from "@/lib/supabase/server";
import { buildRoomUrl, platformUrl } from "@/lib/video";

async function ConsultRoom({ params, lang, t }: { params: Promise<{ id: string }>; lang: Lang; t: H3Dict["consult"] }) {
  const { id } = await params;
  const { data: c } = await supabaseServer()
    .from("consultations")
    .select("id, status, scheduled_at, video_session_id, patients(name), doctors(name_ja, name)")
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
  const doctor = lang === "jp" ? (c.doctors?.name_ja ?? c.doctors?.name) : (c.doctors?.name ?? c.doctors?.name_ja);

  return (
    <div className="flex flex-1 flex-col gap-6 py-4" data-consultation={c.id} data-status={c.status}>
      {c.status !== "done" ? <AutoRefresh /> : null}
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold">{t.title}</h1>
        {doctor ? <p className="text-sm text-muted-foreground">{fmt(t.doctor, { name: doctor })}</p> : null}
        {c.scheduled_at ? (
          <p className="text-sm text-muted-foreground">
            {fmt(t.scheduled, {
              date: new Date(c.scheduled_at).toLocaleString(t.dateLocale, { timeZone: t.timeZone, dateStyle: "medium", timeStyle: "short" }),
            })}
          </p>
        ) : null}
      </div>

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
    </div>
  );
}

export default async function PatientConsultPage({ params }: PageProps<"/[lang]/consult/[id]">) {
  const lang = await rootLang();
  if (!isLang(lang)) notFound();
  const t = (await getDict(lang)).h3.consult;
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">{t.loading}</p>}>
      <ConsultRoom params={params} lang={lang} t={t} />
    </Suspense>
  );
}
