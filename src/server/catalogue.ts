import type { ChallengeMeta, Tier } from "~/challenges/types";
import payloads from "~/lib/generated/payloads.json";
import registry from "~/lib/generated/registry.json";
import { fromHex, SEALED, unseal } from "~/lib/kdf.js";

/**
 * Every challenge, and everything the generator derived for it.
 *
 * Server-only. Titles, clues, digests and puzzle payloads all live here, and
 * the browser is handed them one piece at a time by the functions in game.ts
 * and plants.ts -- never as a list.
 */

type Sealed = { salt: string; iv: string; ct: string };
type Variant = { digest: string; writeup: Sealed; hints: Sealed[] };

const modules = import.meta.glob<{ meta: ChallengeMeta }>("../challenges/*/meta.ts", {
  eager: true,
});

const TIER_RANK: Record<Tier, number> = { bronze: 0, silver: 1, gold: 2 };

/** Trophy-case order: cheapest first. A slot's position is its only public name. */
export const CHALLENGES: ChallengeMeta[] = Object.values(modules)
  .map((m) => m.meta)
  .sort(
    (a, b) =>
      TIER_RANK[a.tier] - TIER_RANK[b.tier] ||
      a.points - b.points ||
      a.slug.localeCompare(b.slug),
  );

export const BY_SLUG = new Map(CHALLENGES.map((c) => [c.slug, c]));
export const MAX_SCORE = CHALLENGES.reduce((sum, c) => sum + c.points, 0);
export const IS_SAMPLE = registry.sample === true;
export const PEPPER: string = registry.pepper;

const entries = registry.challenges as Record<string, { variants: Variant[] }>;

/*
 * A directory with no generated data cannot check a submission; generated data
 * with no directory is an orphaned digest. Both are silent at runtime, so this
 * throws at module scope and the server refuses to start instead.
 */
{
  const declared = CHALLENGES.map((c) => c.slug);
  const missing = declared.filter((s) => !entries[s]);
  const orphaned = Object.keys(entries).filter((s) => !BY_SLUG.has(s));
  if (missing.length > 0) {
    throw new Error(`challenges with no generated data (run pnpm gen): ${missing.join(", ")}`);
  }
  if (orphaned.length > 0) {
    throw new Error(`generated data with no challenge directory: ${orphaned.join(", ")}`);
  }
}

/** Which challenge and variant a flag digest belongs to. */
export const FLAGS = new Map<string, { slug: string; variant: number }>(
  Object.entries(entries).flatMap(([slug, entry]) =>
    entry.variants.map((v, variant) => [v.digest, { slug, variant }] as const),
  ),
);

/** Decoy digest -> what to say to whoever submits it. */
export const DECOYS = new Map<string, string>(
  (registry.honeypots as { digest: string; message: string }[]).map((h) => [
    h.digest,
    h.message,
  ]),
);

export const variantCount = (slug: string) => entries[slug]?.variants.length ?? 1;

/** The puzzle data one variant ships. Shape is each challenge's own business. */
// oxlint-disable-next-line typescript/no-explicit-any -- payload shape is per-challenge
export function payloadOf(slug: string, variant: number): any {
  const entry = (payloads as unknown as Record<string, { variants: unknown[] }>)[slug];
  return entry?.variants[variant];
}

/*
 * Opening a seal costs a PBKDF2 run, and the answer never changes, so each one
 * is paid for once per server process.
 */
const opened = new Map<string, Promise<string | null>>();

function open(secret: string, sealed: Sealed | undefined) {
  if (!sealed) return Promise.resolve(null);
  let pending = opened.get(secret);
  if (!pending) {
    pending = unseal(secret, fromHex(sealed.salt), sealed.ct, fromHex(sealed.iv));
    opened.set(secret, pending);
  }
  return pending;
}

export const hintCount = (slug: string) => entries[slug]?.variants[0]?.hints.length ?? 0;

export const hintText = (slug: string, variant: number, index: number) =>
  open(SEALED.hint(slug, variant, index), entries[slug]?.variants[variant]?.hints[index]);

export const writeupText = (slug: string, variant: number) =>
  open(SEALED.writeup(slug, variant), entries[slug]?.variants[variant]?.writeup);

/** For the two challenges whose flag the server hands over itself. */
export const vaultFlag = (slug: string, variant: number) =>
  open(SEALED.vault(slug, variant), payloadOf(slug, variant)?.sealed);
