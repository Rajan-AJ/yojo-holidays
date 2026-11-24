import "server-only";
import { Pool, types, type PoolClient, type QueryResultRow } from "pg";
import { serverEnv } from "@/lib/env";

/**
 * One Postgres pool per server process (kept on globalThis: the Proxy and the
 * app are bundled separately, and dev hot reload re-evaluates modules).
 *
 * The server connects with a privileged role (Supabase: the pooler connection
 * string; local: scripts/local-db.mjs), so RLS does not apply to these queries.
 * Repositories therefore apply the public visibility rules themselves (see
 * repositories/shared.ts). Never expose this connection to the browser.
 *
 * All queries are parameterised ($1, $2...). SQL fragments interpolated into
 * query text must be constants defined in code, never user input.
 */

// numeric / int8 -> number (money fits comfortably; ids are uuids), date -> 'YYYY-MM-DD'
types.setTypeParser(types.builtins.NUMERIC, (v) => Number(v));
types.setTypeParser(types.builtins.INT8, (v) => Number(v));
types.setTypeParser(types.builtins.DATE, (v) => v);

function createPool() {
  const pool = new Pool({
    connectionString: serverEnv.DATABASE_URL,
    max: serverEnv.DATABASE_POOL_MAX,
    idleTimeoutMillis: 30_000,
    // Supabase's pooler (transaction mode) doesn't support prepared statements
    // across transactions; pg only prepares named statements, which we never use.
  });
  pool.on("error", (error) => console.error("[db] idle client error", error.message));
  return pool;
}

const globalForDb = globalThis as unknown as { pgPool?: Pool };
export const pool = globalForDb.pgPool ?? createPool();
globalForDb.pgPool = pool;

/** Connection dropped underneath us (common with poolers after idle time). */
function isClosedConnection(error: unknown) {
  const e = error as { code?: string; message?: string };
  return (
    e?.code === "57P01" ||
    e?.code === "08006" ||
    e?.code === "ECONNRESET" ||
    /Connection terminated|connection closed/i.test(e?.message ?? "")
  );
}

/** Read query. Retried once if the connection was closed mid-flight. */
export async function query<T extends QueryResultRow>(text: string, params: unknown[] = []): Promise<T[]> {
  try {
    return (await pool.query<T>(text, params)).rows;
  } catch (error) {
    if (!isClosedConnection(error)) throw error;
    return (await pool.query<T>(text, params)).rows;
  }
}

export async function queryOne<T extends QueryResultRow>(text: string, params: unknown[] = []): Promise<T | null> {
  return (await query<T>(text, params))[0] ?? null;
}

/**
 * Writes run in a transaction and are NEVER retried (a dropped write may have
 * applied). `actorId` (a profile id) is recorded by the audit triggers.
 */
export async function transaction<T>(work: (client: PoolClient) => Promise<T>, actorId?: string): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    if (actorId) {
      // auth.uid() reads this, so created_by/updated_by and the audit log name the staff member.
      await client.query("select set_config('request.jwt.claim.sub', $1, true)", [actorId]);
    }
    const result = await work(client);
    await client.query("commit");
    client.release();
    return result;
  } catch (error) {
    await client.query("rollback").catch(() => {});
    // Discard the connection instead of reusing it: after an error its state is uncertain.
    client.release(error instanceof Error ? error : true);
    throw error;
  }
}
