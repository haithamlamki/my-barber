import { Client } from "pg";

const DEFAULT_DB_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

export function dbUrl(): string {
  return process.env.SUPABASE_DB_URL ?? DEFAULT_DB_URL;
}

export async function connect(): Promise<Client> {
  const client = new Client({ connectionString: dbUrl() });
  await client.connect();
  return client;
}

/**
 * Switch the current transaction to the `authenticated` Postgres role and set the
 * JWT claims so that auth.uid() resolves to `userId`. This is exactly how Supabase
 * evaluates RLS for a logged-in user, so policies behave as they would in production.
 * Must be called inside an open transaction (uses SET LOCAL).
 */
export async function asAuthenticated(client: Client, userId: string): Promise<void> {
  await client.query("set local role authenticated");
  await client.query("select set_config('request.jwt.claims', $1, true)", [
    JSON.stringify({ sub: userId, role: "authenticated" }),
  ]);
}

/** Return to the superuser role (RLS bypassed) to set up cross-tenant fixtures. */
export async function asPostgres(client: Client): Promise<void> {
  await client.query("reset role");
  await client.query("select set_config('request.jwt.claims', '', true)");
}

/** Run `fn` inside a transaction that is always rolled back, keeping tests isolated. */
export async function withRollback(client: Client, fn: () => Promise<void>): Promise<void> {
  await client.query("begin");
  try {
    await fn();
  } finally {
    await client.query("rollback");
  }
}
