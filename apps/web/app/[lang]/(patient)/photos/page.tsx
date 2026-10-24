import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { buttonVariants } from "@/components/ui/button";
import { getDict, href, isLang, type Lang } from "@/lib/i18n";
import { isConcernKey } from "@/lib/intake";
import { supabaseServer } from "@/lib/supabase/server";
import { requirePatient } from "../login/_lib/session";
import { SelfiePreview } from "./_components/selfie-preview";

async function PhotosBody({ lang, searchParams }: { lang: Lang; searchParams: Promise<{ intake?: string }> }) {
  const { intake: intakeId } = await searchParams;
  const [patient, dict] = await Promise.all([
    requirePatient(lang, intakeId ? `/photos?intake=${encodeURIComponent(intakeId)}` : "/intake"),
    getDict(lang),
  ]);
  const t = dict.h2;
  const { data: intake } = intakeId
    ? await supabaseServer()
        .from("intakes")
        .select("id, concerns")
        .eq("id", intakeId)
        .eq("patient_id", patient.id)
        .maybeSingle()
    : { data: null };

  if (!intake) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground">{t.photos.needIntake}</p>
        <Link href={href(lang, "/intake")} className={buttonVariants()}>
          {t.photos.toIntake}
        </Link>
      </div>
    );
  }
  return (
    <SelfiePreview
      lang={lang}
      consultPath={href(lang, "/consult")}
      intakeId={intake.id}
      concerns={intake.concerns.filter(isConcernKey)}
      t={t.photos}
      concernLabels={t.concerns}
      procedures={t.procedures}
    />
  );
}

export default async function PhotosPage({ params, searchParams }: PageProps<"/[lang]/photos">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const dict = await getDict(lang);
  return (
    <div className="flex flex-1 flex-col gap-4 py-4">
      <h1 className="text-xl font-bold">{dict.h2.photos.title}</h1>
      <Suspense fallback={<p className="text-sm text-muted-foreground">{dict.common.states.loading}</p>}>
        <PhotosBody lang={lang} searchParams={searchParams as Promise<{ intake?: string }>} />
      </Suspense>
    </div>
  );
}
