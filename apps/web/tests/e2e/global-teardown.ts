import { connectAdmin, destroyE2ETenant } from "./fixtures/tenant";

/** Remove the E2E tenant and all bookings it created, after every project finishes. */
export default async function globalTeardown(): Promise<void> {
  const client = await connectAdmin();
  try {
    await destroyE2ETenant(client);
  } finally {
    await client.end();
  }
}
