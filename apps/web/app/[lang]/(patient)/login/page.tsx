import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getDict, isLang, type Lang } from "@/lib/i18n";
import { AuthForms } from "./_components/auth-forms";
import { safeNext } from "./_lib/session";

async function LoginBody({ lang, searchParams }: { lang: Lang; searchParams: Promise<{ next?: string }> }) {
  const [{ next }, dict] = await Promise.all([searchParams, getDict(lang)]);
  return <AuthForms lang={lang} next={safeNext(next, lang)} t={dict.h2.login} />;
}

export default async function LoginPage({ params, searchParams }: PageProps<"/[lang]/login">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const t = (await getDict(lang)).h2.login;
  return (
    <div className="flex flex-1 flex-col gap-6 py-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold">{t.title}</h1>
        <p className="text-sm text-muted-foreground">{t.lead}</p>
      </div>
      <Suspense>
        <LoginBody lang={lang} searchParams={searchParams as Promise<{ next?: string }>} />
      </Suspense>
    </div>
  );
}
