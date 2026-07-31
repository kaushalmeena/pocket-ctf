/**
 * Scoring, labels, and the player-facing view of a challenge.
 *
 * The challenges themselves live in src/challenges/<slug>/ and are discovered
 * automatically; this module decorates that metadata with the two things it
 * cannot know on its own — its route path and how many hints this deployment
 * shipped — and owns the points arithmetic.
 */

import {
  CHALLENGES as DISCOVERED,
  TOTAL_POINTS as DISCOVERED_TOTAL,
  pathFor,
} from "~/challenges/registry";
import type { Category, ChallengeMeta } from "~/challenges/types";
import registry from "./generated/registry.json";

export type { Category, Difficulty } from "~/challenges/types";

/** A challenge as the UI needs it. */
export type Challenge = ChallengeMeta & {
  /** Route path. One dynamic route serves them all. */
  path: string;
  /**
   * How many hints exist. The text is not here and never was in the shipped
   * bundle: hints live in the answer key and ship as AES-GCM ciphertext, so all
   * that is public is the count. See src/lib/hints.ts.
   */
  hintCount: number;
};

/** Every variant carries the same number of hints, so variant 0 answers this. */
function hintCount(slug: string): number {
  const entry = (registry.challenges as Record<string, { variants: { hints?: unknown[] }[] }>)[
    slug
  ];
  return entry?.variants[0]?.hints?.length ?? 0;
}

export const CHALLENGES: Challenge[] = DISCOVERED.map((meta) => ({
  ...meta,
  path: pathFor(meta.slug),
  hintCount: hintCount(meta.slug),
}));

export const CHALLENGE_BY_SLUG: Record<string, Challenge> = Object.fromEntries(
  CHALLENGES.map((c) => [c.slug, c]),
);

/**
 * Look up a challenge, loudly. A missing slug would otherwise render a blank
 * page rather than failing.
 */
export function getChallenge(slug: string): Challenge {
  const challenge = CHALLENGE_BY_SLUG[slug];
  if (!challenge) throw new Error(`unknown challenge slug: ${slug}`);
  return challenge;
}

export const TOTAL_POINTS = DISCOVERED_TOTAL;

/** Each revealed hint forfeits this fraction of the challenge's points. */
export const HINT_COST_RATIO = 0.15;

/** Points still on the table after `hintsUsed` hints, never below a quarter. */
export function pointsAfterHints(challenge: Challenge, hintsUsed: number) {
  const kept = Math.max(0.25, 1 - hintsUsed * HINT_COST_RATIO);
  return Math.round(challenge.points * kept);
}

export const CATEGORY_LABELS: Record<Category, string> = {
  recon: "Recon",
  stego: "Stego",
  encoding: "Encoding",
  audio: "Audio",
  web: "Web",
  math: "Math",
  crypto: "Crypto",
  forensics: "Forensics",
  reversing: "Reversing",
};
