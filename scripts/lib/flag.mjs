/**
 * What a flag is, shared by the server, the tests and the tools.
 *
 * The answer key holds one *base* flag per challenge, `pctf{a_memorable_phrase}`.
 * The flag a player submits is that phrase plus a suffix derived from the
 * player's seed, keyed with a secret only the server holds:
 * `pctf{a_memorable_phrase_k3x9qa}`. Without that secret nobody can compute
 * anyone's suffix -- including their own -- and a flag passed to a friend is
 * the right phrase with the wrong suffix.
 */

import { createHmac } from "node:crypto";

/** Suffix alphabet: 32 symbols, so a byte maps onto it without bias. */
const ALPHABET = "abcdefghijkmnpqrstuvwxyz23456789";
export const SUFFIX_LENGTH = 6;

/**
 * Canonical form of a submission. Forgiving about case and whitespace, not
 * about content.
 * @param {string} raw
 */
export const normalizeFlag = (raw) => raw.trim().replace(/\s+/g, " ").toLowerCase();

/**
 * The part between the braces.
 * @param {string} flag
 */
export const innerOf = (flag) => flag.slice(flag.indexOf("{") + 1, flag.lastIndexOf("}"));

/**
 * Splice a suffix in before the closing brace.
 * @param {string} base
 * @param {string} suffix
 */
export function applySuffix(base, suffix) {
  const open = base.indexOf("{");
  const close = base.lastIndexOf("}");
  if (open === -1 || close === -1) throw new Error(`malformed base flag: ${base}`);
  return `${base.slice(0, close)}_${suffix}${base.slice(close)}`;
}

/**
 * This player's suffix for this challenge. Deterministic, so it needs no
 * storage; keyed with the server's secret, so it cannot be worked out from
 * the seed alone.
 * @param {string} seed
 * @param {string} slug
 * @param {string} secret the server's secret (src/server/secret.ts)
 */
export function suffixFor(seed, slug, secret) {
  const bytes = createHmac("sha256", secret).update(`pocket-ctf/flag/${seed}/${slug}`).digest();
  let out = "";
  for (const byte of bytes.subarray(0, SUFFIX_LENGTH)) out += ALPHABET[byte % ALPHABET.length];
  return out;
}

/**
 * The flag one player is dealt for one challenge.
 * @param {string} base the answer key's flag for the challenge
 * @param {string} seed the player's seed
 * @param {string} slug
 * @param {string} secret the server's secret
 */
export const personalFlag = (base, seed, slug, secret) =>
  normalizeFlag(applySuffix(base, suffixFor(seed, slug, secret)));

/**
 * The base flag a submission would be, if its last `_xxxxxx` were a suffix.
 * Lets the server recognise a genuine phrase carrying somebody else's suffix.
 * @param {string} flag normalised
 */
export function baseOf(flag) {
  const match = flag.match(new RegExp(`^(.*)_[${ALPHABET}]{${SUFFIX_LENGTH}}\\}$`));
  return match ? `${match[1]}}` : null;
}
