"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { LANGS, type Lang } from "@/lib/i18n";
import { cn } from "@/lib/utils";

// 언어 이름은 각 언어 자기 표기 (사전에 두지 않음)
const LANG_NAMES: Record<Lang, string> = { jp: "日本語", ko: "한국어" };
// 모바일 헤더 폭 부족 대응 (docs/ux-review.md E6)
const LANG_SHORT: Record<Lang, string> = { jp: "JA", ko: "KO" };

// 현재 경로의 첫 구간(lang)만 바꿔 같은 화면으로 이동 (docs/ux-review.md A5)
// usePathname은 동적 경로에서 Suspense가 필요하다(Cache Components). 대기 중에는 각 언어 홈 링크
export function LangSwitcher(props: { lang: Lang; label: string }) {
  return (
    <Suspense fallback={<LangLinks {...props} rest="" />}>
      <CurrentPathLangLinks {...props} />
    </Suspense>
  );
}

function CurrentPathLangLinks(props: { lang: Lang; label: string }) {
  const rest = usePathname().split("/").slice(2).join("/");
  return <LangLinks {...props} rest={rest} />;
}

function LangLinks({ lang, label, rest }: { lang: Lang; label: string; rest: string }) {
  return (
    <nav aria-label={label} className="flex shrink-0 items-center gap-1 whitespace-nowrap text-xs">
      {LANGS.map((l) => (
        <Link
          key={l}
          href={`/${l}${rest ? `/${rest}` : ""}`}
          hrefLang={l === "jp" ? "ja" : "ko"}
          aria-current={l === lang ? "true" : undefined}
          data-lang-switch={l}
          className={cn(
            "rounded-full px-2 py-1 transition-colors sm:px-2.5",
            l === lang ? "bg-secondary font-semibold text-secondary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <span className="sm:hidden" aria-hidden>{LANG_SHORT[l]}</span>
          <span className="sr-only sm:not-sr-only">{LANG_NAMES[l]}</span>
        </Link>
      ))}
    </nav>
  );
}
