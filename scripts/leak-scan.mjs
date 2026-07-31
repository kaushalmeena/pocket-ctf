#!/usr/bin/env node
/**
 * Fail the build if a real flag is readable anywhere outside the answer key.
 *
 * Scans the source tree, `public/`, and -- when present -- the production
 * output in `dist/`, which is the artifact players actually receive. Every
 * flag-shaped string found is classified against the answer key:
 *
 *   leak         matches a real flag           -> build fails
 *   decoy        a declared honeypot           -> expected, reported
 *   illustration neither                       -> a format example, reported
 *
 * Checking against the real values rather than an allowlist of exceptions
 * means the invariant is enforced directly ("no flag is readable") and format
 * examples like `pctf{something}` in prose never need to be registered.
 *
 * Run `pnpm build && pnpm verify:flags` for the check that counts.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeFlag } from "../src/lib/kdf.js";
import { readDeployment, readKey, resolveFlags } from "./answers.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * Deliberately matches the *flag grammar* rather than "anything in braces", so
 * regex literals (`pctf{[a-z0-9_]+}`) and template strings (`pctf{${x}}`) in
 * the tooling aren't reported. Flags are normalised to this alphabet before
 * hashing, so a real flag can never fall outside it.
 */
const FLAG_RE = /pctf\{[a-z0-9_]{2,64}\}/g;

const SKIP_DIRS = new Set(["node_modules", ".git"]);
/** Only the gitignored answer key and its derivatives may hold real flags. */
const ALLOWLIST = new Set(["flags.secret.json", "seeds.secret.json", "ANSWERS.secret.md"]);

/**
 * Prerendered HTML carries `pctf&#123;…&#125;` where the page renders
 * `pctf{…}` -- JSX entities survive into the markup and are decoded by the
 * browser's parser. Normalising braces before matching means an accidentally
 * escaped leak is still caught instead of hiding behind its own encoding.
 */
function decodeBraces(text) {
  return text
    .replace(/&#(?:123|x7b);/gi, "{")
    .replace(/&#(?:125|x7d);/gi, "}")
    .replace(/&lbrace;/gi, "{")
    .replace(/&rbrace;/gi, "}");
}

function statSyncSafe(p) {
  try {
    return statSync(p);
  } catch {
    return null;
  }
}

/** @param {string} abs @param {string[]} acc */
function walk(abs, acc) {
  const st = statSyncSafe(abs);
  if (!st) return acc;
  if (st.isDirectory()) {
    for (const entry of readdirSync(abs)) {
      if (SKIP_DIRS.has(entry)) continue;
      walk(join(abs, entry), acc);
    }
  } else if (st.size < 8 * 1024 * 1024) {
    acc.push(abs);
  }
  return acc;
}

/* --- load the answer key ------------------------------------------ */

let realFlags = new Set();
let decoys = new Set();
let haveKey = false;
try {
  const key = readKey(ROOT);
  const deployment = readDeployment(ROOT);
  decoys = new Set(Object.keys(key.honeypots ?? {}).map(normalizeFlag));
  // Check against the *resolved* flags -- base + this deployment's suffix --
  // since those are what a leak would actually expose. The bases are also
  // included: a stray base flag in the bundle would hand over most of the
  // answer even though it would not validate on its own.
  // resolveFlags returns one flag per variant, so flatten before comparing.
  const resolved = deployment
    ? Object.values(resolveFlags(key, deployment.suffixes)).flat()
    : [];
  realFlags = new Set([...Object.values(key.flags ?? {}), ...resolved].map(normalizeFlag));
  haveKey = true;
} catch {
  console.warn(
    "! answer key not readable -- every flag-shaped string will be treated as suspect",
  );
}

/* --- scan --------------------------------------------------------- */

/*
 * `flags.sample.json` is scanned rather than allowlisted, and that is the point:
 * it is published, so if its demo phrases ever drifted back into matching a real
 * base flag, the scanner would catch it. Root-level files used to be skipped
 * entirely, which is precisely where that mistake would have hidden.
 */
const targets = [
  "src",
  "scripts",
  "public",
  "docs",
  "README.md",
  "vite.config.ts",
  "flags.sample.json",
];
if (statSyncSafe(join(ROOT, "dist"))) targets.push("dist");

const files = targets.flatMap((t) => walk(join(ROOT, t), []));
/** @type {{ file: string; flag: string; kind: "leak" | "decoy" | "illustration" }[]} */
const hits = [];

for (const file of files) {
  const rel = relative(ROOT, file);
  if (ALLOWLIST.has(rel)) continue;
  let text;
  try {
    text = readFileSync(file, "utf8");
  } catch {
    continue;
  }
  for (const match of decodeBraces(text).matchAll(FLAG_RE)) {
    const flag = match[0];
    const kind = !haveKey
      ? "leak"
      : realFlags.has(flag)
        ? "leak"
        : decoys.has(flag)
          ? "decoy"
          : "illustration";
    hits.push({ file: rel, flag, kind });
  }
}

const group = (kind) => hits.filter((h) => h.kind === kind);
const unique = (rows) => [...new Set(rows.map((r) => r.flag))];

console.log(`scanned ${files.length} files in ${targets.join(", ")}`);

const decoyHits = group("decoy");
if (decoyHits.length > 0) {
  console.log(
    `  decoys: ${unique(decoyHits).length} distinct, ${decoyHits.length} occurrence(s) -- planted on purpose`,
  );
}

const illustrations = group("illustration");
if (illustrations.length > 0) {
  console.log(`  format examples (not real flags): ${unique(illustrations).join(", ")}`);
}

const leaks = group("leak");
if (leaks.length > 0) {
  console.error(`\n✘ ${leaks.length} readable flag(s):`);
  for (const l of leaks) console.error(`    ${l.flag}  ${l.file}`);
  console.error("\nDerive the challenge's content from the flag at build time instead.");
  process.exit(1);
}

console.log("\n✔ no real flag is readable outside the answer key");
