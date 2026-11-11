#!/usr/bin/env node
/**
 * Writes the env file a hosted server needs, from the secrets already on this
 * machine.
 *
 * A host clones the repository, and the answer key is gitignored -- so without
 * help the server falls back to the public demo key. src/server/key.ts reads
 * the environment first, so the fix is to hand the host the same JSON as a
 * variable. This assembles that file so nobody has to minify JSON by hand.
 *
 *   pnpm gen:env --url=https://ctf.example.com      # writes .env.deploy
 *   pnpm gen:env --force                            # rewrite it, keeping its secrets
 *   pnpm gen:env --db-branch=staging                # another Neon branch's strings
 *
 * The database strings come from the Neon CLI, for the `production` branch by
 * default -- never from `.env`, which points at `dev`. Rewriting an existing
 * file keeps its session secret and GitHub pair unless the environment
 * overrides them: a new session secret would sign every player out.
 *
 * The result holds your plaintext answer key. It is gitignored, but it is a
 * file full of answers sitting in the project root -- treat it the way you treat
 * flags.secret.json.
 */

import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { hasKey, KEY_ENV, readKey, SECRET_KEY_FILE, URL_ENV } from "./answers.mjs";

const AUTH_ENV = "BETTER_AUTH_SECRET";
const GITHUB_ID_ENV = "GITHUB_CLIENT_ID";
const GITHUB_SECRET_ENV = "GITHUB_CLIENT_SECRET";
const DB_ENV = "DATABASE_URL";
const DB_DIRECT_ENV = "DATABASE_URL_UNPOOLED";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/** Project-relative when it is inside the project, absolute when it isn't. */
const show = (path) => {
  const rel = relative(ROOT, path);
  return rel.startsWith("..") || isAbsolute(rel) ? path : rel;
};

const die = (message) => {
  console.error(`✗ ${message}`);
  process.exit(1);
};

/** `--flag=value` and bare `--flag`. */
const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [name, ...rest] = arg.replace(/^--/, "").split("=");
    return [name, rest.length > 0 ? rest.join("=") : true];
  }),
);

/*
 * Not `.env`: that file is this machine's, and holds the Neon connection
 * strings for the dev branch. The deploy file is a separate thing to paste
 * into a host, and `.env.*` is gitignored too.
 */
const out = resolve(
  ROOT,
  typeof args.get("out") === "string" ? args.get("out") : ".env.deploy",
);
const force = args.has("force");

/** What the file being replaced said, so a rewrite keeps its secrets. */
const previous = existsSync(out) ? readFileSync(out, "utf8") : "";
const kept = (name) => previous.match(new RegExp(`^${name}=(.+)$`, "m"))?.[1]?.trim();

/* --- the site URL ------------------------------------------------- */

const rawUrl =
  typeof args.get("url") === "string" ? args.get("url") : process.env[URL_ENV] || kept(URL_ENV);

if (!rawUrl) {
  die(
    "no site URL.\n" +
      `  Pass --url=https://your-origin, or set ${URL_ENV}.\n` +
      "  Without it the canonical tags and sitemap would advertise localhost.",
  );
}

let origin;
try {
  const parsed = new URL(rawUrl);
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:")
    throw new Error("not http(s)");
  if (parsed.pathname !== "/" || parsed.search || parsed.hash) {
    die(`--url should be a bare origin, not ${rawUrl} -- drop the path.`);
  }
  origin = parsed.origin;
} catch {
  die(`--url is not a URL: ${rawUrl}`);
}

if (origin.startsWith("http://") && !origin.includes("localhost")) {
  console.warn(
    `! ${origin} is plain http. Fine for a private network; odd for a public deploy.`,
  );
}

/* --- the secrets -------------------------------------------------- */

if (!hasKey(ROOT)) {
  die(
    `${SECRET_KEY_FILE} is missing -- there are no flags to deploy.\n` +
      "  Copy flags.sample.json to it, write your own phrases, then run `pnpm gen`.",
  );
}

const key = readKey(ROOT);

/* --- the database ------------------------------------------------ */

const dbBranch =
  typeof args.get("db-branch") === "string" ? args.get("db-branch") : "production";

