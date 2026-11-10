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
    }
  | {
      found: false;
      tier: TrophyTier;
      /** What it is worth right now, after any clues taken. */
      points: number;
      clues: string[];
      cluesLeft: number;
      /** What the next clue would leave it worth. */
      nextWorth: number | null;
    };

export type TrophyCase = {
  me: Me;
  slots: Slot[];
  secrets: { title: string; quip: string; foundAt: number }[];
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
