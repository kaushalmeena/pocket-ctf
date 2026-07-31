#!/usr/bin/env node
/**
 * Verifies *this deployment* -- the one built from your real answer key -- by
 * playing every challenge and then checking the answer the way the site will.
 *
 * `pnpm test` covers the same ground, but it runs against whatever data is live,
 * which on a fresh clone is the committed demo set. It therefore passes green
 * without telling you anything about the flags you are about to hand players.
 * This refuses to run on the demo set for exactly that reason.
 *
 * Two questions, in order:
 *
 *   1. Can each challenge be solved from what a player receives? Every
 *      challenge's own reference solver is driven against its shipped payload,
 *      with no access to the key.
 *   2. Will the site accept the result? The recovered flag goes through the same
 *      salted derivation the browser performs, compared against the hash in the
 *      registry. A generator that hashed something subtly different from what
 *      the puzzle encodes is caught here, rather than by a player who has solved
 *      it and is being told they are wrong.
 *
 * Requires flags.secret.json and seeds.secret.json. Run with
 * `pnpm self-test`.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { derive, fromHex, normalizeFlag, PURPOSE, toHex } from "../src/lib/kdf.js";
import { hasKey, readDeployment, readKey, resolveFlags } from "./answers.mjs";
import { slugs, solverFor } from "./lib/discover.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));

const die = (message) => {
  console.error(`✗ ${message}`);
  process.exit(1);
};

if (!hasKey(ROOT)) die("flags.secret.json is missing -- there is no deployment to verify.");

const registry = read("src/lib/generated/registry.json");
if (registry.sample === true) {
  die(
    "the live data is the demo set, so this would prove nothing about your flags.\n" +
      "  Run `pnpm gen` with flags.secret.json in place first.",
  );
}

const deployment = readDeployment(ROOT);
if (!deployment) die("seeds.secret.json is missing -- run `pnpm gen` first.");

const payloads = read("src/lib/generated/payloads.json");
const flags = resolveFlags(readKey(ROOT), deployment.suffixes);
const discovered = slugs();

const orphans = discovered.filter((slug) => !registry.challenges[slug]);
if (orphans.length > 0) die(`no generated data for ${orphans.join(", ")} -- run \`pnpm gen\`.`);

/** The check the browser performs on submit. */
async function accepted(slug, variant, flag) {
  const { verifySalt, verifyHash } = registry.challenges[slug].variants[variant];
  const digest = await derive(normalizeFlag(flag), PURPOSE.verify, fromHex(verifySalt));
  return toHex(digest) === verifyHash;
}

let failures = 0;

for (const slug of discovered) {
  const { solve } = await solverFor(slug);
  const problems = [];

  for (const [variant, payload] of payloads[slug].variants.entries()) {
    let recovered;
    try {
      recovered = await solve({ payload });
    } catch (error) {
      problems.push(`variant ${variant}: solver threw -- ${error.message}`);
      continue;
    }

    const expected = normalizeFlag(flags[slug][variant]);
    if (normalizeFlag(recovered ?? "") !== expected) {
      problems.push(
        `variant ${variant}: solved to ${recovered ?? "nothing"}, expected ${expected}`,
      );
      continue;
    }

    if (!(await accepted(slug, variant, recovered))) {
      problems.push(
        `variant ${variant}: solves correctly, but the site would reject the answer`,
      );
    }
  }

  failures += problems.length;
  const count = payloads[slug].variants.length;
  if (problems.length === 0) {
    console.log(`  ✔ ${slug.padEnd(22)} solvable and accepted, all ${count} variants`);
  } else {
    console.log(`  ✗ ${slug}`);
    for (const problem of problems) console.log(`      ${problem}`);
  }
}

console.log("");
if (failures > 0) {
  die(
    `${failures} problem${failures === 1 ? "" : "s"} across ${discovered.length} challenges.`,
  );
}
console.log(
  `✔ all ${discovered.length} challenges solvable from shipped data, and every answer ` +
    "accepted. This deployment is good to hand out.",
);
