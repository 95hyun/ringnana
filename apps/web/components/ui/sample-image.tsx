import { cn } from "@/lib/utils";

// docs/design.md §7: 사진 4:5 cover + 좌하단 라벨(가상 인물 "サンプル画像", AI 결과는 "AIによるイメージ" 등)
// src는 signed URL일 수 있어 next/image 대신 <img>
export function SampleImage({
  src,
  alt,
  label,
  ratio = "4/5",
  className,
}: {
  src: string;
  alt: string;
  label?: string;
  ratio?: "4/5" | "16/9" | "1/1";
  className?: string;
}) {
  const aspect = ratio === "16/9" ? "aspect-video" : ratio === "1/1" ? "aspect-square" : "aspect-[4/5]";
  return (
    <figure data-slot="sample-image" className={cn("relative overflow-hidden rounded-xl bg-muted", aspect, className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- signed URL은 next/image 최적화 대상 아님 */}
      <img src={src} alt={alt} className="size-full object-cover" />
      {label && (
        <figcaption className="absolute bottom-2 left-2 rounded-[6px] bg-black/55 px-2 py-0.5 text-xs text-white">{label}</figcaption>
      )}
    </figure>
  );
}
