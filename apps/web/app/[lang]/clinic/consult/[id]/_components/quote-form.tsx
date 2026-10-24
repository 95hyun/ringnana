"use client";

import { Check } from "lucide-react";
import { useState, useTransition, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { fmt, formatKrw, type H3Dict } from "../../../_components/labels";
import { QUOTE_PRESETS, type QuoteItem } from "../../../_components/quote-types";
import { saveQuote } from "../actions";

type Props = {
  consultationId: string;
  initialNotes: string;
  // 항목은 AI 브리프 "소견에 포함" 체크박스와 공유하므로 상위(BriefWorkspace)가 가진다
  items: QuoteItem[];
  setItems: Dispatch<SetStateAction<QuoteItem[]>>;
  initialValidUntil: string;
  // 체류 N일차 → 날짜 라벨 (예: ["10/25", "10/26", ...]). 일정이 없으면 빈 배열
  tripDates: string[];
  t: H3Dict["clinic"]["quote"];
  // 통화 중: 소견란 = 실시간 메모, Primary는 통화 종료(footer)라 확정 버튼은 outline
  live?: { notesLabel: string; footer: ReactNode };
  itemsLabel: string;
};

export function QuoteForm({ consultationId, initialNotes, items, setItems, initialValidUntil, tripDates, t, live, itemsLabel }: Props) {
  const [notes, setNotes] = useState(initialNotes);
  const [validUntil, setValidUntil] = useState(initialValidUntil);
  const [pending, startTransition] = useTransition();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const total = items.reduce((s, i) => s + i.sessions * i.price_krw, 0);
  const update = (idx: number, patch: Partial<QuoteItem>) =>
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== idx) return it;
        const next = { ...it, ...patch };
        // 시술명을 고치면 프리셋이 아니다 — code를 떼야 환자 화면이 사전 이름 대신 고친 이름을 보여 준다
        if ("name" in patch || "name_ja" in patch) delete next.code;
        return next;
      }),
    );
  const toggleDay = (idx: number, day: number) =>
    setItems((prev) =>
      prev.map((it, i) =>
        i !== idx ? it : { ...it, visit_days: it.visit_days.includes(day) ? it.visit_days.filter((d) => d !== day) : [...it.visit_days, day] },
      ),
    );

  const submit = (confirm: boolean) => {
    startTransition(async () => {
      const res = await saveQuote(consultationId, { notes, items, validUntil: validUntil || null, confirm });
      setConfirmOpen(false);
      if (res.ok) toast.success(confirm ? t.confirmedToast : t.savedToast);
      else toast.error(res.detail ? `${t.errors[res.code]} ${res.detail}` : t.errors[res.code]);
    });
  };

  return (
    <div className="flex flex-col gap-5" data-quote-form>
      <div className="flex flex-col gap-2">
        <Label className="text-[13px] font-semibold">{itemsLabel}</Label>
        <span className="text-xs text-muted-foreground">{t.addItem}</span>
        <div className="flex flex-wrap gap-2">
          {QUOTE_PRESETS.map((p) => (
            <Button key={p.name} variant="outline" size="sm" data-preset={p.name} onClick={() => setItems((prev) => [...prev, { ...p, visit_days: [] }])}>
              + {p.name}
            </Button>
          ))}
          <Button variant="ghost" size="sm" onClick={() => setItems((prev) => [...prev, { name: "", name_ja: "", sessions: 1, price_krw: 0, visit_days: [] }])}>
            {t.custom}
          </Button>
        </div>
      </div>

      {items.map((it, idx) => (
        <div key={idx} className="flex flex-col gap-3 rounded-lg border p-3" data-quote-item={idx}>
          {/* 우측 5/12 칼럼에서도 맞게 2줄: 시술명·일본어 / 회차·단가·삭제 */}
          <div className="grid grid-cols-6 items-end gap-2">
            <div className="col-span-3 flex flex-col gap-1">
              <Label className="text-xs">{t.name}</Label>
              <Input value={it.name} onChange={(e) => update(idx, { name: e.target.value })} />
            </div>
            <div className="col-span-3 flex flex-col gap-1">
              <Label className="text-xs">{t.nameJa}</Label>
              <Input value={it.name_ja} onChange={(e) => update(idx, { name_ja: e.target.value })} />
            </div>
            <div className="col-span-2 flex flex-col gap-1">
              <Label className="text-xs">{t.sessions}</Label>
              <Input type="number" min={1} value={it.sessions} onChange={(e) => update(idx, { sessions: Number(e.target.value) || 1 })} />
            </div>
            <div className="col-span-3 flex flex-col gap-1">
              <Label className="text-xs">{t.unitPrice}</Label>
              <Input type="number" min={0} step={10000} value={it.price_krw} onChange={(e) => update(idx, { price_krw: Number(e.target.value) || 0 })} />
            </div>
            <Button variant="ghost" size="sm" className="col-span-1" onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))}>
              {t.remove}
            </Button>
          </div>
          {tripDates.length > 0 ? (
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="text-xs text-muted-foreground">{t.visitDays}</span>
              {tripDates.map((date, d) => (
                <label key={d} className="flex items-center gap-1">
                  <input type="checkbox" data-visit-day={d + 1} checked={it.visit_days.includes(d + 1)} onChange={() => toggleDay(idx, d + 1)} />
                  {fmt(t.dayN, { n: d + 1 })} <span className="text-muted-foreground">({date})</span>
                </label>
              ))}
              {it.visit_days.length > 0 && it.visit_days.length !== it.sessions ? (
                <span className="text-xs text-destructive">{fmt(t.mismatch, { sessions: it.sessions, days: it.visit_days.length })}</span>
              ) : null}
            </div>
          ) : null}
          <div className="text-right text-sm text-muted-foreground">{fmt(t.subtotal, { amount: formatKrw(it.sessions * it.price_krw) })}</div>
        </div>
      ))}

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor="valid-until" className="text-xs">{t.validUntil}</Label>
          <Input id="valid-until" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
        </div>
        <div className="text-lg font-bold" data-quote-total>
          {fmt(t.total, { amount: formatKrw(total) })}
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="notes" className="text-[13px] font-semibold">{live ? live.notesLabel : t.notes}</Label>
        <Textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t.notesPlaceholder} />
      </div>

      {live ? (
        <div className="flex flex-col gap-2">
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="lg" disabled={pending} onClick={() => submit(false)}>
              {t.saveDraft}
            </Button>
            <Button variant="outline" size="lg" disabled={pending || items.length === 0} data-confirm-quote onClick={() => setConfirmOpen(true)}>
              {t.confirm}
            </Button>
          </div>
          {live.footer}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <Button variant="outline" size="lg" className="self-end" disabled={pending} onClick={() => submit(false)}>
            {t.saveDraft}
          </Button>
          <Button size="lg" className="h-12 w-full" disabled={pending || items.length === 0} data-confirm-quote onClick={() => setConfirmOpen(true)}>
            <Check aria-hidden />
            {t.confirm}
          </Button>
          <p className="text-center text-xs text-muted-foreground">{t.confirmNote}</p>
        </div>
      )}
      <Dialog open={confirmOpen} onOpenChange={(open) => !pending && setConfirmOpen(open)}>
        <DialogContent data-confirm-dialog>
          <DialogHeader>
            <DialogTitle>{t.confirmTitle}</DialogTitle>
            <DialogDescription>{t.confirmPrompt}</DialogDescription>
          </DialogHeader>
          <ul className="flex flex-col gap-1 text-sm">
            {items.map((it, idx) => (
              <li key={idx} className="flex justify-between">
                <span>{it.name || "—"} × {it.sessions}</span>
                <span>{formatKrw(it.sessions * it.price_krw)}</span>
              </li>
            ))}
            <li className="flex justify-between border-t pt-1 font-bold">
              <span />
              <span>{fmt(t.total, { amount: formatKrw(total) })}</span>
            </li>
          </ul>
          <DialogFooter>
            <Button variant="outline" disabled={pending} onClick={() => setConfirmOpen(false)}>
              {t.cancel}
            </Button>
            <Button disabled={pending} data-confirm-quote-ok onClick={() => submit(true)}>
              {t.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
