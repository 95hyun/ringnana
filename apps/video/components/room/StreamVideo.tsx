"use client";
import { useEffect, useRef } from "react";

// 영상만 그린다 (소리는 별도 <audio> 하나로 재생 — 배치가 바뀌어도 원음 요소가 바뀌지 않게)
export function StreamVideo({
  stream,
  mirrored = false,
  className = "",
}: {
  stream: MediaStream | null;
  mirrored?: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v || v.srcObject === stream) return;
    v.srcObject = stream;
    if (stream) v.play().catch(() => {});
  }, [stream]);
  return (
    <video
      ref={ref}
      muted
      autoPlay
      playsInline
      className={`h-full w-full object-cover ${mirrored ? "-scale-x-100" : ""} ${className}`}
    />
  );
}
