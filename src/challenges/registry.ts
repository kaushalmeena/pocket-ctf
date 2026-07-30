import registry from "~/lib/generated/registry.json";
import type { ChallengeMeta, ChallengeModule } from "./types";

/**
 * Every challenge, discovered from the filesystem.
 *
 * Adding a challenge means adding a directory; removing one means deleting it.
 * There is no list to keep in sync, which is the point -- the previous design
 * had a slug in a metadata array, a route file, a builder, a solver and an entry
 * in the answer key, and forgetting any one of them failed in a different way.
 *
 * `eager` because the ordering below needs every module up front, and because
 * the whole site is prerendered anyway: there is no route-level code splitting
 * to preserve.
 */
const modules = import.meta.glob<ChallengeModule>("./*/index.ts", { eager: true });

const discovered = Object.values(modules);

/**
 * Presentation order: easiest first, then by points.
 *
 * Derived rather than hand-listed so a new challenge slots itself in. The
 * generated registry's `order` is the authority for anything cryptographic;
 * this is purely what the player sees.
 */
const DIFFICULTY_RANK = { easy: 0, medium: 1, hard: 2 } as const;

export const CHALLENGES: ChallengeMeta[] = discovered
  .map((m) => m.meta)
  .sort(
    (a, b) =>
      DIFFICULTY_RANK[a.difficulty] - DIFFICULTY_RANK[b.difficulty] ||
      a.points - b.points ||
      a.slug.localeCompare(b.slug),
  );

export const CHALLENGE_BY_SLUG: Record<string, ChallengeMeta> = Object.fromEntries(
  CHALLENGES.map((c) => [c.slug, c]),
);

const MODULE_BY_SLUG: Record<string, ChallengeModule> = Object.fromEntries(
  discovered.map((m) => [m.meta.slug, m]),
);

export const pageFor = (slug: string) => MODULE_BY_SLUG[slug]?.Page;

/** Route path for a challenge. One dynamic route serves all of them. */
export const pathFor = (slug: string) => `/c/${slug}`;

export const TOTAL_POINTS = CHALLENGES.reduce((sum, c) => sum + c.points, 0);

/**
 * Cross-check the discovered challenges against the generated registry.
 *
 * A directory with no generated data is a page that cannot verify a submission;
 * generated data with no directory is an orphaned hash. Both are silent at
 * runtime, so this runs at module scope and throws -- prerendering imports every
 * route, which turns either mistake into a failed build.
 */
function audit() {
  const generated = new Set<string>(registry.order);
  const declared = new Set(CHALLENGES.map((c) => c.slug));

  const missingData = [...declared].filter((s) => !generated.has(s));
  const orphaned = [...generated].filter((s) => !declared.has(s));

  if (missingData.length > 0) {
    throw new Error(
      `challenges with no generated data (run pnpm gen): ${missingData.join(", ")}`,
    );
  }
  if (orphaned.length > 0) {
    throw new Error(`generated data with no challenge directory: ${orphaned.join(", ")}`);
  }
}

audit();
