import { getTranslator } from "@/video/lib/translate";
import { handleTranslate } from "@/video/lib/translate/handle-translate";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }
  const result = await handleTranslate(body, getTranslator());
  return Response.json(result.body, { status: result.status });
}
