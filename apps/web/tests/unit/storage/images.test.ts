import { describe, it, expect } from "vitest";
import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  buildImagePath,
  validateImage,
} from "@/lib/storage/images";

describe("validateImage", () => {
  it("accepts jpeg/png/webp under the size limit", () => {
    expect(validateImage({ type: "image/jpeg", size: 1000 })).toEqual({ ok: true, ext: "jpg" });
    expect(validateImage({ type: "image/png", size: 1000 })).toEqual({ ok: true, ext: "png" });
    expect(validateImage({ type: "image/webp", size: 1000 })).toEqual({ ok: true, ext: "webp" });
  });

  it("rejects unsupported types", () => {
    expect(validateImage({ type: "image/gif", size: 1000 })).toEqual({
      ok: false,
      error: "image_type",
    });
    expect(validateImage({ type: "application/pdf", size: 1000 })).toEqual({
      ok: false,
      error: "image_type",
    });
  });

  it("rejects files over the 2MB limit", () => {
    expect(validateImage({ type: "image/png", size: MAX_IMAGE_BYTES + 1 })).toEqual({
      ok: false,
      error: "image_size",
    });
  });

  it("accepts a file exactly at the size limit", () => {
    expect(validateImage({ type: "image/png", size: MAX_IMAGE_BYTES })).toEqual({
      ok: true,
      ext: "png",
    });
  });

  it("rejects an empty file", () => {
    expect(validateImage({ type: "image/png", size: 0 })).toEqual({
      ok: false,
      error: "image_type",
    });
  });

  it("exposes the allowed types and limit", () => {
    expect(ALLOWED_IMAGE_TYPES).toEqual(["image/jpeg", "image/png", "image/webp"]);
    expect(MAX_IMAGE_BYTES).toBe(2 * 1024 * 1024);
  });
});

describe("buildImagePath", () => {
  it("scopes the path by business id then kind", () => {
    expect(buildImagePath("biz-1", "services", "abc", "jpg")).toBe("biz-1/services/abc.jpg");
    expect(buildImagePath("biz-1", "staff", "def", "webp")).toBe("biz-1/staff/def.webp");
  });
});
