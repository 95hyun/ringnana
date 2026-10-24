import { TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";

// 금기 플래그 = Flag chip(high). 코드가 위험도를 매기지 않으므로(의료 판단 금지) "예" 응답은 모두 같은 단계로 보여 준다
export function FlagChip({ flag, children }: { flag: string; children: React.ReactNode }) {
  return (
    <Badge variant="flag-high" data-flag={flag}>
      <TriangleAlert aria-hidden />
      {children}
    </Badge>
  );
}
