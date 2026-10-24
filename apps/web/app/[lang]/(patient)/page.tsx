import Link from "next/link";
import { notFound } from "next/navigation";
import { buttonVariants } from "@/components/ui/button";
import { getDict, href, isLang } from "@/lib/i18n";

export default async function Landing({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const t = (await getDict(lang)).h2.landing;

  return (
    <div className="flex flex-1 flex-col gap-8 py-6">
      <section className="flex flex-col gap-3">
        <p className="text-sm font-medium text-primary">{t.eyebrow}</p>
        <h1 className="text-2xl font-bold leading-snug">
          {t.titleLine1}
          <br />
          {t.titleLine2}
        </h1>
        <p className="text-sm text-muted-foreground">{t.lead}</p>
      </section>

      <ol className="flex flex-col gap-3">
        {t.steps.map((s, i) => (
          <li key={s.title} className="flex gap-3 rounded-lg border p-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              {i + 1}
            </span>
            <div className="flex flex-col gap-0.5">
              <span className="font-medium">{s.title}</span>
              <span className="text-sm text-muted-foreground">{s.body}</span>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-auto flex flex-col gap-2">
        <Link href={href(lang, "/intake")} className={buttonVariants({ size: "lg" })}>
          {t.cta}
        </Link>
        <p className="text-center text-xs text-muted-foreground">{t.footnote}</p>
      </div>
    </div>
  );
}
