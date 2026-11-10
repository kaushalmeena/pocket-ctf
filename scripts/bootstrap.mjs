#!/usr/bin/env node
/**
 * Make sure the app has challenge data to import.
 *
 * `src/lib/generated/{registry,payloads}.json` are gitignored: committing them would publish the running deployment's puzzle
 * payloads and hash material, and a clone could then recover working flags
 * without anyone visiting the site.
 *
 * That leaves a fresh clone with nothing to build against, so this copies the
 * committed sample set into place when the live files are missing. Wired to
 * `postinstall` and to `predev`/`prebuild`, so it is hard to end up in a broken
 * state by accident. It never overwrites existing files -- running `pnpm gen`
 * for a real deployment is always the last word.
 */

import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { hasKey, KEY_ENV } from "./answers.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const GENERATED = join(ROOT, "src", "lib", "generated");
const SAMPLE = join(GENERATED, "sample");

/** [live path, sample path] */
const PAIRS = [
  [join(GENERATED, "registry.json"), join(SAMPLE, "registry.json")],
  [join(GENERATED, "payloads.json"), join(SAMPLE, "payloads.json")],
];

/*
 * A real answer key beats the sample every time.
 *
 * This is what makes `pnpm build` do the right thing everywhere without a
 * second command: locally the key is a file, on Vercel it is an environment
 * variable, and either way the build generates this deployment's own data
 * rather than shipping the public demo flags. With no key at all -- a fresh
 * clone, or CI -- it falls through to the sample below.
 */
if (hasKey(ROOT)) {
  console.log(`✔ answer key found; generating this deployment's challenge data`);
  execFileSync(process.execPath, [join(ROOT, "scripts/generate.mjs")], {
    stdio: "inherit",
  });
  process.exit(0);
}

console.log(`! no answer key (no flags.secret.json, no ${KEY_ENV}) -- using the demo set`);

const copied = [];
for (const [live, sample] of PAIRS) {
  if (existsSync(live)) continue;
  if (!existsSync(sample)) {
    console.error(
      `✘ neither ${live} nor its sample exists. Run \`pnpm gen --sample\` (or \`pnpm gen\` ` +
        "with a real flags.secret.json).",
    );
    process.exit(1);
  }
  mkdirSync(dirname(live), { recursive: true });
  copyFileSync(sample, live);
  copied.push(live);
}

if (copied.length > 0) {
  console.log(`✔ seeded ${copied.length} file(s) from the sample set.`);
  console.log("  This instance is a DEMO: its flags are public in flags.sample.json.");
  console.log("  Run `pnpm gen` with your own flags.secret.json for a real deployment.");
}
