import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ShieldCheck, Sparkles, Video } from "lucide-react";
import { PatientWideLayout } from "@/components/shell/patient-wide";
import { buttonVariants } from "@/components/ui/button";
import { fill } from "@/lib/format";
import { getDict, href, isLang } from "@/lib/i18n";
import { getMarket } from "@/lib/market";
import { Partners } from "./_landing/partners";

export default async function Landing({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const dict = await getDict(lang);
  const t = dict.h2.landing;
  const country = dict.common.countries[getMarket().country];

  // 데스크톱 좌7(히어로·CTA·단계)/우5(제휴 의원), 390px은 1단 (docs/design.md §6, ux-review D2). Primary 버튼은 CTA 하나
  const left = (
    <div className="flex flex-col gap-6">
      {/* 히어로 — 색은 디자인 토큰 클래스만 쓴다 */}
      <section className="relative flex flex-col gap-3 overflow-hidden rounded-2xl bg-blush-tint p-5 md:p-8">
        <span aria-hidden className="absolute -top-10 -right-10 size-36 rounded-full bg-primary/10" />
        <p className="relative text-sm font-medium text-primary">{t.eyebrow}</p>
        <h1 className="relative text-2xl font-bold leading-snug md:text-3xl">
          {t.titleLine1}
          <br />
          {fill(t.titleLine2, { country })}
        </h1>
        <p className="relative text-sm text-muted-foreground md:text-base">{t.lead}</p>
        <div aria-hidden className="relative flex gap-2 pt-1 text-primary">
          {[Video, Sparkles, ShieldCheck].map((Icon, i) => (
            <span key={i} className="flex size-9 items-center justify-center rounded-full bg-background shadow-sm">
              <Icon className="size-4" />
            </span>
          ))}
        </div>
        <div className="relative flex flex-col gap-2 pt-2 md:max-w-sm">
          <Link href={href(lang, "/intake")} className={buttonVariants({ size: "lg" })}>
            {t.cta}
          </Link>
          <p className="text-xs text-muted-foreground">{t.footnote}</p>
        </div>
      </section>

      <ol className="flex flex-col gap-3">
        {t.steps.map((s, i) => (
          <li key={s.title} className="flex gap-3 rounded-xl border bg-card p-3">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {i + 1}
            </span>
            <div className="flex flex-col gap-0.5">
              <span className="font-medium">{s.title}</span>
              <span className="text-sm text-muted-foreground">{s.body}</span>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );

  const right = (
    <Suspense fallback={<div aria-hidden className="h-48 animate-pulse rounded-xl bg-muted" />}>
      <Partners lang={lang} t={t} />
    </Suspense>
  );

  return (
    <div className="py-6">
      <PatientWideLayout left={left} right={right} />
    </div>
  );
}
