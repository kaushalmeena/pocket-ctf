import { count, gte, inArray } from "drizzle-orm";

import { BY_SLUG, CHALLENGES } from "./catalogue";
import { db } from "./db";
import { eggs, players, solves } from "./schema";

/**
 * How rare each trophy is: the share of hunters who hold it.
 *
 * A new deployment has no hunters, and a young one has so few that the real
 * figure is noise -- the first player to find anything would make it "100%
 * of hunters". So every trophy starts from a guess (`prior`), counted as if
 * PSEUDO_HUNTERS imaginary players had already played, and real finds outvote
 * the guess as players arrive. By a few hundred players the guess is a
 * rounding error.
 */

const PSEUDO_HUNTERS = 25;

/** Counting is a few aggregate queries; once a minute is plenty. */
const TTL_MS = 60_000;

type Census = {
  hunters: number;
  flags: Map<string, number>;
  eggs: Map<string, number>;
  platinum: number;
  at: number;
};

const holder = globalThis as { pocketCtfCensus?: Census };

async function take(): Promise<Census> {
  const slugs = CHALLENGES.map((c) => c.slug);
  const [[hunters], flagRows, eggRows, [platinum]] = await Promise.all([
    db().select({ n: count() }).from(players),
    db().select({ key: solves.slug, n: count() }).from(solves).groupBy(solves.slug),
    db().select({ key: eggs.egg, n: count() }).from(eggs).groupBy(eggs.egg),
    db()
      .select({ n: count() })
      .from(
        db()
          .select({ id: solves.playerId })
          .from(solves)
          .where(inArray(solves.slug, slugs))
          .groupBy(solves.playerId)
          .having(({ id }) => gte(count(id), slugs.length))
          .as("finished"),
      ),
  ]);
  return {
    hunters: hunters?.n ?? 0,
    flags: new Map(flagRows.map((r) => [r.key, r.n])),
    eggs: new Map(eggRows.map((r) => [r.key, r.n])),
    platinum: platinum?.n ?? 0,
    at: Date.now(),
  };
}

/**
 * Pass `fresh` straight after writing a find, so the toast for it counts it.
 * Everything else reads a count up to a minute old.
 */
async function census(fresh: boolean) {
  const cached = holder.pocketCtfCensus;
  if (!fresh && cached && Date.now() - cached.at < TTL_MS) return cached;
  holder.pocketCtfCensus = await take();
  return holder.pocketCtfCensus;
}

/** A percentage, one decimal place. */
const blend = (found: number, hunters: number, prior: number) =>
  Math.round(((found + prior * PSEUDO_HUNTERS) / (hunters + PSEUDO_HUNTERS)) * 1000) / 10;

/**
 * The guess for a flag nobody has counted yet: cheap flags are common, and the
 * curve falls away so the 250-point finale starts out around one in twenty.
 */
const flagPrior = (points: number) => 0.75 * Math.exp(-(points - 25) / 90);

const PLATINUM_PRIOR = 0.02;

export type Rarity = {
  /** A flag, by slug. Its prior comes from its points. */
  flag: (slug: string) => number;
  /** A secret trophy. Its prior is the caller's guess, kept beside its quip. */
  egg: (name: string, prior: number) => number;
  platinum: () => number;
};

export async function rarity({ fresh = false } = {}): Promise<Rarity> {
  const c = await census(fresh);
  return {
    flag: (slug) =>
      blend(c.flags.get(slug) ?? 0, c.hunters, flagPrior(BY_SLUG.get(slug)?.points ?? 100)),
    egg: (name, prior) => blend(c.eggs.get(name) ?? 0, c.hunters, prior),
    platinum: () => blend(c.platinum, c.hunters, PLATINUM_PRIOR),
  };
}
