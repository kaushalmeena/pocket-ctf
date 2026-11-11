import { drizzle, type NodePgDatabase } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as schema from "./schema";

/**
 * The database: Postgres on Neon, through Drizzle.
 *
 * `DATABASE_URL` is Neon's pooled connection string, which is the right one for
 * a server that may run as many short-lived functions. Migrations need a direct
 * connection and use `DATABASE_URL_UNPOOLED` instead -- see drizzle.config.ts.
 * `neon init` writes both into `.env`.
 */

export type Database = NodePgDatabase<typeof schema>;

/*
 * Held on globalThis rather than at module scope: the dev server re-evaluates
 * this module on every edit, and each evaluation would otherwise open another
 * pool against the same database.
 */
const holder = globalThis as { pocketCtfDb?: Database };

/**
 * Neon's strings say `sslmode=require`, which node-postgres already treats as
 * full verification and warns about. Saying so explicitly keeps that behaviour
 * and silences the warning.
 */
export const strictSsl = (url: string) =>
  url.replace(/sslmode=require\b/, "sslmode=verify-full");

function open(): Database {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Run `neon init`, or see docs/deployment.md.");
  }
  // Small on purpose: on a serverless host every instance has its own pool, and
  // Neon's pooler is what multiplexes them.
  const pool = new Pool({ connectionString: strictSsl(connectionString), max: 5 });
  return drizzle(pool, { schema });
}

export function db(): Database {
  holder.pocketCtfDb ??= open();
  return holder.pocketCtfDb;
}
