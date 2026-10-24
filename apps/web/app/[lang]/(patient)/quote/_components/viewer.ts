import "server-only";
import { DEMO_PATIENT_ID } from "@/lib/demo";
// H2 소유
import { currentPatientId } from "@/app/[lang]/(patient)/login/_lib/session";

// 로그인 환자(H2 서명 쿠키) 우선, 없으면 데모 페르소나 — 로그인 없이도 데모 동선이 끊기지 않게
export async function viewerPatientId(): Promise<string> {
  return (await currentPatientId()) ?? DEMO_PATIENT_ID;
}
