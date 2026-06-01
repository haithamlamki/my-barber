/**
 * Reads the public Supabase connection settings. These are the only Supabase
 * values safe to expose to the browser. Fails fast if either is missing so a
 * misconfigured deploy never silently falls back to an anonymous client.
 */
export function supabaseBrowserEnv(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not configured");
  if (!anonKey) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured");

  return { url, anonKey };
}
