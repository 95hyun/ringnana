import { Camera, TriangleAlert } from "lucide-react";
import Image from "next/image";
import type { Dict } from "@/dictionaries/jp";
import { cn } from "@/lib/utils";

// 표시 전용 샘플 — 표준 3방향 사진은 화상 진료 중 팀원 파트(apps/video)가 촬영한다. 업로드 없음
const ANGLES = [
  { key: "front", src: "/figma/h2/sample-front.jpg" },
  { key: "left", src: "/figma/h2/sample-left.jpg" },
  { key: "right", src: "/figma/h2/sample-right.jpg", tooDark: true },
] as const;

export function SamplePhotos({ t }: { t: Dict["h2"]["intake"]["photos"] }) {
  return (
    <section className="flex flex-col gap-6 rounded-2xl border bg-surface p-5 shadow-xs md:p-7" aria-labelledby="intake-photos-title">
      <div className="flex items-center justify-between gap-2">
        <h2 id="intake-photos-title" className="flex items-center gap-2 text-[17px] font-semibold">
          <Camera className="size-[18px] text-primary" aria-hidden />
          {t.title}
        </h2>
        <span className="text-[13px] text-muted-foreground">{t.count}</span>
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-[15px] font-semibold leading-normal">{t.guideTitle}</p>
        <p className="text-[13px] leading-relaxed text-muted-foreground">{t.guideBody}</p>
      </div>
      <ul className="grid grid-cols-3 gap-2 md:gap-3">
        {ANGLES.map((a) => (
          <li key={a.key} className="flex flex-col gap-2.5">
            <figure
              className={cn(
                "relative aspect-[4/5] overflow-hidden rounded-xl border md:aspect-auto md:h-[248px]",
                "tooDark" in a && "border-foreground/80",
              )}
            >
              <Image src={a.src} alt={`${t[a.key]} · ${t.sampleLabel}`} fill sizes="(min-width: 768px) 220px, 33vw" className="object-cover" />
              <figcaption className="absolute bottom-1.5 left-1.5 rounded-[6px] bg-black/65 px-2 py-1 text-[10px] font-semibold text-white/90">
                {t.sampleLabel}
              </figcaption>
              {"tooDark" in a && (
                <span className="absolute top-1.5 left-1.5 flex items-center gap-1 rounded-[6px] bg-foreground/80 px-2 py-1 text-[10px] font-bold text-white">
                  <TriangleAlert className="size-2.5" aria-hidden />
                  {t.tooDark}
                </span>
              )}
            </figure>
            <div className="flex flex-col items-center gap-0.5 text-center">
              <p className="text-[13px] font-semibold">{t[a.key]}</p>
              {"tooDark" in a && <p className="text-xs text-muted-foreground">{t.retakeNeeded}</p>}
            </div>
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-1 border-t pt-5 text-[13px]">
        <p className="font-semibold">{t.noteTitle}</p>
        <p className="leading-relaxed text-muted-foreground">{t.noteBody}</p>
      </div>
    </section>
  );
}
