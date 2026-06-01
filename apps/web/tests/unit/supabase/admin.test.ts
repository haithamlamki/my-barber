import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const URL_KEY = "NEXT_PUBLIC_SUPABASE_URL";
const SERVICE_KEY = "SUPABASE_SERVICE_ROLE_KEY";

describe("createSupabaseAdminClient", () => {
  let savedUrl: string | undefined;
  let savedService: string | undefined;

  beforeEach(() => {
    savedUrl = process.env[URL_KEY];
    savedService = process.env[SERVICE_KEY];
  });

  afterEach(() => {
    restore(URL_KEY, savedUrl);
    restore(SERVICE_KEY, savedService);
  });

  it("builds a client when url and service-role key are configured", () => {
    process.env[URL_KEY] = "https://example.supabase.co";
    process.env[SERVICE_KEY] = "service-role-123";

    const client = createSupabaseAdminClient();

    expect(client).toBeDefined();
    expect(typeof client.from).toBe("function");
  });

  it("throws when the url is missing", () => {
    delete process.env[URL_KEY];
    process.env[SERVICE_KEY] = "service-role-123";

    expect(() => createSupabaseAdminClient()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it("throws when the service-role key is missing", () => {
    process.env[URL_KEY] = "https://example.supabase.co";
    delete process.env[SERVICE_KEY];

    expect(() => createSupabaseAdminClient()).toThrow(/SUPABASE_SERVICE_ROLE_KEY/);
  });
});

function restore(key: string, value: string | undefined): void {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}
