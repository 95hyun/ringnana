import { handleOpinionPreflight, handleOpinionTranslate, type OpinionHandlerResult } from "@/lib/opinion/handler";
import { createSupabaseOpinionStore } from "@/lib/opinion/supabase";
import { getTranslator } from "@/lib/translate";

// Supabase·Anthropic SDK 를 쓰므로 Node 런타임
export const runtime = "nodejs";

const toResponse = (r: OpinionHandlerResult) =>
  r.body === null ? new Response(null, { status: r.status, headers: r.headers }) : Response.json(r.body, { status: r.status, headers: r.headers });

export function OPTIONS(request: Request) {
  return toResponse(handleOpinionPreflight(request.headers.get("origin")));
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  let body: unknown = null;
  try {
    body = await request.json();
  } catch {
    // 잘못된 JSON 은 핸들러에서 400 (CORS 헤더 포함)
  }
  let store;
  try {
    store = createSupabaseOpinionStore();
  } catch (e) {
    console.error("[api/opinion/translate] store init failed", e);
    const { headers } = handleOpinionPreflight(origin);
    return Response.json({ error: "internal_error" }, { status: 500, headers });
  }
  return toResponse(await handleOpinionTranslate(body, origin, store, getTranslator()));
}
