import { ArrowLeftRight } from "lucide-react";
import Link from "next/link";
import { LangSwitcher } from "@/components/shell/lang-switcher";
import { SiteFooter } from "@/components/shell/site-footer";
import { Badge } from "@/components/ui/badge";
import { DEFAULT_LANG, getDict, href, type Lang } from "@/lib/i18n";

// 환자 앱 셸 — 기본은 모바일 폭 칼럼. 페이지에 PatientWideLayout(data-layout="wide")이 있으면 최대 1200px로 넓어진다
export async function PatientShell({ lang = DEFAULT_LANG, children }: { lang?: Lang; children: React.ReactNode }) {
  const { common } = await getDict(lang);
  return (
    <div className="flex min-h-full flex-1 justify-center bg-muted">
      <div className="flex w-full max-w-md flex-1 flex-col bg-background shadow-sm has-[[data-layout=wide]]:max-w-[1200px]">
        <header className="sticky top-0 z-10 flex h-16 items-center gap-2 border-b bg-surface px-4">
          <Link href={href(lang, "/")} className="font-[family-name:var(--font-inter)] text-[18px] font-semibold tracking-tight">
            {common.brand}
          </Link>
          <div className="ml-auto flex items-center gap-2">
            <LangSwitcher lang={lang} label={common.langSwitcher} />
            <Badge variant="role-patient" className="hidden min-[400px]:inline-flex">
              {common.roles.patient}
            </Badge>
            {/* 데모용 환자↔의원 화면 전환 (docs/design.md 적용 규칙) */}
            <Link
              href={href(lang, "/clinic")}
              aria-label={common.switchView.toClinic}
              title={common.switchView.toClinic}
              data-switch-view="clinic"
              className="flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <ArrowLeftRight className="size-[18px]" aria-hidden />
            </Link>
          </div>
        </header>
        <main className="flex flex-1 flex-col p-4 has-[[data-layout=wide]]:md:p-8">{children}</main>
        <SiteFooter lang={lang} />
      </div>
    </div>
  );
}
