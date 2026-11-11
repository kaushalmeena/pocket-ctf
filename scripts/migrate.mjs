#!/usr/bin/env node
/**
 * Apply the Drizzle migrations in ./drizzle to the database.
 *
 * Runs before `dev` and `build`, so a deploy brings its schema with it. Uses
 * Neon's direct connection when there is one: the pooled one cannot hold the
 * session-level state a migration needs.
 *
 * With no database configured -- a fresh clone, CI running the test suite --
 * it says so and steps aside rather than failing a build that does not need
 * one.
 */

import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

try {
  process.loadEnvFile(join(ROOT, ".env"));
} catch {
  /* no .env: the host's environment is all there is */
}

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  console.warn(
    "! no DATABASE_URL -- skipping migrations. Run `neon init` to connect a database.",
  );
  process.exit(0);
}

// Same as strictSsl() in src/server/db.ts: keep full verification, lose the warning.
const pool = new Pool({
  connectionString: url.replace(/sslmode=require\b/, "sslmode=verify-full"),
  max: 1,
});
try {
  await migrate(drizzle(pool), { migrationsFolder: join(ROOT, "drizzle") });
  console.log("✔ database schema is up to date");
} finally {
  await pool.end();
}
