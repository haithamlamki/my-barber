import { connectAdmin, createE2ETenant } from "./fixtures/tenant";

/** Provision the isolated E2E tenant once, before any project/worker runs. */
export default async function globalSetup(): Promise<void> {
  const client = await connectAdmin();
  try {
    await createE2ETenant(client);
  } finally {
    await client.end();
  }
}
