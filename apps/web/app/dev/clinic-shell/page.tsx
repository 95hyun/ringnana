import { ClinicShell } from "@/components/shell/clinic-shell";
import { Button } from "@/components/ui/button";

// 의원 셸 미리보기 (H1 확인용)
export default function ClinicShellPreview() {
  return (
    <ClinicShell>
      <h1 className="text-xl font-bold">의원 콘솔 셸</h1>
      <p className="text-sm text-muted-foreground">진료 큐·문진 열람 화면이 이 틀 안에 표시됩니다.</p>
      <Button className="mt-4 w-fit">진료 시작</Button>
    </ClinicShell>
  );
}
