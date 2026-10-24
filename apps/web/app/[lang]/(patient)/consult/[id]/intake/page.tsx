import { notFound, redirect } from "next/navigation";
import { lang as rootLang } from "next/root-params";
import { Suspense } from "react";
import { getDict, href, isLang, type Lang } from "@/lib/i18n";
import { supabaseServer } from "@/lib/supabase/server";
import { signedPhotoUrls } from "@/lib/supabase/storage";
import { requirePatient } from "../../../login/_lib/session";
import { BookingSummary } from "../../../reservations/_components/booking-summary";
import { loadBooking } from "../../../reservations/_lib/booking";
import { IntakeForm } from "./_components/intake-form";

async function IntakeBody({ lang, params }: { lang: Lang; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [patient, dict] = await Promise.all([requirePatient(lang, `/consult/${id}/intake`), getDict(lang)]);
  const booking = await loadBooking(id, patient.id);
  // 본인 draft 진료만 작성 가능 — 이미 신청했거나 남의 진료면 예약 목록으로
  if (!booking || booking.status !== "draft") redirect(href(lang, "/reservations"));
  const t = dict.h2;
  return (
    <IntakeForm
      lang={lang}
      consultationId={booking.id}
      greeting={t.intake.greeting.replace("{name}", patient.name)}
      policyPath={href(lang, "/legal/privacy")}
      disclaimer={dict.common.disclaimer}
      summary={<BookingSummary booking={booking} lang={lang} dict={dict} compact />}
      t={t.intake}
      tb={dict.booking.intake}
      concerns={t.concerns}
      contraindications={t.contraindications}
      goal={{
        t: t.photos,
        common: { sampleImage: dict.common.sampleImage, aiLabel: dict.common.aiLabel, loadingCaption: dict.common.loadingCaption },
        initial: await uploadedSelfie(booking.id),
      }}
    />
  );
}

// 이 draft에 이미 올린 셀카·저장된 목표 이미지 — 새로고침해도 카드 상태를 복원한다
async function uploadedSelfie(consultationId: string) {
  const { data: photos } = await supabaseServer()
    .from("photos")
    .select("angle, storage_path")
    .eq("consultation_id", consultationId)
    .eq("source", "intake")
    .in("angle", ["front", "preview"])
    .order("created_at", { ascending: false });
  const front = photos?.find((p) => p.angle === "front");
  if (!front) return undefined;
  const preview = photos?.find((p) => p.angle === "preview");
  const paths = preview ? [front.storage_path, preview.storage_path] : [front.storage_path];
  const [selfieUrl, previewUrl] = await signedPhotoUrls(paths).catch(() => [null, null]);
  // 셀카를 못 보여주면 복원하지 않는다 — 업로드부터 다시
  return selfieUrl ? { selfieUrl, previewUrl: previewUrl ?? null } : undefined;
}

export default async function ConsultIntakePage({ params }: PageProps<"/[lang]/consult/[id]/intake">) {
  // params는 Suspense 밖에서 읽으면 Cache Components 프리렌더 오류 — 언어는 root param으로
  const lang = await rootLang();
  if (!isLang(lang)) notFound();
  const dict = await getDict(lang);
  return (
    // data-layout="wide" — PatientShell이 데스크톱에서 1200px 폭으로 넓어진다 (Figma S1 데스크톱 2단)
    <div data-layout="wide" className="flex flex-1 flex-col gap-4 py-4">
      <Suspense fallback={<p className="text-sm text-muted-foreground">{dict.common.states.loading}</p>}>
        <IntakeBody lang={lang} params={params} />
      </Suspense>
    </div>
  );
}
