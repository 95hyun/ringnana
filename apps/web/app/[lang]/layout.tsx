import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { RootHtml } from "@/components/shell/root-html";
import { LANGS, htmlLang, isLang } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Ringnana",
  description: "訪韓前にオンラインで韓国皮膚科の診察と確定見積もりを",
};

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export default async function LangLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  return <RootHtml lang={htmlLang(lang)}>{children}</RootHtml>;
}
