"use client";

import { useState } from "react";
import { SampleImage } from "@/components/ui/sample-image";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// 문진 표준 사진(front/left/right). url이 없으면 public/figma/h3 샘플로 대체하고 "샘플" 라벨을 붙인다
export type AnglePhoto = { angle: string; label: string; url: string | null; qualityOk: boolean | null };

type Props = {
  photos: AnglePhoto[];
  t: { title: string; angleCount: string; sample: string; sampleImage: string; qualityCheck: string; sampleNote: string };
};

const sampleSrc = (angle: string) => `/figma/h3/sample-${angle}.jpg`;

export function PhotoReference({ photos, t }: Props) {
  const [active, setActive] = useState(photos[0]?.angle ?? "front");
  const anySample = photos.some((p) => !p.url);

  return (
    <section className="flex flex-col gap-4" data-photo-reference>
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-semibold">{t.title}</h2>
        <span className="text-xs text-muted-foreground">{t.angleCount}</span>
      </div>
      <Tabs value={active} onValueChange={(v) => setActive(String(v))} className="gap-3">
        <TabsList variant="line" className="h-10! w-full gap-0 border-b p-0">
          {photos.map((p) => (
            <TabsTrigger key={p.angle} value={p.angle} className="h-10 rounded-none text-[13px] after:bottom-[-1px]! after:bg-primary data-active:font-semibold data-active:text-primary">
              {p.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {photos.map((p) => (
          <TabsContent key={p.angle} value={p.angle} data-photo={p.angle}>
            <div className="relative flex h-80 justify-center overflow-hidden rounded-lg border bg-muted">
              {p.url ? (
                <a href={p.url} target="_blank" rel="noopener" className="h-full">
                  <SampleImage src={p.url} alt={p.label} className="h-full rounded-none" />
                </a>
              ) : (
                <SampleImage src={sampleSrc(p.angle)} alt={p.label} className="h-full rounded-none" />
              )}
              {!p.url ? <span className="absolute top-2.5 left-2.5 rounded-[4px] bg-black/55 px-2 py-0.5 text-[11px] font-semibold text-white">{t.sampleImage}</span> : null}
              {p.qualityOk === false ? (
                <span className="absolute bottom-2.5 left-2.5 rounded-[4px] bg-warning-tint px-2 py-0.5 text-[11px] font-medium text-warning-foreground">{t.qualityCheck}</span>
              ) : null}
            </div>
          </TabsContent>
        ))}
      </Tabs>
      <div className="flex gap-2">
        {photos
          .filter((p) => p.angle !== active)
          .map((p) => (
            <button key={p.angle} type="button" onClick={() => setActive(p.angle)} className="flex flex-1 flex-col gap-1 text-[11px] font-medium text-muted-foreground" data-photo-thumb={p.angle}>
              <span className="relative flex h-[110px] w-full justify-center overflow-hidden rounded-md border bg-muted">
                <SampleImage src={p.url ?? sampleSrc(p.angle)} alt={p.label} className="h-full rounded-none" />
                {!p.url ? <span className="absolute top-1.5 left-1.5 rounded-[3px] bg-black/55 px-1.5 py-px text-[10px] font-semibold text-white">{t.sample}</span> : null}
                {p.qualityOk === false ? (
                  <span className="absolute bottom-1.5 left-1.5 rounded-[3px] bg-warning-tint px-1.5 py-px text-[10px] text-warning-foreground">{t.qualityCheck}</span>
                ) : null}
              </span>
              {p.label}
            </button>
          ))}
      </div>
      {anySample ? <p className="text-xs leading-relaxed text-muted-foreground">{t.sampleNote}</p> : null}
    </section>
  );
}
