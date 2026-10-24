import { notFound, redirect } from "next/navigation";
import { lang as rootLang } from "next/root-params";
import { Suspense } from "react";
import { getDict, href, isLang, type Lang } from "@/lib/i18n";
import { currentPatientId } from "../login/_lib/session";
import { latestDraftId } from "../reservations/_lib/booking";

// flow-v2: 사진(셀카·AI 목표 이미지)은 문진 안의 선택 카드로 흡수. 옛 경로는 최신 draft 진료 문진으로, 없으면 의사 찾기로
async function Forward({ lang }: { lang: Lang }) {
  const patientId = await currentPatientId();
  const draft = patientId ? await latestDraftId(patientId) : null;
  redirect(href(lang, draft ? `/consult/${draft}/intake` : "/doctors"));
  return null;
}

export default async function PhotosPage() {
  // params는 Suspense 밖에서 읽으면 Cache Components 프리렌더 오류 — 언어는 root param으로
  const lang = await rootLang();
  if (!isLang(lang)) notFound();
  const dict = await getDict(lang);
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">{dict.common.states.loading}</p>}>
      <Forward lang={lang} />
    </Suspense>
  );
}
