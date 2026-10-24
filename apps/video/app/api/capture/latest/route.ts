import { handleCaptureLatest } from "@/lib/capture-store/handlers";
import { createSupabaseCaptureStore } from "@/lib/capture-store/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
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
