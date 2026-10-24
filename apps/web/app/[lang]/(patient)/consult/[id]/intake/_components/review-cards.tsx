import { Camera, TriangleAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Dict } from "@/dictionaries/jp";
import type { ConcernKey, ContraindicationKey } from "@/lib/intake";

type Props = {
  t: Dict["h2"]["intake"];
  concernLabels: Dict["h2"]["concerns"];
  concerns: ConcernKey[];
  flags: ContraindicationKey[]; // lib/intake computeFlags 결과 그대로 — 여기서 판단하지 않는다
};

function ReviewCard({ title, aiDraft, children }: { title: string; aiDraft: string; children: React.ReactNode }) {
  return (
    <section className="flex min-h-[196px] flex-col gap-4 rounded-2xl border bg-surface p-6 shadow-xs">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold">{title}</h3>
        <Badge variant="ai-label">{aiDraft}</Badge>
      </div>
      {children}
    </section>
  );
}

export function ReviewCards({ t, concernLabels, concerns, flags }: Props) {
  const r = t.review;
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5" data-testid="intake-review">
      <ReviewCard title={r.concernsTitle} aiDraft={r.aiDraft}>
        {concerns.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {concerns.map((k) => (
              <li key={k} className="rounded-full bg-primary-tint px-3 py-1.5 text-[13px] font-semibold text-primary-hover">
                {concernLabels[k]}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[13px] text-muted-foreground">{r.concernsEmpty}</p>
        )}
        <p className="text-[13px] leading-relaxed text-muted-foreground">{r.concernsNote}</p>
      </ReviewCard>

      <ReviewCard title={r.flagsTitle} aiDraft={r.aiDraft}>
        {flags.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {flags.map((k) => (
              <li key={k}>
                <Badge variant="flag-high" className="h-auto gap-1.5 px-3 py-1.5 text-[13px] font-bold [&>svg]:size-3.5!">
                  <TriangleAlert aria-hidden />
                  {t.flagLabels[k]}
                </Badge>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[13px] text-muted-foreground">{r.flagsEmpty}</p>
        )}
        <p className="text-[13px] leading-relaxed text-muted-foreground">{r.flagsNote}</p>
      </ReviewCard>

      {/* 정적 샘플 — 샘플 '오른쪽' 사진과 짝. 실제 재촬영은 화상 진료 중 */}
      <ReviewCard title={r.retakeTitle} aiDraft={r.aiDraft}>
        <p className="text-[15px] leading-relaxed">{r.retakeBody}</p>
        <Button type="button" variant="outline" disabled className="h-10 w-fit text-[13px] font-semibold">
          <Camera className="size-4" aria-hidden />
          {r.retakeCta}
        </Button>
      </ReviewCard>
    </div>
  );
}
