/**
 * Challenge metadata: everything that is safe to read.
 *
 * The hashes, ciphertexts and puzzle payloads live in src/lib/generated/,
 * produced by `pnpm gen` from the answer key. This file is hand-written and
 * deliberately spoiler-light -- hints are the exception, and they cost points.
 */

import registry from "./generated/registry.json";

export type Difficulty = "easy" | "medium" | "hard";

export type Category =
  | "recon"
  | "stego"
  | "encoding"
  | "logic"
  | "audio"
  | "web"
  | "math"
  | "crypto"
  | "meta";

export type Challenge = {
  slug: string;
  /** Route path. Every challenge is its own page. */
  path: string;
  title: string;
  /** One line for the index. Should intrigue without instructing. */
  tagline: string;
  category: Category;
  difficulty: Difficulty;
  points: number;
  /** Progressive. Each one revealed costs {@link HINT_COST_RATIO} of the points. */
  hints: string[];
  /** Slugs that must be solved first. */
  requires?: string[];
};

/** Each revealed hint forfeits this fraction of the challenge's points. */
export const HINT_COST_RATIO = 0.15;

export const CATEGORY_LABELS: Record<Category, string> = {
  recon: "Recon",
  stego: "Stego",
  encoding: "Encoding",
  logic: "Logic",
  audio: "Audio",
  web: "Web",
  math: "Math",
  crypto: "Crypto",
  meta: "Meta",
};

export const CHALLENGES: Challenge[] = [
  {
    slug: "first-light",
    path: "/c/first-light",
    title: "First Light",
    tagline: "A page with nothing to hide, and one thing hidden.",
    category: "recon",
    difficulty: "easy",
    points: 50,
    hints: [
      "The flag on the page is the wrong flag. Ignore what is painted; ask what is present.",
      "Right-click. Inspect. Then look for elements that occupy no space at all.",
      "There are 29 of them, each carrying one character and one number. The number is not decoration — it is an index.",
    ],
  },
  {
    slug: "invisible-ink",
    path: "/c/invisible-ink",
    title: "Invisible Ink",
    tagline: "A dull poem that counts its own pauses.",
    category: "stego",
    difficulty: "easy",
    points: 75,
    hints: [
      "Select the poem and copy it. Paste it somewhere that shows you a character count. That number is bigger than it should be.",
      "Some Unicode characters have no width. Two of them, used as 0 and 1, will carry any message you like.",
      "U+200B and U+200C. Filter the string down to just those, map them to bits, and read eight at a time.",
    ],
  },
  {
    slug: "russian-dolls",
    path: "/c/russian-dolls",
    title: "Russian Dolls",
    tagline: "Five layers. None of them difficult. That is the difficulty.",
    category: "encoding",
    difficulty: "easy",
    points: 75,
    hints: [
      "Every encoding has a silhouette. Trailing `=`, mixed case and digits means one thing; all-caps with digits 2 through 7 means another.",
      "Layer three is not an encoding at all — it is a substitution cipher, and the laziest one there is.",
      "Outside in: base64, base32, ROT13, base64. Then the plaintext is the right characters in the wrong order.",
    ],
  },
  {
    slug: "knights-and-knaves",
    path: "/c/knights-and-knaves",
    title: "Knights and Knaves",
    tagline: "Eight islanders. Four of them are lying to you. Which four?",
    category: "logic",
    difficulty: "medium",
    points: 125,
    hints: [
      "Knights only say true things; knaves only say false things. So an islander is a knight *exactly when* their statement is true. Write that as an equation and the puzzle solves itself.",
      "Start with B and C — they form a loop you can close by contradiction. Then note that two of the remaining statements are direct contradictions, which pins the total.",
      "The flag is the eight verdicts in order, A through H, as `k` and `n`, wrapped in the usual braces. Brute-forcing all 256 assignments is a perfectly honest solve.",
    ],
  },
  {
    slug: "chromatic-aberration",
    path: "/c/chromatic-aberration",
    title: "Chromatic Aberration",
    tagline: "Four thousand and ninety-six pixels of nothing in particular.",
    category: "stego",
    difficulty: "medium",
    points: 150,
    hints: [
      "The image is noise because almost all of it is noise. You are looking for the part that isn't.",
      "Every channel of every pixel is a byte. Changing a byte by one is invisible to you and obvious to a script.",
      "Blue channel, least significant bit, row-major, most-significant-bit first, NUL-terminated. Draw it to a canvas and read `getImageData`.",
    ],
  },
  {
    slug: "dots-and-dashes",
    path: "/c/dots-and-dashes",
    title: "Dots and Dashes",
    tagline: "The oldest digital protocol still in service.",
    category: "audio",
    difficulty: "medium",
    points: 125,
    hints: [
      "You already know what this is. The only question is whether you decode it by ear or by arithmetic.",
      "Short beep, long beep. A gap three times the base unit ends a letter; a gap seven times the base unit ends a word.",
      "The word gap becomes an underscore in the flag. If you'd rather read than listen, the timings are sitting in the page as an array of numbers.",
    ],
  },
  {
    slug: "one-frame-window",
    path: "/c/one-frame-window",
    title: "One Frame Window",
    tagline: "It was there. You were too slow. It will not repeat.",
    category: "web",
    difficulty: "medium",
    points: 150,
    hints: [
      "Reloading won't help; it is exactly as fast every time. Change the rules instead of your reflexes.",
      "Grepping the bundle finds ciphertext, not a flag. But something has to decrypt it, and that something runs in a debugger you control.",
      "Elements panel → right-click the container → Break on → subtree modifications. Then reload. The page freezes mid-reveal.",
    ],
  },
  {
    slug: "nowhere-to-be-found",
    path: "/c/nowhere-to-be-found",
    title: "Nowhere To Be Found",
    tagline: "This page does not have your flag. Another one does, and nothing links to it.",
    category: "recon",
    difficulty: "medium",
    points: 125,
    hints: [
      "Websites keep a handful of files at fixed, well-known paths. You have never opened most of them.",
      "One of those files exists to tell crawlers what to stay away from. Consider what that implies about its contents.",
      "`/robots.txt`. Read what it forbids, then go there.",
    ],
  },
  {
    slug: "prime-cuts",
    path: "/c/prime-cuts",
    title: "Prime Cuts",
    tagline: "Ninety-three digits with exactly one honest decomposition.",
    category: "math",
    difficulty: "hard",
    points: 200,
    hints: [
      "There is precisely one way to break a whole number into primes. That uniqueness is the encoding, not an obstacle to it.",
      "Trial division is enough — no factor is above twenty thousand. Sort what falls out, ascending.",
      "Reduce each prime modulo 127 and read the results as ASCII. (Why 127 and not 128? Try 128 and watch half the alphabet become unreachable.)",
    ],
  },
  {
    slug: "the-repeat-offender",
    path: "/c/the-repeat-offender",
    title: "The Repeat Offender",
    tagline: "A key shorter than its message keeps the same secret many times.",
    category: "crypto",
    difficulty: "hard",
    points: 200,
    hints: [
      "XOR with a repeating key. The key length is given to you, which is the hard half of the problem removed.",
      "Bytes at positions 0, 19, 38, … were all XORed with the same single byte. So were 1, 20, 39, …. That is nineteen separate, tiny problems.",
      "For each column try all 256 bytes and score the result on how English it looks — spaces and `etaoin shrdlu` are worth the most. The best-scoring byte is almost always right.",
    ],
  },
  {
    slug: "the-meta-key",
    path: "/c/the-meta-key",
    title: "The Meta Key",
    tagline: "The last door has ten locks, and you have been collecting keys all along.",
    category: "meta",
    difficulty: "hard",
    points: 300,
    requires: [
      "first-light",
      "invisible-ink",
      "russian-dolls",
      "knights-and-knaves",
      "chromatic-aberration",
      "dots-and-dashes",
      "one-frame-window",
      "nowhere-to-be-found",
      "prime-cuts",
      "the-repeat-offender",
    ],
    hints: [
      "Everything you need is in the ten flags you already have. Lay them out in challenge order.",
      "You are looking at the inner text of each flag — what sits between the braces.",
      "First character of each, in order. Wrap in `pctf{ }`.",
    ],
  },
];

