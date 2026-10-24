import { PatientShell } from "@/components/shell/patient-shell";
import { Button } from "@/components/ui/button";

// 환자 셸 미리보기 (H1 확인용)
export default function PatientShellPreview() {
  return (
    <PatientShell>
      <h1 className="text-xl font-bold">患者アプリ シェル</h1>
      <p className="text-sm text-muted-foreground">問診・写真アップロード画面はこの枠の中に表示されます。</p>
      <Button className="mt-4">次へ</Button>
    </PatientShell>
  );
}
