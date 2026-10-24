import type { Metadata } from "next";
import { Suspense } from "react";
import { CheckClient } from "@/video/components/check/CheckClient";
import { parseCheckQuery } from "@/video/components/check/query";

export const metadata: Metadata = { title: "Ringnana カメラ・マイクの確認" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

// 주소 값은 요청 때만 알 수 있어 Suspense 안에서 읽는다 (cacheComponents)
async function CheckBody({ searchParams }: { searchParams: SearchParams }) {
  const { lang, returnUrl } = parseCheckQuery(await searchParams);
  return <CheckClient lang={lang} returnUrl={returnUrl} />;
}

export default function CheckPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense>
      <CheckBody searchParams={searchParams} />
    </Suspense>
  );
}