export const CHALLENGE_BY_SLUG: Record<string, Challenge> = Object.fromEntries(
  CHALLENGES.map((c) => [c.slug, c]),
);

/**
 * Look up a challenge, loudly.
 *
 * Challenge pages reference themselves by slug at module scope, so a typo would
 * otherwise surface as a blank page rendering `undefined`. Throwing at import
 * time turns that into a build failure -- prerendering runs every route, so a
 * bad slug can't reach a player.
 */
export function getChallenge(slug: string): Challenge {
  const challenge = CHALLENGE_BY_SLUG[slug];
  if (!challenge) throw new Error(`unknown challenge slug: ${slug}`);
  return challenge;
}

export const TOTAL_POINTS = CHALLENGES.reduce((sum, c) => sum + c.points, 0);

/** Points still on the table after `hintsUsed` hints, never below a quarter. */
export function pointsAfterHints(challenge: Challenge, hintsUsed: number) {
  const kept = Math.max(0.25, 1 - hintsUsed * HINT_COST_RATIO);
  return Math.round(challenge.points * kept);
}

/**
 * Cross-check the hand-written list against the generated registry.
 *
 * A slug in one and not the other means either a challenge page with no hash to
 * check submissions against, or an orphaned hash with no page. Both are silent
 * failures at runtime, so this runs at module scope: prerendering imports every
 * route, which turns a mismatch into a failed build instead of a broken page.
 */
function auditRegistry() {
  const generated = new Set<string>(registry.order);
  const declared = new Set(CHALLENGES.map((c) => c.slug));
  const missingPayload = [...declared].filter((s) => !generated.has(s));
  const missingMetadata = [...generated].filter((s) => !declared.has(s));

  if (missingPayload.length > 0) {
    throw new Error(
      `challenges without generated data (run pnpm gen): ${missingPayload.join(", ")}`,
    );
  }
  if (missingMetadata.length > 0) {
    throw new Error(`generated data without a challenge page: ${missingMetadata.join(", ")}`);
  }
}

auditRegistry();
