#!/usr/bin/env node
/**
 * Build the challenge registry from the plaintext answer key.
 *
 *   flags.secret.json  ->  src/lib/generated/registry.json
 *                          src/lib/generated/payloads.json
 *
 * Nothing this script writes contains a readable flag. Each flag becomes:
 *   - a salted PBKDF2 hash, for checking submissions
 *   - a second salted PBKDF2 hash, for validating stored proof-of-solve tokens
 *   - an AES-GCM key that encrypts that challenge's writeup
 *   - whatever the puzzle needs: ciphertext, pixel data, prime products, beeps
 *
 * Run `pnpm gen` after editing the answer key. Commit the generated files.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";
import { derive, normalizeFlag, PURPOSE, seal, sha256Hex, toHex } from "../src/lib/kdf.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT_DIR = join(ROOT, "src", "lib", "generated");

const rand = (n) => crypto.getRandomValues(new Uint8Array(n));

/* ------------------------------------------------------------------ *
 * Encoding helpers used by individual puzzles
 * ------------------------------------------------------------------ */

const B32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

/** RFC 4648 base32. Node has no built-in. @param {Buffer} buf */
function base32(buf) {
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

const rot13 = (s) =>
  s.replace(/[a-z]/gi, (c) => {
    const base = c <= "Z" ? 65 : 97;
    return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
  });

const b64 = (s) => Buffer.from(s, "utf8").toString("base64");
const reverse = (s) => [...s].reverse().join("");

/** @param {string} s @returns {string} bits, MSB first, 8 per character */
const toBits = (s) =>
  [...Buffer.from(s, "utf8")].map((b) => b.toString(2).padStart(8, "0")).join("");

/** Deterministic noise, so regenerating doesn't churn a 16 KB data URI. */
function lcg(seed) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state >>> 24;
  };
}

/* ------------------------------------------------------------------ *
 * Minimal PNG encoder (truecolor, 8-bit, no filtering)
 * ------------------------------------------------------------------ */

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = -1;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/**
 * @param {number} size square edge length
 * @param {(x: number, y: number) => [number, number, number]} pixel
 */
function encodePng(size, pixel) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: truecolour
  const raw = Buffer.alloc(size * (size * 3 + 1));
  let o = 0;
  for (let y = 0; y < size; y++) {
    raw[o++] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixel(x, y);
      raw[o++] = r;
      raw[o++] = g;
      raw[o++] = b;
    }
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

/* ------------------------------------------------------------------ *
 * Puzzle payload builders -- one per challenge that needs baked data
 * ------------------------------------------------------------------ */

/** Sort-by-index DOM fragments. The flag exists only as 29 loose characters. */
function buildFirstLight(flag) {
  const shards = [...flag].map((v, k) => ({ k, v }));
  // Fisher-Yates with a fixed seed: shuffled in the DOM, ordered by data-k.
  const next = lcg(0x5eed);
  for (let i = shards.length - 1; i > 0; i--) {
    const j = next() % (i + 1);
    [shards[i], shards[j]] = [shards[j], shards[i]];
  }
  return { shards };
}

const POEM = `The kettle hums a flat and patient note.
Outside, a bus lets someone off too soon.
I keep the window open for the draught
and read the same page nineteen times by noon.
Nothing is hidden here, the morning says,
holding its hands out, empty, palms turned up.
The radio agrees. The neighbours' dog
agrees. The rain has nothing to add either.
And still I count the pauses, not the words,
the way you'd count the gaps between two trains
and know from that alone which one is yours.`;

/** Zero-width steganography: U+200B is 0, U+200C is 1, both invisible. */
function buildInvisibleInk(flag) {
  const bits = toBits(flag);
  const chars = [...POEM];
  if (chars.length < bits.length) throw new Error("poem too short to carry the flag");
  // Spread the payload across the whole poem rather than front-loading it.
  const stride = Math.floor(chars.length / bits.length);
  let out = "";
  let bit = 0;
  for (let i = 0; i < chars.length; i++) {
    out += chars[i];
    if (bit < bits.length && i % stride === 0 && chars[i] !== "\n") {
      out += bits[bit] === "1" ? "‌" : "​";
      bit++;
    }
  }
  if (bit !== bits.length) throw new Error(`only embedded ${bit}/${bits.length} bits`);
  return { poem: out, carrierLength: chars.length };
}

/** Five encodings, stacked. Peel outside-in. */
function buildRussianDolls(flag) {
  const blob = b64(base32(Buffer.from(rot13(b64(reverse(flag))), "utf8")));
  return { blob, layers: 5 };
}

