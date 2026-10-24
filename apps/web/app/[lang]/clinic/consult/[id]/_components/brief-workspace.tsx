"use client";

import { useState, type ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { fmt, type H3Dict } from "../../../_components/labels";
import { QUOTE_PRESETS, type QuoteItem } from "../../../_components/quote-types";
import { QuoteForm } from "./quote-form";

type BriefDict = H3Dict["clinic"]["brief"];
type CandidateKey = keyof BriefDict["candidates"];

// AI 브리프 후보 = 고정 예시(환자 데이터로 계산하지 않는다 — 의료 판단 금지). 체크하면 견적 항목을 미리 채울 뿐 확정은 의사
const rejuran = QUOTE_PRESETS.find((p) => p.code === "rejuran")!;
const botoxEye = QUOTE_PRESETS.find((p) => p.code === "botox_eye")!;
const EXAMPLE_CANDIDATES: { key: CandidateKey; item: Omit<QuoteItem, "visit_days">; matches: (it: QuoteItem) => boolean }[] = [
  { key: "rejuran", item: rejuran, matches: (it) => it.code === "rejuran" },
  { key: "botox_eye", item: botoxEye, matches: (it) => it.code === "botox_eye" },
];

type Props = {
  consultationId: string;
  initialNotes: string;
  initialItems: QuoteItem[];
  initialValidUntil: string;
  tripDates: string[];
  flagCard: ReactNode;
  // 통화 중이면 통화 종료 버튼(Primary)을 넘긴다
  liveFooter?: ReactNode;
  t: Pick<H3Dict["clinic"], "brief" | "quote">;
};

export function BriefWorkspace({ consultationId, initialNotes, initialItems, initialValidUntil, tripDates, flagCard, liveFooter, t }: Props) {
  const [items, setItems] = useState<QuoteItem[]>(initialItems);
  const tb = t.brief;
  const selected = EXAMPLE_CANDIDATES.filter((c) => items.some(c.matches)).length;

  const toggle = (c: (typeof EXAMPLE_CANDIDATES)[number], on: boolean) =>
    setItems((prev) => (on ? (prev.some(c.matches) ? prev : [...prev, { ...c.item, visit_days: [] }]) : prev.filter((it) => !c.matches(it))));

  return (
    <div className="flex flex-col gap-5" data-brief>
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <h2 className="text-[15px] font-semibold">{tb.title}</h2>
          <Badge variant="ghost" className="rounded-sm bg-muted text-muted-foreground">
            {tb.example}
          </Badge>
        </div>
        <p className="text-[13px] text-muted-foreground">{selected === 0 ? tb.summaryNone : fmt(tb.summarySelected, { n: selected })}</p>
      </div>

      {EXAMPLE_CANDIDATES.map((c) => {
        const copy = tb.candidates[c.key];
        const checked = items.some(c.matches);
        return (
          <section key={c.key} className="flex flex-col gap-3.5 rounded-lg border bg-surface p-5" data-brief-candidate={c.key}>
            <div className="flex items-center justify-between">
              <Badge variant="ai-label">{tb.aiDraft}</Badge>
              <span className="text-xs text-muted-foreground">{tb.suitability}</span>
            </div>
            <h3 className="text-[17px] leading-snug font-semibold">{copy.title}</h3>
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold text-muted-foreground">{tb.evidence}</span>
              {copy.evidence.map((e) => (
                <p key={e} className="text-[13px] leading-relaxed">
                  {e}
                </p>
              ))}
            </div>
            <div className="flex flex-col gap-0.5 rounded-md border border-warning-border bg-warning-tint px-3 py-2.5 text-xs leading-normal">
              <span className="font-semibold text-warning-foreground">{tb.hold}</span>
              <span className="text-warning">{copy.hold}</span>
            </div>
            <label className="flex min-h-10 cursor-pointer items-center gap-2.5 border-t pt-2.5 text-[13px] font-medium">
              <Checkbox checked={checked} onCheckedChange={(on) => toggle(c, on)} data-include={c.key} />
              {tb.include}
            </label>
          </section>
        );
      })}

      {flagCard}

      <QuoteForm
        consultationId={consultationId}
        initialNotes={initialNotes}
        items={items}
        setItems={setItems}
        initialValidUntil={initialValidUntil}
        tripDates={tripDates}
        t={t.quote}
        itemsLabel={tb.quoteItems}
        live={liveFooter ? { notesLabel: tb.liveNotes, footer: liveFooter } : undefined}
      />
    </div>
  );
}
