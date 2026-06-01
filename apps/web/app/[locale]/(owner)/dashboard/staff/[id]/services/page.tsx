import { notFound, redirect } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isLocale } from "@/lib/i18n/locales";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getOwnerContext } from "@/lib/auth/owner";
import { normalizeServiceScope } from "@/lib/staff/schema";
import { updateStaffServices } from "../../actions";
import { ServiceAssignForm, type AssignableService } from "./ServiceAssignForm";

export default async function AssignServicesPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  if (!isLocale(locale)) notFound();
  setRequestLocale(locale);

  const owner = await getOwnerContext();
  if (!owner) redirect(`/${locale}/login`);

  const supabase = await createSupabaseServerClient();
  const { data: member } = await supabase
    .from("staff_profiles")
    .select("id, display_name, staff_assignments(service_scope_json)")
    .eq("id", id)
    .maybeSingle();
  if (!member) notFound();

  const { data: services } = await supabase
    .from("services")
    .select("id, name_ar, name_en")
    .eq("business_id", owner.businessId)
    .eq("status", "active")
    .order("created_at", { ascending: true });

  const t = await getTranslations("owner.staff.assign");
  const scope = normalizeServiceScope(member.staff_assignments?.[0]?.service_scope_json);
  const assignable: AssignableService[] = (services ?? []).map((service) => ({
    id: service.id,
    name: locale === "ar" ? service.name_ar : service.name_en,
  }));

  return (
    <section>
      <h1 className="text-title-lg font-display text-ink">{t("title")}</h1>
      <p className="mt-xxs text-body-sm text-muted">
        {t("subtitle", { name: member.display_name })}
      </p>
      <div className="mt-lg">
        <ServiceAssignForm
          locale={locale}
          services={assignable}
          action={updateStaffServices.bind(null, member.id)}
          initialAll={scope.all}
          initialServiceIds={scope.all ? [] : scope.service_ids}
          cancelHref={`/${locale}/dashboard/staff`}
        />
      </div>
    </section>
  );
}
