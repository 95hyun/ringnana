"use client";

import { Checkbox } from "@/components/ui/checkbox";

// 준비물 체크 — 화면 안에서만 유지 (저장하지 않음)
export function BringChecklist({ items }: { items: { id: string; label: string }[] }) {
  return (
    <ul className="flex flex-col">
      {items.map((item) => (
        <li key={item.id}>
          <label className="flex min-h-11 cursor-pointer items-start gap-2.5 py-1 text-[13px] leading-relaxed">
            <Checkbox className="mt-0.5 size-5" />
            <span>{item.label}</span>
          </label>
        </li>
      ))}
    </ul>
  );
}
