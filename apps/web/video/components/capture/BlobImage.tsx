"use client";
import { useEffect, useRef } from "react";

// Blob 미리보기 — 주소는 effect 안에서 만들고 정리한다 (Strict Mode 이중 실행에도 안전)
export function BlobImage({ blob, alt, className }: { blob: Blob; alt: string; className?: string }) {
  const ref = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const url = URL.createObjectURL(blob);
    if (ref.current) ref.current.src = url;
    return () => URL.revokeObjectURL(url);
  }, [blob]);
  // eslint-disable-next-line @next/next/no-img-element -- 로컬 Blob 미리보기
  return <img ref={ref} alt={alt} className={className} />;
}
