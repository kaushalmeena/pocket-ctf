/**
 * Resolving the answer key into this deployment's actual flags.
 *
 * Two files feed in, and both are gitignored:
 *
 *   flags.secret.json        the *base* flags you authored, of the shape
 *                            pctf{some_memorable_phrase}
 *   deployment.secret.json   a random suffix per challenge, minted on first
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

/** Suffix alphabet, kept inside the `[a-z0-9_]` flag grammar. */
const ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";
const SUFFIX_LENGTH = 6;

export const SECRET_KEY_FILE = "flags.secret.json";
export const SAMPLE_KEY_FILE = "flags.sample.json";
export const DEPLOYMENT_FILE = "deployment.secret.json";

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
 * `deployment.secret.json` are simply absent. Supplying the same JSON through
 * environment variables is what lets a *real* instance deploy without the
 * answers ever being committed -- see docs/architecture.md.
 */
export const KEY_ENV = "POCKET_CTF_FLAGS";
export const DEPLOYMENT_ENV = "POCKET_CTF_DEPLOYMENT";

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
    return readJson(join(root, DEPLOYMENT_FILE), DEPLOYMENT_ENV);
  } catch {
    return null;
  }
}

export function writeDeployment(root, deployment) {
  writeFileSync(join(root, DEPLOYMENT_FILE), `${JSON.stringify(deployment, null, 2)}\n`);
}

/**
 * Suffixes for every slug in the key, minting any that are missing.
 *
 * @param {object} key parsed flags.secret.json
 * @param {object|null} existing parsed deployment.secret.json
 * @param {boolean} rotate mint fresh suffixes for everything
 */
export function resolveSuffixes(key, existing, rotate = false) {
  const previous = rotate ? {} : (existing?.suffixes ?? {});
  const suffixes = {};
  let minted = 0;
  for (const slug of Object.keys(key.flags)) {
    const kept = previous[slug];
    if (typeof kept === "string" && kept.length > 0) {
      suffixes[slug] = kept;
    } else {
      suffixes[slug] = mintSuffix();
      minted++;
    }
  }
  return { suffixes, minted };
}

/** `{ slug: resolvedFlag }` for the whole key. */
export function resolveFlags(key, suffixes) {
  return Object.fromEntries(
    Object.entries(key.flags).map(([slug, base]) => {
      const suffix = suffixes[slug];
      if (!suffix) throw new Error(`no deployment suffix for "${slug}" -- run pnpm gen`);
      return [slug, applySuffix(base, suffix)];
    }),
  );
}
