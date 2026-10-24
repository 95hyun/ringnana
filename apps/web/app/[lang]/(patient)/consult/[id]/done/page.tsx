import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { lang as rootLang } from "next/root-params";
import { connection } from "next/server";
import { Suspense } from "react";
import { FileText } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DisclaimerBar } from "@/components/ui/disclaimer-bar";
import { AutoRefresh } from "@/app/[lang]/clinic/_components/auto-refresh";
import { getDict, href, isLang, type Lang } from "@/lib/i18n";
import { formatAppointment } from "@/lib/format";
import { supabaseServer } from "@/lib/supabase/server";
import type { Dict } from "@/dictionaries/jp";
import { DoctorRowCard } from "../_components/doctor-row";
import { loadVisit } from "../_components/visit";

type DoneDict = Pick<Dict, "common" | "h3" | "visit">;

async function DoneContent({ params, lang, dict }: { params: Promise<{ id: string }>; lang: Lang; dict: DoneDict }) {
  await connection();
  const { id } = await params;
  const c = await loadVisit(id);
  // 통화에서 막 돌아오면 의사 쪽 종료 처리 전이라 in_call일 수 있다 — in_call·done 모두 이 화면
  if (c.status !== "in_call" && c.status !== "done") redirect(href(lang, `/consult/${c.id}`));

  // /quote/[id]와 같은 기준: 확정·수락된 견적이 있으면 의사 노트가 준비된 것
  const { data: quote } = await supabaseServer()
    .from("quotes")
    .select("id")
    .eq("consultation_id", c.id)
    .in("status", ["confirmed", "accepted"])
    .limit(1)
    .maybeSingle();

  const v = dict.visit.done;
  const when = c.scheduled_at ? formatAppointment(c.scheduled_at, lang, dict) : null;

  return (
    <div data-layout="wide" className="flex flex-col gap-6" data-consultation={c.id} data-status={c.status} data-note-ready={quote ? "1" : "0"}>
      {/* 노트가 확정되면 화면이 스스로 바뀌도록 폴링 (Realtime 대신 — 기존 규칙) */}
      {quote ? null : <AutoRefresh />}

      <section className="flex flex-col gap-3 rounded-xl border border-blush/15 bg-blush-tint p-5 md:p-6" data-hero>
        <p className="text-[11px] font-semibold tracking-wide text-blush uppercase">{v.eyebrow}</p>
        <h1 className="text-[22px] font-bold leading-tight md:text-[26px]">{v.title}</h1>
        {when ? <p className="text-[13px] font-medium text-blush tabular-nums">{when}</p> : null}
      </section>

      <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-12">
        <div className="flex flex-col gap-4 md:col-span-7">
          <Card className="gap-5 p-4 md:p-5" data-next>
            <h2 className="text-[22px] font-bold leading-snug">{v.nextTitle}</h2>
            {quote ? (
              <div className="flex flex-col gap-4" data-note-link>
                <p className="text-[15px] leading-[1.8]">{v.noteReady}</p>
                <Link href={href(lang, `/quote/${c.id}`)} className={buttonVariants({ size: "lg", className: "h-12 w-full" })} data-view-note>
                  <FileText aria-hidden />
                  {v.viewNote}
                </Link>
              </div>
            ) : (
              <div className="flex flex-col gap-2 rounded-lg border bg-surface p-4" data-note-pending>
                <p className="text-[15px] font-semibold">{v.notePending}</p>
                <p className="text-[13px] leading-relaxed text-muted-foreground">{v.notePendingBody}</p>
              </div>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-4 md:col-span-5">
          <Card className="gap-4 p-5 md:p-6" data-summary>
            <h2 className="text-base font-semibold">{v.summary}</h2>
            <DoctorRowCard doctor={c.doctors} lang={lang} titleFallback={dict.visit.room.doctorTitleFallback} />
            {when ? (
              <div className="flex flex-col gap-1 border-t pt-3">
                <span className="text-[11px] font-semibold text-muted-foreground">{v.scheduledAt}</span>
                <span className="text-[15px] tabular-nums">{when}</span>
              </div>
            ) : null}
            <Link href={href(lang, "/reservations")} className="text-sm font-medium text-primary underline-offset-4 hover:underline">
              {v.toReservations}
            </Link>
          </Card>
        </div>
      </div>

      <DisclaimerBar>{dict.common.disclaimer}</DisclaimerBar>
    </div>
  );
}

export default async function ConsultDonePage({ params }: PageProps<"/[lang]/consult/[id]/done">) {
  const lang = await rootLang();
  if (!isLang(lang)) notFound();
  const dict = await getDict(lang);
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">{dict.h3.consult.loading}</p>}>
      <DoneContent params={params} lang={lang} dict={dict} />
    </Suspense>
  );
}
