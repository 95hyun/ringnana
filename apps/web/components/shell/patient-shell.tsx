import Link from "next/link";
import { DEFAULT_LANG, getDict, href, type Lang } from "@/lib/i18n";

// 환자 앱 셸 — 모바일 폭 고정
export async function PatientShell({ lang = DEFAULT_LANG, children }: { lang?: Lang; children: React.ReactNode }) {
  const { common } = await getDict(lang);
  return (
    <div className="flex min-h-full flex-1 justify-center bg-muted/40">
      <div className="flex w-full max-w-md flex-1 flex-col bg-background shadow-sm">
        <header className="flex h-14 items-center border-b px-4">
          <Link href={href(lang, "/")} className="text-lg font-bold tracking-tight">
            {common.brand}
          </Link>
          <span className="ml-2 text-xs text-muted-foreground">{common.patientTagline}</span>
        </header>
        <main className="flex flex-1 flex-col p-4">{children}</main>
      </div>
    </div>
  );
}
