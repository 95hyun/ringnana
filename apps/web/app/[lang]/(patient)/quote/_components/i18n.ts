import "server-only";
import { notFound } from "next/navigation";
import { lang as rootLang } from "next/root-params";
import type { Dict } from "@/dictionaries/jp";
import { getDict, htmlLang, isLang, type Lang } from "@/lib/i18n";

export type H4Dict = Dict["h4"];

// H4 서버 컴포넌트 공용: 경로 언어 + 사전 + Intl 로케일
export async function h4Context(): Promise<{ lang: Lang; locale: string; t: H4Dict; common: Dict["common"] }> {
  const lang = await rootLang();
  if (!lang || !isLang(lang)) notFound();
  const dict = await getDict(lang);
  return { lang, locale: htmlLang(lang), t: dict.h4, common: dict.common };
}