/** Flag bits hidden in the low bit of the blue channel, NUL-terminated. */
function buildChromaticAberration(flag) {
  const SIZE = 64;
  const bits = `${toBits(flag)}00000000`;
  const noise = lcg(0xc0ffee);
  const plane = new Uint8Array(SIZE * SIZE * 3);
  for (let i = 0; i < plane.length; i++) plane[i] = noise();
  for (let i = 0; i < bits.length; i++) {
    const idx = i * 3 + 2; // blue channel of pixel i
    plane[idx] = (plane[idx] & 0xfe) | Number(bits[i]);
  }
  const png = encodePng(SIZE, (x, y) => {
    const i = (y * SIZE + x) * 3;
    return [plane[i], plane[i + 1], plane[i + 2]];
  });
  return {
    size: SIZE,
    dataUri: `data:image/png;base64,${png.toString("base64")}`,
    bytes: png.length,
  };
}

const MORSE = {
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
};

/**
 * Morse, shipped as raw on/off durations rather than dots and dashes -- the
 * bundle holds a list of integers, so you decode it by ear or by arithmetic.
 */
function buildDotsAndDashes(flag) {
  const inner = flag.slice(flag.indexOf("{") + 1, flag.lastIndexOf("}"));
  const UNIT = 90;
  /** @type {{ on: boolean; ms: number }[]} */
  const timeline = [];
  const push = (on, units) => timeline.push({ on, ms: units * UNIT });

  const words = inner.split("_");
  words.forEach((word, wi) => {
    if (wi > 0) push(false, 7);
    [...word].forEach((ch, ci) => {
      const code = MORSE[ch];
      if (!code) throw new Error(`no morse for "${ch}" -- keep flags a-z and _`);
      if (ci > 0) push(false, 3);
      [...code].forEach((sym, si) => {
        if (si > 0) push(false, 1);
        push(true, sym === "." ? 1 : 3);
      });
    });
  });
  return { timeline, unitMs: UNIT, toneHz: 620 };
}

/**
 * A big squarefree composite. Every prime factor is `127k + c` for one
 * character `c`, with `k` strictly increasing so numeric order == text order.
 *
 * The modulus has to be odd: `128k + c` is even for every even `c`, so half the
 * alphabet ('p' among them) would have no primes at all. 127 is prime and
 * larger than any character code we use, which makes `p mod 127` unambiguous
 * and -- by Dirichlet -- always solvable.
 */
function buildPrimeCuts(flag) {
  const MOD = 127;
  const isPrime = (n) => {
    if (n < 2) return false;
    for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
    return true;
  };
  let k = 0;
  let product = 1n;
  const factors = [];
  for (const ch of flag) {
    const c = ch.charCodeAt(0);
    if (c === 0 || c >= MOD) throw new Error(`"${ch}" (${c}) is outside 1..${MOD - 1}`);
    let p = 0;
    for (let candidate = k + 1; candidate < 100_000; candidate++) {
      if (isPrime(MOD * candidate + c)) {
        k = candidate;
        p = MOD * candidate + c;
        break;
      }
    }
    if (!p) throw new Error(`no prime found for "${ch}"`);
    factors.push(p);
    product *= BigInt(p);
  }
  return {
    n: product.toString(),
    factorCount: factors.length,
    modulus: MOD,
    largestFactor: factors[factors.length - 1],
  };
}

const XOR_PLAINTEXT = `Every cipher that repeats eventually confesses. A key that is shorter than the message it protects does not hide one secret; it hides the same small secret over and over, and repetition is the loudest sound a ciphertext can make. Line the bytes up in columns the width of the key and each column becomes a single shift applied to ordinary English, which is not ordinary at all once you count the letters. The letter e will out itself. The space will out itself faster. Patience is the only tool required, and patience is cheap.`;

/** Repeating-key XOR. The key is the flag's inner text. */
function buildRepeatOffender(flag) {
  const key = Buffer.from(flag.slice(flag.indexOf("{") + 1, flag.lastIndexOf("}")), "utf8");
  const pt = Buffer.from(XOR_PLAINTEXT, "utf8");
  const ct = Buffer.alloc(pt.length);
  for (let i = 0; i < pt.length; i++) ct[i] = pt[i] ^ key[i % key.length];
  return { ciphertextHex: ct.toString("hex"), keyLength: key.length, bytes: ct.length };
}

/**
 * Encrypt a value under a key derived from a *publicly discoverable* string:
 * a URL path, a slug, a phrase on the page. The bundle then carries only
 * ciphertext -- knowing where to look is the key.
 */
async function publicSeal(secret, plaintext) {
  const salt = rand(16);
  const iv = rand(12);
  return {
    salt: toHex(salt),
    iv: toHex(iv),
    ct: await seal(secret, salt, plaintext, iv),
  };
}

/* ------------------------------------------------------------------ *
 * Main
 * ------------------------------------------------------------------ */

