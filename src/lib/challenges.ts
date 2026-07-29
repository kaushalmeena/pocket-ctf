/**
 * Challenge metadata: everything that is safe to read.
 *
 * The hashes, ciphertexts and puzzle payloads live in src/lib/generated/,
 * produced by `pnpm gen` from the answer key. This file is hand-written and
 * deliberately spoiler-light: no flag, hint or writeup text appears here. Hints
 * and writeups live in the answer key and ship encrypted.
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
  /**
   * How many hints exist, read from the generated registry.
   *
   * The text itself is not here. Hints used to be plaintext in this file, which
   * meant they were readable in the public repository -- free spoilers -- and
   * readable in the shipped bundle, so a player could have all three without
   * paying the points they cost. They now live in the answer key and ship as
   * AES-GCM ciphertext; see hintCount() and revealHintText().
   */
  hintCount: number;
  /** Slugs that must be solved first. */
  requires?: string[];
};

/**
 * Challenges whose flag is *impossible* to obtain without an interaction this
 * app can observe.
 *
 * Deliberately short. Most puzzles have several legitimate solve routes -- the
 * morse timings can be read instead of heard, the reveal can be breakpointed on
 * first load without ever pressing replay -- so treating a missing interaction
 * as suspicious there would libel honest players. These two have no such
 * ambiguity: the logic puzzle's flag only exists once you exchange the verdicts
 * for it, and the unlisted page's flag only renders on that page.
 */
export const REQUIRES_INTERACTION: ReadonlySet<string> = new Set([
  "knights-and-knaves",
  "nowhere-to-be-found",
]);

/** How many hints the generated registry carries for a challenge. */
function hintCount(slug: string): number {
  const entry = (registry.challenges as Record<string, { hints?: unknown[] }>)[slug];
  return entry?.hints?.length ?? 0;
}

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
    hintCount: hintCount("first-light"),
  },
  {
    slug: "invisible-ink",
    path: "/c/invisible-ink",
    title: "Invisible Ink",
    tagline: "A dull poem that counts its own pauses.",
    category: "stego",
    difficulty: "easy",
    points: 75,
    hintCount: hintCount("invisible-ink"),
  },
  {
    slug: "russian-dolls",
    path: "/c/russian-dolls",
    title: "Russian Dolls",
    tagline: "Five layers. None of them difficult. That is the difficulty.",
    category: "encoding",
    difficulty: "easy",
    points: 75,
    hintCount: hintCount("russian-dolls"),
  },
  {
    slug: "knights-and-knaves",
    path: "/c/knights-and-knaves",
    title: "Knights and Knaves",
    tagline: "Eight islanders. Four of them are lying to you. Which four?",
    category: "logic",
    difficulty: "medium",
    points: 125,
    hintCount: hintCount("knights-and-knaves"),
  },
  {
    slug: "chromatic-aberration",
    path: "/c/chromatic-aberration",
    title: "Chromatic Aberration",
    tagline: "Four thousand and ninety-six pixels of nothing in particular.",
    category: "stego",
    difficulty: "medium",
    points: 150,
    hintCount: hintCount("chromatic-aberration"),
  },
  {
    slug: "dots-and-dashes",
    path: "/c/dots-and-dashes",
    title: "Dots and Dashes",
    tagline: "The oldest digital protocol still in service.",
    category: "audio",
    difficulty: "medium",
    points: 125,
    hintCount: hintCount("dots-and-dashes"),
  },
  {
    slug: "one-frame-window",
    path: "/c/one-frame-window",
    title: "One Frame Window",
    tagline: "It was there. You were too slow. It will not repeat.",
    category: "web",
    difficulty: "medium",
    points: 150,
    hintCount: hintCount("one-frame-window"),
  },
  {
    slug: "nowhere-to-be-found",
    path: "/c/nowhere-to-be-found",
    title: "Nowhere To Be Found",
    tagline: "This page does not have your flag. Another one does, and nothing links to it.",
    category: "recon",
    difficulty: "medium",
    points: 125,
    hintCount: hintCount("nowhere-to-be-found"),
  },
  {
    slug: "prime-cuts",
    path: "/c/prime-cuts",
    title: "Prime Cuts",
    tagline: "Ninety-three digits with exactly one honest decomposition.",
    category: "math",
    difficulty: "hard",
    points: 200,
    hintCount: hintCount("prime-cuts"),
  },
  {
    slug: "the-repeat-offender",
    path: "/c/the-repeat-offender",
    title: "The Repeat Offender",
    tagline: "A key shorter than its message keeps the same secret many times.",
    category: "crypto",
    difficulty: "hard",
    points: 200,
    hintCount: hintCount("the-repeat-offender"),
  },
  {
    slug: "the-meta-key",
    path: "/c/the-meta-key",
    title: "The Meta Key",
    tagline: "The last door has ten locks, and you have been collecting keys all along.",
    category: "meta",
    difficulty: "hard",
    points: 300,
    hintCount: hintCount("the-meta-key"),
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
