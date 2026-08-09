// app/api/apiUtils/s_env/db.js
// -----------------------------------------------------------------------------
// PostgreSQL connection utility.
// A single shared pool is reused across requests. In dev, Next.js hot-reload
// re-evaluates modules, so we cache the pool on globalThis to avoid opening a
// new pool on every reload.
// -----------------------------------------------------------------------------

import { Pool } from "pg";

function createPool() {
  return new Pool({
    connectionString: process.env.DATABASE_URL,
    // Enable SSL for hosted providers (Neon, Supabase, RDS, etc.).
    ssl:
      process.env.PGSSL === "true"
        ? { rejectUnauthorized: false }
        : undefined,
    max: Number(process.env.PG_POOL_MAX || 10),
    idleTimeoutMillis: 30_000,
  });
}

const globalForPg = globalThis;

export const pool = globalForPg.__ATC_PG_POOL__ || createPool();

if (process.env.NODE_ENV !== "production") {
  globalForPg.__ATC_PG_POOL__ = pool;
}

/**
 * Run a parameterized query.
 * @param {string} text  SQL with $1, $2 placeholders
 * @param {any[]}  params
 * @returns {Promise<import('pg').QueryResult>}
 */
export async function query(text, params = []) {
  return pool.query(text, params);
}

/**
 * Run several statements inside a single transaction.
 * @param {(client: import('pg').PoolClient) => Promise<any>} fn
 */
export async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
