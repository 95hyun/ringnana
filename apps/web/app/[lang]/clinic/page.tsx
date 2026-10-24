import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DEMO_DOCTOR_ID } from "@/lib/demo";
import { getDict, href, isLang, type Lang } from "@/lib/i18n";
import { supabaseServer } from "@/lib/supabase/server";
import { AutoRefresh } from "./_components/auto-refresh";
import { fmt, label, type H3Dict } from "./_components/labels";

const STATUS_ORDER: Record<string, number> = { in_call: 0, requested: 1, scheduled: 2, done: 3 };

async function Queue({ lang, t }: { lang: Lang; t: H3Dict["clinic"] }) {
  await connection();
  const { data, error } = await supabaseServer()
    .from("consultations")
    .select("id, status, scheduled_at, created_at, patients(name, birth_year), intakes(concerns, flags, trip_start, trip_end)")
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
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((c) => (
          <TableRow key={c.id} data-consultation={c.id} data-status={c.status} className={c.status === "done" ? "opacity-60" : undefined}>
            <TableCell>
              <Badge variant={c.status === "requested" ? "default" : c.status === "in_call" ? "destructive" : "secondary"}>
                {label(t.labels.status, c.status)}
              </Badge>
            </TableCell>
            <TableCell className="font-medium">
              <Link href={href(lang, `/clinic/consult/${c.id}`)} className="hover:underline">
                {c.patients?.name ?? "—"}
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
                    <Badge key={f} variant="destructive">
                      {label(t.labels.flags, f)}
                    </Badge>
                  ))
                )}
              </div>
            </TableCell>
            <TableCell className="text-sm">
              {c.intakes?.trip_start ? `${c.intakes.trip_start} ~ ${c.intakes.trip_end ?? ""}` : "—"}
            </TableCell>
            <TableCell className="text-sm text-muted-foreground">
              {new Date(c.created_at).toLocaleString(t.dateLocale, { timeZone: "Asia/Seoul", dateStyle: "short", timeStyle: "short" })}
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
