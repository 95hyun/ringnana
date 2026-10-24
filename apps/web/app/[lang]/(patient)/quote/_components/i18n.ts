import "server-only";
import { notFound } from "next/navigation";
import { lang as rootLang } from "next/root-params";
import type { Dict } from "@/dictionaries/jp";
import { getDict, isLang, type Lang } from "@/lib/i18n";

export type H4Dict = Dict["h4"];

// H4 서버 컴포넌트 공용: 경로 언어 + 사전
export async function h4Context(): Promise<{ lang: Lang; t: H4Dict; common: Dict["common"] }> {
  const lang = await rootLang();
  if (!lang || !isLang(lang)) notFound();
  const dict = await getDict(lang);
  return { lang, t: dict.h4, common: dict.common };
}
