import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const globalForDb = globalThis as unknown as { _pool?: Pool };

/**
 * Per spec ADR-002 + Phase 7 review (DB-CRIT-2 / ARCH-S-3):
 *   - DATABASE_URL MUST be the Neon pooler endpoint (hostname contains
 *     "-pooler"). The pooler multiplexes our many short-lived serverless
 *     connections onto Neon's per-project ceiling.
 *   - max:3 keeps each Vercel worker instance from holding too many
 *     connections; 3 is enough for the worker's parallel writes (PSI +
 *     hygiene + probes all share the same pool).
 *   - DIRECT_URL is the unpooled endpoint, used only by drizzle-kit migrate.
 */
const pool =
  globalForDb._pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 3,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

if (process.env.NODE_ENV !== "production") globalForDb._pool = pool;

export const db = drizzle(pool, { schema });
export type Db = typeof db;

/**
 * Accepts either the top-level Db OR a transaction handle from db.transaction().
 * Persist functions take this so callers can run them inside or outside a tx.
 */
import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type { NodePgQueryResultHKT } from "drizzle-orm/node-postgres";

export type Tx = PgTransaction<
  NodePgQueryResultHKT,
  typeof schema,
  ExtractTablesWithRelations<typeof schema>
>;
export type DbOrTx = Db | Tx;
