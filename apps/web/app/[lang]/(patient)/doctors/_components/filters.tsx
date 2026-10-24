import Link from "next/link";
import { buttonVariants, Button } from "@/components/ui/button";
import type { Dict } from "@/dictionaries/jp";
import { CONCERN_KEYS } from "@/lib/intake";
import { href, type Lang } from "@/lib/i18n";

export const AREAS = ["gangnam", "myeongdong", "apgujeong"] as const;
export const DOC_LANGS = ["ja", "ko", "en"] as const;

export type Filters = {
  concern: string[];
  from: string;
  to: string;
  lang: string;
  area: string;
};

const field =
  "h-11 w-full rounded-lg border border-border-strong bg-surface px-3 text-[15px]";

// GET 폼 — URL searchParams가 상태라 공유·뒤로가기가 된다 (JS 불필요)
export function FilterForm({
  lang,
  dict,
  f,
}: {
  lang: Lang;
  dict: Dict;
  f: Filters;
}) {
  const t = dict.doctors;
  return (
    <form
      method="get"
      action={href(lang, "/doctors")}
      className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 text-[15px] shadow-sm md:p-6"
      data-testid="doctor-filters"
    >
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">
          {t.list.filterConcern}
        </legend>
        <div className="flex flex-wrap gap-2">
          {CONCERN_KEYS.map((c) => (
            <label key={c} className="cursor-pointer">
              <input
                type="checkbox"
                name="concern"
                value={c}
                defaultChecked={f.concern.includes(c)}
                className="peer sr-only"
              />
              <span className="flex min-h-9 items-center rounded-full border border-border-strong bg-surface px-3 text-sm peer-checked:border-primary peer-checked:bg-primary-tint peer-checked:text-primary-hover peer-focus-visible:ring-2 peer-focus-visible:ring-ring">
                {dict.h2.concerns[c]}
              </span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="grid gap-4 md:grid-cols-4">
        <fieldset className="flex flex-col gap-1 md:col-span-2">
          <legend className="mb-1 text-sm font-medium">
            {t.list.filterDate}
          </legend>
          <div className="flex items-center gap-2">
            <input
              type="date"
              name="from"
              defaultValue={f.from}
              aria-label={t.list.dateFrom}
              className={field}
            />
            <span aria-hidden>〜</span>
            <input
              type="date"
              name="to"
              defaultValue={f.to}
              aria-label={t.list.dateTo}
              className={field}
            />
          </div>
        </fieldset>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">{t.list.filterLang}</span>
          <select name="lang" defaultValue={f.lang} className={field}>
            <option value="">{t.list.any}</option>
            {DOC_LANGS.map((l) => (
              <option key={l} value={l}>
                {t.languages[l]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">{t.list.filterArea}</span>
          <select name="area" defaultValue={f.area} className={field}>
            <option value="">{t.list.any}</option>
            {AREAS.map((a) => (
              <option key={a} value={a}>
                {t.areas[a]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex flex-col gap-2 md:flex-row">
        <Button type="submit" className="md:w-56">
          {t.list.apply}
        </Button>
        <Link
          href={href(lang, "/doctors")}
          className={buttonVariants({ variant: "ghost" })}
        >
          {t.list.reset}
        </Link>
      </div>
    </form>
  );
}
