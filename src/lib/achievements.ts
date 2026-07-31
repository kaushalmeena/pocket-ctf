/**
 * Badges. Purely cosmetic, deliberately a little judgemental.
 *
 * Each one is a predicate over the same proof-backed state everything else
 * reads, so an unearned badge would require an unearned solve.
 */

import type { LucideProps } from "lucide-solid";
import {
  Award,
  Cat,
  Crosshair,
  Droplet,
  Gem,
  Hammer,
  Moon,
  Sparkles,
  Trophy,
  Zap,
} from "lucide-solid";
import type { Component } from "solid-js";
import { CHALLENGES } from "./challenges";
import type { ProgressState, Stats } from "./progress";

export type Achievement = {
  id: string;
  icon: Component<LucideProps>;
  title: string;
  description: string;
  earned: (state: ProgressState, stats: Stats) => boolean;
  /** Shown while unearned, when the badge would otherwise spoil something. */
  secret?: boolean;
};

const solvedRecords = (state: ProgressState) => Object.values(state.solves);

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "first-blood",
    icon: Droplet,
    title: "First Blood",
    description: "Solve your first challenge.",
    earned: (_, stats) => stats.solved >= 1,
  },
  {
    id: "clean-hands",
    icon: Gem,
    title: "Clean Hands",
    description: "Solve five challenges without revealing a single hint.",
    earned: (state) => solvedRecords(state).filter((r) => r.hintsUsed === 0).length >= 5,
  },
  {
    id: "one-shot",
    icon: Crosshair,
    title: "One Shot",
    description: "Solve a challenge on the first submission, with no hints.",
    earned: (state) => solvedRecords(state).some((r) => r.tries === 0 && r.hintsUsed === 0),
  },
  {
    id: "quick-draw",
    icon: Zap,
    title: "Quick Draw",
    description: "Solve anything within ninety seconds of opening it.",
    earned: (state) =>
      solvedRecords(state).some((r) => r.elapsedMs > 0 && r.elapsedMs < 90_000),
  },
  {
    id: "stubborn",
    icon: Hammer,
    title: "Stubborn",
    description: "Get a challenge wrong ten times, then get it right.",
    earned: (state) => solvedRecords(state).some((r) => r.tries >= 10),
  },
  {
    id: "polymath",
    icon: Sparkles,
    title: "Polymath",
    description: "Solve at least one challenge in every category.",
    earned: (_, stats) => Object.values(stats.byCategory).every((bucket) => bucket.solved >= 1),
  },
  {
    id: "night-shift",
    icon: Moon,
    title: "Night Shift",
    description: "Solve something between 1am and 5am. Go to bed.",
    earned: (state) =>
      solvedRecords(state).some((r) => {
        const hour = new Date(r.solvedAt).getHours();
        return hour >= 1 && hour < 5;
      }),
  },
  {
    id: "curious-cat",
    icon: Cat,
    title: "Curious Cat",
    description: "Submit a flag you found lying around instead of solving for it.",
    earned: (state) => state.decoysTripped > 0,
    secret: true,
  },
  {
    id: "completionist",
    icon: Trophy,
    title: "Completionist",
    description: `Solve all ${CHALLENGES.length} challenges.`,
    earned: (_, stats) => stats.solved === CHALLENGES.length,
  },
  {
    id: "purist",
    icon: Award,
    title: "Purist",
    description: "Finish every challenge without revealing one hint.",
    earned: (_, stats) => stats.solved === CHALLENGES.length && stats.hintsUsed === 0,
  },
];

export function earnedAchievements(state: ProgressState, stats: Stats) {
  return ACHIEVEMENTS.filter((a) => a.earned(state, stats));
}
