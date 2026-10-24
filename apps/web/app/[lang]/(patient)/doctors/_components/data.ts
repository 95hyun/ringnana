import "server-only";
import { supabaseServer } from "@/lib/supabase/server";

export type Slot = { id: string; starts_at: string };

export const DOCTOR_SELECT =
  "id, name, name_ja, title, title_ja, bio, bio_ja, specialties, languages, photo_path, clinics(id, name, name_ja, area, address, address_ja, station, station_ja), doctor_slots(id, starts_at, status)";

// 의사 + 의원 + 미래의 open 슬롯(시각 오름차순). 슬롯이 적은 데모 규모라 JS에서 거른다
export async function loadDoctors(id?: string) {
  let q = supabaseServer().from("doctors").select(DOCTOR_SELECT);
  if (id) q = q.eq("id", id);
  const { data, error } = await q.order("created_at");
  if (error) console.error("doctors query failed", error);
  const now = Date.now();
  return (data ?? []).map((d) => {
    const clinic = Array.isArray(d.clinics) ? d.clinics[0] : d.clinics;
    const slots: Slot[] = (d.doctor_slots ?? [])
      .filter(
        (s) => s.status === "open" && new Date(s.starts_at).getTime() > now,
      )
      .map((s) => ({ id: s.id, starts_at: s.starts_at }))
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at));
    return { ...d, clinic: clinic ?? null, slots };
  });
}

export type DoctorRow = Awaited<ReturnType<typeof loadDoctors>>[number];

export function seoulYmd(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(
    new Date(iso),
  );
}
