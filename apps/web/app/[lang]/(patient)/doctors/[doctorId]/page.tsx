import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { lang as rootLang } from "next/root-params";
import { connection } from "next/server";
import { ChevronLeft, Map as MapIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { DisclaimerBar } from "@/components/ui/disclaimer-bar";
import { SampleImage } from "@/components/ui/sample-image";
import { Button } from "@/components/ui/button";
import { formatDate, formatTime } from "@/lib/format";
import { getDict, href, isLang, type Lang } from "@/lib/i18n";
import { localized } from "@/lib/localize";
import { addDays, todaySeoul } from "../../quote/_components/format";
import { startBookingForm } from "../actions";
import { loadDoctors, seoulYmd } from "../_components/data";

export default async function DoctorProfilePage({
  params,
  searchParams,
}: PageProps<"/[lang]/doctors/[doctorId]">) {
  // doctorId는 런타임 값이라 Suspense 안에서만 await한다(Cache Components). lang은 root param으로
  const lang = await rootLang();
  if (!lang || !isLang(lang)) notFound();
  const dict = await getDict(lang);
  return (
    <div data-layout="wide" className="flex flex-col gap-6">
      <Link
        href={href(lang, "/doctors")}
        className="flex min-h-11 items-center gap-1 text-sm font-medium text-primary"
      >
        <ChevronLeft className="size-4" />
        {dict.doctors.profile.back}
      </Link>
      <Suspense
        fallback={
          <p className="text-sm text-muted-foreground">
            {dict.doctors.list.loading}
          </p>
        }
      >
        <Profile
          lang={lang}
          params={params}
          searchParams={searchParams as Promise<{ error?: string }>}
        />
      </Suspense>
      <DisclaimerBar>{dict.common.disclaimer}</DisclaimerBar>
    </div>
  );
}

async function Profile({
  lang,
  params,
  searchParams,
}: {
  lang: Lang;
  params: Promise<{ doctorId: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  await connection();
  const { doctorId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(doctorId)) notFound();
  const [{ error }, dict, [d]] = await Promise.all([
    searchParams,
    getDict(lang),
    loadDoctors(doctorId),
  ]);
  if (!d) notFound();
  const t = dict.doctors;
  const name = localized(d, lang) ?? "—";
  const area =
    d.clinic?.area && d.clinic.area in t.areas
      ? t.areas[d.clinic.area as keyof typeof t.areas]
      : null;

  // 오늘부터 14일(서울 기준) 안의 슬롯을 날짜별로 묶는다
  const last = addDays(todaySeoul(), 13);
  const byDay = new Map<string, typeof d.slots>();
  for (const s of d.slots) {
    const day = seoulYmd(s.starts_at);
    if (day > last) continue;
    byDay.set(day, [...(byDay.get(day) ?? []), s]);
  }

  return (
    <>
      <section className="flex items-center gap-4 rounded-xl border border-blush/15 bg-blush-tint p-5 md:p-6">
        <span
          aria-hidden
          className="flex size-20 shrink-0 items-center justify-center rounded-full bg-surface text-3xl font-bold text-primary-hover"
        >
          {Array.from(name)[0]}
        </span>
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-semibold tracking-wide text-blush uppercase">
            {localized(d, lang, "title")}
          </p>
          <h1 className="text-[22px] font-bold leading-tight md:text-[26px]">
            {name}
          </h1>
          <p className="text-[13px] font-medium text-blush">
            {localized(d.clinic, lang)}
            {area && ` ・ ${area}`}
          </p>
        </div>
      </section>

      <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-12">
        <div className="flex flex-col gap-6 md:col-span-7">
          <Card className="gap-3 p-5 md:p-6">
            <h2 className="text-lg font-semibold">{t.profile.about}</h2>
            <p className="text-[15px] leading-[1.8]">
              {localized(d, lang, "bio") ?? t.profile.noBio}
            </p>
          </Card>

          <Card className="gap-3 p-5 md:p-6">
            <h2 className="text-lg font-semibold">{t.profile.specialties}</h2>
            <div className="flex flex-wrap gap-1.5">
              {d.specialties.map((c) => (
                <Badge key={c} variant="role-doctor">
                  {dict.h2.concerns[c as keyof typeof dict.h2.concerns] ?? c}
                </Badge>
              ))}
            </div>
            <h2 className="pt-2 text-lg font-semibold">
              {t.profile.languages}
            </h2>
            <p className="text-[15px]">
              {d.languages
                .map((l) => t.languages[l as keyof typeof t.languages] ?? l)
                .join(" / ")}
            </p>
          </Card>

          <Card className="gap-4 p-5" data-testid="doctor-clinic">
            <SampleImage
              src="/figma/h4/clinic.jpg"
              alt=""
              label={dict.common.sampleImage}
              ratio="16/9"
              className="rounded-lg"
            />
            <h2 className="text-lg font-semibold">
              {localized(d.clinic, lang)}
            </h2>
            <p className="text-[13px] leading-relaxed text-muted-foreground">
              {localized(d.clinic, lang, "address") ?? "—"}
              <br />
              {t.profile.station} ・{" "}
              {localized(d.clinic, lang, "station") ?? "—"}
            </p>
            <div className="flex h-[110px] flex-col items-center justify-center gap-1.5 rounded-lg bg-muted text-[13px] text-muted-foreground">
              <MapIcon className="size-[18px]" strokeWidth={1.75} aria-hidden />
              {t.profile.map}
            </div>
          </Card>
        </div>

        <section
          className="flex flex-col gap-3 md:col-span-5"
          data-testid="doctor-slots"
        >
          <form
            action={startBookingForm.bind(null, lang, d.id)}
            className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 text-[15px] shadow-sm md:sticky md:top-4"
          >
            <div className="flex flex-col gap-0.5">
              <h2 className="text-lg font-semibold">{t.profile.slotsTitle}</h2>
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                {t.profile.slotsLead}
              </p>
            </div>
            {error && (
              <p
                role="alert"
                className="rounded-lg bg-warning-tint p-3 text-sm text-warning-foreground"
              >
                {t.errors.slotUnavailable}
              </p>
            )}
            {byDay.size === 0 ? (
              <p className="text-sm text-muted-foreground">
                {t.profile.slotsEmpty}
              </p>
            ) : (
              [...byDay].map(([day, slots]) => (
                <fieldset key={day} className="flex flex-col gap-2">
                  <legend className="mb-1 text-sm font-medium">
                    {formatDate(day, lang)}
                  </legend>
                  <div className="grid grid-cols-3 gap-2">
                    {slots.map((s) => (
                      <label key={s.id} className="cursor-pointer">
                        <input
                          type="radio"
                          name="slot"
                          value={s.id}
                          required
                          className="peer sr-only"
                        />
                        <span className="flex h-11 items-center justify-center rounded-lg border border-border-strong bg-surface text-sm peer-checked:border-primary peer-checked:bg-primary-tint peer-checked:font-semibold peer-checked:text-primary-hover peer-focus-visible:ring-2 peer-focus-visible:ring-ring">
                          {formatTime(s.starts_at, lang)}
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))
            )}
            {byDay.size > 0 && (
              <>
                <Button type="submit" size="lg">
                  {t.profile.book}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  {t.profile.pickSlot}
                </p>
              </>
            )}
          </form>
        </section>
      </div>
    </>
  );
}
