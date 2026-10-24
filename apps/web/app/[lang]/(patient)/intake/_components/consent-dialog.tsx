"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { Dict } from "@/dictionaries/jp";

const ITEMS = [
  { key: "share", required: true },
  { key: "transfer", required: true },
  { key: "ai", required: true },
  { key: "reminder", required: false }, // 선택 항목은 저장하지 않는다 (스키마 변경 없음)
] as const;
type ItemKey = (typeof ITEMS)[number]["key"];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAgree: () => void;
  policyPath: string;
  t: Dict["h2"]["intake"]["consent"];
};

export function ConsentDialog({ open, onOpenChange, onAgree, policyPath, t }: Props) {
  const [checked, setChecked] = useState<Partial<Record<ItemKey, boolean>>>({});
  const ready = ITEMS.every((i) => !i.required || checked[i.key]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={false} className="gap-4 rounded-2xl p-6 shadow-xl sm:max-w-[560px] sm:p-7" data-testid="intake-consent">
        <p className="text-xs font-semibold text-primary">{t.eyebrow}</p>
        <DialogTitle className="text-2xl leading-snug font-semibold">{t.title}</DialogTitle>
        <DialogDescription render={<div />} className="flex flex-col gap-1 rounded-[10px] bg-background p-3.5 text-[13px] leading-[1.7] text-foreground">
          {t.summary.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </DialogDescription>
        <ul className="flex flex-col gap-3.5">
          {ITEMS.map((i) => (
            <li key={i.key}>
              <label className="flex cursor-pointer items-start gap-3 text-[13px] leading-[1.7]">
                <Checkbox
                  className="mt-0.5 size-5 border-border-strong bg-surface"
                  checked={checked[i.key] === true}
                  onCheckedChange={(v) => setChecked((c) => ({ ...c, [i.key]: v }))}
                />
                <span>
                  <span className={i.required ? "font-semibold text-primary-hover" : "font-semibold text-muted-foreground"}>
                    {i.required ? t.required : t.optional}
                  </span>
                  {" · "}
                  {t.items[i.key]}
                </span>
              </label>
            </li>
          ))}
        </ul>
        <a href={policyPath} target="_blank" rel="noreferrer" className="w-fit text-[13px] text-primary underline-offset-4 hover:underline">
          {t.policy}
        </a>
        <p className="text-xs leading-relaxed text-muted-foreground">{t.draftNote}</p>
        <div className="flex gap-3">
          <DialogClose render={<Button variant="outline" className="rounded-[10px] text-sm" />}>{t.cancel}</DialogClose>
          <Button className="flex-1 rounded-[10px] text-sm" disabled={!ready} onClick={onAgree} data-testid="intake-consent-agree">
            {t.agree}
          </Button>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">{t.hint}</p>
      </DialogContent>
    </Dialog>
  );
}
