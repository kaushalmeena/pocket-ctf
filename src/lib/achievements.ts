/**
 * Badges. Purely cosmetic, deliberately a little judgemental.
 *
 * Each one is a predicate over the same proof-backed state everything else
 * reads, so an unearned badge would require an unearned solve.
 */

import { CHALLENGES } from "./challenges";
import type { ProgressState, Stats } from "./progress";

export type Achievement = {
  id: string;
  icon: string;
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
    icon: "◗",
    title: "First Blood",
    description: "Solve your first challenge.",
    earned: (_, stats) => stats.solved >= 1,
  },
  {
    id: "clean-hands",
    icon: "◇",
    title: "Clean Hands",
    description: "Solve five challenges without revealing a single hint.",
    earned: (state) => solvedRecords(state).filter((r) => r.hintsUsed === 0).length >= 5,
  },
  {
    id: "one-shot",
    icon: "◎",
    title: "One Shot",
    description: "Solve a challenge on the first submission, with no hints.",
    earned: (state) => solvedRecords(state).some((r) => r.tries === 0 && r.hintsUsed === 0),
  },
  {
    id: "quick-draw",
    icon: "◈",
    title: "Quick Draw",
    description: "Solve anything within ninety seconds of opening it.",
    earned: (state) =>
      solvedRecords(state).some((r) => r.elapsedMs > 0 && r.elapsedMs < 90_000),
  },
  {
    id: "stubborn",
    icon: "◍",
    title: "Stubborn",
    description: "Get a challenge wrong ten times, then get it right.",
    earned: (state) => solvedRecords(state).some((r) => r.tries >= 10),
  },
  {
    id: "polymath",
    icon: "◉",
    title: "Polymath",
    description: "Solve at least one challenge in every category.",
    earned: (_, stats) => Object.values(stats.byCategory).every((bucket) => bucket.solved >= 1),
  },
  {
    id: "night-shift",
    icon: "☾",
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
    icon: "◔",
    title: "Curious Cat",
    description: "Submit a flag you found lying around instead of solving for it.",
    earned: (state) => state.decoysTripped > 0,
    secret: true,
  },
  {
    id: "completionist",
    icon: "●",
    title: "Completionist",
    description: "Solve all eleven challenges.",
    earned: (_, stats) => stats.solved === CHALLENGES.length,
  },
  {
    id: "purist",
    icon: "◆",
    title: "Purist",
    description: "Finish every challenge without revealing one hint.",
    earned: (_, stats) => stats.solved === CHALLENGES.length && stats.hintsUsed === 0,
  },
];

export function earnedAchievements(state: ProgressState, stats: Stats) {
  return ACHIEVEMENTS.filter((a) => a.earned(state, stats));
}
