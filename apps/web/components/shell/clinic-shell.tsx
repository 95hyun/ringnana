import { ArrowLeftRight } from "lucide-react";
import Link from "next/link";
import { FlowSteps } from "@/components/shell/flow-steps";
import { LangSwitcher } from "@/components/shell/lang-switcher";
import { Badge } from "@/components/ui/badge";
import { DEFAULT_LANG, getDict, href, type Lang } from "@/lib/i18n";

// 의원 콘솔 셸 — 데스크톱. 콘솔 문구는 jp 경로에서도 한국어일 수 있어 한글 우선 폰트 스택(font-ko)을 쓴다
export async function ClinicShell({ lang = DEFAULT_LANG, children }: { lang?: Lang; children: React.ReactNode }) {
  const { common } = await getDict(lang);
  // 콘솔 단계 이름은 경로 언어와 무관하게 한국어 (nav·clinicConsole과 같은 규칙)
  const { common: ko } = await getDict("ko");
  return (
    <div className="flex min-h-full flex-1 flex-col bg-background font-ko">
      <header className="relative flex h-15 items-center gap-6 border-b bg-surface px-6 xl:px-12">
        <Link href={href(lang, "/clinic")} className="flex items-center gap-2">
          <span className="font-[family-name:var(--font-inter)] text-[17px] font-bold tracking-tight">{common.brand}</span>
          <span className="text-[13px] text-muted-foreground">{common.clinicConsole}</span>
        </Link>
        <nav className="flex gap-4 text-sm">
          <Link href={href(lang, "/clinic")} className="text-muted-foreground hover:text-foreground">
            {common.nav.queue}
          </Link>
          <Link href={href(lang, "/clinic/aftercare")} className="text-muted-foreground hover:text-foreground">
            {common.nav.aftercare}
          </Link>
        </nav>
        {/* Figma S2 헤더 가운데 3단계 — 좁으면 nav와 겹쳐 숨긴다 */}
        <FlowSteps
          variant="bar"
          labels={ko.flowSteps}
          ariaLabel={ko.stepLabel}
          className="absolute top-0 left-1/2 hidden -translate-x-1/2 xl:flex"
        />
        <div className="ml-auto flex items-center gap-3">
          <LangSwitcher lang={lang} label={common.langSwitcher} />
          <Badge variant="role-doctor">{common.roles.doctor}</Badge>
          {/* 데모용 의원↔환자 화면 전환 */}
          <Link
            href={href(lang, "/")}
            data-switch-view="patient"
            className="flex h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ArrowLeftRight className="size-4" aria-hidden />
            {common.switchView.toPatient}
          </Link>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-[1248px] flex-1 flex-col px-6 py-6 md:py-10">{children}</main>
    </div>
  );
}
