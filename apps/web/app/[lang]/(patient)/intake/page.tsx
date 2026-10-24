import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getDict, href, isLang, type Lang } from "@/lib/i18n";
import { requirePatient } from "../login/_lib/session";
import { IntakeForm } from "./_components/intake-form";

async function IntakeBody({ lang }: { lang: Lang }) {
  const [patient, dict] = await Promise.all([requirePatient(lang, "/intake"), getDict(lang)]);
  const t = dict.h2;
  return (
    <IntakeForm
      lang={lang}
      greeting={t.intake.greeting.replace("{name}", patient.name)}
      photosPath={href(lang, "/photos")}
      policyPath={href(lang, "/legal/privacy")}
      disclaimer={dict.common.disclaimer}
      t={t.intake}
      concerns={t.concerns}
      contraindications={t.contraindications}
    />
  );
}

export default async function IntakePage({ params }: PageProps<"/[lang]/intake">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const dict = await getDict(lang);
  return (
    // data-layout="wide" — PatientShell이 데스크톱에서 1200px 폭으로 넓어진다 (Figma S1 데스크톱 2단)
    <div data-layout="wide" className="flex flex-1 flex-col gap-4 py-4">
      <Suspense fallback={<p className="text-sm text-muted-foreground">{dict.common.states.loading}</p>}>
        <IntakeBody lang={lang} />
      </Suspense>
    </div>
  );
}
