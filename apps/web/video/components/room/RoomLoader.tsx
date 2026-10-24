"use client";
import dynamic from "next/dynamic";
import type { RoomQuery } from "@/video/lib/room/query";

// 방 화면은 카메라·localStorage·Realtime 등 브라우저 전용이라 서버에서 그리지 않는다
const RoomClient = dynamic(() => import("./RoomClient").then((m) => m.RoomClient), {
  ssr: false,
  loading: () => <div className="h-dvh bg-neutral-950" />,
});

export function RoomLoader({ query }: { query: RoomQuery }) {
  return <RoomClient query={query} />;
}
