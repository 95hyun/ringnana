import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DEMO_CLINIC_ID } from "@/lib/demo";
import { href } from "@/lib/i18n";
import { patientName, treatmentName } from "@/lib/localize";
import { supabaseServer } from "@/lib/supabase/server";
import { signedPhotoUrls } from "@/lib/supabase/storage";
import { dueDate, parseSymptoms } from "@/app/[lang]/(patient)/aftercare/_components/checkin";
import { fill, formatDateShort } from "@/lib/format";
import { parseItems } from "@/app/[lang]/(patient)/quote/_components/format";
import { h4Context } from "@/app/[lang]/(patient)/quote/_components/i18n";
import { ReviewForm } from "../_components/review-form";

export default async function ClinicCheckinPage({ params }: PageProps<"/[lang]/clinic/aftercare/[followupId]">) {
  const { lang, t } = await h4Context();
  return (
    <div className="flex flex-col gap-4">
      <Link href={href(lang, "/clinic/aftercare")} className="text-sm text-muted-foreground hover:underline">
        {t.clinic.back}
      </Link>
      <Suspense fallback={<p className="text-sm text-muted-foreground">{t.clinic.loading}</p>}>
        <CheckinDetail params={params} />
      </Suspense>
    </div>
  );
}

async function CheckinDetail({ params }: { params: Promise<{ followupId: string }> }) {
  await connection();
  const { followupId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(followupId)) notFound();
  const { lang, t, common } = await h4Context();
  const c = t.clinic;

  const db = supabaseServer();
  const { data: f } = await db
    .from("followups")
    .select(
      "id, due_day, status, alert, patient_note, symptoms, doctor_note, photos(storage_path), bookings!inner(clinic_id, visit_dates, quotes!inner(items, consultations!inner(patient_id, intake_id, notes, patients!inner(name, name_latin, birth_year))))",
    )
    .eq("id", followupId)
    .maybeSingle();
  if (!f || f.bookings.clinic_id !== DEMO_CLINIC_ID || f.status === "pending") notFound();

  const consult = f.bookings.quotes.consultations;
  // 비교 기준 = 그 진료 문진 때 찍은 정면 사진 (없으면 환자의 가장 최근 정면 사진)
  const frontPhoto = (intakeId?: string) => {
    const q = db
      .from("photos")
      .select("storage_path")
      .eq("patient_id", consult.patient_id)
      .eq("angle", "front")
      .order("created_at", { ascending: false })
      .limit(1);
    return (intakeId ? q.eq("intake_id", intakeId) : q).maybeSingle();
  };
  const baseline =
    (consult.intake_id ? (await frontPhoto(consult.intake_id)).data : null) ?? (await frontPhoto()).data;

  const paths = [baseline?.storage_path, f.photos?.storage_path];
  const urls = await signedPhotoUrls(paths.filter((p): p is string => !!p)).catch(() => []);
  let next = 0;
  const [baselineUrl, checkinUrl] = paths.map((p) => (p ? (urls[next++] ?? null) : null));

  const visits = [...f.bookings.visit_dates].sort();
  const due = dueDate(visits, f.due_day);
  const symptoms = parseSymptoms(f.symptoms);
  const memo = f.patient_note ?? "";
  const items = parseItems(f.bookings.quotes.items);
  const summary = [
    items
      .map((i) => `${treatmentName(i, lang, { common }) ?? c.treatmentFallback}${i.sessions ? fill(c.sessions, { n: i.sessions }) : ""}`)
      .join(", "),
    fill(c.visitDates, { dates: visits.map((d) => formatDateShort(d, lang)).join(", ") }),
    due && fill(c.dueOn, { date: formatDateShort(due, lang) }),
    consult.patients.birth_year && fill(c.born, { year: consult.patients.birth_year }),
  ].filter(Boolean);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="text-xl font-bold">{fill(c.detailTitle, { name: patientName(consult.patients), n: f.due_day })}</h1>
        {f.alert && <Badge variant="destructive">{c.alertSelf}</Badge>}
        <Badge variant={f.status === "reviewed" ? "outline" : "secondary"}>
          {f.status === "reviewed" ? c.status.reviewed : c.status.submitted}
        </Badge>
      </div>
      <p className="text-sm text-muted-foreground">{summary.join(" · ")}</p>

      <div className="grid gap-4 md:grid-cols-2">
        <PhotoCard title={c.baseline} url={baselineUrl} empty={c.noPhoto} />
        <PhotoCard title={fill(c.checkinPhoto, { n: f.due_day })} url={checkinUrl} empty={c.noPhoto} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{c.selfReport}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 text-sm">
            <div>
              <p className="font-medium">{c.symptomCheck}</p>
              {symptoms.length ? (
                <ul className="list-inside list-disc text-destructive">
                  {symptoms.map((s) => (
                    <li key={s}>{c.symptoms[s]}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground">{c.notApplicable}</p>
              )}
            </div>
            <div>
              <p className="font-medium">{c.patientMemo}</p>
              <p className="whitespace-pre-wrap text-muted-foreground">{memo || "—"}</p>
            </div>
            {consult.notes && (
              <div>
                <p className="font-medium">{c.firstNotes}</p>
                <p className="whitespace-pre-wrap text-muted-foreground">{consult.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>
        <ReviewForm
          followupId={f.id}
          initialNote={f.doctor_note ?? ""}
          reviewed={f.status === "reviewed"}
          t={c.review}
          errors={c.errors}
        />
      </div>
    </div>
  );
}

function PhotoCard({ title, url, empty }: { title: string; url: string | null; empty: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {url ? (
          // signed URL은 매번 바뀌어 next/image 최적화 대상이 아니다
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={title} className="aspect-square w-full rounded-lg border object-cover" />
        ) : (
          <div className="flex aspect-square items-center justify-center rounded-lg border text-sm text-muted-foreground">
            {empty}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
