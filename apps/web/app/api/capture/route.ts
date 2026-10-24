import { handleCaptureSubmit } from "@/video/lib/capture-store/handlers";
import { createSupabaseCaptureStore } from "@/video/lib/capture-store/supabase";

// 사진 3장 multipart를 받는다 (spec §7.2). 기본 Node 런타임

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
