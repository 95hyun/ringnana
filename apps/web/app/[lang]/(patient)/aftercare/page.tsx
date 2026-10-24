import { Suspense } from "react";
import Link from "next/link";
import { connection } from "next/server";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { href } from "@/lib/i18n";
import { supabaseServer } from "@/lib/supabase/server";
import { viewerPatientId } from "../quote/_components/viewer";
import { fill, formatDate, parseItems } from "../quote/_components/format";
import { h4Context } from "../quote/_components/i18n";
import { dueDate } from "./_components/checkin";

export default async function AftercarePage() {
  const { t, common } = await h4Context();
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-bold">{t.aftercare.title}</h1>
        <p className="text-sm text-muted-foreground">{t.aftercare.intro}</p>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">{common.states.loading}</p>}>
        <AftercareList />
      </Suspense>
    </div>
  );
}

const STATUS_VARIANT: Record<string, "outline" | "secondary" | "default"> = {
  pending: "outline",
  submitted: "secondary",
  reviewed: "default",
};

async function AftercareList() {
  await connection();
  const { lang, locale, t } = await h4Context();
  const db = supabaseServer();
  const patientId = await viewerPatientId();
  // 환자의 진료 → 견적 → 예약 순으로 따라간다
  const { data: bookings } = await db
    .from("bookings")
    .select("id, visit_dates, created_at, quotes!inner(items, consultations!inner(patient_id)), followups(id, due_day, status)")
    .eq("quotes.consultations.patient_id", patientId)
    .order("created_at", { ascending: false });

  if (!bookings?.length) {
    return (
      <Card>
        <CardContent className="py-6 text-center text-sm text-muted-foreground">{t.aftercare.empty}</CardContent>
      </Card>
    );
  }

  return bookings.map((b) => {
    const items = parseItems(b.quotes.items);
    const title = items.map((i) => i.name_ja ?? i.name).filter(Boolean).join("・") || t.quote.treatmentFallback;
    const visits = [...b.visit_dates].sort();
    const followups = [...b.followups].sort((x, y) => x.due_day - y.due_day);
    return (
      <Card key={b.id}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>
            {fill(t.aftercare.visits, { dates: visits.map((d) => formatDate(locale, d)).join("・") || "—" })}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {followups.map((f) => {
            const due = dueDate(visits, f.due_day);
            const status = (f.status in t.aftercare.status ? f.status : "pending") as keyof typeof t.aftercare.status;
            return (
              <Link
                key={f.id}
                href={href(lang, `/aftercare/${f.id}`)}
                className="flex items-center justify-between rounded-lg border px-3 py-3 transition-colors hover:bg-muted"
              >
                <span>
                  <span className="font-medium">{fill(t.aftercare.dayN, { n: f.due_day })}</span>
                  {due && (
                    <span className="ml-2 text-sm text-muted-foreground">
                      {fill(t.aftercare.around, { date: formatDate(locale, due) })}
                    </span>
                  )}
                </span>
                <Badge variant={STATUS_VARIANT[status]}>{t.aftercare.status[status]}</Badge>
              </Link>
            );
          })}
        </CardContent>
      </Card>
    );
  });
}
