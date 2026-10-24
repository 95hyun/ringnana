"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

// 노트 저장 = 브라우저 인쇄(PDF 저장 포함). 별도 파일 생성은 하지 않는다
export function PrintButton({ label, variant }: { label: string; variant: "default" | "outline" }) {
  return (
    <Button type="button" variant={variant} className="w-full print:hidden" onClick={() => window.print()}>
      <Download strokeWidth={1.75} aria-hidden />
      {label}
    </Button>
  );
}
