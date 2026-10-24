import "server-only";

// BBANANA REST (https://www.bbanana.ai/v1) — 비동기: POST /generations → task, GET /tasks/{id} 폴링.
// 입력 이미지는 공개 https URL만 받는다. 400·401·402·403·404·410·422는 재시도하지 않는다(가이드 규칙).
const BASE = "https://www.bbanana.ai/v1";
const MODEL = "gpt-image-2";

export type CreateResult = { ok: true; taskId: string } | { ok: false; code: string };
export type TaskResult =
  | { status: "pending"; progress: number }
  | { status: "succeeded"; url: string }
  | { status: "failed"; code: string };

export function bbananaConfigured(): boolean {
  return Boolean(process.env.BBANANA_API_KEY);
}

function headers(extra?: Record<string, string>) {
  return { Authorization: `Bearer ${process.env.BBANANA_API_KEY}`, "Content-Type": "application/json", ...extra };
}

const RETRYABLE = new Set([409, 429, 503]);

async function errorCode(res: Response): Promise<string> {
  const body = (await res.json().catch(() => null)) as { error?: { code?: string } } | null;
  return body?.error?.code ?? `http_${res.status}`;
}

export async function createGeneration(input: { prompt: string; imageUrl: string; idempotencyKey: string }): Promise<CreateResult> {
  const body = JSON.stringify({
    model: MODEL,
    prompt: input.prompt,
    input: { image_urls: [input.imageUrl] },
    options: { quality: "medium", resolution: "1K", size: "1:1" },
  });
  // 재시도는 같은 Idempotency-Key로 1회만 — 이중 과금 방지
  for (let attempt = 0; attempt < 2; attempt++) {
    let res: Response;
    try {
      res = await fetch(`${BASE}/generations`, {
        method: "POST",
        headers: headers({ "Idempotency-Key": input.idempotencyKey }),
        body,
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      if (attempt === 0) continue;
      return { ok: false, code: "network_error" };
    }
    if (res.ok) {
      const task = (await res.json().catch(() => null)) as { id?: string } | null;
      return task?.id ? { ok: true, taskId: task.id } : { ok: false, code: "bad_response" };
    }
    if (attempt === 0 && RETRYABLE.has(res.status)) {
      const wait = Math.min(Number(res.headers.get("Retry-After")) || 3, 10);
      await new Promise((r) => setTimeout(r, wait * 1000));
      continue;
    }
    return { ok: false, code: await errorCode(res) };
  }
  return { ok: false, code: "retry_exhausted" };
}

export async function getTask(taskId: string): Promise<TaskResult> {
  let res: Response;
  try {
    res = await fetch(`${BASE}/tasks/${encodeURIComponent(taskId)}`, { headers: headers(), signal: AbortSignal.timeout(10_000), cache: "no-store" });
  } catch {
    return { status: "pending", progress: 0 }; // 일시적 네트워크 오류는 다음 폴링에서 다시 본다
  }
  if (RETRYABLE.has(res.status)) return { status: "pending", progress: 0 };
  if (!res.ok) return { status: "failed", code: await errorCode(res) };
  const task = (await res.json().catch(() => null)) as {
    status: string;
    progress?: number;
    output?: { url: string }[];
    error?: { code?: string } | null;
  } | null;
  if (!task) return { status: "pending", progress: 0 };
  if (task.status === "succeeded" && task.output?.[0]?.url) return { status: "succeeded", url: task.output[0].url };
  if (task.status === "failed" || task.status === "canceled" || task.status === "succeeded") {
    return { status: "failed", code: task.error?.code ?? task.status };
  }
  return { status: "pending", progress: task.progress ?? 0 };
}
