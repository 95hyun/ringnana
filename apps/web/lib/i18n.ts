// 다국어 경로 규칙 — 정본 docs/i18n.md. 경로 값(jp)↔HTML 언어 코드(ja) 변환은 이 파일에서만 한다.
import type { Dict } from "@/dictionaries/jp";

export const LANGS = ["jp", "ko"] as const;
export type Lang = (typeof LANGS)[number];
export const DEFAULT_LANG: Lang = "jp";

const HTML_LANG: Record<Lang, string> = { jp: "ja", ko: "ko" };

export function isLang(value: string): value is Lang {
  return (LANGS as readonly string[]).includes(value);
}

export function htmlLang(lang: Lang): string {
  return HTML_LANG[lang];
}

// href("jp", "/intake") → "/jp/intake", href("jp", "/") → "/jp". 쿼리·해시는 path에 그대로 붙여 넘긴다
export function href(lang: Lang, path: string): string {
  if (!path.startsWith("/")) throw new Error(`href: path must start with "/": ${path}`);
  return path === "/" ? `/${lang}` : `/${lang}${path}`;
}

const loaders: Record<Lang, () => Promise<Dict>> = {
  jp: () => import("@/dictionaries/jp").then((m) => m.default),
  ko: () => import("@/dictionaries/ko").then((m) => m.default),
};

// 서버 컴포넌트에서 사용. 클라이언트 컴포넌트에는 필요한 조각만 props로 넘긴다
export function getDict(lang: Lang): Promise<Dict> {
  return loaders[lang]();
}
