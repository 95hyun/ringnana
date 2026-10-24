"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "cn";
import type { H4Dict } from "../../_components/i18n";
import { fill, formatDate, formatDateShort } from "@/lib/format";
import type { Lang } from "@/lib/i18n";
import { daysBetween } from "../../_components/format";
import { bookQuote } from "../actions";

export function BookingPicker({
  quoteId,
  tripStart,
  tripEnd,
  sessions,
  suggested,
  lang,
  t,
  errors,
}: {
  quoteId: string;
  tripStart: string;
  tripEnd: string;
  sessions: number;
  suggested: string[];
  lang: Lang;
  t: H4Dict["booking"];
  errors: H4Dict["errors"];
}) {
  const days = daysBetween(tripStart, tripEnd);
  const [selected, setSelected] = useState<string[]>(suggested);
  const [pending, startTransition] = useTransition();
  const full = selected.length === sessions;

  function toggle(day: string) {
    setSelected((cur) => (cur.includes(day) ? cur.filter((d) => d !== day) : cur.length < sessions ? [...cur, day].sort() : cur));
  }

  function submit() {
    startTransition(async () => {
      const res = await bookQuote(quoteId, selected);
      if (res.ok) toast.success(t.success);
      else toast.error(fill(errors[res.error], { n: res.n ?? sessions }));
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.title}</CardTitle>
        <CardDescription>
          {fill(t.description, { start: formatDate(tripStart, lang), end: formatDate(tripEnd, lang), n: sessions })}
          {suggested.length > 0 && t.suggestedNote}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-2">
          {days.map((day, i) => {
            const order = selected.indexOf(day);
            const on = order >= 0;
            return (
              <button
                key={day}
                type="button"
                onClick={() => toggle(day)}
                disabled={pending || (!on && full)}
                aria-pressed={on}
                className={cn(
                  "flex flex-col items-start rounded-lg border px-3 py-2 text-left text-sm transition-colors disabled:opacity-40",
                  on ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
                )}
              >
                <span className="text-xs opacity-80">{fill(t.tripDay, { n: i + 1 })}</span>
                <span className="font-medium">{formatDateShort(day, lang)}</span>
                <span className="text-xs">
                  {on ? fill(t.order, { n: order + 1 }) : ""}
                  {suggested.includes(day) && <span className="ml-1 opacity-80">{t.suggested}</span>}
                </span>
              </button>
            );
          })}
        </div>
        {sessions > days.length && <p className="text-sm text-destructive">{t.tooManySessions}</p>}
        <Button size="lg" className="w-full" disabled={!full || pending} onClick={submit}>
          {pending ? t.submitting : full ? t.submit : fill(t.remaining, { n: sessions - selected.length })}
        </Button>
        <p className="text-xs text-muted-foreground">{t.payNote}</p>
      </CardContent>
    </Card>
  );
}
