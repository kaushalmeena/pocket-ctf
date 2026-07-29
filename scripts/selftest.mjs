#!/usr/bin/env node
/**
 * Solve every generated payload the way a player would, and check the answers
 * against the key. This catches the failure mode that matters most in a CTF:
 * shipping a puzzle that cannot actually be solved from what's on the page.
 *
 * Requires flags.secret.json. Run with `node scripts/selftest.mjs`.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { derive, fromHex, normalizeFlag, PURPOSE, toHex, unseal } from "../src/lib/kdf.js";
import { innerOf, readDeployment, readKey, resolveFlags } from "./answers.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(readFileSync(join(ROOT, p), "utf8"));

const baseKey = readKey(ROOT);
const deployment = readDeployment(ROOT);
if (!deployment) {
  console.error("deployment.secret.json missing -- run pnpm gen first");
  process.exit(1);
}

/**
 * The flags for *this* deployment: authored base plus random suffix. Every
 * assertion below is against these, so the test proves the shipped payloads
 * encode the real answers rather than the base ones.
 */
const key = { ...baseKey, flags: resolveFlags(baseKey, deployment.suffixes) };
const registry = read("src/lib/generated/registry.json");
const payloads = read("src/lib/generated/payloads.json");

let failures = 0;
const check = (slug, expected, actual) => {
  const ok = actual === normalizeFlag(expected);
  if (!ok) failures++;
  console.log(`${ok ? "✔" : "✘"} ${slug.padEnd(22)} ${ok ? actual : `got ${actual}`}`);
};

/* --- solvers ------------------------------------------------------ */

const unrot13 = (s) =>
  s.replace(/[a-z]/gi, (c) => {
    const base = c <= "Z" ? 65 : 97;
    return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
  });

