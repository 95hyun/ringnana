export type MediaErrorKind = "denied" | "notFound" | "inUse";

// spec §4.1: 1920×1080 → 1280×720 → 카메라가 주는 값 (16:9 기준)
export function mediaConstraintsChain(widths: readonly number[]): MediaStreamConstraints[] {
  return [
    ...widths.map((w) => ({
      audio: true,
      video: { width: { ideal: w }, height: { ideal: Math.round((w * 9) / 16) } },
    })),
    { audio: true, video: true },
  ];
}

export function classifyMediaError(err: unknown): MediaErrorKind {
  const name = err && typeof err === "object" && "name" in err ? String((err as { name: unknown }).name) : "";
  if (name === "NotAllowedError" || name === "SecurityError" || name === "PermissionDeniedError") return "denied";
  if (name === "NotFoundError" || name === "DevicesNotFoundError") return "notFound";
  return "inUse";
}

// 권한 거부·장치 없음은 해상도를 낮춰도 해결되지 않으므로 다음 단계로 넘어가지 않는다
export const shouldTryNextConstraints = (err: unknown) => classifyMediaError(err) === "inUse";
