import { beforeEach, describe, expect, it, vi } from "vitest";

const { createSupabaseServerClient } = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
}));
vi.mock("@/lib/supabase/server", () => ({ createSupabaseServerClient }));

import { getOwnerContext } from "@/lib/auth/owner";

const USER = { id: "user-1", email: "owner@demo.local" };
const BUSINESS = "11111111-1111-1111-1111-111111111111";

/**
 * Fake the chained query builder used in owner.ts:
 *   from().select().eq().eq().not().limit().maybeSingle()
 * Every method returns the same chain; maybeSingle resolves the seeded result.
 */
function fakeClient(opts: {
  user: { id: string; email: string | null } | null;
  result?: { data: { business_id: string | null } | null; error: unknown };
}) {
  const chain = {
    select: () => chain,
    eq: () => chain,
    not: () => chain,
    limit: () => chain,
    maybeSingle: async () => opts.result ?? { data: null, error: null },
  };
  return {
    auth: { getUser: async () => ({ data: { user: opts.user } }) },
    from: () => chain,
  };
}

beforeEach(() => {
  createSupabaseServerClient.mockReset();
});

describe("getOwnerContext", () => {
  it("returns null when there is no session", async () => {
    createSupabaseServerClient.mockResolvedValue(fakeClient({ user: null }));
    expect(await getOwnerContext()).toBeNull();
  });

  it("returns null when the role query errors", async () => {
    createSupabaseServerClient.mockResolvedValue(
      fakeClient({ user: USER, result: { data: null, error: { message: "denied" } } }),
    );
    expect(await getOwnerContext()).toBeNull();
  });

  it("returns null when the user holds no owner business", async () => {
    createSupabaseServerClient.mockResolvedValue(
      fakeClient({ user: USER, result: { data: null, error: null } }),
    );
    expect(await getOwnerContext()).toBeNull();
  });

  it("resolves the owner context for a valid owner", async () => {
    createSupabaseServerClient.mockResolvedValue(
      fakeClient({ user: USER, result: { data: { business_id: BUSINESS }, error: null } }),
    );
    expect(await getOwnerContext()).toEqual({
      userId: "user-1",
      email: "owner@demo.local",
      businessId: BUSINESS,
    });
  });

  it("defaults email to empty string when the auth user has none", async () => {
    createSupabaseServerClient.mockResolvedValue(
      fakeClient({
        user: { id: "user-1", email: null },
        result: { data: { business_id: BUSINESS }, error: null },
      }),
    );
    const ctx = await getOwnerContext();
    expect(ctx?.email).toBe("");
  });
});
