import "server-only";
import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/db/database.types";
import { BUSINESS_MEDIA_BUCKET, buildImagePath, validateImage, type ImageKind } from "./images";

type Client = SupabaseClient<Database>;

export type UploadResult =
  | { readonly ok: true; readonly path: string | null }
  | { readonly ok: false; readonly error: "image_type" | "image_size" | "save_failed" };

/**
 * Validates and uploads an optional image from form data into the tenant's
 * private media folder. Returns `{ ok: true, path: null }` when no file was
 * provided so callers can leave the row's image untouched. RLS on
 * storage.objects rejects writes outside the owner's business folder.
 */
export async function uploadBusinessImage(
  supabase: Client,
  businessId: string,
  kind: ImageKind,
  file: FormDataEntryValue | null,
): Promise<UploadResult> {
  if (!(file instanceof File) || file.size === 0) return { ok: true, path: null };

  const validation = validateImage({ type: file.type, size: file.size });
  if (!validation.ok) return { ok: false, error: validation.error };

  const path = buildImagePath(businessId, kind, randomUUID(), validation.ext);
  const { error } = await supabase.storage
    .from(BUSINESS_MEDIA_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) return { ok: false, error: "save_failed" };

  return { ok: true, path };
}

/** Creates a short-lived signed URL for one private object, or null. */
export async function signedImageUrl(supabase: Client, path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data } = await supabase.storage
    .from(BUSINESS_MEDIA_BUCKET)
    .createSignedUrl(path, 3600);
  return data?.signedUrl ?? null;
}

/** Batch-signs many private object paths, keyed by path. Missing/failed paths are omitted. */
export async function signedImageUrls(
  supabase: Client,
  paths: readonly string[],
): Promise<Map<string, string>> {
  const unique = [...new Set(paths.filter((p): p is string => Boolean(p)))];
  if (unique.length === 0) return new Map();

  const { data } = await supabase.storage
    .from(BUSINESS_MEDIA_BUCKET)
    .createSignedUrls(unique, 3600);

  const map = new Map<string, string>();
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) map.set(item.path, item.signedUrl);
  }
  return map;
}
