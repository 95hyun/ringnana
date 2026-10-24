import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DEMO_DOCTOR_ID } from "@/lib/demo";
import { getDict, href, isLang, type Lang } from "@/lib/i18n";
import { patientName } from "@/lib/localize";
import { formatDateTime } from "@/lib/format";
import { CLINIC_TIME_ZONE } from "@/lib/market";
import { supabaseServer } from "@/lib/supabase/server";
import { AutoRefresh } from "./_components/auto-refresh";
import { FlagChip } from "./_components/flag-chip";
import { fmt, label, type H3Dict } from "./_components/labels";

const STATUS_ORDER: Record<string, number> = { in_call: 0, requested: 1, scheduled: 2, done: 3 };

async function Queue({ lang, t }: { lang: Lang; t: H3Dict["clinic"] }) {
  await connection();
  const { data, error } = await supabaseServer()
    .from("consultations")
    .select("id, status, scheduled_at, created_at, patients(name, name_latin, birth_year), intakes(concerns, flags, trip_start, trip_end)")
    // 담당 의사 미배정(H2가 막 만든 요청)도 데모 의사의 큐에 보인다
    .or(`doctor_id.eq.${DEMO_DOCTOR_ID},doctor_id.is.null`)
    .order("created_at", { ascending: false });

  const q = t.queue;
  if (error) return <p className="text-sm text-destructive">{q.loadError} {error.message}</p>;

  const rows = [...(data ?? [])].sort((a, b) => (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9));
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">{q.empty}</p>;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{q.cols.status}</TableHead>
          <TableHead>{q.cols.patient}</TableHead>
          <TableHead>{q.cols.concerns}</TableHead>
          <TableHead>{q.cols.flags}</TableHead>
          <TableHead>{q.cols.trip}</TableHead>
          <TableHead>{q.cols.requestedAt}</TableHead>
          <TableHead className="w-8" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((c) => (
          // 행 전체가 링크 — 환자명 Link의 after 오버레이가 행을 덮는다
          <TableRow key={c.id} data-consultation={c.id} data-status={c.status} className={`group relative cursor-pointer ${c.status === "done" ? "opacity-60" : ""}`}>
            <TableCell>
              <Badge variant={c.status === "requested" ? "default" : c.status === "in_call" ? "hold" : "outline"}>
                {label(t.labels.status, c.status)}
              </Badge>
            </TableCell>
            <TableCell className="font-medium">
              <Link href={href(lang, `/clinic/consult/${c.id}`)} className="after:absolute after:inset-0 group-hover:underline">
                {patientName(c.patients)}
              </Link>
              {c.patients?.birth_year ? (
                <span className="ml-1 text-xs text-muted-foreground">({fmt(q.age, { n: new Date().getFullYear() - c.patients.birth_year })})</span>
              ) : null}
            </TableCell>
            <TableCell>{(c.intakes?.concerns ?? []).map((k) => label(t.labels.concerns, k)).join(", ") || "—"}</TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                {(c.intakes?.flags ?? []).length === 0 ? (
                  <span className="text-muted-foreground">{q.none}</span>
                ) : (
                  c.intakes!.flags.map((f) => (
                    <FlagChip key={f} flag={f}>
                      {label(t.labels.flags, f)}
                    </FlagChip>
                  ))
                )}
              </div>
            </TableCell>
            <TableCell className="text-sm">
              {c.intakes?.trip_start ? `${c.intakes.trip_start} ~ ${c.intakes.trip_end ?? ""}` : "—"}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {formatDateTime(c.created_at, lang, CLINIC_TIME_ZONE)}
            </TableCell>
            <TableCell className="w-8 text-muted-foreground">
              <ChevronRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" aria-hidden />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default async function ClinicQueuePage({ params }: PageProps<"/[lang]/clinic">) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  const t = (await getDict(lang)).h3.clinic;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">{t.queue.title}</h1>
        <span className="text-xs text-muted-foreground">{t.queue.autoRefresh}</span>
      </div>
      <AutoRefresh />
      <Suspense fallback={<p className="text-sm text-muted-foreground">{t.loading}</p>}>
        <Queue lang={lang} t={t} />
      </Suspense>
    </div>
  );
}
