import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getDict, href, isLang, type Lang } from "@/lib/i18n";
import { requirePatient } from "../login/_lib/session";
import { IntakeForm } from "./_components/intake-form";

async function IntakeBody({ lang }: { lang: Lang }) {
  const [patient, dict] = await Promise.all([requirePatient(lang, "/intake"), getDict(lang)]);
  const t = dict.h2;
  return (
    <>
      <p className="text-sm text-muted-foreground">{t.intake.greeting.replace("{name}", patient.name)}</p>
      <IntakeForm lang={lang} photosPath={href(lang, "/photos")} t={t.intake} concerns={t.concerns} contraindications={t.contraindications} />
    </>
  );
}

export default async function IntakePage({ params }: PageProps<"/[lang]/intake">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const dict = await getDict(lang);
  return (
    <div className="flex flex-1 flex-col gap-4 py-4">
      <h1 className="text-xl font-bold">{dict.h2.intake.title}</h1>
      <Suspense fallback={<p className="text-sm text-muted-foreground">{dict.common.states.loading}</p>}>
        <IntakeBody lang={lang} />
      </Suspense>
    </div>
  );
}
