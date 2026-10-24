import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DEMO_CLINIC_ID } from "@/lib/demo";
import { href } from "@/lib/i18n";
import { patientName, treatmentName } from "@/lib/localize";
import { supabaseServer } from "@/lib/supabase/server";
import { dueDate, parseSymptoms } from "@/app/[lang]/(patient)/aftercare/_components/checkin";
import { formatShortDate, parseItems } from "@/app/[lang]/(patient)/quote/_components/format";
import { h4Context } from "@/app/[lang]/(patient)/quote/_components/i18n";

export default async function ClinicAftercarePage() {
  const { t } = await h4Context();
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold">{t.clinic.title}</h1>
        <p className="text-sm text-muted-foreground">{t.clinic.intro}</p>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">{t.clinic.loading}</p>}>
        <CheckinTable />
      </Suspense>
    </div>
  );
}

async function CheckinTable() {
  await connection();
  const { lang, t, common } = await h4Context();
  const c = t.clinic;
  const { data } = await supabaseServer()
    .from("followups")
    .select(
      "id, due_day, status, alert, symptoms, bookings!inner(clinic_id, visit_dates, quotes!inner(items, consultations!inner(patients!inner(name, name_latin))))",
    )
    .eq("bookings.clinic_id", DEMO_CLINIC_ID)
    .in("status", ["submitted", "reviewed"]);

  // 정렬: 확인 필요 + 이상 보고 → 확인 필요 → 확인 완료
  const rank = (f: { status: string; alert: boolean }) => (f.status === "submitted" ? (f.alert ? 0 : 1) : 2);
  const rows = [...(data ?? [])].sort((a, b) => rank(a) - rank(b));

  if (!rows.length) return <p className="text-sm text-muted-foreground">{c.empty}</p>;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{c.cols.patient}</TableHead>
          <TableHead>{c.cols.treatment}</TableHead>
          <TableHead>{c.cols.checkin}</TableHead>
          <TableHead>{c.cols.symptoms}</TableHead>
          <TableHead>{c.cols.status}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((f) => {
          const due = dueDate(f.bookings.visit_dates, f.due_day);
          const symptoms = parseSymptoms(f.symptoms);
          const items = parseItems(f.bookings.quotes.items);
          const highlight = f.alert && f.status === "submitted";
          const detail = href(lang, `/clinic/aftercare/${f.id}`);
          return (
            <TableRow key={f.id} className={highlight ? "bg-destructive/5" : undefined}>
              <TableCell className="font-medium">
                <Link href={detail} className="hover:underline">
                  {patientName(f.bookings.quotes.consultations.patients)}
                </Link>
              </TableCell>
              <TableCell>{items.map((i) => treatmentName(i, lang, { common })).filter(Boolean).join(", ") || "—"}</TableCell>
              <TableCell>
                D+{f.due_day}
                {due && <span className="ml-1 text-muted-foreground">({formatShortDate(due)})</span>}
              </TableCell>
              <TableCell>
                {symptoms.length ? (
                  <span className="text-destructive">{symptoms.map((s) => c.symptoms[s]).join(", ")}</span>
                ) : (
                  <span className="text-muted-foreground">{c.none}</span>
                )}
              </TableCell>
              <TableCell>
                <Link href={detail}>
                  <Badge variant={highlight ? "destructive" : f.status === "submitted" ? "secondary" : "outline"}>
                    {highlight ? c.alertBadge : f.status === "submitted" ? c.status.submitted : c.status.reviewed}
                  </Badge>
                </Link>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
