import Link from "next/link";
import { notFound } from "next/navigation";
import { lang as rootLang } from "next/root-params";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabaseServer } from "@/lib/supabase/server";
import { signedPhotoUrls } from "@/lib/supabase/storage";
import { getDict, href, isLang, type Lang } from "@/lib/i18n";
import { CONTRAINDICATION_KEYS } from "@/lib/intake";
import { patientName, treatmentName } from "@/lib/localize";
import type { Dict } from "@/dictionaries/jp";
import { buildRoomUrl, platformUrl } from "@/lib/video";
import { AutoRefresh } from "../../_components/auto-refresh";
import { requestOrigin } from "../../_components/origin";
import { fmt, formatKrw, label, tripDays, type H3Dict } from "../../_components/labels";
import { parseQuoteItems } from "../../_components/quote-types";
import { CallControls, EndOnReturn } from "./_components/call-controls";
import { CallPhotos, groupCallPhotos } from "./_components/call-photos";
import { QuoteForm } from "./_components/quote-form";

const ANGLE_ORDER = ["front", "left", "right"];

const isoDateFromToday = (days: number) => new Date(Date.now() + days * 86_400_000).toISOString().slice(0, 10);

async function ConsultDetail({ id, lang, t, dict }: { id: string; lang: Lang; t: H3Dict["clinic"]; dict: Pick<Dict, "common"> }) {
  const L = t.labels;
  const tc = t.consult;
  const db = supabaseServer();
  const { data: c } = await db
    .from("consultations")
    .select(
      "id, status, notes, video_session_id, patient_id, intake_id, patients(name, name_latin, birth_year, country), doctors(name), intakes(concerns, flags, contraindications, trip_start, trip_end)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!c) notFound();

  // 문진에 연결된 사진 우선, 없으면 환자의 최신 사진 (H2 업로드가 intake_id를 안 붙인 경우 대비)
  const photoQuery = db.from("photos").select("id, angle, storage_path, quality_ok, intake_id").eq("patient_id", c.patient_id).eq("source", "intake").in("angle", ANGLE_ORDER).order("created_at", { ascending: false });
  const { data: allPhotos } = await photoQuery;
  const scoped = (allPhotos ?? []).filter((p) => c.intake_id && p.intake_id === c.intake_id);
  const pool = scoped.length > 0 ? scoped : (allPhotos ?? []);
  const photos = ANGLE_ORDER.map((a) => pool.find((p) => p.angle === a)).filter((p) => p !== undefined);
  const urls = await signedPhotoUrls(photos.map((p) => p.storage_path)).catch(() => photos.map(() => null));

  // 환자 기대 이미지 — 셀카(문진 정면) + H2가 저장하는 AI 이미지(angle='preview', 최신 1장)
  const selfie = photos.find((p) => p.angle === "front");
  const { data: preview } = c.intake_id
    ? await db.from("photos").select("storage_path").eq("intake_id", c.intake_id).eq("angle", "preview").order("created_at", { ascending: false }).limit(1).maybeSingle()
    : { data: null };
  const [previewUrl] = preview ? await signedPhotoUrls([preview.storage_path]).catch(() => [null]) : [null];
  const selfieUrl = selfie ? urls[photos.indexOf(selfie)] : null;

  // 통화 중 촬영 사진 (video 앱 서버가 저장, 계약 §4) — 회차별로 묶는다
  const { data: callRows } = await db
    .from("photos")
    .select("id, angle, storage_path, capture_batch_id, capture_mode, created_at")
    .eq("consultation_id", id)
    .eq("source", "call")
    .order("created_at", { ascending: false });
  const callUrls = await signedPhotoUrls((callRows ?? []).map((p) => p.storage_path)).catch(() => (callRows ?? []).map(() => null));
  const callBatches = groupCallPhotos((callRows ?? []).map((p, i) => ({ ...p, url: callUrls[i] ?? null })));

  const { data: quote } = await db
    .from("quotes")
    .select("id, items, total_krw, valid_until, status")
    .eq("consultation_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const origin = await requestOrigin();
  const sessionId = c.video_session_id;
  const doctorUrl = buildRoomUrl({ sessionId, role: "doctor", name: c.doctors?.name ?? tc.doctorFallback, lang: "ko", returnUrl: platformUrl(href(lang, `/clinic/consult/${id}?ended=1`), origin) }, origin);

  const intake = c.intakes;
  // 문진 응답 원본(jsonb) — 예/아니오 전체를 보여 준다. 없는 키는 미응답(H2 문항 추가 이전 데이터)
  const rawAnswers = intake?.contraindications;
  const answers: Record<string, unknown> = rawAnswers && typeof rawAnswers === "object" && !Array.isArray(rawAnswers) ? rawAnswers : {};
  const nDays = tripDays(intake?.trip_start ?? null, intake?.trip_end ?? null);
  const tripDates = Array.from({ length: Math.min(nDays, 31) }, (_, i) => {
    const d = new Date(`${intake!.trip_start}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + i);
    return `${d.getUTCMonth() + 1}/${d.getUTCDate()}`;
  });
  const items = parseQuoteItems(quote?.items);
  const locked = quote && quote.status !== "draft";
  const defaultValidUntil = isoDateFromToday(30);

  return (
    <div className="flex flex-col gap-6" data-consultation={c.id} data-status={c.status}>
      <Suspense>
        <EndOnReturn consultationId={c.id} t={t.call} />
      </Suspense>
      {c.status === "in_call" ? <AutoRefresh /> : null}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href={href(lang, "/clinic")} className="text-sm text-muted-foreground hover:underline">
            {tc.back}
          </Link>
          <h1 className="text-2xl font-bold">{patientName(c.patients)}</h1>
          {c.patients?.birth_year ? <span className="text-muted-foreground">{fmt(t.queue.age, { n: new Date().getFullYear() - c.patients.birth_year })} · {c.patients.country}</span> : null}
          <Badge variant={c.status === "in_call" ? "destructive" : "secondary"}>{label(L.status, c.status)}</Badge>
        </div>
        <CallControls consultationId={c.id} status={c.status} doctorUrl={doctorUrl} t={t.call} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Card>
          <CardHeader>
            <CardTitle>{tc.intake}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <div>
              <span className="text-muted-foreground">{tc.concerns} </span>
              {(intake?.concerns ?? []).map((k) => label(L.concerns, k)).join(", ") || "—"}
            </div>
            <div className="flex flex-wrap items-center gap-1">
              <span className="text-muted-foreground">{tc.flags} </span>
              {(intake?.flags ?? []).length === 0 ? (
                <span>{tc.none}</span>
              ) : (
                intake!.flags.map((f) => (
                  <Badge key={f} variant="destructive" data-flag={f}>
                    {label(L.flags, f)}
                  </Badge>
                ))
              )}
            </div>
            <div className="flex flex-col gap-1" data-contraindications>
              <span className="text-muted-foreground">{tc.answers}</span>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                {CONTRAINDICATION_KEYS.map((k) => {
                  const v = answers[k];
                  return (
                    <li key={k} className="flex justify-between border-b border-dashed py-0.5" data-answer={k}>
                      <span>{label(L.flags, k)}</span>
                      <span className={v === true ? "font-semibold text-destructive" : "text-muted-foreground"}>
                        {v === true ? tc.yes : v === false ? tc.no : tc.unanswered}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div>
              <span className="text-muted-foreground">{tc.trip} </span>
              {intake?.trip_start ? `${intake.trip_start} ~ ${intake.trip_end ?? ""} (${fmt(tc.days, { n: nDays })})` : "—"}
            </div>
            <p className="text-xs text-muted-foreground">{tc.flagNote}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{tc.photos}</CardTitle>
          </CardHeader>
          <CardContent>
            {photos.length === 0 ? (
              <p className="text-sm text-muted-foreground">{tc.noPhotos}</p>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                {photos.map((p, i) => (
                  <figure key={p.id} className="flex flex-col gap-1" data-photo={p.angle}>
                    {urls[i] ? (
                      // eslint-disable-next-line @next/next/no-img-element -- signed URL은 매번 바뀌어 next/image 최적화 대상 아님
                      <a href={urls[i]!} target="_blank" rel="noopener"><img src={urls[i]!} alt={label(L.angles, p.angle)} className="aspect-[3/4] w-full rounded border object-cover" /></a>
                    ) : (
                      <div className="flex aspect-[3/4] items-center justify-center rounded border text-xs text-muted-foreground">{tc.photoLoadFailed}</div>
                    )}
                    <figcaption className="text-center text-xs text-muted-foreground">
                      {label(L.angles, p.angle)}
                      {p.quality_ok === false ? tc.qualityCheck : ""}
                    </figcaption>
                  </figure>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card data-expectation>
        <CardHeader>
          <CardTitle>{tc.expectation}</CardTitle>
        </CardHeader>
        <CardContent className="grid max-w-xl grid-cols-2 gap-3">
          {[
            { key: "selfie", url: selfieUrl, caption: tc.selfie },
            { key: "preview", url: previewUrl, caption: tc.preview },
          ].map((x) => (
            <figure key={x.key} className="flex flex-col gap-1" data-expectation-slot={x.key}>
              {x.url ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element -- signed URL은 매번 바뀌어 next/image 최적화 대상 아님 */}
                  <img src={x.url} alt={x.caption} className="aspect-[3/4] w-full rounded border object-cover" />
                  {/* 환자에게 보인 것과 같은 고지를 유지 — 실제 결과가 아님 */}
                  {x.key === "preview" ? (
                    <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">{tc.aiNotice}</span>
                  ) : null}
                </div>
              ) : (
                <div className="flex aspect-[3/4] items-center justify-center rounded border border-dashed text-xs text-muted-foreground">{tc.noImage}</div>
              )}
              <figcaption className="text-center text-xs text-muted-foreground">{x.caption}</figcaption>
            </figure>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.callPhotos.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <CallPhotos batches={callBatches} t={t.callPhotos} labels={L.angles} dateLocale={t.dateLocale} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{tc.quoteTitle}</CardTitle>
        </CardHeader>
        <CardContent>
          {locked ? (
            <div className="flex flex-col gap-3 text-sm" data-quote-locked={quote.status}>
              <p className="whitespace-pre-wrap">{c.notes || "—"}</p>
              <ul className="flex flex-col gap-1">
                {items.map((it, i) => (
                  <li key={i} className="flex justify-between border-b py-1">
                    <span>
                      {treatmentName(it, lang, dict) ?? it.name} {lang === "ko" && it.name_ja ? <span className="text-muted-foreground">({it.name_ja})</span> : null} {fmt(tc.sessions, { n: it.sessions })}
                      {it.visit_days.length > 0 ? <span className="text-muted-foreground"> · {fmt(tc.stayDays, { days: it.visit_days.join("·") })}</span> : null}
                    </span>
                    <span>{formatKrw(it.sessions * it.price_krw)}</span>
                  </li>
                ))}
              </ul>
              <div className="flex justify-between font-bold">
                <span>{fmt(tc.totalWithValidity, { date: quote.valid_until ?? "—" })}</span>
                <span>{formatKrw(quote.total_krw)}</span>
              </div>
              <Badge>{quote.status === "accepted" ? tc.accepted : tc.confirmedWaiting}</Badge>
            </div>
          ) : (
            <QuoteForm
              consultationId={c.id}
              initialNotes={c.notes ?? ""}
              initialItems={items}
              initialValidUntil={quote?.valid_until ?? defaultValidUntil}
              tripDates={tripDates}
              t={t.quote}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default async function ClinicConsultPage({ params }: PageProps<"/[lang]/clinic/consult/[id]">) {
  // params 전체를 여기서 await하면 [id]까지 런타임 값이 되므로 lang만 root-params로 읽는다
  const lang = await rootLang();
  if (!isLang(lang)) notFound();
  const dict = await getDict(lang);
  const t = dict.h3.clinic;
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">{t.loading}</p>}>
      <ConsultDetailLoader params={params} lang={lang} t={t} dict={dict} />
    </Suspense>
  );
}

// [id]는 런타임 값 — Suspense 안에서 await (cacheComponents)
async function ConsultDetailLoader({ params, lang, t, dict }: { params: Promise<{ id: string }>; lang: Lang; t: H3Dict["clinic"]; dict: Pick<Dict, "common"> }) {
  const { id } = await params;
  return <ConsultDetail id={id} lang={lang} t={t} dict={dict} />;
}
