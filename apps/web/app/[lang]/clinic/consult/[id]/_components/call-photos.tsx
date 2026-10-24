// 통화 중 촬영 사진 — docs/video-integration.md §4, docs/face-capture.md
import { Badge } from "@/components/ui/badge";
import { fmt, label, type H3Dict } from "../../../_components/labels";

const SLOTS = ["front", "left", "right"] as const;

export type CallPhotoRow = {
  id: string;
  angle: string;
  capture_batch_id: string | null;
  capture_mode: string | null;
  created_at: string;
  url: string | null; // signed URL (실패 시 null)
};

export type CallPhotoBatch = {
  batchId: string;
  takenAt: string;
  slots: Partial<Record<(typeof SLOTS)[number], CallPhotoRow>>;
};

// 회차별로 묶고 최신 회차가 먼저. 같은 회차·같은 각도는 최신 행이 이긴다(재전송 덮어쓰기)
export function groupCallPhotos(rows: CallPhotoRow[]): CallPhotoBatch[] {
  const batches = new Map<string, CallPhotoBatch>();
  for (const r of [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    if (!(SLOTS as readonly string[]).includes(r.angle)) continue;
    const key = r.capture_batch_id ?? "unknown";
    const b = batches.get(key) ?? { batchId: key, takenAt: r.created_at, slots: {} };
    b.slots[r.angle as (typeof SLOTS)[number]] = r;
    if (r.created_at > b.takenAt) b.takenAt = r.created_at;
    batches.set(key, b);
  }
  return [...batches.values()].sort((a, b) => b.takenAt.localeCompare(a.takenAt));
}

export function CallPhotos({ batches, t, labels, dateLocale }: { batches: CallPhotoBatch[]; t: H3Dict["clinic"]["callPhotos"]; labels: Record<string, string>; dateLocale: string }) {
  if (batches.length === 0) return <p className="text-sm text-muted-foreground">{t.empty}</p>;
  return (
    <div className="flex flex-col gap-4" data-call-photos>
      {batches.map((b, i) => (
        <div key={b.batchId} className="flex flex-col gap-2" data-batch={b.batchId}>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium">
              {fmt(t.batch, {
                n: batches.length - i,
                time: new Date(b.takenAt).toLocaleTimeString(dateLocale, { timeZone: "Asia/Seoul", timeStyle: "short" }),
              })}
            </span>
            {i === 0 ? <Badge>{t.latest}</Badge> : null}
          </div>
          <div className="grid grid-cols-3 gap-3">
            {SLOTS.map((angle) => {
              const p = b.slots[angle];
              return (
                <figure key={angle} className="flex flex-col gap-1" data-call-photo={angle}>
                  {p?.url ? (
                    <a href={p.url} target="_blank" rel="noopener">
                      {/* eslint-disable-next-line @next/next/no-img-element -- signed URL은 매번 바뀌어 next/image 최적화 대상 아님 */}
                      <img src={p.url} alt={label(labels, angle)} className="aspect-[3/4] w-full rounded border object-cover" />
                    </a>
                  ) : (
                    <div className="flex aspect-[3/4] items-center justify-center rounded border border-dashed text-xs text-muted-foreground">
                      {p ? t.loadFailed : t.missing}
                    </div>
                  )}
                  <figcaption className="text-center text-xs text-muted-foreground">
                    {label(labels, angle)}
                    {p?.capture_mode === "manual" ? ` · ${t.manual}` : ""}
                  </figcaption>
                </figure>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
