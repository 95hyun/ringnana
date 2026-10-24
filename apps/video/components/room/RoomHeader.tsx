"use client";
import type { ReactNode } from "react";
import type { Role, UiLang } from "@/lib/contracts";
import type { RoomText } from "@/lib/room/text";

export function RoomHeader({
  role,
  uiLang,
  onLangChange,
  text,
  status,
}: {
  role: Role;
  uiLang: UiLang;
  onLangChange: (lang: UiLang) => void;
  text: RoomText;
  status?: ReactNode;
}) {
  return (
    <header className="flex min-h-12 items-center justify-between gap-3 border-b border-neutral-800 px-4 py-2">
      <div className="flex min-w-0 items-center gap-3">
        <span className="text-sm font-semibold tracking-wide text-neutral-300">Ringnana</span>
        {status}
      </div>
      {role === "patient" && (
        <div role="group" aria-label={text.langToggleLabel} className="flex shrink-0 overflow-hidden rounded-full border border-neutral-700 text-sm">
          {(["ja", "ko"] as const).map((lang) => (
            <button
              key={lang}
              type="button"
              aria-pressed={uiLang === lang}
              onClick={() => onLangChange(lang)}
              className={`px-3 py-1 ${uiLang === lang ? "bg-neutral-100 text-neutral-900" : "text-neutral-300 hover:bg-neutral-800"}`}
            >
              {lang === "ja" ? text.langJa : text.langKo}
            </button>
          ))}
        </div>
      )}
    </header>
  );
}
