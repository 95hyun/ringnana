import type { Metadata } from "next";
import { parseRoomQuery, toSearchParams } from "@/lib/room/query";
import { RoomLoader } from "@/components/room/RoomLoader";
import { InvalidLink } from "@/components/room/Notice";

export const metadata: Metadata = { title: "Ringnana ビデオ診察" };

export default async function RoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { sessionId } = await params;
  const query = parseRoomQuery(sessionId, toSearchParams(await searchParams));
  if (!query.ok) return <InvalidLink />;
  return <RoomLoader query={query} />;
}
