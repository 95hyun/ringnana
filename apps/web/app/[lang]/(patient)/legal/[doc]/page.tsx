import { notFound } from "next/navigation";
import { getDict, isLang } from "@/lib/i18n";

// 약관·개인정보·特商法 페이지 틀 (H1, docs/ux-review.md B1·B2). 문구는 dictionaries/*/legal.ts
const DOCS = ["terms", "privacy", "tokushoho"] as const;
type Doc = (typeof DOCS)[number];

export function generateStaticParams() {
  return DOCS.map((doc) => ({ doc }));
}

export default async function LegalPage({ params }: PageProps<"/[lang]/legal/[doc]">) {
  const { lang, doc } = await params;
  if (!isLang(lang) || !(DOCS as readonly string[]).includes(doc)) notFound();
  const { legal } = await getDict(lang);
  const d = doc as Doc;
  return (
    <article className="flex flex-col gap-4" data-legal={d}>
      <h1 className="text-xl font-bold">{legal[d].title}</h1>
      <p className="rounded-lg bg-accent px-3 py-2 text-xs text-accent-foreground">{legal.draftNotice}</p>
      {d === "tokushoho" ? (
        <dl className="divide-y rounded-lg border text-sm">
          {legal.tokushoho.rows.map((r) => (
            <div key={r.label} className="grid grid-cols-[7rem_1fr] gap-2 px-3 py-2">
              <dt className="text-muted-foreground">{r.label}</dt>
              <dd>{r.value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        legal[d].sections.map((s) => (
          <section key={s.heading} className="flex flex-col gap-1">
            <h2 className="text-sm font-semibold">{s.heading}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{s.body}</p>
          </section>
        ))
      )}
    </article>
  );
}
