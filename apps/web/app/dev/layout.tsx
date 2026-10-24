import { RootHtml } from "@/components/shell/root-html";

// /dev는 언어 구간 밖 (docs/i18n.md)
export default function DevLayout({ children }: { children: React.ReactNode }) {
  return <RootHtml lang="ko">{children}</RootHtml>;
}
