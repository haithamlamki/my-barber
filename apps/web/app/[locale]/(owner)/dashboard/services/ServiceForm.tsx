"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import type { Locale } from "@/lib/i18n/locales";
import { formatOMR } from "@/lib/i18n/money";
import { TAX_CODES } from "@/lib/services/schema";
import type { ServiceFormState } from "./actions";

export interface ServiceFormDefaults {
  readonly name_ar: string;
  readonly name_en: string;
  readonly duration_min: number;
  readonly buffer_before_min: number;
  readonly buffer_after_min: number;
  readonly price_minor: number;
  readonly tax_code: string;
}

const EMPTY: ServiceFormDefaults = {
  name_ar: "",
  name_en: "",
  duration_min: 30,
  buffer_before_min: 0,
  buffer_after_min: 0,
  price_minor: 0,
  tax_code: "OMR_VAT_STANDARD",
};

interface ServiceFormProps {
  readonly locale: Locale;
  readonly cancelHref: string;
  readonly action: (state: ServiceFormState, formData: FormData) => Promise<ServiceFormState>;
  readonly defaults?: ServiceFormDefaults;
  readonly imageUrl?: string | null;
}

const inputClass =
  "h-10 rounded-md border border-hairline bg-canvas px-sm text-body-sm text-ink placeholder:text-muted-soft";
const labelTextClass = "text-caption text-body";

export function ServiceForm({
  locale,
  cancelHref,
  action,
  defaults = EMPTY,
  imageUrl = null,
}: ServiceFormProps) {
  const t = useTranslations("owner.services.form");
  const tErr = useTranslations("owner.services.errors");
  const tTax = useTranslations("owner.services");
  const [state, formAction, pending] = useActionState<ServiceFormState, FormData>(action, {
    ok: true,
  });
  const [priceMinor, setPriceMinor] = useState(String(defaults.price_minor));
  const [imagePreview, setImagePreview] = useState<string | null>(imageUrl);

  const errors = state.errors ?? {};
  const pricePreview = formatOMR(Number.parseInt(priceMinor || "0", 10) || 0, locale);

  return (
    <form action={formAction} encType="multipart/form-data" className="flex max-w-lg flex-col gap-md">
      <input type="hidden" name="locale" value={locale} />

      <Field label={t("name_ar")} error={errors.name_ar && tErr("name_ar")}>
        <input name="name_ar" dir="rtl" defaultValue={defaults.name_ar} className={inputClass} />
      </Field>

      <Field label={t("name_en")} error={errors.name_en && tErr("name_en")}>
        <input name="name_en" dir="ltr" defaultValue={defaults.name_en} className={inputClass} />
      </Field>

      <Field label={t("duration_min")} error={errors.duration_min && tErr("duration_min")}>
        <input
          name="duration_min"
          inputMode="numeric"
          dir="ltr"
          defaultValue={String(defaults.duration_min)}
          className={inputClass}
        />
      </Field>

      <div className="grid grid-cols-2 gap-md">
        <Field
          label={t("buffer_before_min")}
          error={errors.buffer_before_min && tErr("buffer_before_min")}
        >
          <input
            name="buffer_before_min"
            inputMode="numeric"
            dir="ltr"
            defaultValue={String(defaults.buffer_before_min)}
            className={inputClass}
          />
        </Field>
        <Field
          label={t("buffer_after_min")}
          error={errors.buffer_after_min && tErr("buffer_after_min")}
        >
          <input
            name="buffer_after_min"
            inputMode="numeric"
            dir="ltr"
            defaultValue={String(defaults.buffer_after_min)}
            className={inputClass}
          />
        </Field>
      </div>

      <Field label={t("price_minor")} error={errors.price_minor && tErr("price_minor")}>
        <input
          name="price_minor"
          inputMode="numeric"
          dir="ltr"
          value={priceMinor}
          onChange={(e) => setPriceMinor(e.target.value)}
          className={inputClass}
        />
        <span className="text-caption text-muted">{t("price_hint", { preview: pricePreview })}</span>
      </Field>

      <Field label={t("tax_code")} error={errors.tax_code && tErr("tax_code")}>
        <select
          name="tax_code"
          defaultValue={defaults.tax_code}
          className={`${inputClass} appearance-none`}
        >
          {TAX_CODES.map((code) => (
            <option key={code} value={code}>
              {tTax(`tax_${code}`)}
            </option>
          ))}
        </select>
      </Field>

      <Field label={t("image")} error={errors.image && tErr(errors.image as "image_type")}>
        {imagePreview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imagePreview}
            alt=""
            className="size-16 rounded-md border border-hairline object-cover"
          />
        )}
        <input
          type="file"
          name="image"
          accept="image/jpeg,image/png,image/webp"
          onChange={(e) => {
            const file = e.target.files?.[0];
            setImagePreview(file ? URL.createObjectURL(file) : imageUrl);
          }}
          className="text-body-sm text-body file:me-sm file:rounded-md file:border file:border-hairline file:bg-surface-soft file:px-sm file:py-xxs file:text-caption file:text-body"
        />
        <span className="text-caption text-muted">{t("image_hint")}</span>
      </Field>

      {errors._form && <p className="text-caption text-error">{tErr("save_failed")}</p>}

      <div className="mt-xs flex items-center gap-sm">
        <button
          type="submit"
          disabled={pending}
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-lg text-button text-on-primary hover:bg-primary-active disabled:bg-primary-disabled disabled:text-muted transition-colors"
        >
          {pending ? t("saving") : t("save")}
        </button>
        <a
          href={cancelHref}
          className="inline-flex h-10 items-center justify-center rounded-md border border-hairline px-lg text-button text-body hover:bg-surface-soft transition-colors"
        >
          {t("cancel")}
        </a>
      </div>
    </form>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string | false;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-xxs">
      <span className={labelTextClass}>{label}</span>
      {children}
      {error && <span className="text-caption text-error">{error}</span>}
    </label>
  );
}
