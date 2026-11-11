/**
 * Reading the answer key, for the tools that run outside the server.
 *
 * flags.secret.json holds one *base* flag per challenge, plus the clues,
 * writeups and decoys. It is gitignored. Nothing is generated from it: the
 * server reads it at startup (src/server/key.ts) and derives each player's
 * flag from it on request (scripts/lib/flag.mjs).
 *
 * The project's own environment variables, each prefixed with the domain it
 * configures: this project, Better Auth, and the GitHub OAuth app.
 *
 *   POCKET_CTF_URL             public origin: canonical tags, sitemap, and in
 *                              production Better Auth's base URL
 *   POCKET_CTF_FLAGS           flags.secret.json, for a host that cannot have it
 *
 *   BETTER_AUTH_SECRET         signs session cookies
 *
 *   GITHUB_CLIENT_ID           GitHub OAuth app client id
 *   GITHUB_CLIENT_SECRET       GitHub OAuth app client secret
 *
 * There is deliberately no BETTER_AUTH_URL: Better Auth would read it on its
 * own, in development too, and a local .env pointing it at the live site would
 * send every sign-in there. POCKET_CTF_URL covers it, in production only.
 *
 * DATABASE_URL, DATABASE_URL_UNPOOLED and NEON_* are not ours to name: the Neon
 * CLI writes them under exactly those names and its Vercel integration expects
 * them.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const SECRET_KEY_FILE = "flags.secret.json";
export const SAMPLE_KEY_FILE = "flags.sample.json";

/** The answer key, as one line of JSON, for a host that cannot have the file. */
export const KEY_ENV = "POCKET_CTF_FLAGS";

/**
 * The public origin. Not a secret: the browser bundle reads it. It is handed
 * to the client by name through `define` in vite.config.ts -- never by adding
 * `POCKET_CTF_` to Vite's `envPrefix`, which would put the answer key in the
 * bundle too.
 */
export const URL_ENV = "POCKET_CTF_URL";

/** The real key, from the environment or the file. Throws if neither exists. */
export function readKey(root) {
  const fromEnv = process.env[KEY_ENV];
  return fromEnv
    ? JSON.parse(fromEnv)
    : JSON.parse(readFileSync(join(root, SECRET_KEY_FILE), "utf8"));
}

/** Whether a real answer key is reachable at all, from either source. */
export function hasKey(root) {
  return Boolean(process.env[KEY_ENV]) || existsSync(join(root, SECRET_KEY_FILE));
}

/** The committed demo key. Public by design; see flags.sample.json. */
export function readSampleKey(root) {
  return JSON.parse(readFileSync(join(root, SAMPLE_KEY_FILE), "utf8"));
}

/** Whichever key the server would run on here: the real one, else the demo. */
export const liveKey = (root) =>
  hasKey(root)
    ? { key: readKey(root), sample: false }
    : { key: readSampleKey(root), sample: true };
