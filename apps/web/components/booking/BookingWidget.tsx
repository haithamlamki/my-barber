"use client";

import { useActionState, useState } from "react";
import { useTranslations } from "next-intl";
import type { Locale } from "@/lib/i18n/locales";
import { formatBookingDate, formatBookingTime } from "@/lib/i18n/datetime";
import {
  createBooking,
  getSlots,
  type BookingFormState,
  type SlotView,
} from "@/app/[locale]/book/actions";

interface BookingWidgetProps {
  readonly locale: Locale;
  readonly serviceId: string;
  readonly staffProfileId: string;
  readonly bookableDates: readonly string[];
}

const INITIAL_STATE: BookingFormState = { ok: false };

export function BookingWidget({
  locale,
  serviceId,
  staffProfileId,
  bookableDates,
}: BookingWidgetProps) {
  const t = useTranslations("booking");
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [slots, setSlots] = useState<readonly SlotView[] | null>(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedSlotIso, setSelectedSlotIso] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState(createBooking, INITIAL_STATE);

  async function selectDate(date: string) {
    setSelectedDate(date);
    setSelectedSlotIso(null);
    setSlots(null);
    setLoadingSlots(true);
    const result = await getSlots(serviceId, staffProfileId, date);
    setLoadingSlots(false);
    setSlots(result.ok ? result.slots : []);
  }

  const errors = state.errors ?? {};
  const nameError = errors.customer_name ? t("errors.name") : undefined;
  const phoneError = errors.customer_phone ? t("errors.phone") : undefined;
  const emailError = errors.customer_email ? t("errors.email") : undefined;
  const formError = errors._form ? t(`errors.${errors._form}`) : undefined;

  return (
    <div className="flex flex-col gap-xl">
      <section>
        <h2 className="text-body-md text-ink">{t("choose_date")}</h2>
        <div className="mt-sm flex gap-xs overflow-x-auto pb-xs">
          {bookableDates.map((date) => {
            const active = date === selectedDate;
            return (
              <button
                key={date}
                type="button"
                onClick={() => selectDate(date)}
                aria-pressed={active}
                className={`shrink-0 rounded-md border px-md py-sm text-caption transition-colors ${
                  active
                    ? "border-primary bg-primary text-on-primary"
                    : "border-hairline bg-canvas text-ink hover:border-ink"
                }`}
              >
                {formatBookingDate(date, locale)}
              </button>
            );
          })}
        </div>
      </section>

      {selectedDate ? (
        <section>
          <h2 className="text-body-md text-ink">{t("choose_time")}</h2>
          {loadingSlots ? (
            <p className="mt-sm text-body-sm text-muted">{t("loading_slots")}</p>
          ) : slots && slots.length > 0 ? (
            <div className="mt-sm grid grid-cols-3 gap-xs sm:grid-cols-4">
              {slots.map((slot) => {
                const active = slot.startsAtIso === selectedSlotIso;
                return (
                  <button
                    key={slot.startsAtIso}
                    type="button"
                    onClick={() => setSelectedSlotIso(slot.startsAtIso)}
                    aria-pressed={active}
                    className={`rounded-md border py-sm text-center text-caption transition-colors ${
                      active
                        ? "border-primary bg-primary text-on-primary"
                        : "border-hairline bg-canvas text-ink hover:border-ink"
                    }`}
                  >
                    {formatBookingTime(slot.startsAtIso, locale)}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="mt-sm rounded-md border border-hairline bg-surface-soft px-md py-md text-body-sm text-muted">
              {t("no_slots")}
            </p>
          )}
        </section>
      ) : null}

      {selectedSlotIso ? (
        <form action={formAction} className="flex flex-col gap-sm">
          <h2 className="text-body-md text-ink">{t("details_title")}</h2>
          <input type="hidden" name="service_id" value={serviceId} />
          <input type="hidden" name="staff_profile_id" value={staffProfileId} />
          <input type="hidden" name="starts_at" value={selectedSlotIso} />
          <input type="hidden" name="locale" value={locale} />

          <label className="flex flex-col gap-xxs">
            <span className="text-caption text-body">{t("name_label")}</span>
            <input
              name="customer_name"
              required
              autoComplete="name"
              placeholder={t("name_placeholder")}
              className="h-10 rounded-md border border-hairline bg-canvas px-sm text-body-sm text-ink placeholder:text-muted-soft"
            />
            {nameError ? <span className="text-caption text-error">{nameError}</span> : null}
          </label>

          <label className="flex flex-col gap-xxs">
            <span className="text-caption text-body">{t("phone_label")}</span>
            <input
              name="customer_phone"
              required
              inputMode="numeric"
              autoComplete="tel"
              dir="ltr"
              placeholder={t("phone_placeholder")}
              className="h-10 rounded-md border border-hairline bg-canvas px-sm text-body-sm text-ink placeholder:text-muted-soft"
            />
            {phoneError ? <span className="text-caption text-error">{phoneError}</span> : null}
          </label>

          <label className="flex flex-col gap-xxs">
            <span className="text-caption text-body">{t("email_label")}</span>
            <input
              name="customer_email"
              type="email"
              autoComplete="email"
              dir="ltr"
              placeholder={t("email_placeholder")}
              className="h-10 rounded-md border border-hairline bg-canvas px-sm text-body-sm text-ink placeholder:text-muted-soft"
            />
            {emailError ? <span className="text-caption text-error">{emailError}</span> : null}
          </label>

          {formError ? <p className="text-caption text-error">{formError}</p> : null}

          <button
            type="submit"
            disabled={pending}
            className="mt-xs inline-flex h-10 items-center justify-center rounded-md bg-primary px-lg text-button text-on-primary transition-colors hover:bg-primary-active disabled:bg-primary-disabled disabled:text-muted"
          >
            {pending ? t("confirming") : t("confirm")}
          </button>
        </form>
      ) : null}
    </div>
  );
}
