#!/usr/bin/env node
/**
 * Build the challenge registry from the plaintext answer key.
 *
 *   flags.secret.json      ->  src/lib/generated/registry.json
 *   seeds.secret.json          src/lib/generated/payloads.json
 *                              ANSWERS.secret.md
 *
 * Nothing this writes contains readable flag, hint or writeup text. Each flag
 * becomes a peppered digest, AES-GCM ciphertext, and whatever its own
 * `build.mjs` derives from it. Both files are read by the server only; neither
 * is ever bundled for the browser.
 *
 * The per-challenge work lives in src/challenges/<slug>/build.mjs; this file
 * only knows how to find them and what to do with what they return.
 *
 * Run `pnpm gen` after editing the answer key. Commit nothing it produces.
 */

import { writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

import { flagDigest, normalizeFlag, SEALED, seal, toHex } from "../src/lib/kdf.js";
import {
  readDeployment,
  readKey,
  readSampleKey,
  resolveFlags,
  resolveSuffixes,
  SEEDS_ENV,
  SEEDS_FILE,
  VARIANT_COUNT,
  writeDeployment,
} from "./answers.mjs";
import { builderFor, slugs } from "./lib/discover.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

/**
 * `--sample` builds the committed demo set instead of a real deployment.
 *
 * The live files are gitignored: committing them would publish this
 * installation's puzzle payloads and hash material, and a clone could then
 * recover working flags without anyone visiting the site. The sample set exists
 * so a fresh clone still builds and plays; its flags all end in `_sample`.
 */
const sample = process.argv.includes("--sample");

/** `--rotate` mints fresh suffixes: every flag changes. */
const rotate = process.argv.includes("--rotate");

const OUT_DIR = sample
  ? join(ROOT, "src", "lib", "generated", "sample")
  : join(ROOT, "src", "lib", "generated");

const rand = (n) => crypto.getRandomValues(new Uint8Array(n));

/**
 * Encrypt under a key derived from a *publicly discoverable* string -- a slug, a
 * phrase on the page, an index. The bundle then carries only ciphertext, and
 * knowing where to look is the key.
 */
async function publicSeal(secret, plaintext) {
  const salt = rand(16);
  const iv = rand(12);
  return { salt: toHex(salt), iv: toHex(iv), ct: await seal(secret, salt, plaintext, iv) };
}

/* ------------------------------------------------------------------ *
 * Answer key
 * ------------------------------------------------------------------ */

const order = slugs();
if (order.length === 0) throw new Error("no challenges found under src/challenges/");

const key = sample ? readSampleKey(ROOT) : readKey(ROOT);

for (const slug of order) {
  if (!key.flags?.[slug]) throw new Error(`${slug}: no flag in the answer key`);
}
for (const slug of Object.keys(key.flags ?? {})) {
  if (!order.includes(slug)) {
    throw new Error(`${slug}: flag in the answer key but no src/challenges/${slug}/`);
  }
}

const existingDeployment = sample ? null : readDeployment(ROOT);

// The demo set uses a fixed, obvious suffix: reproducible so regenerating does
// not churn the committed files, and visible so nobody mistakes it for live.
const { suffixes, minted } = sample
  ? {
      suffixes: Object.fromEntries(
        order.map((s) => [
          s,
          Array.from({ length: VARIANT_COUNT }, (_, i) => (i === 0 ? "sample" : `sample${i}`)),
        ]),
      ),
      minted: 0,
    }
  : resolveSuffixes(key, existingDeployment, rotate);

const flags = resolveFlags(key, suffixes);

if (!sample && (minted > 0 || rotate)) {
  if (process.env[SEEDS_ENV]) {
    console.warn(
      `! ${SEEDS_ENV} is set but does not cover every challenge, so ${minted} suffix(es) ` +
        "were minted fresh. On a hosted build nothing persists them, so every deploy changes " +
        `those flags. Run \`pnpm gen\` locally and copy ${SEEDS_FILE} into ${SEEDS_ENV}.`,
    );
  }
  writeDeployment(ROOT, {
    $comment:
      "Per-deployment flag suffixes. Gitignored, and the only thing separating this " +
      "instance's flags from any other's. Regenerate with `pnpm gen --rotate`.",
    suffixes,
  });
}

/* ------------------------------------------------------------------ *
 * Per challenge
 * ------------------------------------------------------------------ */

/**
 * Minted fresh on every run. Nothing a player holds depends on it -- progress
 * lives in the server's database, keyed by challenge, not by hash -- so
 * regenerating never resets anyone.
 */
const pepper = toHex(rand(32));

const registry = {};
const payloads = {};

for (const slug of order) {
  const { build } = await builderFor(slug);
  const variants = [];
  const payloadVariants = [];

  for (const [variant, resolved] of flags[slug].entries()) {
    const flag = normalizeFlag(resolved);
    if (!/^pctf\{[a-z0-9_]+\}$/.test(flag)) {
      throw new Error(`${slug}: flag must match pctf{[a-z0-9_]+} -- got "${flag}"`);
    }

    /*
     * Hints and writeups ship sealed rather than as plaintext strings.
     *
     * Their keys come from the slug, variant and index, so this is obfuscation,
     * not secrecy: the server can open them whenever it likes. What it buys is
     * that the text is not in the repository or readable in the generated
     * files, and that the only way to it is the endpoint that charges for it.
     */
    const hints = [];
    for (const [i, text] of (key.hints?.[slug] ?? []).entries()) {
      hints.push(await publicSeal(SEALED.hint(slug, variant, i), text));
    }
    const writeup = key.writeups?.[slug] ?? "_No writeup was written for this challenge._";

    variants.push({
      digest: await flagDigest(flag, pepper),
      writeup: await publicSeal(SEALED.writeup(slug, variant), writeup),
      hints,
    });

    payloadVariants.push(await build({ flag, seal: publicSeal, slug, variant }));
  }

  registry[slug] = { variants };
  payloads[slug] = { variants: payloadVariants };
}

/* ------------------------------------------------------------------ *
 * Decoys
 * ------------------------------------------------------------------ */

/**
 * The only readable `pctf{...}` strings in the project, planted where a
 * shortcut-taker looks first. Submitting one earns a trophy of its own, because
 * it says something specific about how you got there.
 */
const honeypots = [];
for (const [decoy, message] of Object.entries(key.honeypots ?? {})) {
  honeypots.push({ digest: await flagDigest(normalizeFlag(decoy), pepper), message });
}

/* ------------------------------------------------------------------ *
 * Emit
 * ------------------------------------------------------------------ */

const banner = {
  $generated: "pnpm gen -- do not edit by hand",
  $note:
    "Server-only. Contains no plaintext flags, hints or writeups. See docs/build-pipeline.md.",
};

writeFileSync(
  join(OUT_DIR, "registry.json"),
  `${JSON.stringify(
    { ...banner, version: 3, sample, pepper, order, challenges: registry, honeypots },
    null,
    2,
  )}\n`,
);

writeFileSync(
  join(OUT_DIR, "payloads.json"),
  `${JSON.stringify({ ...banner, ...payloads }, null, 2)}\n`,
);

/*
 * The resolved answers, where the operator can find them. Suffixes are random,
 * so without this whoever runs the CTF would not know their own flags -- and
 * they cannot be recovered from the committed output, which is the point.
 */
const answersFile = "ANSWERS.secret.md";
if (!sample) {
  writeFileSync(
    join(ROOT, answersFile),
    [
      "# Answers",
      "",
      "Generated by `pnpm gen`. Gitignored, and the only readable copy of this",
      "deployment's flags. Suffixes come from `seeds.secret.json`; changing",
      "that file (or running `pnpm gen --rotate`) changes every flag below.",
      "",
      `Each challenge ships ${VARIANT_COUNT} variants and every player is dealt one, so`,
      "any of the flags listed for a challenge is correct -- for the player who",
      "was dealt that variant.",
      "",
      "| Challenge | Variant | Flag |",
      "| --------- | ------- | ---- |",
      ...order.flatMap((slug) =>
        flags[slug].map((flag, v) => `| ${slug} | ${v} | \`${flag}\` |`),
      ),
      "",
    ].join("\n"),
  );
}

const rel = (f) => relative(ROOT, join(OUT_DIR, f));
const mode = sample
  ? " -- SAMPLE set, flags end in _sample and are public"
  : rotate
    ? " -- suffixes ROTATED: every flag changed"
    : "";
console.log(`✔ ${order.length} challenges, ${honeypots.length} decoys${mode}`);
console.log(`  ${rel("registry.json")}`);
console.log(`  ${rel("payloads.json")}`);
if (!sample) console.log(`  ${answersFile}  <- this deployment's flags, gitignored`);