/** A connection string for the branch, from the Neon CLI. Never printed. */
function neonString(pooled) {
  try {
    return execFileSync(
      "neon",
      ["connection-string", dbBranch, ...(pooled ? ["--pooled"] : [])],
      { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    );
  } catch (error) {
    die(
      `the Neon CLI could not give a connection string for "${dbBranch}".\n` +
        `  ${
          String(error.stderr || error.message)
            .trim()
            .split("\n")[0]
        }\n` +
        "  Install it and run `neon auth`, or pass --db-branch=<name>.",
    );
  }
}

const connection = (pooled) => {
  const parsed = neonString(pooled).trim();
  if (!/^postgres(ql)?:\/\//.test(parsed ?? ""))
    die(`unexpected output from the Neon CLI for "${dbBranch}".`);
  return parsed;
};

const database = { pooled: connection(true), direct: connection(false) };

/* --- write -------------------------------------------------------- */

if (existsSync(out) && !force) {
  die(`${show(out)} already exists. Pass --force to overwrite it.`);
}

const choose = (name) =>
  process.env[name]
    ? [process.env[name], "from the environment"]
    : kept(name)
      ? [kept(name), `kept from ${show(out)}`]
      : [null, null];

/**
 * Minified and unquoted, deliberately.
 *
 * `JSON.stringify` without spacing cannot emit a newline outside a string and
 * escapes any inside one, so each value is a single line. Leaving it unquoted
 * avoids the apostrophe problem: dotenv only strips quotes it finds at the
 * start of a value, and these start with `{`, so the JSON arrives verbatim
 * however many apostrophes a hint contains.
 */
const line = (name, value) => `${name}=${JSON.stringify(value)}`;

const [keptSecret, secretSource] = choose(AUTH_ENV);
const authSecret = keptSecret ?? randomBytes(32).toString("base64");
const [githubId, githubSource] = choose(GITHUB_ID_ENV);
const [githubSecret] = choose(GITHUB_SECRET_ENV);

const body = `# Generated by \`pnpm gen:env\`. Do not commit -- this is the answer key.
#
# Paste these into your host's environment settings, or hand the file to a CLI
# that reads one. The server reads the answer key at startup and works out
# every player's flags and puzzles from it on request.

${URL_ENV}=${origin}

# Signs session cookies. Freshly generated unless one is already set; keep it
# stable across deploys, or everyone is signed out.
${AUTH_ENV}=${authSecret}

# From your GitHub OAuth app, if players should be able to claim progress.
# Callback URL: ${origin}/api/auth/callback/github
${GITHUB_ID_ENV}=${githubId ?? ""}
${GITHUB_SECRET_ENV}=${githubSecret ?? ""}

# The Neon "${dbBranch}" branch. Pooled for the running server; direct for the
# migrations the build applies.
${DB_ENV}=${database.pooled}
${DB_DIRECT_ENV}=${database.direct}

${line(KEY_ENV, key)}
`;

writeFileSync(out, body);

/* --- verify what was written -------------------------------------- */

const written = readFileSync(out, "utf8");
const readBack = (name) => written.match(new RegExp(`^${name}=(.*)$`, "m"))?.[1];

for (const [name, original] of [[KEY_ENV, key]]) {
  const raw = readBack(name);
  if (!raw) die(`${name} did not survive the write -- this is a bug.`);
  if (JSON.stringify(JSON.parse(raw)) !== JSON.stringify(original)) {
    die(`${name} does not round-trip -- this is a bug.`);
  }
}

const gitignored = readFileSync(join(ROOT, ".gitignore"), "utf8")
  .split("\n")
  .some((rule) => rule.trim() === ".env.*" || rule.trim() === show(out));

const row = (name, value) => console.log(`    ${name.padEnd(27)}${value}`);

console.log(`✔ ${show(out)}`);
row(URL_ENV, origin);
row(AUTH_ENV, secretSource ?? "freshly generated");
row(GITHUB_ID_ENV, githubSource ?? "empty -- claiming with GitHub stays off");
row(DB_ENV, `Neon branch "${dbBranch}", pooled`);
row(DB_DIRECT_ENV, `Neon branch "${dbBranch}", direct`);
row(KEY_ENV, `${Object.keys(key.flags ?? key).length} flags`);
console.log("");
if (!gitignored) {
  console.warn(`! ${show(out)} is NOT gitignored. Add it before you commit anything.`);
}
console.log("This file contains your plaintext flags and database credentials. Don't commit");
console.log(
  "it, don't paste it anywhere public, and delete it when the host has what it needs.",
);
