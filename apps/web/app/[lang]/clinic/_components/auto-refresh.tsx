"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

// 서버 컴포넌트 데이터를 주기적으로 다시 받는다 (Realtime 대신 폴링 — spec 결정)
export function AutoRefresh({ intervalMs = 5000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), intervalMs);
    return () => clearInterval(t);
  }, [router, intervalMs]);
  return null;
}
