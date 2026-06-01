"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import type { Locale } from "@/lib/i18n/locales";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type Stage = "email" | "code";

export function LoginForm({ locale }: { locale: Locale }) {
  const t = useTranslations("owner.login");
  const router = useRouter();
  const supabase = createSupabaseBrowserClient();

  const [stage, setStage] = useState<Stage>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function sendCode(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const { error: sendError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: false },
    });
    setPending(false);
    if (sendError) {
      setError(t("error_send"));
      return;
    }
    setStage("code");
  }

  async function verifyCode(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setPending(true);
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token: code.trim(),
      type: "email",
    });
    if (verifyError) {
      setPending(false);
      setError(t("error_invalid"));
      return;
    }
    router.replace(`/${locale}/dashboard/services`);
    router.refresh();
  }

  return (
    <div className="rounded-lg border border-hairline bg-canvas p-xl shadow-soft-1">
      <h1 className="text-title-lg text-ink font-display">{t("title")}</h1>
      <p className="mt-xs text-body-sm text-muted">{t("subtitle")}</p>

      {stage === "email" ? (
        <form onSubmit={sendCode} className="mt-lg flex flex-col gap-sm">
          <label className="flex flex-col gap-xxs">
            <span className="text-caption text-body">{t("email_label")}</span>
            <input
              type="email"
              required
              autoComplete="email"
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("email_placeholder")}
              className="h-10 rounded-md border border-hairline bg-canvas px-sm text-body-sm text-ink placeholder:text-muted-soft"
            />
          </label>
          {error && <p className="text-caption text-error">{error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="mt-xs inline-flex h-10 items-center justify-center rounded-md bg-primary px-lg text-button text-on-primary hover:bg-primary-active disabled:bg-primary-disabled disabled:text-muted transition-colors"
          >
            {pending ? t("sending") : t("send_code")}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="mt-lg flex flex-col gap-sm">
          <p className="text-body-sm text-body">{t("sent_to", { email })}</p>
          <label className="flex flex-col gap-xxs">
            <span className="text-caption text-body">{t("code_label")}</span>
            <input
              inputMode="numeric"
              required
              autoComplete="one-time-code"
              dir="ltr"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={t("code_placeholder")}
              className="h-10 rounded-md border border-hairline bg-canvas px-sm text-body-sm text-ink tracking-widest placeholder:text-muted-soft"
            />
          </label>
          {error && <p className="text-caption text-error">{error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="mt-xs inline-flex h-10 items-center justify-center rounded-md bg-primary px-lg text-button text-on-primary hover:bg-primary-active disabled:bg-primary-disabled disabled:text-muted transition-colors"
          >
            {pending ? t("verifying") : t("verify")}
          </button>
          <button
            type="button"
            onClick={() => {
              setStage("email");
              setCode("");
              setError(null);
            }}
            className="text-caption text-muted hover:text-ink transition-colors"
          >
            {t("use_other_email")}
          </button>
        </form>
      )}
    </div>
  );
}
