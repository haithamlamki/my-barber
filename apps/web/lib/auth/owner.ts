import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface OwnerContext {
  readonly userId: string;
  readonly email: string;
  readonly businessId: string;
}

/**
 * Resolves the logged-in user's owner context: their auth identity plus the
 * single business they own. Returns null when there is no session or the user
 * holds no `owner` role — callers redirect to login in that case.
 *
 * Relies on RLS: the user can read only their own `user_roles` rows, so this
 * cannot leak another tenant's business id.
 */
export async function getOwnerContext(): Promise<OwnerContext | null> {
  const supabase = await createSupabaseServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("user_roles")
    .select("business_id")
    .eq("user_id", user.id)
    .eq("role", "owner")
    .not("business_id", "is", null)
    .limit(1)
    .maybeSingle();

  if (error || !data?.business_id) return null;

  return { userId: user.id, email: user.email ?? "", businessId: data.business_id };
}
