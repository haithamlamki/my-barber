import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/db/database.types";
import { supabaseBrowserEnv } from "./env";

/** Browser-side Supabase client for Client Components (login, interactive forms). */
export function createSupabaseBrowserClient() {
  const { url, anonKey } = supabaseBrowserEnv();
  return createBrowserClient<Database>(url, anonKey);
}
