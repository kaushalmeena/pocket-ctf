import type { ChallengeMeta, Tier } from "~/challenges/types";

import { baseOf, normalizeFlag, personalFlag } from "../../scripts/lib/flag.mjs";
import { KEY } from "./key";

/**
 * Every challenge, and every flag and puzzle, worked out per player.
 *
 * Server-only. A challenge is a directory: `meta.ts` says what it is, and an
 * optional `build.mjs` turns a flag into the puzzle that hides it. Each player
 * is dealt their own flag (see scripts/lib/flag.mjs), so each is dealt their
 * own puzzle, built here on first use and remembered for a while.
 */

type Seeded = { seed: string };

const metas = import.meta.glob<{ meta: ChallengeMeta }>("../challenges/*/meta.ts", {
  eager: true,
});

/*
 * Challenges whose flag the server hands over once a request earns it have
 * nothing to build, and no build.mjs.
 */
// oxlint-disable-next-line typescript/no-explicit-any -- payload shape is per-challenge
type Build = (input: { flag: string; slug: string }) => any;
const builders = import.meta.glob<{ build: Build }>("../challenges/*/build.mjs", {
  eager: true,
});
const BUILD = new Map(
  Object.entries(builders).map(([path, mod]) => [path.split("/").at(-2)!, mod.build]),
);

const TIER_RANK: Record<Tier, number> = { bronze: 0, silver: 1, gold: 2 };

/** Trophy-case order: cheapest first. A slot's position is its only public name. */
export const CHALLENGES: ChallengeMeta[] = Object.values(metas)
  .map((m) => m.meta)
  .sort(
    (a, b) =>
      TIER_RANK[a.tier] - TIER_RANK[b.tier] ||
      a.points - b.points ||
      a.slug.localeCompare(b.slug),
  );

export const BY_SLUG = new Map(CHALLENGES.map((c) => [c.slug, c]));
export const MAX_SCORE = CHALLENGES.reduce((sum, c) => sum + c.points, 0);

/*
 * A challenge with no flag in the key cannot be solved; a flag with no
 * challenge is a typo. Both are silent at runtime, so the server refuses to
 * start instead.
 */
{
  const missing = CHALLENGES.filter((c) => !KEY.flags[c.slug]).map((c) => c.slug);
  const orphaned = Object.keys(KEY.flags).filter((s) => !BY_SLUG.has(s));
  if (missing.length > 0)
    throw new Error(`no flag in the answer key for: ${missing.join(", ")}`);
  if (orphaned.length > 0) {
    throw new Error(`answer key has flags for unknown challenges: ${orphaned.join(", ")}`);
  }
}

/** The flag this player is dealt for a challenge. */
export const flagFor = (player: Seeded, slug: string) =>
  personalFlag(KEY.flags[slug]!, player.seed, slug);

/* ------------------------------------------------------------------ *
 * Puzzles
 * ------------------------------------------------------------------ */

/**
 * Built puzzles, by seed and slug. Building is deterministic, so this is only
 * about cost -- the stego portrait and the bytecode are the expensive ones --
 * and the oldest entries are simply dropped once it is full.
 */
const built = new Map<string, unknown>();
const BUILT_MAX = 4000;

/** The puzzle this player was dealt for a challenge. Shape is the challenge's own. */
// oxlint-disable-next-line typescript/no-explicit-any -- payload shape is per-challenge
export function dealt(player: Seeded, slug: string): any {
  const id = `${player.seed}/${slug}`;
  if (built.has(id)) return built.get(id);
  const build = BUILD.get(slug);
  if (!build) throw new Error(`${slug} has no puzzle to deal; its flag is handed over`);
  const payload = build({ flag: flagFor(player, slug), slug });
  if (built.size >= BUILT_MAX) built.delete(built.keys().next().value!);
  built.set(id, payload);
  return payload;
}

/* ------------------------------------------------------------------ *
 * Submissions
 * ------------------------------------------------------------------ */

const DECOYS = new Map(
  Object.entries(KEY.honeypots ?? {}).map(([flag, message]) => [normalizeFlag(flag), message]),
);

const BY_BASE = new Map(
  Object.entries(KEY.flags).map(([slug, base]) => [normalizeFlag(base), slug]),
);

export type Verdict =
  | { kind: "flag"; slug: string }
  /** The right phrase with somebody else's suffix. */
  | { kind: "borrowed"; slug: string }
  | { kind: "decoy"; message: string }
  | { kind: "miss" };

/**
 * What a submission is, for this player. A flag does not say which challenge
 * it is for, so it is compared with this player's flag for each of them:
 * twenty short hashes, which is nothing.
 */
export function identify(player: Seeded, raw: string): Verdict {
  const flag = normalizeFlag(raw);
  const decoy = DECOYS.get(flag);
  if (decoy) return { kind: "decoy", message: decoy };
  for (const { slug } of CHALLENGES) {
    if (flagFor(player, slug) === flag) return { kind: "flag", slug };
  }
  const base = baseOf(flag);
  const slug = base ? BY_BASE.get(base) : undefined;
  return slug ? { kind: "borrowed", slug } : { kind: "miss" };
}

/* ------------------------------------------------------------------ *
 * Clues and writeups
 * ------------------------------------------------------------------ */

export const hintCount = (slug: string) => KEY.hints?.[slug]?.length ?? 0;

export const hintText = (slug: string, index: number) => KEY.hints?.[slug]?.[index] ?? null;

export const writeupText = (slug: string) => KEY.writeups?.[slug] ?? null;
