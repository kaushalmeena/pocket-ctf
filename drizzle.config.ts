import { defineConfig } from "drizzle-kit";

/**
 * Migrations run over a direct connection: Neon's pooler does not hold the
 * session-level state they need. Falls back to the pooled URL where only that
 * one is set.
 */
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/server/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "",
  },
  strict: true,
});
