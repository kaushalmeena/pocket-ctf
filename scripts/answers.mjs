/**
 * Resolving the answer key into this deployment's actual flags.
 *
 * Two files feed in, and both are gitignored:
 *
 *   flags.secret.json        the *base* flags you authored, of the shape
 *                            pctf{some_memorable_phrase}
 *   seeds.secret.json   a random suffix per challenge, minted on first
 *                            `pnpm gen` and reused thereafter
 *
 * The flag players actually submit is the two spliced together --
 * base phrase, underscore, suffix. That matters for two reasons.
 *
 * Without it, a flag is only as strong as its own semantics -- a writeup, a
 * screenshot, or a friend on a different copy of the site hands over a working
 * answer. Some flags were outright guessable: the logic puzzle's answer space
 * is 256 strings, so it could be ground out by submission alone. Six random
 * characters take that from 256 to about two billion.
 *
 * And because the suffixes are per-deployment, two installations never share a
 * flag. Answers leaked from one are worthless against the other.
 *
 * Every tool that needs the real flags -- the generator, the self-test, the
 * leak scanner -- resolves them through this module, so none of them can
 * disagree about what the answer is.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/**
 * How many variants of each challenge ship.
 *
 * Every browser draws one per challenge, so a flag passed between players only
 * works if both happened to draw the same one -- (N-1)/N of the time it simply
 * fails. Four is a deliberate middle: the payload data multiplies by this, and
 * the stego PNG is the largest at ~12 KB apiece.
 *
 * Be clear about the ceiling. All N verification hashes have to ship, or the
 * client could not check a submission at all, so someone willing to script it
 * can hash a borrowed flag against each variant's salt and find the match in
 * about N x 300 ms. This stops sharing in a group chat; it does not stop
 * someone determined. See docs/architecture/anti-cheat.md.
 */
export const VARIANT_COUNT = 4;

/** Suffix alphabet, kept inside the `[a-z0-9_]` flag grammar. */
const ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";
const SUFFIX_LENGTH = 6;

export const SECRET_KEY_FILE = "flags.secret.json";
export const SAMPLE_KEY_FILE = "flags.sample.json";
export const SEEDS_FILE = "seeds.secret.json";

/**
 * A fresh suffix. Rejection-sampled so each character is uniform over the
 * alphabet rather than skewed by `% 32` on a byte.
 */
export function mintSuffix() {
  let out = "";
  while (out.length < SUFFIX_LENGTH) {
    for (const byte of crypto.getRandomValues(new Uint8Array(SUFFIX_LENGTH))) {
      if (out.length === SUFFIX_LENGTH) break;
      if (byte < 256 - (256 % ALPHABET.length)) out += ALPHABET[byte % ALPHABET.length];
    }
  }
  return out;
}

/** Splice a suffix in before the closing brace. */
export function applySuffix(baseFlag, suffix) {
  const open = baseFlag.indexOf("{");
  const close = baseFlag.lastIndexOf("}");
  if (open === -1 || close === -1) throw new Error(`malformed base flag: ${baseFlag}`);
  const inner = baseFlag.slice(open + 1, close);
  return `${baseFlag.slice(0, open + 1)}${inner}_${suffix}${baseFlag.slice(close)}`;
}

/** The part between the braces -- what a challenge's puzzle usually encodes. */
export function innerOf(flag) {
  return flag.slice(flag.indexOf("{") + 1, flag.lastIndexOf("}"));
}

/**
 * Environment fallbacks, for building where the gitignored files cannot exist.
 *
 * A hosted build clones the repo, so `flags.secret.json` and
 * `seeds.secret.json` are simply absent. Supplying the same JSON through
 * environment variables is what lets a *real* instance deploy without the
 * answers ever being committed -- see docs/architecture/README.md.
 */
export const KEY_ENV = "POCKET_CTF_FLAGS";
/** Same width as {@link KEY_ENV}, so values line up in a .env. */
export const SEEDS_ENV = "POCKET_CTF_SEEDS";

/**
 * The public origin. Not a secret, unlike the two above -- it is read by the
 * browser bundle, which is why it keeps Vite's `VITE_` prefix. Vite only inlines
 * prefixed variables into client code, so renaming it would need `envPrefix` in
 * vite.config.ts and would silently resolve to undefined until that was done.
 */
export const URL_ENV = "VITE_SITE_URL";

/** Prefer the environment, fall back to the file. */
function readJson(path, envVar) {
  const fromEnv = process.env[envVar];
  return fromEnv ? JSON.parse(fromEnv) : JSON.parse(readFileSync(path, "utf8"));
}

export function readKey(root) {
  return readJson(join(root, SECRET_KEY_FILE), KEY_ENV);
}

/** Whether a real answer key is reachable at all, from either source. */
export function hasKey(root) {
  return Boolean(process.env[KEY_ENV]) || existsSync(join(root, SECRET_KEY_FILE));
}

/** The committed demo key. Public by design; see flags.sample.json. */
export function readSampleKey(root) {
  return JSON.parse(readFileSync(join(root, SAMPLE_KEY_FILE), "utf8"));
}

export function readDeployment(root) {
  try {
    return readJson(join(root, SEEDS_FILE), SEEDS_ENV);
  } catch {
    return null;
  }
}

export function writeDeployment(root, deployment) {
  writeFileSync(join(root, SEEDS_FILE), `${JSON.stringify(deployment, null, 2)}\n`);
}

/**
 * Suffixes for every slug in the key, minting any that are missing.
 *
 * @param {object} key parsed flags.secret.json
 * @param {object|null} existing parsed seeds.secret.json
 * @param {boolean} rotate mint fresh suffixes for everything
 */
export function resolveSuffixes(key, existing, rotate = false) {
  const previous = rotate ? {} : (existing?.suffixes ?? {});
  const suffixes = {};
  let minted = 0;

  for (const slug of Object.keys(key.flags)) {
    // Older deployment files held one suffix per slug rather than a list.
    const kept = Array.isArray(previous[slug])
      ? previous[slug]
      : typeof previous[slug] === "string"
        ? [previous[slug]]
        : [];

    suffixes[slug] = Array.from({ length: VARIANT_COUNT }, (_, i) => {
      if (typeof kept[i] === "string" && kept[i].length > 0) return kept[i];
      minted++;
      return mintSuffix();
    });
  }
  return { suffixes, minted };
}

/** `{ slug: [flagForVariant0, flagForVariant1, ...] }` for the whole key. */
export function resolveFlags(key, suffixes) {
  return Object.fromEntries(
    Object.entries(key.flags).map(([slug, base]) => {
      const list = suffixes[slug];
      if (!Array.isArray(list) || list.length === 0) {
        throw new Error(`no deployment suffixes for "${slug}" -- run pnpm gen`);
      }
      return [slug, list.map((suffix) => applySuffix(base, suffix))];
    }),
  );
}
