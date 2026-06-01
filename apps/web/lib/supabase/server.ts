import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { Database } from "@/lib/db/database.types";
import { supabaseBrowserEnv } from "./env";

/**
 * Server-side Supabase client bound to the request cookies. Use in Server
 * Components, Server Actions, and Route Handlers. RLS still applies — this runs
 * as the logged-in user, never as the service role.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = supabaseBrowserEnv();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        // Server Components cannot set cookies; the middleware refreshes the
        // session instead, so swallowing this write is the documented pattern.
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // No-op: called from a Server Component render.
        }
      },
    },
  });
}