const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
function unbase32(s) {
  let bits = 0;
  let value = 0;
  const out = [];
  for (const ch of s.replace(/=+$/, "")) {
    value = (value << 5) | B32.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

// 1. first-light -- sort the DOM shards by index
check(
  "first-light",
  key.flags["first-light"],
  [...payloads["first-light"].shards]
    .sort((a, b) => a.k - b.k)
    .map((s) => s.v)
    .join(""),
);

// 2. invisible-ink -- read the zero-width characters
{
  const bits = [...payloads["invisible-ink"].poem]
    .filter((c) => c === "​" || c === "‌")
    .map((c) => (c === "‌" ? "1" : "0"))
    .join("");
  const text = Buffer.from(bits.match(/.{8}/g).map((b) => Number.parseInt(b, 2))).toString(
    "utf8",
  );
  check("invisible-ink", key.flags["invisible-ink"], text);
}

// 3. russian-dolls -- peel five layers
{
  const l1 = Buffer.from(payloads["russian-dolls"].blob, "base64").toString("utf8");
  const l2 = unbase32(l1).toString("utf8");
  const l3 = unrot13(l2);
  const l4 = Buffer.from(l3, "base64").toString("utf8");
  check("russian-dolls", key.flags["russian-dolls"], [...l4].reverse().join(""));
}

// 4. knights-and-knaves -- brute force all 256 assignments of the stated puzzle
{
  const solutions = [];
  for (let mask = 0; mask < 256; mask++) {
    const k = (i) => Boolean(mask & (1 << i)); // 0=A .. 7=H
    const count = [...Array(8).keys()].filter(k).length;
    const claims = [
      !k(1), // A: B is a knave
      k(2), // B: C is a knight
      !k(0) && !k(1), // C: A and B are both knaves
      count === 4, // D: exactly four of us are knights
      !k(7), // E: H is a knave
      !k(3), // F: D is a knave
      !k(2), // G: C is a knave
      count % 2 === 1, // H: the number of knights is odd
    ];
    if (claims.every((claim, i) => claim === k(i))) {
      solutions.push([...Array(8).keys()].map((i) => (k(i) ? "k" : "n")).join(""));
    }
  }
  if (solutions.length !== 1) {
    failures++;
    console.log(`✘ knights-and-knaves    ${solutions.length} solutions, expected exactly 1`);
  } else {
    // The verdicts alone are no longer the flag -- they are the key that
    // unseals it, which is what makes the 256-string answer space unfarmable.
    const s = payloads["knights-and-knaves"].verdictSeal;
    const flag = await unseal(solutions[0], fromHex(s.salt), s.ct, fromHex(s.iv));
    check("knights-and-knaves", key.flags["knights-and-knaves"], flag);

    const wrong = await unseal("kkkkkkkk", fromHex(s.salt), s.ct, fromHex(s.iv));
    if (wrong) {
      failures++;
      console.log("✘ knights-and-knaves    a wrong verdict string unsealed the flag");
    }
  }
}

// 5. chromatic-aberration -- pull the low bit of the blue channel
{
  const png = Buffer.from(payloads["chromatic-aberration"].dataUri.split(",")[1], "base64");
  // Re-inflate the IDAT and walk the scanlines (filter type 0 throughout).
  const { inflateSync } = await import("node:zlib");
  const idat = [];
  let off = 8;
  while (off < png.length) {
    const len = png.readUInt32BE(off);
    const type = png.toString("ascii", off + 4, off + 8);
    if (type === "IDAT") idat.push(png.subarray(off + 8, off + 8 + len));
    off += 12 + len;
  }
  const size = payloads["chromatic-aberration"].size;
  const raw = inflateSync(Buffer.concat(idat));
  let bits = "";
  for (let y = 0; y < size; y++) {
    const row = 1 + y * (size * 3 + 1);
    for (let x = 0; x < size; x++) bits += raw[row + x * 3 + 2] & 1;
  }
  const bytes = bits.match(/.{8}/g).map((b) => Number.parseInt(b, 2));
  const end = bytes.indexOf(0);
  check(
    "chromatic-aberration",
    key.flags["chromatic-aberration"],
    Buffer.from(bytes.slice(0, end)).toString("utf8"),
  );
}

// 6. dots-and-dashes -- durations back to morse, morse back to text
{
  const MORSE = {
    ".-": "a",
    "-...": "b",
    "-.-.": "c",
    "-..": "d",
    ".": "e",
    "..-.": "f",
    "--.": "g",
    "....": "h",
    "..": "i",
    ".---": "j",
    "-.-": "k",
    ".-..": "l",
    "--": "m",
    "-.": "n",
    "---": "o",
    ".--.": "p",
    "--.-": "q",
    ".-.": "r",
    "...": "s",
    "-": "t",
    "..-": "u",
    "...-": "v",
    ".--": "w",
    "-..-": "x",
    "-.--": "y",
    "--..": "z",
    // Digits: flags carry a random alphanumeric suffix, so the decoder needs
    // the full ITU alphabet, not just the letters.
    "-----": "0",
    ".----": "1",
    "..---": "2",
    "...--": "3",
    "....-": "4",
    ".....": "5",
    "-....": "6",
    "--...": "7",
    "---..": "8",
    "----.": "9",
  };
  const { timeline, unitMs } = payloads["dots-and-dashes"];
  let symbols = "";
  for (const step of timeline) {
    const units = Math.round(step.ms / unitMs);
    if (step.on) symbols += units === 1 ? "." : "-";
    else if (units === 3) symbols += " ";
    else if (units === 7) symbols += " / ";
  }
  const text = symbols
    .split(" / ")
    .map((word) =>
      word
        .split(" ")
        .map((c) => MORSE[c])
        .join(""),
    )
    .join("_");
  check("dots-and-dashes", key.flags["dots-and-dashes"], `pctf{${text}}`);
}

// 7. one-frame-window -- key is the slug
{
  const s = payloads["one-frame-window"].sealed;
  const flag = await unseal("one-frame-window", fromHex(s.salt), s.ct, fromHex(s.iv));
  check("one-frame-window", key.flags["one-frame-window"], flag);
}

// 8. nowhere-to-be-found -- key is the hidden URL path
{
  const s = payloads["nowhere-to-be-found"].sealed;
  const flag = await unseal("/vault/omega", fromHex(s.salt), s.ct, fromHex(s.iv));
  check("nowhere-to-be-found", key.flags["nowhere-to-be-found"], flag);
}

// 9. prime-cuts -- factor, sort, reduce mod 127
{
  let n = BigInt(payloads["prime-cuts"].n);
  const primes = [];
  for (let p = 2n; p * p <= n; p++) {
    while (n % p === 0n) {
      primes.push(p);
      n /= p;
    }
  }
  if (n > 1n) primes.push(n);
  primes.sort((a, b) => (a < b ? -1 : 1));
  const mod = BigInt(payloads["prime-cuts"].modulus);
  check(
    "prime-cuts",
    key.flags["prime-cuts"],
    primes.map((p) => String.fromCharCode(Number(p % mod))).join(""),
  );
}

// 10. the-repeat-offender -- column-wise frequency attack, no key knowledge
{
  const { ciphertextHex, keyLength } = payloads["the-repeat-offender"];
  const ct = Buffer.from(ciphertextHex, "hex");
  const score = (b) => {
    const c = String.fromCharCode(b).toLowerCase();
    if (c === " ") return 6;
    if ("etaoinshrdlu".includes(c)) return 3;
    if (/[a-z]/.test(c)) return 1;
    if (".,;'-".includes(c)) return 0;
    return -8; // control characters and punctuation soup
  };
  let recovered = "";
  for (let col = 0; col < keyLength; col++) {
    let best = 0;
    let bestScore = -Infinity;
    for (let guess = 32; guess < 127; guess++) {
      let total = 0;
      for (let i = col; i < ct.length; i += keyLength) total += score(ct[i] ^ guess);
      if (total > bestScore) {
        bestScore = total;
        best = guess;
      }
    }
    recovered += String.fromCharCode(best);
  }
  check("the-repeat-offender", key.flags["the-repeat-offender"], `pctf{${recovered}}`);
}

// 11. the-meta-key -- chain all ten tokens, unseal the recipe, apply it
{
  const order = registry.order;
  const required = payloads["the-meta-key"].requires;
  const tokens = [];
  for (const slug of required) {
    const salt = fromHex(registry.challenges[slug].tokenSalt);
    tokens.push(toHex(await derive(normalizeFlag(key.flags[slug]), PURPOSE.token, salt)));
  }
  const r = payloads["the-meta-key"].recipe;
  const recipe = await unseal(tokens.join(""), fromHex(r.salt), r.ct, fromHex(r.iv));
  if (!recipe) {
    failures++;
    console.log("✘ the-meta-key          recipe would not decrypt from the token chain");
  } else {
    // First character of each flag's inner text, in challenge order.
    const letters = required
      .map((slug) => innerOf(normalizeFlag(key.flags[slug])).charAt(0))
      .join("");
    const tag = deployment.suffixes["the-meta-key"];

    // The suffix is not derivable from the other ten flags, so the recipe has
    // to hand it over -- otherwise this challenge is unsolvable by design.
    if (!recipe.includes(tag)) {
      failures++;
      console.log("✘ the-meta-key          recipe does not disclose the deployment tag");
    }
    check("the-meta-key", key.flags["the-meta-key"], `pctf{${letters}_${tag}}`);
  }
  if (order.length !== required.length + 1) {
    failures++;
    console.log("✘ the-meta-key          should require every other challenge");
  }
}

/* --- registry integrity ------------------------------------------- */

for (const slug of registry.order) {
  const entry = registry.challenges[slug];
  const flag = normalizeFlag(key.flags[slug]);
  const hash = toHex(await derive(flag, PURPOSE.verify, fromHex(entry.verifySalt)));
  const writeup = await unseal(
    flag,
    fromHex(entry.sealSalt),
    entry.writeup,
    fromHex(entry.sealIv),
  );
  if (hash !== entry.verifyHash) {
    failures++;
    console.log(`✘ ${slug}: verify hash mismatch`);
  }
  if (!writeup) {
    failures++;
    console.log(`✘ ${slug}: writeup will not decrypt with its own flag`);
  }
  // A wrong flag must not decrypt, and must not validate.
  if (await unseal(`${flag}x`, fromHex(entry.sealSalt), entry.writeup, fromHex(entry.sealIv))) {
    failures++;
    console.log(`✘ ${slug}: writeup decrypted under the WRONG flag`);
  }
}

console.log(
  failures === 0
    ? `\nAll ${registry.order.length} challenges are solvable from shipped data.`
    : `\n${failures} problem(s).`,
);
process.exit(failures === 0 ? 0 : 1);
