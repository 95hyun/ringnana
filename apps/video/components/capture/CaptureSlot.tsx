"use client";
import type { CaptureSlotArea, RoomContext } from "@/lib/contracts";
import { DoctorCapture } from "./DoctorCapture";
import { PatientCapture } from "./PatientCapture";

// 촬영 화면 자리 (spec §5·§9, plan "끼움 약속")
export function CaptureSlot({ ctx }: { ctx: RoomContext; area: CaptureSlotArea }) {
  return ctx.role === "doctor" ? <DoctorCapture ctx={ctx} /> : <PatientCapture ctx={ctx} />;
}
