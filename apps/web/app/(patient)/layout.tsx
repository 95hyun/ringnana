import { PatientShell } from "@/components/shell/patient-shell";
import { RootHtml } from "@/components/shell/root-html";

// 이행용 임시 루트 레이아웃 — H2~H4가 app/[lang]/(patient)/로 옮기면 H1이 삭제한다
export default function LegacyPatientLayout({ children }: { children: React.ReactNode }) {
  return (
    <RootHtml lang="ja">
      <PatientShell lang="jp">{children}</PatientShell>
    </RootHtml>
  );
}
