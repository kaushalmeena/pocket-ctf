/** Trophy grade. Platinum is not a challenge: it is what finding them all earns. */
export type Tier = "bronze" | "silver" | "gold";

/**
 * Everything about a challenge that is not derived from its flag.
 *
 * All of it is a spoiler. Nothing on the site lists the challenges, so a title
 * or a `whereabouts` reaching the browser early would undo the hunt -- this type
 * is only ever imported by server code, and its fields are released one at a
 * time: `whereabouts` when a player pays for the first clue, `title` and `quip`
 * when they submit the flag.
 */
export type ChallengeMeta = {
  /** Directory name under src/challenges. Never shown to a player. */
  slug: string;
  /** The trophy's name, revealed on the solve. */
  title: string;
  /** One witty line for the trophy toast. */
  quip: string;
  /** The first clue: where to look, never how to solve. */
  whereabouts: string;
  tier: Tier;
  points: number;
};
