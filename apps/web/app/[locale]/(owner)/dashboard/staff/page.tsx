import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale } from "@/lib/i18n/locales";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOwnerContext } from "@/lib/auth/owner";
import { signedImageUrls } from "@/lib/storage/upload";
import { normalizeServiceScope } from "@/lib/staff/schema";
import { setStaffStatus } from "./actions";

export default async function StaffPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const owner = await getOwnerContext();
  if (!owner) redirect(`/${locale}/login`);

  const supabase = await createSupabaseServerClient();
  const { data: staff } = await supabase
    .from("staff_profiles")
    .select(
      "id, display_name, employment_type, status, image_path, staff_assignments(service_scope_json)",
    )
    .eq("business_id", owner.businessId)
    .order("created_at", { ascending: true });

  const t = await getTranslations("owner.staff");
  const rows = staff ?? [];
  const imageUrls = await signedImageUrls(
    supabase,
    rows.map((m) => m.image_path).filter((p): p is string => Boolean(p)),
  );

  return (
    <section>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-title-lg font-display text-ink">{t("title")}</h1>
          <p className="mt-xxs text-body-sm text-muted">{t("subtitle")}</p>
        </div>
        <a
          href={`/${locale}/dashboard/staff/new`}
          className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-lg text-button text-on-primary hover:bg-primary-active transition-colors"
        >
          {t("add")}
        </a>
      </div>

      {rows.length === 0 ? (
        <p className="mt-xl rounded-lg border border-hairline bg-surface-soft px-lg py-xl text-body-sm text-muted">
          {t("empty")}
        </p>
      ) : (
        <div className="mt-lg overflow-hidden rounded-lg border border-hairline">
          <table className="w-full border-collapse text-start">
            <thead>
              <tr className="border-b border-hairline bg-surface-soft text-start">
                <th className="px-md py-sm text-start text-caption text-muted">{t("col_name")}</th>
                <th className="px-md py-sm text-start text-caption text-muted">{t("col_employment")}</th>
                <th className="px-md py-sm text-start text-caption text-muted">{t("col_services")}</th>
                <th className="px-md py-sm text-start text-caption text-muted">{t("col_status")}</th>
                <th className="px-md py-sm text-end text-caption text-muted">{t("col_actions")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((member) => {
                const isActive = member.status === "active";
                const assignment = member.staff_assignments?.[0];
                const scope = normalizeServiceScope(assignment?.service_scope_json);
                const servicesLabel = scope.all
                  ? t("services_all")
                  : t("services_count", { n: scope.service_ids.length });
                const imageUrl = member.image_path ? imageUrls.get(member.image_path) : null;
                return (
                  <tr key={member.id} className="border-b border-hairline-soft last:border-b-0">
                    <td className="px-md py-sm">
                      <div className="flex items-center gap-sm">
                        {imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={imageUrl}
                            alt=""
                            className="size-9 rounded-full border border-hairline object-cover"
                          />
                        ) : (
                          <div className="size-9 rounded-full bg-surface-soft" />
                        )}
                        <span className="text-body-sm text-ink">{member.display_name}</span>
                      </div>
                    </td>
                    <td className="px-md py-sm text-body-sm text-body">
                      {t(`employment_${member.employment_type}` as "employment_employee")}
                    </td>
                    <td className="px-md py-sm text-body-sm text-body">{servicesLabel}</td>
                    <td className="px-md py-sm">
                      <span
                        className={`inline-flex items-center rounded-pill px-sm py-xxs text-caption ${
                          isActive ? "bg-surface-card text-ink" : "bg-surface-soft text-muted"
                        }`}
                      >
                        {isActive ? t("status_active") : t("status_archived")}
                      </span>
                    </td>
                    <td className="px-md py-sm">
                      <div className="flex items-center justify-end gap-sm">
                        <a
                          href={`/${locale}/dashboard/staff/${member.id}/services`}
                          className="text-caption text-body hover:text-ink transition-colors"
                        >
                          {t("assign_services")}
                        </a>
                        <a
                          href={`/${locale}/dashboard/staff/${member.id}/edit`}
                          className="text-caption text-body hover:text-ink transition-colors"
                        >
                          {t("edit")}
                        </a>
                        <form action={setStaffStatus}>
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="id" value={member.id} />
                          <input
                            type="hidden"
                            name="status"
                            value={isActive ? "archived" : "active"}
                          />
                          <button
                            type="submit"
                            className="text-caption text-muted hover:text-ink transition-colors"
                          >
                            {isActive ? t("archive") : t("restore")}
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
