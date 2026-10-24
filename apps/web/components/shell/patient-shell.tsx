import Link from "next/link";
import { LangSwitcher } from "@/components/shell/lang-switcher";
import { SiteFooter } from "@/components/shell/site-footer";
import { DEFAULT_LANG, getDict, href, type Lang } from "@/lib/i18n";

// 환자 앱 셸 — 모바일 폭 고정
export async function PatientShell({ lang = DEFAULT_LANG, children }: { lang?: Lang; children: React.ReactNode }) {
  const { common } = await getDict(lang);
  return (
    <div className="flex min-h-full flex-1 justify-center bg-muted">
      <div className="flex w-full max-w-md flex-1 flex-col bg-background shadow-sm">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-2 border-b bg-background/90 px-4 backdrop-blur">
          <Link href={href(lang, "/")} className="flex items-center gap-2">
            <span aria-hidden className="flex size-7 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
              R
            </span>
            <span className="whitespace-nowrap text-base font-bold tracking-tight">{common.brand}</span>
          </Link>
          <span className="hidden truncate text-[11px] text-muted-foreground sm:inline">{common.patientTagline}</span>
          <div className="ml-auto">
            <LangSwitcher lang={lang} label={common.langSwitcher} />
          </div>
        </header>
        <main className="flex flex-1 flex-col p-4">{children}</main>
        <SiteFooter lang={lang} />
      </div>
    </div>
  );
}
