import { connection } from "next/server";
import { handleCaptureLatest } from "@/video/lib/capture-store/handlers";
import { createSupabaseCaptureStore } from "@/video/lib/capture-store/supabase";

// 기본이 Node 런타임. 매 요청 새로 읽는다 (cacheComponents 에서는 segment config 대신 connection())
export async function GET(request: Request) {
  await connection();
  const sessionId = new URL(request.url).searchParams.get("sessionId");
  const headers = { "Cache-Control": "no-store" };
  let store;
  try {
    store = createSupabaseCaptureStore();
  } catch (e) {
    console.error("[api/capture/latest] store init failed", e);
    return Response.json({ error: "internal_error" }, { status: 500, headers });
  }
  const { status, body } = await handleCaptureLatest(sessionId, store);
  return Response.json(body, { status, headers });
}
