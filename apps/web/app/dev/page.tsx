import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { DEMO_PATIENT_ID } from "@/lib/demo";
import { supabaseServer } from "@/lib/supabase/server";
import { signedPhotoUrls } from "@/lib/supabase/storage";

// H1 확인용 페이지 — DB 연결·시드·Storage 상태. 데모에서 쓰지 않는다.
const TABLES = [
  "clinics",
  "doctors",
  "patients",
  "intakes",
  "photos",
  "consultations",
  "quotes",
  "bookings",
  "followups",
] as const;

async function DbStatus() {
  await connection();
  const db = supabaseServer();
  const counts = await Promise.all(
    TABLES.map(async (t) => {
      const { count, error } = await db.from(t).select("*", { count: "exact", head: true });
      return { t, count, error: error?.message };
    }),
  );
  const { data: buckets, error: bucketError } = await db.storage.listBuckets();
  const { data: photos, error: photoError } = await db
    .from("photos")
    .select("angle, storage_path")
    .eq("patient_id", DEMO_PATIENT_ID)
    .order("created_at");
  const urls = await signedPhotoUrls((photos ?? []).map((p) => p.storage_path));

  return (
    <>
      <table className="text-sm">
        <tbody>
          {counts.map(({ t, count, error }) => (
            <tr key={t} data-table={t}>
              <td className="pr-6 font-mono">{t}</td>
              <td data-count>{error ? `error: ${error}` : count}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-sm">
        buckets:{" "}
        <span data-buckets>
          {bucketError
            ? `error: ${bucketError.message}`
            : (buckets ?? []).map((b) => `${b.name}(${b.public ? "public" : "private"})`).join(", ")}
        </span>
      </p>
      {photoError && <p className="text-sm text-destructive">photos error: {photoError.message}</p>}
      <div className="flex flex-wrap gap-3">
        {(photos ?? []).map((p, i) =>
          urls[i] ? (
            // eslint-disable-next-line @next/next/no-img-element -- signed URL은 매번 바뀌어 next/image 최적화 대상 아님
            <img key={p.storage_path} src={urls[i]} alt={p.angle} data-signed-photo className="h-40 w-30 rounded border object-cover" />
          ) : null,
        )}
      </div>
    </>
  );
}

export default function DevPage() {
  // service role로 private 사진 URL을 내주므로 배포 빌드에서는 막는다
  if (process.env.NODE_ENV === "production") notFound();
  return (
    <main className="flex flex-col gap-4 p-6">
      <h1 className="text-xl font-bold">/dev — DB 연결 확인</h1>
      <Suspense fallback={<p>loading…</p>}>
        <DbStatus />
      </Suspense>
      <nav className="flex gap-4 text-sm underline">
        <Link href="/dev/patient-shell">환자 셸</Link>
        <Link href="/dev/clinic-shell">의원 셸</Link>
      </nav>
    </main>
  );
}
