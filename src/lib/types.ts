/**
 * The shapes that cross the wire between the server and the browser.
 *
 * Nothing in here names a challenge before it is solved. A player's view of the
 * hunt is a count, a score and whatever they have already earned.
 */

export type TrophyTier = "bronze" | "silver" | "gold" | "platinum" | "secret";

/** One toast. Flags, easter eggs and the platinum all arrive as this. */
export type Trophy = {
  tier: TrophyTier;
  title: string;
  quip: string;
  /** Absent for trophies that carry no score. */
  points?: number;
  /** Nobody on this deployment had found it before. */
  firstBlood?: boolean;
  fragment?: Fragment;
  /** Share of hunters holding it, as a percentage. See src/server/rarity.ts. */
  rarity?: number;
};

/**
 * A numbered piece of something longer. Every flag but one comes with one, and
 * what they add up to is for the player to work out.
 */
export type Fragment = { n: number; of: number; text: string };

export type Me = {
  handle: string;
  /** False while the handle is the one the server made up. */
  named: boolean;
  /** The GitHub name this progress is claimed under, or null if it is not. */
  account: string | null;
  found: number;
  total: number;
  score: number;
  maxScore: number;
  secrets: number;
  /** 1-based position on the board, or null before the first flag. */
  rank: number | null;
};

/** What the prompt on the front page says back. */
export type Reply = {
  tone: "ok" | "err" | "info";
  lines: string[];
  trophies: Trophy[];
  me: Me;
  /** Wipe the scrollback first. */
  clear?: boolean;
};

/** One slot in the trophy case. Locked slots say nothing about what they are. */
export type Slot =
  | {
      found: true;
      tier: TrophyTier;
      title: string;
      quip: string;
      points: number;
      cluesUsed: number;
      foundAt: number;
      firstBlood: boolean;
      fragment?: Fragment;
      rarity: number;
    }
  | {
      found: false;
      tier: TrophyTier;
      /** What it will pay when found, after any clues taken. */
      points: number;
      /** What it would have paid with no clues. */
      full: number;
      clues: string[];
      cluesLeft: number;
      /** What it would pay after one more clue. */
      nextWorth: number | null;
      rarity: number;
    };

export type TrophyCase = {
  me: Me;
  slots: Slot[];
  secrets: { title: string; quip: string; foundAt: number; rarity: number }[];
  secretsTotal: number;
  platinum: Trophy | null;
};

export type BoardRow = {
  rank: number;
  handle: string;
  found: number;
  score: number;
  lastAt: number;
  you: boolean;
  platinum: boolean;
};
