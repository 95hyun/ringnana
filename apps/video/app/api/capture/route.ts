import { handleCaptureSubmit } from "@/lib/capture-store/handlers";
import { createSupabaseCaptureStore } from "@/lib/capture-store/supabase";

// 사진 3장 multipart를 받으므로 Node 런타임 (spec §7.2)
export const runtime = "nodejs";

export async function POST(request: Request) {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "invalid_form_data" }, { status: 400 });
  }
  let store;
  try {
    store = createSupabaseCaptureStore();
  } catch (e) {
    console.error("[api/capture] store init failed", e);
    return Response.json({ error: "internal_error" }, { status: 500 });
  }
  const { status, body } = await handleCaptureSubmit(formData, store);
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}
