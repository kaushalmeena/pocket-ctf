import { CHALLENGES } from "./catalogue";
import { type Player, secretOf } from "./players";

/**
 * The last flag has no hiding place of its own. Its address is cut into
 * fragments, and every other flag hands over one of them when it is found.
 */

export const FINALE = "last-word";

/** Characters of the address each trophy carries. */
const WIDTH = 2;

/** Every challenge that carries a fragment, in trophy-case order. */
const CARRIERS = CHALLENGES.filter((c) => c.slug !== FINALE);

/**
 * The address, for this player only. It comes from their own seed, so one
 * player's fragments are no use to another, and at over a hundred bits it is
 * not going to be guessed.
 */
export const finaleKey = (player: Player) =>
  secretOf(player, "finale", CARRIERS.length * WIDTH);

export type Fragment = { n: number; of: number; text: string };

/** The piece of the address a challenge carries, or nothing for the finale. */
export function fragmentOf(player: Player, slug: string): Fragment | undefined {
  const index = CARRIERS.findIndex((c) => c.slug === slug);
  if (index === -1) return undefined;
  return {
    n: index + 1,
    of: CARRIERS.length,
    text: finaleKey(player).slice(index * WIDTH, (index + 1) * WIDTH),
  };
}
