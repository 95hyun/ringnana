import type { Metadata } from "next";
import { CheckClient } from "@/components/check/CheckClient";
import { parseCheckQuery } from "@/components/check/query";

export const metadata: Metadata = { title: "Ringnana カメラ・マイクの確認" };

export default async function CheckPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { lang, returnUrl } = parseCheckQuery(await searchParams);
  return <CheckClient lang={lang} returnUrl={returnUrl} />;
}
