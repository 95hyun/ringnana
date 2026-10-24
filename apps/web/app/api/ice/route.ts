import { connection } from "next/server";
import type { IceResponse } from "@/video/lib/contracts";
import { config } from "@/video/lib/config";
import { buildIceServers } from "@/video/lib/room/ice";

// spec §7.6 — 환경변수는 요청 때 읽는다 (빌드 때 고정되지 않게)
export async function GET() {
  await connection();
  const body: IceResponse = {
    iceServers: buildIceServers(
      {
        TURN_URLS: process.env.TURN_URLS,
        TURN_USERNAME: process.env.TURN_USERNAME,
        TURN_CREDENTIAL: process.env.TURN_CREDENTIAL,
      },
      config.ice.publicStun,
    ),
  };
  return Response.json(body, { headers: { "Cache-Control": "no-store" } });
}
