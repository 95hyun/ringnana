"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Dict } from "@/dictionaries/jp";
import { CONCERN_KEYS, CONTRAINDICATION_KEYS, type ContraindicationKey } from "@/lib/intake";
import { submitIntake } from "../actions";

type Props = {
  lang: string;
  photosPath: string; // href(lang, "/photos") — 서버에서 만들어 넘긴다
  t: Dict["h2"]["intake"];
  concerns: Dict["h2"]["concerns"];
  contraindications: Dict["h2"]["contraindications"];
};

export function IntakeForm({ lang, photosPath, t, concerns, contraindications }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  // 금기 문항은 '선택 안 함'을 허용하지 않는다 — 모두 はい/いいえ 중 하나
  const [answers, setAnswers] = useState<Partial<Record<ContraindicationKey, boolean>>>({});
  const [flagged, setFlagged] = useState<{ intakeId: string; flags: ContraindicationKey[] } | null>(null);
  const unanswered = CONTRAINDICATION_KEYS.filter((k) => answers[k] === undefined).length;
  const toPhotos = (intakeId: string) => router.push(`${photosPath}?intake=${intakeId}`);

  // form action 대신 onSubmit — React 19 form action은 제출 후 비제어 입력을 리셋한다
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (unanswered > 0) {
      toast.error(t.unanswered);
      return;
    }
    startTransition(async () => {
      const res = await submitIntake(fd);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      if (res.flags.length > 0) setFlagged({ intakeId: res.intakeId, flags: res.flags });
      else toPhotos(res.intakeId);
    });
  }

  if (flagged) {
    return (
      <Card className="border-warning-border bg-warning-tint" data-testid="intake-flag-notice">
        <CardHeader>
          <CardTitle>{t.flagTitle}</CardTitle>
          <CardDescription>{t.flagBody}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ul className="list-disc pl-5 text-sm">
            {flagged.flags.map((k) => (
              <li key={k}>{contraindications[k]}</li>
            ))}
          </ul>
          <Button size="lg" onClick={() => toPhotos(flagged.intakeId)}>
            {t.flagCta}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <input type="hidden" name="lang" value={lang} />
      <Card>
        <CardHeader>
          <CardTitle>{t.concernsTitle}</CardTitle>
          <CardDescription>{t.concernsDesc}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-2">
          {CONCERN_KEYS.map((k) => (
            <label key={k} className="flex items-center gap-2 rounded-md border p-2.5 text-sm has-checked:border-primary has-checked:bg-primary/5">
              <input type="checkbox" name="concerns" value={k} className="size-4 accent-primary" />
              {concerns[k]}
            </label>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.tripTitle}</CardTitle>
          <CardDescription>{t.tripDesc}</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="trip_start">{t.tripStart}</Label>
            <Input id="trip_start" name="trip_start" type="date" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="trip_end">{t.tripEnd}</Label>
            <Input id="trip_end" name="trip_end" type="date" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.contraTitle}</CardTitle>
          <CardDescription>{t.contraDesc}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {CONTRAINDICATION_KEYS.map((k) => (
            <fieldset key={k} className="flex flex-col gap-2 rounded-md border p-3">
              <legend className="sr-only">{contraindications[k]}</legend>
              <p className="text-sm">{contraindications[k]}</p>
              <div className="grid grid-cols-2 gap-2">
                {([true, false] as const).map((v) => (
                  <label
                    key={String(v)}
                    className="flex items-center justify-center gap-2 rounded-md border py-2 text-sm has-checked:border-primary has-checked:bg-primary/5"
                  >
                    <input
                      type="radio"
                      name={`q_${k}`}
                      checked={answers[k] === v}
                      onChange={() => setAnswers((a) => ({ ...a, [k]: v }))}
                      className="size-4 accent-primary"
                    />
                    {v ? t.yes : t.no}
                  </label>
                ))}
              </div>
              {answers[k] && (
                <>
                  <input type="hidden" name="yes" value={k} />
                  <p className="text-xs text-warning-foreground" role="status">{t.yesNote}</p>
                </>
              )}
            </fieldset>
          ))}
        </CardContent>
      </Card>

      <Button type="submit" size="lg" disabled={pending}>
        {pending ? t.submitting : t.submit}
      </Button>
    </form>
  );
}
