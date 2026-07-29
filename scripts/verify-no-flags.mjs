#!/usr/bin/env node
/**
 * Fail the build if a readable flag is anywhere it shouldn't be.
 *
 * Scans the source tree and, when present, the production output for anything
 * matching `pctf{...}`. Every hit must be a declared honeypot -- those are
 * *supposed* to be greppable, since punishing the shortcut is the point.
 *
 * This is the guard rail behind the whole design: challenge content is derived
 * from the flags at build time, so a regression that leaks one is a silent
 * failure unless something actively looks for it.
 */

import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
/**
 * Deliberately matches the *flag grammar* rather than "anything in braces", so
 * regex literals (`pctf{[a-z0-9_]+}`) and template strings (`pctf{${x}}`) in
 * the tooling aren't reported as leaks. Flags are normalised to this alphabet
 * before hashing, so a real flag can never fall outside it.
 */
const FLAG_RE = /pctf\{[a-z0-9_]{2,64}\}/g;

const SKIP_DIRS = new Set(["node_modules", ".git", ".vinxi", "dist"]);
/** Files allowed to hold plaintext flags. */
const ALLOWLIST = new Set(["flags.secret.json", "flags.example.json"]);

/** Honeypots are declared decoys; if the key is missing, fall back to none. */
let declaredDecoys = new Set();
try {
  const key = JSON.parse(readFileSync(join(ROOT, "flags.secret.json"), "utf8"));
  declaredDecoys = new Set(Object.keys(key.honeypots ?? {}));
} catch {
  console.warn("! flags.secret.json not found -- decoys cannot be distinguished from leaks");
}

const targets = ["src", "scripts", "public", "README.md", "app.config.ts"];
if (statSyncSafe(join(ROOT, ".output"))) targets.push(".output");

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

const files = targets.flatMap((t) => walk(join(ROOT, t), []));
/** @type {{ file: string; flag: string; decoy: boolean }[]} */
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
  for (const match of text.matchAll(FLAG_RE)) {
    hits.push({ file: rel, flag: match[0], decoy: declaredDecoys.has(match[0]) });
  }
}

const leaks = hits.filter((h) => !h.decoy);
const decoys = hits.filter((h) => h.decoy);

console.log(`scanned ${files.length} files in ${targets.join(", ")}`);
if (decoys.length > 0) {
  console.log(`  ${decoys.length} honeypot occurrence(s) -- expected:`);
  for (const d of decoys) console.log(`    ${d.flag}  ${d.file}`);
}

if (leaks.length > 0) {
  console.error(`\n✘ ${leaks.length} plaintext flag(s) leaked:`);
  for (const l of leaks) console.error(`    ${l.flag}  ${l.file}`);
  console.error("\nDerive challenge content from the flag at build time instead.");
  process.exit(1);
}

console.log("\n✔ no plaintext flags outside the answer key");
