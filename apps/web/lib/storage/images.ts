/**
 * Pure validation + path helpers for business media (service photos, barber
 * avatars). Stored in a private, business-scoped Supabase Storage bucket; the
 * first path segment is always the owning business id so storage RLS can scope
 * reads/writes per tenant.
 */

export const BUSINESS_MEDIA_BUCKET = "business-media";

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

export const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB

export type ImageKind = "services" | "staff";

const EXTENSION_BY_TYPE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export type ImageValidation =
  | { readonly ok: true; readonly ext: string }
  | { readonly ok: false; readonly error: "image_type" | "image_size" };

/** Validates an uploaded image by MIME type and size. Empty files are rejected. */
export function validateImage(file: { type: string; size: number }): ImageValidation {
  const ext = EXTENSION_BY_TYPE[file.type];
  if (!ext || file.size <= 0) return { ok: false, error: "image_type" };
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, error: "image_size" };
  return { ok: true, ext };
}

/** Builds a tenant-scoped object path: `{businessId}/{kind}/{id}.{ext}`. */
export function buildImagePath(
  businessId: string,
  kind: ImageKind,
  id: string,
  ext: string,
): string {
  return `${businessId}/${kind}/${id}.${ext}`;
}
