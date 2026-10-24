import { cn } from "@/lib/utils";

// 환자 화면 데스크톱 2단(좌 7 / 우 5, 최대 1200px) — 랜딩 등에서 사용 (docs/design.md §6, ux-review D2).
// 이 컴포넌트가 들어 있으면 PatientShell이 모바일 칼럼 대신 넓은 폭으로 바뀐다(data-layout="wide").
// 390px에서는 1단으로 쌓인다.
export function PatientWideLayout({
  left,
  right,
  className,
}: {
  left: React.ReactNode;
  right: React.ReactNode;
  className?: string;
}) {
  return (
    <div data-layout="wide" className={cn("grid grid-cols-1 gap-6 md:grid-cols-12", className)}>
      <div className="md:col-span-7">{left}</div>
      <div className="md:col-span-5">{right}</div>
    </div>
  );
}
