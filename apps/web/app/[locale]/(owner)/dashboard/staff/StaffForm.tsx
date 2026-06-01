"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import type { Locale } from "@/lib/i18n/locales";
import { EMPLOYMENT_TYPES, STAFF_LANGUAGES } from "@/lib/staff/schema";
import type { StaffFormState } from "./actions";

export interface StaffFormDefaults {
  readonly display_name: string;
  readonly email: string;
  readonly bio_ar: string;
  readonly bio_en: string;
  readonly employment_type: string;
  readonly languages: readonly string[];
}

const EMPTY: StaffFormDefaults = {
  display_name: "",
  email: "",
  bio_ar: "",
  bio_en: "",
  employment_type: "employee",
  languages: ["ar", "en"],
};

interface StaffFormProps {
  readonly locale: Locale;
  readonly cancelHref: string;
  readonly action: (state: StaffFormState, formData: FormData) => Promise<StaffFormState>;
  readonly defaults?: StaffFormDefaults;
  /** Email is set once at creation; the edit form omits it. */
  readonly showEmail?: boolean;
  readonly imageUrl?: string | null;
}

const inputClass =
  "h-10 rounded-md border border-hairline bg-canvas px-sm text-body-sm text-ink placeholder:text-muted-soft";
const textareaClass =
  "rounded-md border border-hairline bg-canvas px-sm py-xs text-body-sm text-ink placeholder:text-muted-soft";
const labelTextClass = "text-caption text-body";

export function StaffForm({
  locale,
  cancelHref,
  action,
  defaults = EMPTY,
  showEmail = false,
  imageUrl = null,
}: StaffFormProps) {
  const t = useTranslations("owner.staff.form");
  const tErr = useTranslations("owner.staff.errors");
  const tEmp = useTranslations("owner.staff");
  const tLang = useTranslations("owner.staff.lang");
  const [state, formAction, pending] = useActionState<StaffFormState, FormData>(action, {
    ok: true,
  });
  const [imagePreview, setImagePreview] = useState<string | null>(imageUrl);

  const errors = state.errors ?? {};

  return (
    <form action={formAction} encType="multipart/form-data" className="flex max-w-lg flex-col gap-md">
      <input type="hidden" name="locale" value={locale} />

      <Field label={t("display_name")} error={errors.display_name && tErr("display_name")}>
        <input name="display_name" defaultValue={defaults.display_name} className={inputClass} />
      </Field>

      {showEmail && (
        <Field label={t("email")} error={errors.email && tErr(errors.email)}>
          <input
            name="email"
            type="email"
            dir="ltr"
            defaultValue={defaults.email}
            placeholder={t("email_placeholder")}
            className={inputClass}
          />
        </Field>
      )}

      <Field label={t("bio_ar")}>
        <textarea name="bio_ar" dir="rtl" rows={2} defaultValue={defaults.bio_ar} className={textareaClass} />
      </Field>

      <Field label={t("bio_en")}>
        <textarea name="bio_en" dir="ltr" rows={2} defaultValue={defaults.bio_en} className={textareaClass} />
      </Field>

      <Field label={t("employment_type")} error={errors.employment_type && tErr("employment_type")}>
        <select
          name="employment_type"
          defaultValue={defaults.employment_type}
          className={`${inputClass} appearance-none`}
        >
          {EMPLOYMENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {tEmp(`employment_${type}`)}
            </option>
          ))}
        </select>
      </Field>

      <fieldset className="flex flex-col gap-xxs">
        <legend className={labelTextClass}>{t("languages")}</legend>
        <div className="flex flex-wrap gap-md">
          {STAFF_LANGUAGES.map((lang) => (
            <label key={lang} className="flex items-center gap-xxs text-body-sm text-body">
              <input
                type="checkbox"
                name="languages"
                value={lang}
                defaultChecked={defaults.languages.includes(lang)}
                className="size-4 accent-primary"
              />
              {tLang(lang)}
            </label>
          ))}
        </div>
        {errors.languages && <span className="text-caption text-error">{tErr("languages")}</span>}
      </fieldset>

      <Field label={t("image")} error={errors.image && tErr(errors.image)}>
        {imagePreview && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imagePreview}
            alt=""
            className="size-16 rounded-full border border-hairline object-cover"
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
