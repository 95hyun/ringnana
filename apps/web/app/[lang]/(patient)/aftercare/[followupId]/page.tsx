import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { href } from "@/lib/i18n";
import { supabaseServer } from "@/lib/supabase/server";
import { signedPhotoUrl } from "@/lib/supabase/storage";
import { viewerPatientId } from "../../quote/_components/viewer";
import { fill, formatDate } from "@/lib/format";
import { h4Context } from "../../quote/_components/i18n";
import { dueDate, parseSymptoms } from "../_components/checkin";
import { CheckinForm } from "../_components/checkin-form";

export default async function CheckinPage({ params }: PageProps<"/[lang]/aftercare/[followupId]">) {
  const { lang, t, common } = await h4Context();
  return (
    <div className="flex flex-col gap-4">
      <Link href={href(lang, "/aftercare")} className="text-sm text-muted-foreground hover:underline">
        {t.checkin.back}
      </Link>
      <Suspense fallback={<p className="text-sm text-muted-foreground">{common.states.loading}</p>}>
        <CheckinContent params={params} />
      </Suspense>
    </div>
  );
}

async function CheckinContent({ params }: { params: Promise<{ followupId: string }> }) {
  await connection();
  const { followupId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(followupId)) notFound();
  const { lang, t } = await h4Context();

  const db = supabaseServer();
  const { data: f } = await db
    .from("followups")
    .select(
      "id, due_day, status, patient_note, symptoms, doctor_note, alert, photos(storage_path), bookings!inner(visit_dates, quotes!inner(consultations!inner(patient_id)))",
    )
    .eq("id", followupId)
    .maybeSingle();
  if (!f || f.bookings.quotes.consultations.patient_id !== (await viewerPatientId())) notFound();

  const due = dueDate(f.bookings.visit_dates, f.due_day);
  const heading = (
    <div>
      <h1 className="text-xl font-bold">{fill(t.checkin.title, { n: f.due_day })}</h1>
      {due && <p className="text-sm text-muted-foreground">{fill(t.checkin.due, { date: formatDate(due, lang) })}</p>}
    </div>
  );

  if (f.status === "pending") {
    return (
      <>
        {heading}
        <CheckinForm followupId={f.id} t={t.checkin} symptoms={t.symptoms} errors={t.errors} />
      </>
    );
  }

  const symptoms = parseSymptoms(f.symptoms);
  const memo = f.patient_note ?? "";
  const photoUrl = f.photos?.storage_path ? await signedPhotoUrl(f.photos.storage_path).catch(() => null) : null;

  return (
    <>
      {heading}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {t.checkin.sent}
            <Badge variant={f.status === "reviewed" ? "default" : "secondary"}>
              {f.status === "reviewed" ? t.aftercare.status.reviewed : t.aftercare.status.submitted}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          {photoUrl && (
            // signed URL은 매번 바뀌어 next/image 최적화 대상이 아니다
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt={t.checkin.photoAlt} className="w-full rounded-lg border object-cover" />
          )}
          <div>
            <p className="font-medium">{t.checkin.symptomsLabel}</p>
            <p className="text-muted-foreground">
              {symptoms.length ? symptoms.map((s) => t.symptoms[s]).join(" / ") : t.checkin.none}
            </p>
          </div>
          {memo && (
            <div>
              <p className="font-medium">{t.checkin.memo}</p>
              <p className="whitespace-pre-wrap text-muted-foreground">{memo}</p>
            </div>
          )}
          {f.alert && f.status === "submitted" && (
            <p className="rounded-lg bg-destructive/10 p-3 text-destructive">{t.checkin.alertNotice}</p>
          )}
        </CardContent>
      </Card>
      {f.status === "reviewed" && f.doctor_note && (
        <Card>
          <CardHeader>
            <CardTitle>{t.checkin.doctorComment}</CardTitle>
          </CardHeader>
          <CardContent className="whitespace-pre-wrap text-sm">{f.doctor_note}</CardContent>
        </Card>
      )}
    </>
  );
}
