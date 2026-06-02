/**
 * The single business this v0.1 deployment serves. The customer-facing catalog
 * (the `/book` service listing) is scoped to it so a second tenant's services
 * can never surface on this deployment's pages. Fails fast if unset so a
 * misconfigured deploy is caught at first render rather than leaking silently.
 */
export function getActiveBusinessId(): string {
  const id = process.env.NEXT_PUBLIC_BUSINESS_ID;
  if (!id) throw new Error("NEXT_PUBLIC_BUSINESS_ID is not configured");
  return id;
}
