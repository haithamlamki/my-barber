"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import type { Locale } from "@/lib/i18n/locales";
import type { StaffFormState } from "../../actions";

export interface AssignableService {
  readonly id: string;
  readonly name: string;
}

interface ServiceAssignFormProps {
  readonly locale: Locale;
  readonly cancelHref: string;
  readonly services: readonly AssignableService[];
  readonly action: (state: StaffFormState, formData: FormData) => Promise<StaffFormState>;
  readonly initialAll: boolean;
  readonly initialServiceIds: readonly string[];
}

export function ServiceAssignForm({
  locale,
  cancelHref,
  services,
  action,
  initialAll,
  initialServiceIds,
}: ServiceAssignFormProps) {
  const t = useTranslations("owner.staff.assign");
  const tErr = useTranslations("owner.staff.errors");
  const [state, formAction, pending] = useActionState<StaffFormState, FormData>(action, {
    ok: true,
  });
  const [all, setAll] = useState(initialAll);
  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="flex max-w-lg flex-col gap-md">
      <input type="hidden" name="locale" value={locale} />

      <label className="flex items-center gap-sm text-body-sm text-ink">
        <input
          type="checkbox"
          name="all_services"
          checked={all}
          onChange={(e) => setAll(e.target.checked)}
          className="size-4 accent-primary"
        />
        {t("all_services")}
      </label>

      <fieldset
        className={`flex flex-col gap-xs rounded-lg border border-hairline p-md ${all ? "opacity-50" : ""}`}
      >
        <legend className="px-xs text-caption text-muted">{t("specific_services")}</legend>
        {services.length === 0 ? (
          <p className="text-body-sm text-muted">{t("no_services")}</p>
        ) : (
          services.map((service) => (
            <label key={service.id} className="flex items-center gap-sm text-body-sm text-body">
              <input
                type="checkbox"
                name="service_ids"
                value={service.id}
                disabled={all}
                defaultChecked={initialServiceIds.includes(service.id)}
                className="size-4 accent-primary"
              />
              {service.name}
            </label>
          ))
        )}
      </fieldset>

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
