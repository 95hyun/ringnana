// 표시 헬퍼. 라벨 문구 자체는 dictionaries/{lang}/h3.ts — 사전에 없는 키는 그대로 보여준다
import type { Dict } from "@/dictionaries/jp";

export type H3Dict = Dict["h3"];

export const label = (map: Record<string, string>, key: string) => map[key] ?? key;

// "{n}세" 같은 사전 문구의 자리표시자 치환
export function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

// 체류 일수 (trip_start~trip_end 포함). 일정이 없으면 0
export function tripDays(start: string | null, end: string | null): number {
  if (!start || !end) return 0;
  return Math.round((Date.parse(end) - Date.parse(start)) / 86_400_000) + 1;
}

export const formatKrw = (n: number) => `${n.toLocaleString("ko-KR")}원`;
