import type { Metadata } from "next";
import { Suspense } from "react";
import { parseRoomQuery, toSearchParams } from "@/video/lib/room/query";
import { RoomLoader } from "@/video/components/room/RoomLoader";
import { InvalidLink } from "@/video/components/room/Notice";

export const metadata: Metadata = { title: "Ringnana ビデオ診察" };

type Props = {
  params: Promise<{ sessionId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

// 방 주소·쿼리는 요청 때만 알 수 있어 Suspense 안에서 읽는다 (cacheComponents)
async function RoomBody({ params, searchParams }: Props) {
  const { sessionId } = await params;
  const query = parseRoomQuery(sessionId, toSearchParams(await searchParams));
  if (!query.ok) return <InvalidLink />;
  return <RoomLoader query={query} />;
}

export default function RoomPage(props: Props) {
  return (
    <Suspense>
      <RoomBody {...props} />
    </Suspense>
  );
}
