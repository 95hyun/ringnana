import { ArrowLeftRight } from "lucide-react";
import Link from "next/link";
import { FlowSteps } from "@/components/shell/flow-steps";
import { LangSwitcher } from "@/components/shell/lang-switcher";
import { SiteFooter } from "@/components/shell/site-footer";
import { Badge } from "@/components/ui/badge";
import { DEFAULT_LANG, getDict, href, type Lang } from "@/lib/i18n";

// 환자 앱 셸 — 기본은 모바일 폭 칼럼. 페이지에 data-layout="wide"가 있으면 전체 폭(헤더 전폭 + 본문 가운데 1200px)으로 바뀐다
// 헤더는 자기 폭 기준(@container)으로 1줄(데스크톱, 가운데 3단계) / 3줄(모바일)을 고른다 — Figma 헤더 4:3013, 모바일 4:3171
export async function PatientShell({ lang = DEFAULT_LANG, children }: { lang?: Lang; children: React.ReactNode }) {
  const { common } = await getDict(lang);
  const switchHref = href(lang, "/clinic");
  return (
    <div className="flex min-h-full flex-1 justify-center bg-muted">
      <div className="flex w-full max-w-md flex-1 flex-col bg-background shadow-sm has-[[data-layout=wide]]:max-w-none has-[[data-layout=wide]]:shadow-none">
        <header className="@container sticky top-0 z-10 border-b bg-surface">
          <div className="relative flex h-15 items-center gap-2 px-4 @3xl:px-12">
            <Link href={href(lang, "/")} className="font-[family-name:var(--font-inter)] text-[17px] font-bold tracking-tight">
              {common.brand}
            </Link>
            <FlowSteps
              variant="bar"
              labels={common.flowSteps}
              ariaLabel={common.stepLabel}
              className="absolute top-0 left-1/2 hidden -translate-x-1/2 @3xl:flex"
            />
            <div className="ml-auto flex items-center gap-2 @3xl:gap-4">
              <LangSwitcher lang={lang} label={common.langSwitcher} />
              <Badge variant="role-patient">{common.roles.patient}</Badge>
              {/* 데모용 환자↔의원 화면 전환 (docs/design.md 적용 규칙) */}
              <Link
                href={switchHref}
                data-switch-view="clinic"
                className="hidden h-11 items-center text-[13px] text-muted-foreground hover:text-foreground @3xl:flex"
              >
                {common.switchView.toClinic}
              </Link>
            </div>
          </div>
          <div className="flex flex-col gap-1 px-4 pb-2 @3xl:hidden">
            <FlowSteps variant="inline" labels={common.flowSteps} ariaLabel={common.stepLabel} />
            <Link
              href={switchHref}
              data-switch-view="clinic"
              className="flex h-9 w-fit items-center gap-2 text-[13px] text-muted-foreground hover:text-foreground"
            >
              <ArrowLeftRight className="size-4" aria-hidden />
              {common.switchView.toClinic}
            </Link>
          </div>
        </header>
        <main className="flex flex-1 flex-col p-4 has-[[data-layout=wide]]:mx-auto has-[[data-layout=wide]]:w-full has-[[data-layout=wide]]:max-w-[1248px] has-[[data-layout=wide]]:md:px-6 has-[[data-layout=wide]]:md:py-10">
          {children}
        </main>
        <SiteFooter lang={lang} />
      </div>
    </div>
  );
}
