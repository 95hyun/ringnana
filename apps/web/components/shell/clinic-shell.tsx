import Link from "next/link";
import { LangSwitcher } from "@/components/shell/lang-switcher";
import { DEFAULT_LANG, getDict, href, type Lang } from "@/lib/i18n";

// 의원 콘솔 셸 — 데스크톱. 콘솔 문구는 jp 경로에서도 한국어일 수 있어 한글 폰트를 고정한다
export async function ClinicShell({ lang = DEFAULT_LANG, children }: { lang?: Lang; children: React.ReactNode }) {
  const { common } = await getDict(lang);
  return (
    <div className="flex min-h-full flex-1 flex-col bg-muted font-[family-name:var(--font-kr)]">
      <header className="flex h-14 items-center gap-6 border-b bg-background px-6">
        <Link href={href(lang, "/clinic")} className="flex items-center gap-2">
          <span aria-hidden className="flex size-7 items-center justify-center rounded-lg bg-primary text-sm font-bold text-primary-foreground">
            R
          </span>
          <span className="text-base font-bold tracking-tight">{common.brand}</span>
          <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">{common.clinicConsole}</span>
        </Link>
        <nav className="flex gap-4 text-sm">
          <Link href={href(lang, "/clinic")} className="text-muted-foreground hover:text-foreground">
            {common.nav.queue}
          </Link>
          <Link href={href(lang, "/clinic/aftercare")} className="text-muted-foreground hover:text-foreground">
            {common.nav.aftercare}
          </Link>
        </nav>
        <div className="ml-auto">
          <LangSwitcher lang={lang} label={common.langSwitcher} />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col p-6">{children}</main>
    </div>
  );
}
