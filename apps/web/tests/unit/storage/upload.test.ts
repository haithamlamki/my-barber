import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/database.types";
import {
  signedImageUrl,
  signedImageUrls,
  uploadBusinessImage,
} from "@/lib/storage/upload";

type Client = SupabaseClient<Database>;

const BUSINESS = "11111111-1111-1111-1111-111111111111";

/**
 * Minimal hand-rolled fake of the Supabase storage surface used by upload.ts.
 * Records calls so tests can assert the orchestration (path building, error
 * mapping) without a live storage backend.
 */
function fakeStorage(overrides: {
  upload?: () => { error: { message: string } | null };
  createSignedUrl?: () => { data: { signedUrl: string } | null };
  createSignedUrls?: () => { data: Array<{ path: string | null; signedUrl: string | null }> | null };
}) {
  const from = vi.fn(() => ({
    upload: vi.fn(async () => (overrides.upload ?? (() => ({ error: null })))()),
    createSignedUrl: vi.fn(async () =>
      (overrides.createSignedUrl ?? (() => ({ data: null })))(),
    ),
    createSignedUrls: vi.fn(async () =>
      (overrides.createSignedUrls ?? (() => ({ data: [] })))(),
    ),
  }));
  const client = { storage: { from } } as unknown as Client;
  return { client, from };
}

function pngFile(bytes = 10): File {
  return new File([new Uint8Array(bytes)], "x.png", { type: "image/png" });
}

describe("uploadBusinessImage", () => {
  it("returns ok with null path and skips storage when no file is given", async () => {
    const { client, from } = fakeStorage({});
    const result = await uploadBusinessImage(client, BUSINESS, "services", null);

    expect(result).toEqual({ ok: true, path: null });
    expect(from).not.toHaveBeenCalled();
  });

  it("treats an empty file as no upload", async () => {
    const { client, from } = fakeStorage({});
    const empty = new File([], "x.png", { type: "image/png" });

    const result = await uploadBusinessImage(client, BUSINESS, "services", empty);

    expect(result).toEqual({ ok: true, path: null });
    expect(from).not.toHaveBeenCalled();
  });

  it("rejects a disallowed mime type without touching storage", async () => {
    const { client, from } = fakeStorage({});
    const gif = new File([new Uint8Array(10)], "x.gif", { type: "image/gif" });

    const result = await uploadBusinessImage(client, BUSINESS, "services", gif);

    expect(result).toEqual({ ok: false, error: "image_type" });
    expect(from).not.toHaveBeenCalled();
  });

  it("uploads a valid image and returns a business-scoped path", async () => {
    const { client } = fakeStorage({ upload: () => ({ error: null }) });

    const result = await uploadBusinessImage(client, BUSINESS, "staff", pngFile());

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.path).toMatch(
        new RegExp(`^${BUSINESS}/staff/[0-9a-f-]{36}\\.png$`),
      );
    }
  });

  it("maps a storage failure to save_failed", async () => {
    const { client } = fakeStorage({ upload: () => ({ error: { message: "boom" } }) });

    const result = await uploadBusinessImage(client, BUSINESS, "services", pngFile());

    expect(result).toEqual({ ok: false, error: "save_failed" });
  });
});

describe("signedImageUrl", () => {
  it("returns null for a null path without calling storage", async () => {
    const { client, from } = fakeStorage({});
    expect(await signedImageUrl(client, null)).toBeNull();
    expect(from).not.toHaveBeenCalled();
  });

  it("returns the signed url when storage resolves one", async () => {
    const { client } = fakeStorage({
      createSignedUrl: () => ({ data: { signedUrl: "https://signed/x.png" } }),
    });
    expect(await signedImageUrl(client, `${BUSINESS}/staff/a.png`)).toBe(
      "https://signed/x.png",
    );
  });

  it("returns null when storage yields no data", async () => {
    const { client } = fakeStorage({ createSignedUrl: () => ({ data: null }) });
    expect(await signedImageUrl(client, `${BUSINESS}/staff/a.png`)).toBeNull();
  });
});

describe("signedImageUrls", () => {
  it("returns an empty map and skips storage for no paths", async () => {
    const { client, from } = fakeStorage({});
    const map = await signedImageUrls(client, []);
    expect(map.size).toBe(0);
    expect(from).not.toHaveBeenCalled();
  });

  it("returns an empty map when storage yields no data", async () => {
    const { client } = fakeStorage({ createSignedUrls: () => ({ data: null }) });
    const map = await signedImageUrls(client, [`${BUSINESS}/services/a.png`]);
    expect(map.size).toBe(0);
  });

  it("dedupes paths and keys results by path, omitting incomplete entries", async () => {
    const a = `${BUSINESS}/services/a.png`;
    const b = `${BUSINESS}/services/b.png`;
    const { client } = fakeStorage({
      createSignedUrls: () => ({
        data: [
          { path: a, signedUrl: "https://signed/a.png" },
          { path: b, signedUrl: null },
          { path: null, signedUrl: "https://signed/orphan.png" },
        ],
      }),
    });

    const map = await signedImageUrls(client, [a, a, b]);

    expect(map.get(a)).toBe("https://signed/a.png");
    expect(map.has(b)).toBe(false);
    expect(map.size).toBe(1);
  });
});
