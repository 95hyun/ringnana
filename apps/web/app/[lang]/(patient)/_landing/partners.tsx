import { localized } from "@/lib/localize";
import type { Lang } from "@/lib/i18n";
import { supabaseServer } from "@/lib/supabase/server";

// 전문의 배지는 DB specialty가 피부과일 때만 — 자격을 과장 표기하지 않는다
const DERM = /피부과|皮膚科|dermatolog/i;

type T = { partnersTitle: string; partnersLead: string; doctorBadge: string };

// 랜딩 제휴 의원·전문의 카드 (ux-review B3). 데이터는 시드의 가상 의원·의사
export async function Partners({ lang, t }: { lang: Lang; t: T }) {
  const { data: clinics, error } = await supabaseServer()
    .from("clinics")
    .select("id, name, name_ja, doctors(id, name, name_ja, specialty)")
    .order("created_at")
    .limit(2);
  if (error) console.error("landing partners query failed", error);
  if (!clinics?.length) return null;

  return (
    <section className="flex flex-col gap-3" data-testid="landing-partners">
      <div className="flex flex-col gap-0.5">
        <h2 className="font-bold">{t.partnersTitle}</h2>
        <p className="text-sm text-muted-foreground">{t.partnersLead}</p>
      </div>
      {clinics.map((c) => (
        <div key={c.id} className="flex flex-col gap-3 rounded-xl border bg-card p-4">
          {/* 주소는 일본어 컬럼이 없어 표시하지 않는다(환자 화면 언어 혼재 방지) */}
          <span className="font-medium">{localized(c, lang)}</span>
          <ul className="flex flex-col gap-2">
            {c.doctors.map((d) => {
              const name = localized(d, lang) ?? "";
              return (
                <li key={d.id} className="flex items-center gap-3">
                  <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 font-bold text-primary">
                    {name.slice(0, 1)}
                  </span>
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{name}</span>
                    {DERM.test(d.specialty ?? "") && (
                      <span className="w-fit rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">{t.doctorBadge}</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}
