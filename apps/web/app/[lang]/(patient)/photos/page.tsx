import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PatientStepper } from "@/components/shell/patient-stepper";
import { buttonVariants } from "@/components/ui/button";
import { getDict, href, isLang, type Lang } from "@/lib/i18n";
import { isConcernKey } from "@/lib/intake";
import { supabaseServer } from "@/lib/supabase/server";
import { signedPhotoUrls } from "@/lib/supabase/storage";
import { requirePatient } from "../login/_lib/session";
import { SelfiePreview } from "./_components/selfie-preview";

async function PhotosBody({ lang, searchParams }: { lang: Lang; searchParams: Promise<{ intake?: string }> }) {
  const { intake: intakeId } = await searchParams;
  const [patient, dict] = await Promise.all([
    requirePatient(lang, intakeId ? `/photos?intake=${encodeURIComponent(intakeId)}` : "/photos"),
    getDict(lang),
  ]);
  const t = dict.h2;
  const db = supabaseServer();
  // ?intake= 가 없으면(새로고침·뒤로 가기·직접 진입) 로그인 환자의 최신 문진으로 판단한다 (ux-review E1)
  const base = db.from("intakes").select("id, concerns").eq("patient_id", patient.id);
  const { data: intake } = await (intakeId ? base.eq("id", intakeId) : base.order("created_at", { ascending: false }).limit(1)).maybeSingle();

  if (!intake) {
    return (
      <div className="flex flex-col gap-3">
        <p className="font-medium">{t.photos.needIntake}</p>
        <p className="text-sm text-muted-foreground">{t.photos.needIntakeWhy}</p>
        <Link href={href(lang, "/intake")} className={buttonVariants()}>
          {t.photos.toIntake}
        </Link>
      </div>
    );
  }
  const submitted = await submittedState(intake.id);
  return (
    <SelfiePreview
      submitted={submitted}
      lang={lang}
      consultPath={href(lang, "/consult")}
      intakeId={intake.id}
      concerns={intake.concerns.filter(isConcernKey)}
      t={t.photos}
      concernLabels={t.concerns}
      common={{ sampleImage: dict.common.sampleImage, aiLabel: dict.common.aiLabel, loadingCaption: dict.common.loadingCaption }}
    />
  );
}

export default async function PhotosPage({ params, searchParams }: PageProps<"/[lang]/photos">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const dict = await getDict(lang);
  return (
    <div className="flex flex-1 flex-col gap-4 py-4">
      <PatientStepper lang={lang} current="photos" />
      <h1 className="text-xl font-bold">{dict.h2.photos.title}</h1>
      <Suspense fallback={<p className="text-sm text-muted-foreground">{dict.common.states.loading}</p>}>
        <PhotosBody lang={lang} searchParams={searchParams as Promise<{ intake?: string }>} />
      </Suspense>
    </div>
  );
}

// 이 문진으로 이미 진료 요청(셀카 업로드)이 됐으면 셀카·저장된 기대 이미지를 복원값으로 돌려준다
async function submittedState(intakeId: string) {
  const db = supabaseServer();
  const [{ data: consult }, { data: photos }] = await Promise.all([
    db.from("consultations").select("id").eq("intake_id", intakeId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    db.from("photos").select("angle, storage_path").eq("intake_id", intakeId).in("angle", ["front", "preview"]).order("created_at", { ascending: false }),
  ]);
  if (!consult) return undefined;
  const front = photos?.find((p) => p.angle === "front");
  const preview = photos?.find((p) => p.angle === "preview");
  const sign = async (path?: string) => (path ? ((await signedPhotoUrls([path]).catch(() => [null]))[0] ?? null) : null);
  const [selfieUrl, previewUrl] = await Promise.all([sign(front?.storage_path), sign(preview?.storage_path)]);
  // 셀카를 못 보여주면 복원하지 않는다 — 업로드 단계부터 다시(uploadSelfie가 기존 진료 요청을 재사용)
  if (!selfieUrl) return undefined;
  return { consultationId: consult.id, selfieUrl, previewUrl };
}
