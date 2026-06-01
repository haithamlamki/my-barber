import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { supabaseBrowserEnv } from "@/lib/supabase/env";

const URL_KEY = "NEXT_PUBLIC_SUPABASE_URL";
const ANON_KEY = "NEXT_PUBLIC_SUPABASE_ANON_KEY";

describe("supabaseBrowserEnv", () => {
  let savedUrl: string | undefined;
  let savedAnon: string | undefined;

  beforeEach(() => {
    savedUrl = process.env[URL_KEY];
    savedAnon = process.env[ANON_KEY];
  });

  afterEach(() => {
    restore(URL_KEY, savedUrl);
    restore(ANON_KEY, savedAnon);
  });

  it("returns url and anonKey when both are configured", () => {
    process.env[URL_KEY] = "https://example.supabase.co";
    process.env[ANON_KEY] = "anon-123";

    expect(supabaseBrowserEnv()).toEqual({
      url: "https://example.supabase.co",
      anonKey: "anon-123",
    });
  });

  it("throws when the url is missing", () => {
    delete process.env[URL_KEY];
    process.env[ANON_KEY] = "anon-123";

    expect(() => supabaseBrowserEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it("throws when the anon key is missing", () => {
    process.env[URL_KEY] = "https://example.supabase.co";
    delete process.env[ANON_KEY];

    expect(() => supabaseBrowserEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_ANON_KEY/);
  });
});

function restore(key: string, value: string | undefined): void {
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}
