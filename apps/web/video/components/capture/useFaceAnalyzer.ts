"use client";
import { useEffect, useState } from "react";
import { createFaceAnalyzer, type FaceAnalyzer } from "@/video/lib/face";

type AnalyzerState = { analyzer: FaceAnalyzer | null; status: "loading" | "ready" | "failed" };

/** enabled 동안만 얼굴 분석기를 띄운다 (환자 브라우저 전용). 실패하면 수동 촬영으로만 진행된다. */
export function useFaceAnalyzer(enabled: boolean): AnalyzerState {
  const [state, setState] = useState<AnalyzerState>({ analyzer: null, status: "loading" });
  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let made: FaceAnalyzer | null = null;
    createFaceAnalyzer().then(
      (a) => {
        if (cancelled) {
          a.close();
          return;
        }
        made = a;
        setState({ analyzer: a, status: "ready" });
      },
      (e) => {
        console.error("[capture] face analyzer failed", e);
        if (!cancelled) setState({ analyzer: null, status: "failed" });
      },
    );
    return () => {
      cancelled = true;
      made?.close();
      setState({ analyzer: null, status: "loading" });
    };
  }, [enabled]);
  return state;
}
