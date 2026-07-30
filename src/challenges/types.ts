import type { Component } from "solid-js";

export type Difficulty = "easy" | "medium" | "hard";

export type Category =
  | "recon"
  | "stego"
  | "encoding"
  | "audio"
  | "web"
  | "math"
  | "crypto"
  | "forensics"
  | "reversing";

/**
 * Everything about a challenge that is safe to read.
 *
 * Hints and writeups are deliberately absent: they live in the answer key and
 * ship encrypted. Only the count is public, and that comes from the registry.
 */
export type ChallengeMeta = {
  /** Directory name under src/challenges, and the URL segment. */
  slug: string;
  title: string;
  /** One line for the index. Should intrigue without instructing. */
  tagline: string;
  category: Category;
  difficulty: Difficulty;
  points: number;
};

/**
 * A challenge module: its metadata and the component that renders the puzzle.
 *
 * `Page` receives the payload this deployment generated for that slug. It is
 * typed loosely on purpose -- each challenge knows the shape its own builder
 * produces, and pinning it here would mean one union that every challenge has
 * to be added to, which is exactly the coupling this layout removes.
 */
export type ChallengeModule = {
  meta: ChallengeMeta;
  // biome-ignore lint/suspicious/noExplicitAny: payload shape is per-challenge
  Page: Component<{ payload: any }>;
};
