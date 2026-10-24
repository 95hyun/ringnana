"use client";

import { ArrowRight, Check, ScanFace } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DisclaimerBar } from "@/components/ui/disclaimer-bar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Dict } from "@/dictionaries/jp";
import { CONCERN_KEYS, CONTRAINDICATION_KEYS, EXAMPLE_INTAKE, computeFlags, type ConcernKey, type ContraindicationKey } from "@/lib/intake";
import { cn } from "@/lib/utils";
import { submitIntake } from "../actions";
import { ConsentDialog } from "./consent-dialog";
import { ReviewCards } from "./review-cards";
import { SamplePhotos } from "./sample-photos";

type Props = {
  lang: string;
  greeting: string;
  photosPath: string; // href(lang, "/photos") — 서버에서 만들어 넘긴다
  policyPath: string;
  disclaimer: string;
  t: Dict["h2"]["intake"];
  concerns: Dict["h2"]["concerns"];
  contraindications: Dict["h2"]["contraindications"];
};

const fieldLabel = "text-[13px] font-semibold leading-normal";
const optionBox =
  "flex h-11 cursor-pointer items-center justify-center gap-1.5 rounded-[10px] border bg-background px-3 text-[13px] font-medium text-muted-foreground has-checked:border-primary has-checked:bg-primary-tint has-checked:font-semibold has-checked:text-primary-hover has-focus-visible:ring-2 has-focus-visible:ring-ring";

