/**
 * Encoding primitives shared by challenge builders and their reference solvers.
 *
 * These live here rather than inside individual challenges because several
 * puzzles need the same transforms, and because a builder and its solver must
 * agree exactly -- importing one implementation is how they are kept honest.
 */

const B32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** RFC 4648 base32. Node has no built-in. @param {Buffer} buf */
export function base32(buf) {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32_ALPHABET[(value << (5 - bits)) & 31];
  while (out.length % 8 !== 0) out += "=";
  return out;
}

/** @param {string} s */
export function unbase32(s) {
  let bits = 0;
  let value = 0;
  const out = [];
  for (const ch of s.replace(/=+$/, "")) {
    value = (value << 5) | B32_ALPHABET.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

/** Its own inverse. */
export const rot13 = (s) =>
  s.replace(/[a-z]/gi, (c) => {
    const base = c <= "Z" ? 65 : 97;
    return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
  });

export const b64 = (s) => Buffer.from(s, "utf8").toString("base64");
export const unb64 = (s) => Buffer.from(s, "base64").toString("utf8");
export const reverse = (s) => [...s].reverse().join("");

/** @param {string} s @returns {string} bits, MSB first, 8 per character */
export const toBits = (s) =>
  [...Buffer.from(s, "utf8")].map((b) => b.toString(2).padStart(8, "0")).join("");

/** @param {string} bits @returns {string} text, NUL-terminated if a 0 byte appears */
export function fromBits(bits) {
  const bytes = (bits.match(/.{8}/g) ?? []).map((b) => Number.parseInt(b, 2));
  const end = bytes.indexOf(0);
  return Buffer.from(end === -1 ? bytes : bytes.slice(0, end)).toString("utf8");
}

/**
 * Deterministic noise. Challenge payloads are committed artefacts, so anything
 * random would churn the diff on every regeneration for no reason.
 * @param {number} seed
 */
export function lcg(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state >>> 24;
  };
}

/** Fisher-Yates against a seeded generator. @param {unknown[]} items */
export function shuffle(items, seed) {
  const next = lcg(seed);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = next() % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** The part between the braces -- what most puzzles actually encode. */
export const innerOf = (flag) => flag.slice(flag.indexOf("{") + 1, flag.lastIndexOf("}"));

export const MORSE = {
  a: ".-",
  b: "-...",
  c: "-.-.",
  d: "-..",
  e: ".",
  f: "..-.",
  g: "--.",
  h: "....",
  i: "..",
  j: ".---",
  k: "-.-",
  l: ".-..",
  m: "--",
  n: "-.",
  o: "---",
  p: ".--.",
  q: "--.-",
  r: ".-.",
  s: "...",
  t: "-",
  u: "..-",
  v: "...-",
  w: ".--",
  x: "-..-",
  y: "-.--",
  z: "--..",
  0: "-----",
  1: ".----",
  2: "..---",
  3: "...--",
  4: "....-",
  5: ".....",
  6: "-....",
  7: "--...",
  8: "---..",
  9: "----.",
};

/** `{ ".-": "a", … }` — built from MORSE so the two cannot disagree. */
export const MORSE_REVERSE = Object.fromEntries(
  Object.entries(MORSE).map(([letter, code]) => [code, letter]),
);

/**
 * A Galois LFSR. Used by the stream-cipher challenge and by its solver, so the
 * two share one definition of "correct".
 * @param {number} state non-zero initial state
 * @param {number} taps polynomial mask
 * @param {number} width register width in bits
 */
export function lfsr(state, taps, width) {
  const mask = (1 << width) - 1;
  let reg = state & mask;
  return () => {
    const out = reg & 1;
    reg >>>= 1;
    if (out) reg ^= taps;
    reg &= mask;
    return out;
  };
}

/** `width` bits of LFSR keystream, packed into bytes. */
export function lfsrKeystream(state, taps, width, byteCount) {
  const next = lfsr(state, taps, width);
  const out = Buffer.alloc(byteCount);
  for (let i = 0; i < byteCount; i++) {
    let byte = 0;
    for (let b = 0; b < 8; b++) byte = (byte << 1) | next();
    out[i] = byte;
  }
  return out;
}
