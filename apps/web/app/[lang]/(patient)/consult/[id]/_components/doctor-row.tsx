import { localized } from "@/lib/localize";
import type { Lang } from "@/lib/i18n";

type DoctorRow = {
  name: string;
  name_ja: string | null;
  title?: string | null;
  title_ja?: string | null;
  clinics?: { name: string; name_ja: string | null } | null;
} | null;

// S5 상단 "Dr. [Name], Dermatologist" 행 — 대기실·진료 완료 공용. 사진(photo_path)은 시드에 없어 이니셜 아바타
export function DoctorRowCard({ doctor, lang, titleFallback, right }: { doctor: DoctorRow; lang: Lang; titleFallback: string; right?: React.ReactNode }) {
  const name = localized(doctor, lang);
  if (!name) return null;
  const title = localized(doctor, lang, "title") ?? titleFallback;
  const clinic = localized(doctor?.clinics, lang);
  return (
    <div className="flex items-center gap-3" data-doctor-profile>
      <div className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-primary-tint text-lg font-semibold text-primary-hover" aria-hidden>
        {name.slice(0, 1)}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="text-base font-semibold">
          {name} · {title}
        </p>
        {clinic ? <p className="text-[13px] text-muted-foreground">{clinic}</p> : null}
      </div>
      {right}
    </div>
  );
}
