import { Lock, Sparkles, Trophy } from "lucide-solid";
import { Show } from "solid-js";

import type { TrophyTier } from "~/lib/types";

export const TIER_LABEL: Record<TrophyTier, string> = {
  bronze: "Bronze",
  silver: "Silver",
  gold: "Gold",
  platinum: "Platinum",
  secret: "Secret",
};

/**
 * A trophy in its metal. The colours live in app.css as `.tier-*`, the one
 * sanctioned exception to the single-accent rule: a trophy's grade is
 * information, and four greys would not carry it.
 */
export function TrophyIcon(props: { tier: TrophyTier; size?: number; locked?: boolean }) {
  const size = () => props.size ?? 20;
  return (
    <span
      class={`tier-${props.tier} trophy-disc inline-flex shrink-0 items-center justify-center rounded-full`}
      classList={{ "trophy-locked": props.locked }}
      style={{ width: `${size() * 2}px`, height: `${size() * 2}px` }}
      aria-hidden="true"
    >
      <Show when={!props.locked} fallback={<Lock size={size() * 0.8} />}>
        <Show when={props.tier === "secret"} fallback={<Trophy size={size()} />}>
          <Sparkles size={size()} />
        </Show>
      </Show>
    </span>
  );
}
