import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

export type { Database, Tables, TablesInsert, TablesUpdate } from "./database.types";

let client: SupabaseClient<Database> | undefined;

// 로그인 없음 → 서버에서 service role로만 접근 (RLS 정책 없음, docs/architecture.md)
export function supabaseServer(): SupabaseClient<Database> {
  if (!client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error("NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY が未設定です (apps/web/.env.local)");
    }
    client = createClient<Database>(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client;
}
