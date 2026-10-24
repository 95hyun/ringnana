import { config } from "@/lib/config";
import type { OpinionTranslateResponse } from "@/lib/contracts";
import { TranslationError, type Translator } from "@/lib/translate/types";
import type { OpinionStore } from "./types";

export type OpinionHandlerOptions = {
  /** 허용 출처 목록. 기본값은 환경변수 ALLOWED_PLATFORM_ORIGINS. */
  allowedOrigins?: readonly string[];
  timeoutMs?: number;
};

export type OpinionHandlerResult = {
  status: 200 | 204 | 400 | 404 | 409 | 500;
  body: OpinionTranslateResponse | { error: string } | null;
  headers: Record<string, string>;
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function parseAllowedOrigins(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/** 허용된 출처면 CORS 헤더, 아니면 빈 객체. 정확히 일치할 때만 허용한다. */
function corsHeaders(origin: string | null, opts: OpinionHandlerOptions): Record<string, string> {
  const allowed = opts.allowedOrigins ?? parseAllowedOrigins(process.env.ALLOWED_PLATFORM_ORIGINS);
  const headers: Record<string, string> = { Vary: "Origin", "Cache-Control": "no-store" };
  if (origin && allowed.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Methods"] = "POST, OPTIONS";
    headers["Access-Control-Allow-Headers"] = "Content-Type";
    headers["Access-Control-Max-Age"] = "600";
  }
  return headers;
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new TranslationError("timeout", `소견 번역 ${ms}ms 초과`)), ms);
  });
  return Promise.race([p, timeout]).finally(() => clearTimeout(timer));
}

/** OPTIONS 사전 요청 (spec §7.5) */
export function handleOpinionPreflight(origin: string | null, opts: OpinionHandlerOptions = {}): OpinionHandlerResult {
  return { status: 204, body: null, headers: corsHeaders(origin, opts) };
}

/** POST /api/opinion/translate 본문 처리 (spec §7.5). 원문이 그대로일 때만 결과를 쓴다. */
export async function handleOpinionTranslate(
  body: unknown,
  origin: string | null,
  store: OpinionStore,
  translator: Translator,
  opts: OpinionHandlerOptions = {},
): Promise<OpinionHandlerResult> {
  const headers = corsHeaders(origin, opts);
  const reply = (status: OpinionHandlerResult["status"], b: OpinionHandlerResult["body"]) => ({ status, body: b, headers });

  const consultationId =
    typeof body === "object" && body !== null ? (body as Record<string, unknown>).consultationId : undefined;
  if (typeof consultationId !== "string" || !UUID_RE.test(consultationId)) {
    return reply(400, { error: "invalid_consultation_id" });
  }

  try {
    const row = await store.readNotes(consultationId);
    if (!row) return reply(404, { error: "consultation_not_found" });
    const source = row.notes;
    if (source === null || !source.trim()) return reply(409, { error: "notes_empty" });

    await store.markPending(consultationId);

    let notesJa: string | null = null;
    try {
      // SDK 시간 제한과 별개로 번역기 종류와 무관하게 상한을 보장한다
      const out = await withTimeout(translator.translateOpinion(source), opts.timeoutMs ?? config.opinion.timeoutMs);
      if (typeof out === "string" && out.trim()) notesJa = out;
    } catch (err) {
      console.warn("[opinion/translate] 번역 실패:", err instanceof Error ? err.message : err);
    }

    // 0행 갱신 = 그 사이 소견이 바뀜 → stale, 상태는 pending 으로 남긴다
    const written =
      notesJa !== null
        ? await store.writeDoneIfSource(consultationId, source, notesJa)
        : await store.markFailedIfSource(consultationId, source);
    if (!written) return reply(200, { status: "stale" });
    return reply(200, { status: notesJa !== null ? "done" : "failed" });
  } catch (err) {
    console.error("[opinion/translate] DB 오류:", err);
    return reply(500, { error: "database_error" });
  }
}