export function IntakeForm({ lang, greeting, photosPath, policyPath, disclaimer, t, concerns, contraindications }: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  // 예시 채우기 때문에 입력을 모두 제어 컴포넌트로 둔다
  const [selected, setSelected] = useState<ConcernKey[]>([]);
  const [trip, setTrip] = useState({ start: "", end: "" });
  // 금기 문항은 '선택 안 함'을 허용하지 않는다 — 모두 はい/いいえ 중 하나
  const [answers, setAnswers] = useState<Partial<Record<ContraindicationKey, boolean>>>({});
  const [consentOpen, setConsentOpen] = useState(false);
  const [flagged, setFlagged] = useState<{ intakeId: string; flags: ContraindicationKey[] } | null>(null);
  const unanswered = CONTRAINDICATION_KEYS.filter((k) => answers[k] === undefined).length;
  const toPhotos = (intakeId: string) => router.push(`${photosPath}?intake=${intakeId}`);

  function fillExample() {
    setSelected([...EXAMPLE_INTAKE.concerns]);
    setTrip({ start: EXAMPLE_INTAKE.tripStart, end: EXAMPLE_INTAKE.tripEnd });
    setAnswers(Object.fromEntries(CONTRAINDICATION_KEYS.map((k) => [k, EXAMPLE_INTAKE.yes.includes(k)])));
  }

  function toggleConcern(k: ConcernKey, on: boolean) {
    setSelected((s) => (on ? CONCERN_KEYS.filter((c) => c === k || s.includes(c)) : s.filter((c) => c !== k)));
  }

  // form action 대신 onSubmit — React 19 form action은 제출 후 비제어 입력을 리셋한다. 제출 = 동의 모달 열기
  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (selected.length === 0) {
      toast.error(t.errors.noConcern);
      return;
    }
    if (unanswered > 0) {
      toast.error(t.unanswered);
      return;
    }
    setConsentOpen(true);
  }

  function onAgree() {
    if (!formRef.current) return;
    const fd = new FormData(formRef.current);
    setConsentOpen(false);
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
      <Card className="mx-auto w-full max-w-md border-warning-border bg-warning-tint" data-testid="intake-flag-notice">
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
    <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-8 md:gap-10">
      <input type="hidden" name="lang" value={lang} />

      <section className="flex flex-col gap-4 rounded-2xl bg-blush-tint p-5 md:px-9 md:py-8">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-blush">
          <p className="text-[11px] font-bold tracking-wide uppercase">{t.hero.eyebrow}</p>
          <p className="text-[13px]">{t.hero.example}</p>
        </div>
        <h1 className="text-[28px] leading-tight font-extrabold md:text-[36px]">{t.hero.title}</h1>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:gap-8">
          <p className="flex-1 text-[15px] leading-relaxed text-muted-foreground">{t.hero.lead}</p>
          <div className="flex gap-2.5">
            <Button type="button" variant="outline" className="h-[42px] px-[18px] text-[13px] font-semibold" onClick={fillExample} data-testid="intake-example">
              {t.hero.tryExample}
            </Button>
            <Link href={photosPath} className={buttonVariants({ variant: "outline", className: "h-[42px] px-[18px] text-[13px] font-semibold" })}>
              <ScanFace className="size-4" aria-hidden />
              {t.hero.scanFace}
            </Link>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="lg:sticky lg:top-24 lg:col-span-7">
          <SamplePhotos t={t.photos} />
        </div>

        <section className="flex flex-col gap-5 rounded-2xl border bg-surface p-5 shadow-xs md:p-7 lg:col-span-5" aria-labelledby="intake-form-title">
          <div className="flex flex-col gap-1">
            <h2 id="intake-form-title" className="text-[17px] font-semibold">
              {t.formTitle}
            </h2>
            <p className="text-[13px] text-muted-foreground">{greeting}</p>
          </div>

          <fieldset className="flex flex-col gap-2">
            <legend className={fieldLabel}>{t.concernsTitle}</legend>
            <p className="text-xs text-muted-foreground">{t.concernsDesc}</p>
            <div className="mt-1 grid grid-cols-2 gap-1.5">
              {CONCERN_KEYS.map((k) => (
                <label key={k} className={cn(optionBox, "justify-start")}>
                  <input
                    type="checkbox"
                    name="concerns"
                    value={k}
                    checked={selected.includes(k)}
                    onChange={(e) => toggleConcern(k, e.target.checked)}
                    className="peer sr-only"
                  />
                  <Check className="hidden size-3.5 peer-checked:block" aria-hidden />
                  {concerns[k]}
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className="flex flex-col gap-2">
            <legend className={fieldLabel}>{t.tripTitle}</legend>
            <p className="text-xs text-muted-foreground">{t.tripDesc}</p>
            <div className="mt-1 grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="trip_start" className="text-xs text-muted-foreground">
                  {t.tripStart}
                </Label>
                <Input
                  id="trip_start"
                  name="trip_start"
                  type="date"
                  value={trip.start}
                  onChange={(e) => setTrip((v) => ({ ...v, start: e.target.value }))}
                  className="h-11 rounded-[10px] bg-background"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="trip_end" className="text-xs text-muted-foreground">
                  {t.tripEnd}
                </Label>
                <Input
                  id="trip_end"
                  name="trip_end"
                  type="date"
                  value={trip.end}
                  onChange={(e) => setTrip((v) => ({ ...v, end: e.target.value }))}
                  className="h-11 rounded-[10px] bg-background"
                />
              </div>
            </div>
          </fieldset>

          <div className="flex flex-col gap-2">
            <p className={fieldLabel}>{t.contraTitle}</p>
            <p className="text-xs text-muted-foreground">{t.contraDesc}</p>
            <div className="mt-1 flex flex-col gap-4">
              {CONTRAINDICATION_KEYS.map((k) => (
                <fieldset key={k} className="flex flex-col gap-1.5">
                  <legend className="mb-1.5 text-[13px] leading-normal">{contraindications[k]}</legend>
                  <div className="grid grid-cols-2 gap-1.5">
                    {([true, false] as const).map((v) => (
                      <label key={String(v)} className={optionBox}>
                        <input
                          type="radio"
                          name={`q_${k}`}
                          checked={answers[k] === v}
                          onChange={() => setAnswers((a) => ({ ...a, [k]: v }))}
                          className="peer sr-only"
                        />
                        <Check className="hidden size-3.5 peer-checked:block" aria-hidden />
                        {v ? t.yes : t.no}
                      </label>
                    ))}
                  </div>
                  {answers[k] && (
                    <>
                      <input type="hidden" name="yes" value={k} />
                      <p className="text-xs text-warning-foreground" role="status">
                        {t.yesNote}
                      </p>
                    </>
                  )}
                </fieldset>
              ))}
            </div>
          </div>
        </section>
      </div>

      <section className="flex flex-col gap-6" aria-labelledby="intake-review-title">
        <div className="flex flex-col gap-1.5">
          <h2 id="intake-review-title" className="text-2xl leading-tight font-extrabold md:text-[28px]">
            {t.review.title}
          </h2>
          <p className="text-[13px] text-muted-foreground">{t.review.lead}</p>
        </div>
        <ReviewCards t={t} concernLabels={concerns} concerns={selected} flags={computeFlags(answers)} />
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <p className="text-[13px] text-muted-foreground">{t.review.aiNote}</p>
          <Button type="submit" disabled={pending} className="w-full rounded-[10px] px-[22px] text-sm font-bold md:w-auto" data-testid="intake-submit">
            <ArrowRight className="size-4" aria-hidden />
            {pending ? t.submitting : t.submit}
          </Button>
        </div>
        <DisclaimerBar>{disclaimer}</DisclaimerBar>
      </section>

      <ConsentDialog open={consentOpen} onOpenChange={setConsentOpen} onAgree={onAgree} policyPath={policyPath} t={t.consent} />
    </form>
  );
}
