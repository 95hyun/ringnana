import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Card, CardContent } from "@/components/ui/card";
import { DisclaimerBar } from "@/components/ui/disclaimer-bar";
import { fill } from "@/lib/format";
import { getDict, isLang, type Lang } from "@/lib/i18n";
import { localized } from "@/lib/localize";
import { isConcernKey } from "@/lib/intake";
import { DoctorCard } from "./_components/doctor-card";
import {
  AREAS,
  DOC_LANGS,
  FilterForm,
  type Filters,
} from "./_components/filters";
import { loadDoctors, seoulYmd } from "./_components/data";

type SP = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined) =>
  (Array.isArray(v) ? v[0] : v) ?? "";
const ymd = (v: string) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? v : "");

function parse(sp: SP): Filters {
  const c = sp.concern;
  const concern = (Array.isArray(c) ? c : c ? [c] : []).filter(isConcernKey);
  const lang = one(sp.lang);
  const area = one(sp.area);
  return {
    concern,
    from: ymd(one(sp.from)),
    to: ymd(one(sp.to)),
    lang: (DOC_LANGS as readonly string[]).includes(lang) ? lang : "",
    area: (AREAS as readonly string[]).includes(area) ? area : "",
  };
}

export default async function DoctorsPage({
  params,
  searchParams,
}: PageProps<"/[lang]/doctors">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const dict = await getDict(lang);
  return (
    <div data-layout="wide" className="flex flex-col gap-6">
      <section className="flex flex-col gap-3 rounded-xl border border-blush/15 bg-blush-tint p-5 md:p-6">
        <p className="text-[11px] font-semibold tracking-wide text-blush uppercase">
          {dict.doctors.list.eyebrow}
        </p>
        <h1 className="text-[22px] font-bold leading-tight md:text-[26px]">
          {dict.doctors.list.title}
        </h1>
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          {dict.doctors.list.lead}
        </p>
      </section>
      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground">
            {dict.doctors.list.loading}
          </p>
        }
      >
        <Results lang={lang} searchParams={searchParams as Promise<SP>} />
      </Suspense>
      <DisclaimerBar>{dict.common.disclaimer}</DisclaimerBar>
    </div>
  );
}

async function Results({
  lang,
  searchParams,
}: {
  lang: Lang;
  searchParams: Promise<SP>;
}) {
  await connection();
  const f = parse(await searchParams);
  const dict = await getDict(lang);
  const t = dict.doctors;
  const all = await loadDoctors();

  const rows = all
    .filter(
      (d) =>
        f.concern.length === 0 ||
        f.concern.some((c) => d.specialties.includes(c)),
    )
    .filter((d) => !f.lang || d.languages.includes(f.lang))
    .filter((d) => !f.area || d.clinic?.area === f.area)
    .filter((d) =>
      !f.from && !f.to
        ? true
        : d.slots.some((s) => {
            const day = seoulYmd(s.starts_at);
            return (!f.from || day >= f.from) && (!f.to || day <= f.to);
          }),
    )
    // 가장 빠른 open 슬롯 오름차순, 슬롯 없는 의사는 뒤
    .sort(
      (a, b) =>
        (a.slots[0]?.starts_at ?? "9").localeCompare(
          b.slots[0]?.starts_at ?? "9",
        ) || (localized(a, lang) ?? "").localeCompare(localized(b, lang) ?? ""),
    );

  return (
    <>
      <FilterForm lang={lang} dict={dict} f={f} />
      <p
        className="text-[13px] text-muted-foreground"
        data-testid="doctor-count"
      >
        {fill(t.list.count, { n: rows.length })}
      </p>
      {rows.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col gap-1 py-6 text-center">
            <p className="font-medium">{t.list.empty}</p>
            <p className="text-sm text-muted-foreground">{t.list.emptyHint}</p>
          </CardContent>
        </Card>
      ) : (
        <ul className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {rows.map((d) => (
            <DoctorCard key={d.id} d={d} lang={lang} dict={dict} />
          ))}
        </ul>
      )}
    </>
  );
}