const key = JSON.parse(readFileSync(join(ROOT, "flags.secret.json"), "utf8"));
const flags = key.flags;
const order = Object.keys(flags);

/** @type {Record<string, unknown>} */
const registry = {};
/** @type {Record<string, unknown>} */
const payloads = {};
/** @type {string[]} */
const tokens = [];

for (const slug of order) {
  const flag = normalizeFlag(flags[slug]);
  if (!/^pctf\{[a-z0-9_]+\}$/.test(flag)) {
    throw new Error(`${slug}: flag must match pctf{[a-z0-9_]+} -- got "${flag}"`);
  }

  const verifySalt = rand(16);
  const tokenSalt = rand(16);
  const sealSalt = rand(16);
  const sealIv = rand(12);

  const token = toHex(await derive(flag, PURPOSE.token, tokenSalt));
  tokens.push(token);

  const writeup = key.writeups?.[slug] ?? "_No writeup was written for this challenge._";

  registry[slug] = {
    verifySalt: toHex(verifySalt),
    verifyHash: toHex(await derive(flag, PURPOSE.verify, verifySalt)),
    tokenSalt: toHex(tokenSalt),
    // sha256 of the token, not the token: a tampered localStorage entry cannot
    // be made to validate without deriving the token, which needs the flag.
    tokenHash: await sha256Hex(token),
    sealSalt: toHex(sealSalt),
    sealIv: toHex(sealIv),
    writeup: await seal(flag, sealSalt, writeup, sealIv),
    length: flag.length,
  };
}

payloads["first-light"] = buildFirstLight(normalizeFlag(flags["first-light"]));
payloads["invisible-ink"] = buildInvisibleInk(normalizeFlag(flags["invisible-ink"]));
payloads["russian-dolls"] = buildRussianDolls(normalizeFlag(flags["russian-dolls"]));
payloads["chromatic-aberration"] = buildChromaticAberration(
  normalizeFlag(flags["chromatic-aberration"]),
);
payloads["dots-and-dashes"] = buildDotsAndDashes(normalizeFlag(flags["dots-and-dashes"]));
payloads["prime-cuts"] = buildPrimeCuts(normalizeFlag(flags["prime-cuts"]));
payloads["the-repeat-offender"] = buildRepeatOffender(
  normalizeFlag(flags["the-repeat-offender"]),
);

// The flag flashes for one frame. Grepping the bundle yields ciphertext; the
// key is the slug, so the *intended* solve and the *lazy* solve are the same
// skill -- pausing the runtime.
payloads["one-frame-window"] = {
  sealed: await publicSeal("one-frame-window", normalizeFlag(flags["one-frame-window"])),
};

// Keyed by the URL you can only reach by reading robots.txt. The unlisted page
// derives the key from its own location.pathname, so no path literal is needed.
payloads["nowhere-to-be-found"] = {
  sealed: await publicSeal("/vault/omega", normalizeFlag(flags["nowhere-to-be-found"])),
};

// The meta challenge's instructions are locked behind every other solve: the
// secret is all ten proof-of-solve tokens concatenated in challenge order.
const metaSlug = "the-meta-key";
const chainSecret = tokens.slice(0, order.indexOf(metaSlug)).join("");
payloads[metaSlug] = {
  recipe: await publicSeal(
    chainSecret,
    "Take the first character of the inner text of each flag you have collected, in challenge order, and wrap the result in pctf{ }.",
  ),
  requires: order.slice(0, order.indexOf(metaSlug)),
};

/**
 * Decoys. These are the only readable `pctf{...}` strings in the project, and
 * they are planted where a shortcut-taker looks first: painted on a page, in a
 * source comment, in a payload file, in the registry. Submitting one is
 * recorded, because it says something specific about how you got there.
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

/** Pick a decoy by the substring of its message, so the pairing stays legible. */
const decoyNamed = (needle) => Object.keys(key.honeypots ?? {}).find((d) => d.includes(needle));

const banner = {
  $generated: "pnpm gen -- do not edit by hand",
  $note: "Contains no plaintext flags. See README.md#anti-cheat.",
};

writeFileSync(
  join(OUT_DIR, "registry.json"),
  `${JSON.stringify(
    {
      ...banner,
      $flag: decoyNamed("read_the_registry"),
      version: 1,
      order,
      challenges: registry,
      honeypots,
    },
    null,
    2,
  )}\n`,
);
writeFileSync(
  join(OUT_DIR, "payloads.json"),
  `${JSON.stringify({ ...banner, $flag: decoyNamed("decoy_friend"), ...payloads }, null, 2)}\n`,
);

console.log(`✔ ${order.length} challenges, ${honeypots.length} decoys`);
console.log(`  src/lib/generated/registry.json`);
console.log(`  src/lib/generated/payloads.json`);
