#!/usr/bin/env node
/**
 * Build the challenge registry from the plaintext answer key.
 *
 *   flags.secret.json      ->  src/lib/generated/registry.json
 *   deployment.secret.json     src/lib/generated/payloads.json
 *                              public/robots.txt, public/sitemap.xml
 *                              ANSWERS.secret.md
 *
 * Nothing this writes contains readable flag, hint or writeup text. Each flag
 * becomes salted PBKDF2 hashes, AES-GCM ciphertext, and whatever its own
 * `build.mjs` derives from it.
 *
 * The per-challenge work lives in src/challenges/<slug>/build.mjs; this file
 * only knows how to find them and what to do with what they return.
 *
 * Run `pnpm gen` after editing the answer key. Commit nothing it produces.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import {
  derive,
  fromHex,
  normalizeFlag,
  PURPOSE,
  seal,
  sha256Hex,
  toHex,
} from "../src/lib/kdf.js";
import {
  DEPLOYMENT_ENV,
  DEPLOYMENT_FILE,
  readDeployment,
  readKey,
  readSampleKey,
  resolveFlags,
  resolveSuffixes,
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

/** `--rotate` mints fresh suffixes *and* salts: every flag changes. */
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

/** Key material for hint N. Mirrored in src/lib/hints.ts. */
const hintSecret = (slug, variant, index) => `pocket-ctf/hint/${slug}/${variant}/${index}`;

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
  if (process.env[DEPLOYMENT_ENV]) {
    console.warn(
      `! ${DEPLOYMENT_ENV} is set but does not cover every challenge, so ${minted} suffix(es) ` +
        "were minted fresh. On a hosted build nothing persists them, so every deploy changes " +
        `those flags. Run \`pnpm gen\` locally and copy ${DEPLOYMENT_FILE} into ${DEPLOYMENT_ENV}.`,
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
 * Salts, reused where the flag has not changed
 * ------------------------------------------------------------------ */

/**
 * Players store PBKDF2(flag, tokenSalt) as proof of solve, so minting a new
 * tokenSalt silently invalidates everyone's progress. Salts are therefore kept
 * whenever the flag they belong to is unchanged -- established by re-deriving
 * the old verifyHash -- and only rotated on request.
 */
let previous = {};
if (!rotate) {
  try {
    previous = JSON.parse(readFileSync(join(OUT_DIR, "registry.json"), "utf8")).challenges;
  } catch {
    previous = {};
  }
}

async function saltsFor(slug, variant, flag) {
  const old = previous?.[slug]?.variants?.[variant];
  if (old?.verifySalt && old?.tokenSalt && old?.sealSalt) {
    const stillValid =
      toHex(await derive(flag, PURPOSE.verify, fromHex(old.verifySalt))) === old.verifyHash;
    if (stillValid) {
      return {
        verifySalt: fromHex(old.verifySalt),
        tokenSalt: fromHex(old.tokenSalt),
        sealSalt: fromHex(old.sealSalt),
        reused: true,
      };
    }
  }
  return {
    verifySalt: rand(16),
    tokenSalt: rand(16),
    sealSalt: rand(16),
    reused: false,
  };
}

/* ------------------------------------------------------------------ *
 * Per challenge
 * ------------------------------------------------------------------ */

const registry = {};
const payloads = {};
let reusedCount = 0;

for (const slug of order) {
  const { build } = await builderFor(slug);
  const variants = [];
  const payloadVariants = [];

  for (const [variant, resolved] of flags[slug].entries()) {
    const flag = normalizeFlag(resolved);
    if (!/^pctf\{[a-z0-9_]+\}$/.test(flag)) {
      throw new Error(`${slug}: flag must match pctf{[a-z0-9_]+} -- got "${flag}"`);
    }

    const { verifySalt, tokenSalt, sealSalt, reused } = await saltsFor(slug, variant, flag);
    if (reused) reusedCount++;

    // Always fresh, even when the salts are reused: encrypting different
    // plaintext under the same AES-GCM key and nonce is a real break, and the
    // writeup is exactly what changes between runs.
    const sealIv = rand(12);
    const token = toHex(await derive(flag, PURPOSE.token, tokenSalt));
    const writeup = key.writeups?.[slug] ?? "_No writeup was written for this challenge._";

    /*
     * Hints ship encrypted rather than as plaintext strings.
     *
     * A hint must be readable *before* the challenge is solved, so its key
     * cannot depend on the flag -- it comes from the slug, variant and index,
     * all of which the browser knows. This is obfuscation, not secrecy. What it
     * buys is that the text is not in the repository, and that taking a hint
     * means clicking the button that charges you points for it.
     */
    const hints = [];
    for (const [i, text] of (key.hints?.[slug] ?? []).entries()) {
      hints.push(await publicSeal(hintSecret(slug, variant, i), text));
    }

    variants.push({
      verifySalt: toHex(verifySalt),
      verifyHash: toHex(await derive(flag, PURPOSE.verify, verifySalt)),
      tokenSalt: toHex(tokenSalt),
      // sha256 of the token, not the token: a tampered localStorage entry cannot
      // be made to validate without deriving the token, which needs the flag.
      tokenHash: await sha256Hex(token),
      sealSalt: toHex(sealSalt),
      sealIv: toHex(sealIv),
      writeup: await seal(flag, sealSalt, writeup, sealIv),
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
 * shortcut-taker looks first. Submitting one is recorded, because it says
 * something specific about how you got there.
 */
const honeypots = [];
for (const [decoy, message] of Object.entries(key.honeypots ?? {})) {
  const salt = rand(16);
  honeypots.push({
    salt: toHex(salt),
    hash: toHex(await derive(normalizeFlag(decoy), PURPOSE.verify, salt)),
    message,
  });
}

const decoyNamed = (needle) => Object.keys(key.honeypots ?? {}).find((d) => d.includes(needle));

/* ------------------------------------------------------------------ *
 * Emit
 * ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ *
 * Decoys
 * ------------------------------------------------------------------ */

/**
 * Plausible-looking data that leads nowhere.
 *
 * A static analyst's first move is to dump the generated JSON and look for
 * anything flag-shaped. These give them more to work through: entries for
 * challenges that do not exist, carrying salts, hashes and sealed blobs in
 * exactly the shape the real ones use.
 *
 * Deliberately in a separate `$decoys` key rather than mixed into each
 * challenge's payload. Noise that slows someone reading the whole file is fair;
 * noise inside the puzzle a player is honestly working on is not, and would make
 * the challenges feel arbitrary rather than fair.
 *
 * Each decrypts, under a key derived from its own name, to a note. Someone who
 * works that out has earned the joke rather than wasted their evening.
 */
const PHANTOMS = {
  "shader-secrets":
    "There is no shader challenge. You reversed a decoy, which is genuinely good " +
    "practice -- the real ones are all listed on /challenges.",
  "cache-poisoning":
    "Also not real. Everything this site ships is reachable from the challenge " +
    "list; nothing is hidden behind a slug you were supposed to guess.",
  "heap-snapshot":
    "Three for three. The registry is public by design: it holds hashes, and " +
    "hashes are safe to publish. That is the whole idea.",
};

const decoys = {};
for (const [name, note] of Object.entries(PHANTOMS)) {
  const salt = rand(16);
  decoys[name] = {
    verifySalt: toHex(salt),
    // A hash of something that is not a flag, so no submission can ever match.
    verifyHash: toHex(await derive(`pocket-ctf/decoy/${name}`, PURPOSE.verify, salt)),
    tokenSalt: toHex(rand(16)),
    tokenHash: await sha256Hex(toHex(rand(32))),
    sealed: await publicSeal(`pocket-ctf/decoy/${name}`, note),
  };
}

const banner = {
  $generated: "pnpm gen -- do not edit by hand",
  $note: "Contains no plaintext flags, hints or writeups. See docs/architecture/README.md.",
};

writeFileSync(
  join(OUT_DIR, "registry.json"),
  `${JSON.stringify(
    {
      ...banner,
      $flag: decoyNamed("read_the_registry"),
      version: 2,
      sample,
      order,
      challenges: registry,
      honeypots,
      $decoys: decoys,
    },
    null,
    2,
  )}\n`,
);

writeFileSync(
  join(OUT_DIR, "payloads.json"),
  `${JSON.stringify({ ...banner, $flag: decoyNamed("decoy_friend"), ...payloads }, null, 2)}\n`,
);

/*
 * robots.txt and sitemap.xml encode the same rule the per-route meta tags do:
 * the landing page and the challenge index are public, everything whose content
 * is a spoiler is not.
 */
const siteUrl = (process.env.VITE_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

/*
 * There is no host to assume: the build output is a folder of static files that
 * can be served from anywhere. Left unset, canonical tags and the sitemap point
 * at localhost, which is right for development and wrong the moment it ships.
 */
if (!sample && !process.env.VITE_SITE_URL) {
  console.warn(
    `! VITE_SITE_URL is unset, so canonical URLs and the sitemap point at ${siteUrl}. ` +
      "Fine locally; set it to your real origin before deploying.",
  );
}

writeFileSync(
  join(ROOT, "public", "robots.txt"),
  `# Pocket CTF
#
# Generated by \`pnpm gen\`. robots.txt is a polite request, not a security
# control -- crawlers that respect it stay out of the paths below, and everyone
# else is welcome to read this file.

User-agent: *
Allow: /$
Allow: /challenges

# Challenge pages carry their puzzle payloads, and an indexed payload is a
# cached spoiler. The writeups are worse.
Disallow: /c/

# A personal scoreboard held in localStorage; nothing to index.
Disallow: /progress

Sitemap: ${siteUrl}/sitemap.xml
`,
);

const INDEXABLE = ["/", "/challenges"];
writeFileSync(
  join(ROOT, "public", "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${INDEXABLE.map(
  (path) => `  <url>
    <loc>${siteUrl}${path}</loc>
    <changefreq>monthly</changefreq>
    <priority>${path === "/" ? "1.0" : "0.8"}</priority>
  </url>`,
).join("\n")}
</urlset>
`,
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
      "deployment's flags. Suffixes come from `deployment.secret.json`; changing",
      "that file (or running `pnpm gen --rotate`) changes every flag below.",
      "",
      `Each challenge ships ${VARIANT_COUNT} variants and every browser draws one at`,
      "random, so any of the flags listed for a challenge is correct -- for the",
      "player who happened to draw that variant.",
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
console.log(
  `✔ ${order.length} challenges, ${honeypots.length} decoys` +
    (sample
      ? " -- SAMPLE set, flags end in _sample and are public"
      : rotate
        ? " -- suffixes and salts ROTATED: every flag changed, all progress invalid"
        : `, ${reusedCount} salt set(s) reused so existing progress still verifies`),
);
console.log(`  ${rel("registry.json")}`);
console.log(`  ${rel("payloads.json")}`);
console.log("  public/robots.txt");
console.log("  public/sitemap.xml");
if (!sample) console.log(`  ${answersFile}  <- this deployment's flags, gitignored`);
