import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import type { Dict } from "@/dictionaries/jp";
import { formatDateShort, formatTime } from "@/lib/format";
import { href, type Lang } from "@/lib/i18n";
import { localized } from "@/lib/localize";
import type { DoctorRow } from "./data";

export function DoctorCard({
  d,
  lang,
  dict,
}: {
  d: DoctorRow;
  lang: Lang;
  dict: Dict;
}) {
  const t = dict.doctors;
  const name = localized(d, lang) ?? "—";
  const first = d.slots[0];
  const area =
    d.clinic?.area && d.clinic.area in t.areas
      ? t.areas[d.clinic.area as keyof typeof t.areas]
      : null;
  return (
    <li data-testid="doctor-card" className="flex">
      <Card className="w-full gap-4 p-5">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary-tint text-lg font-bold text-primary-hover"
          >
            {Array.from(name)[0]}
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <h2 className="text-lg font-semibold">{name}</h2>
            <span className="text-[13px] text-muted-foreground">
              {localized(d, lang, "title")}
            </span>
            <span className="text-sm">
              {localized(d.clinic, lang)}
              {area && (
                <span className="text-muted-foreground"> ・ {area}</span>
              )}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {d.specialties.map((c) => (
            <Badge key={c} variant="role-doctor">
              {dict.h2.concerns[c as keyof typeof dict.h2.concerns] ?? c}
            </Badge>
          ))}
        </div>
        <p className="text-[13px] text-muted-foreground">
          {t.profile.languages}:{" "}
          {d.languages
            .map((l) => t.languages[l as keyof typeof t.languages] ?? l)
            .join(" / ")}
        </p>
        <div className="flex items-center justify-between gap-3 rounded-lg bg-blush-tint px-3 py-2 text-[13px]">
          <span className="text-muted-foreground">{t.list.earliest}</span>
          <span className="font-medium text-blush">
            {first
              ? `${formatDateShort(first.starts_at, lang)} ${formatTime(first.starts_at, lang)}`
              : t.list.noSlot}
          </span>
        </div>
        <Link
          href={href(lang, `/doctors/${d.id}`)}
          className={buttonVariants({ variant: first ? "default" : "outline" })}
        >
          {t.list.viewProfile}
        </Link>
      </Card>
    </li>
  );
}
