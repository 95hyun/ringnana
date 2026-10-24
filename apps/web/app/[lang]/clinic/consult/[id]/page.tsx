import Link from "next/link";
import { notFound } from "next/navigation";
import { lang as rootLang } from "next/root-params";
import { TriangleAlert } from "lucide-react";
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
import { CallControls, EndCallButton, EndOnReturn } from "./_components/call-controls";
import { CallPhotos, groupCallPhotos } from "./_components/call-photos";
import { DisclaimerBar } from "@/components/ui/disclaimer-bar";
import { SampleImage } from "@/components/ui/sample-image";
import { BriefWorkspace } from "./_components/brief-workspace";
import { PhotoReference, type AnglePhoto } from "./_components/photo-reference";

const ANGLE_ORDER = ["front", "left", "right"];

// "2026-11-14" → "11/14"
const monthDay = (iso: string) => {
  const [, m, d] = iso.split("-");
  return `${Number(m)}/${Number(d)}`;
};

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
  const doctorUrl = buildRoomUrl({ sessionId, role: "doctor", name: c.doctors?.name ?? tc.doctorFallback, lang: "ko", returnUrl: platformUrl(href(lang, `/clinic/consult/${id}?ended=1`), origin) });

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

  const tb = t.brief;
  const concerns = intake?.concerns ?? [];
  const flagLabels = (intake?.flags ?? []).map((f) => label(L.flags, f));
  // 환자가 문진에서 실제로 본 일본어 라벨(H2 사전) — "원래 고민" 표시용
  const jpConcerns: Record<string, string> = (await getDict("jp")).h2.concerns;
  const age = c.patients?.birth_year ? fmt(t.queue.age, { n: new Date().getFullYear() - c.patients.birth_year }) : null;
  const visiting = intake?.trip_start ? fmt(tc.visiting, { range: `${monthDay(intake.trip_start)}–${intake.trip_end ? monthDay(intake.trip_end) : ""}` }) : null;
  const anglePhotos: AnglePhoto[] = ANGLE_ORDER.map((a) => {
    const i = photos.findIndex((p) => p.angle === a);
    return { angle: a, label: label(L.angles, a), url: i >= 0 ? (urls[i] ?? null) : null, qualityOk: i >= 0 ? photos[i].quality_ok : null };
  });

  // 금기 플래그 = 문진 "예" 응답 그대로(경고 톤, 빨강 금지). 위험도·가부는 매기지 않는다
  const flagCard =
    flagLabels.length > 0 ? (
      <div className="flex flex-col gap-2 rounded-lg border border-warning-border bg-warning-tint p-4" data-flag-card>
        <p className="flex items-center gap-2 text-[13px] font-semibold text-warning-foreground">
          <TriangleAlert className="size-4 shrink-0" aria-hidden />
          {fmt(tb.flagTitle, { flags: flagLabels.join(", ") })}
        </p>
        <p className="text-[13px] leading-relaxed text-warning">{tb.flagBody}</p>
      </div>
    ) : null;

  return (
    <div className="flex flex-col gap-7" data-consultation={c.id} data-status={c.status}>
      <Suspense>
        <EndOnReturn consultationId={c.id} t={t.call} />
      </Suspense>
      {c.status === "in_call" ? <AutoRefresh /> : null}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <Link href={href(lang, "/clinic")} className="text-sm text-muted-foreground hover:underline">
            {tc.back}
          </Link>
          <h1 className="text-[28px] leading-tight font-semibold">{tc.title}</h1>
          <p className="text-[13px] text-muted-foreground">{tc.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant={c.status === "requested" ? "default" : c.status === "in_call" ? "hold" : "outline"}>{label(L.status, c.status)}</Badge>
          <CallControls consultationId={c.id} status={c.status} doctorUrl={doctorUrl} t={t.call} />
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-6 border-b pb-6" data-patient-summary>
        <div className="flex flex-col gap-2.5">
          <p className="text-lg font-semibold">{[patientName(c.patients), age, c.patients?.country, visiting].filter(Boolean).join(" · ")}</p>
          {concerns.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {concerns.map((k) => (
                <Badge key={k} variant="role-doctor" className="rounded-sm" data-concern={k}>
                  {label(L.concerns, k)}
                </Badge>
              ))}
            </div>
          ) : null}
          {flagLabels.length > 0 ? (
            <p className="flex items-center gap-1.5 text-[13px] font-medium text-warning-foreground" data-flags>
              <TriangleAlert className="size-4 shrink-0 text-warning" aria-hidden />
              {tc.flags} · {flagLabels.join(", ")}
            </p>
          ) : null}
        </div>
        {/* 측정값이 아닌 예시 지표 — 데모 연출용임을 바로 아래에 밝힌다 */}
        <div className="flex flex-col gap-1 border-l pl-7">
          <p className="text-[28px] font-semibold text-primary tabular-nums">{tc.metric}</p>
          <p className="text-xs text-muted-foreground">{tc.metricNote}</p>
        </div>
      </div>

      <div className="grid gap-8 md:grid-cols-12">
        <div className="flex min-w-0 flex-col gap-6 md:col-span-7">
          <PhotoReference
            photos={anglePhotos}
            t={{
              title: tc.photoRef,
              angleCount: fmt(tc.angleCount, { n: ANGLE_ORDER.length }),
              sample: tc.sample,
              sampleImage: dict.common.sampleImage,
              qualityCheck: tc.qualityCheck,
              sampleNote: tc.sampleNote,
            }}
          />
          <section className="flex flex-col gap-3 border-t pt-4">
            <h2 className="text-[15px] font-semibold">{t.callPhotos.title}</h2>
            <CallPhotos batches={callBatches} t={t.callPhotos} labels={L.angles} dateLocale={t.dateLocale} />
          </section>
          <section className="flex flex-col gap-3 border-t pt-4" data-expectation>
            <h2 className="text-[15px] font-semibold">{tc.expectation}</h2>
            <div className="grid max-w-md grid-cols-2 gap-3">
              {[
                { key: "selfie", url: selfieUrl, caption: tc.selfie, ai: false },
                // 목표 이미지 = 환자가 원하는 모습(AI). 결과 예측이 아니라 가능 범위를 설명하는 근거 자료
                { key: "preview", url: previewUrl, caption: tc.preview, ai: true },
              ].map((x) => (
                <div key={x.key} className="flex flex-col gap-1" data-expectation-slot={x.key}>
                  {x.url ? (
                    // AI Label은 눈에 덜 띄게(design.md 5-3) — 사진 위 오버레이 대신 아래 보더 칩
                    <SampleImage src={x.url} alt={x.caption} label={x.ai ? undefined : dict.common.sampleImage} />
                  ) : (
                    <div className="flex aspect-[4/5] items-center justify-center rounded-xl border border-dashed text-xs text-muted-foreground">{tc.noImage}</div>
                  )}
                  <span className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                    {x.caption}
                    {x.ai ? <Badge variant="ai-label">{dict.common.aiLabel}</Badge> : null}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{tc.expectationNote}</p>
          </section>
          <section className="flex flex-col gap-2 border-y py-4" data-original-concerns>
            <span className="text-[11px] font-semibold text-muted-foreground">{tc.originalConcerns}</span>
            <p lang="ja" className="text-base leading-[1.75]">
              {concerns.map((k) => jpConcerns[k] ?? k).join("、") || "—"}
            </p>
            {concerns.length > 0 ? <p className="text-[13px] text-muted-foreground">“{concerns.map((k) => label(L.concerns, k)).join(", ")}”</p> : null}
            <div className="flex flex-col gap-3 rounded-lg border bg-surface p-4" data-contraindications>
              <span className="text-[11px] font-semibold text-muted-foreground">{tc.submittedIntake}</span>
              <div className="flex flex-col gap-1">
                <span className="text-[13px] font-semibold">{tc.concerns}</span>
                <span className="text-[15px]">{concerns.map((k) => label(L.concerns, k)).join(", ") || tc.none}</span>
              </div>
              <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                {CONTRAINDICATION_KEYS.map((k) => {
                  const v = answers[k];
                  return (
                    <div key={k} className="flex flex-col gap-1" data-answer={k}>
                      <span className="text-[13px] font-semibold">{label(L.flags, k)}</span>
                      <span className={v === true ? "text-[15px] font-semibold text-warning-foreground" : "text-[15px] text-muted-foreground"}>
                        {v === true ? tc.yes : v === false ? tc.no : tc.unanswered}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[13px] font-semibold">{tc.trip}</span>
                <span className="text-[15px]">{intake?.trip_start ? `${intake.trip_start} ~ ${intake.trip_end ?? ""} (${fmt(tc.days, { n: nDays })})` : "—"}</span>
              </div>
              <p className="text-xs text-muted-foreground">{tc.flagNote}</p>
            </div>
          </section>
        </div>

        <div className="flex min-w-0 flex-col gap-5 md:col-span-5">
          {locked ? (
            <>
              {flagCard}
              <Card>
                <CardHeader>
                  <CardTitle>{tc.quoteTitle}</CardTitle>
                </CardHeader>
                <CardContent>
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
                    <div className="flex items-center gap-2">
                      <Badge variant="doctor-confirmed" data-doctor-confirmed>{tc.doctorConfirmed}</Badge>
                      <span className="text-xs text-muted-foreground">{quote.status === "accepted" ? tc.accepted : tc.confirmedWaiting}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <BriefWorkspace
              consultationId={c.id}
              initialNotes={c.notes ?? ""}
              initialItems={items}
              initialValidUntil={quote?.valid_until ?? defaultValidUntil}
              tripDates={tripDates}
              flagCard={flagCard}
              liveFooter={
                c.status === "in_call" ? (
                  <>
                    <EndCallButton consultationId={c.id} t={t.call} />
                    <p className="text-xs leading-relaxed text-muted-foreground">{tb.liveNote}</p>
                  </>
                ) : undefined
              }
              t={{ brief: t.brief, quote: t.quote }}
            />
          )}
        </div>
      </div>

      <DisclaimerBar>{dict.common.disclaimer}</DisclaimerBar>
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
