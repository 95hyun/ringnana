import Link from "next/link";
import { DEFAULT_LANG, getDict, href, type Lang } from "@/lib/i18n";

// 의원 콘솔 셸 — 데스크톱. 콘솔 문구는 jp 경로에서도 한국어일 수 있어 한글 폰트를 고정한다
export async function ClinicShell({ lang = DEFAULT_LANG, children }: { lang?: Lang; children: React.ReactNode }) {
  const { common } = await getDict(lang);
  return (
    <div className="flex min-h-full flex-1 flex-col font-[family-name:var(--font-kr)]">
      <header className="flex h-14 items-center gap-6 border-b px-6">
        <Link href={href(lang, "/clinic")} className="text-lg font-bold tracking-tight">
          {common.brand} <span className="text-sm font-normal text-muted-foreground">{common.clinicConsole}</span>
        </Link>
        <nav className="flex gap-4 text-sm">
          <Link href={href(lang, "/clinic")} className="hover:underline">
            {common.nav.queue}
          </Link>
          <Link href={href(lang, "/clinic/aftercare")} className="hover:underline">
            {common.nav.aftercare}
          </Link>
        </nav>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col p-6">{children}</main>
    </div>
  );
}
