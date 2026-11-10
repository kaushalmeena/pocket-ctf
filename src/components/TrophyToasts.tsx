import { createEffect, createSignal, on, onCleanup, Show } from "solid-js";

import { chime } from "~/lib/chime";
import { type Toast, useGame } from "~/lib/game";

import { TIER_LABEL, TrophyIcon } from "./TrophyIcon";

/** How long a trophy holds the corner before making way for the next. */
const HOLD_MS = 6500;
const LEAVE_MS = 320;

/**
 * Trophies, announced one at a time in the top-right corner.
 *
 * One at a time on purpose: a flag that also completes the set earns two, and
 * stacking them would bury the one that matters under the one that came first.
 */
export function TrophyToasts() {
  const { toasts, dismiss } = useGame();
  const current = () => toasts()[0];
  const [leaving, setLeaving] = createSignal(false);

  let hold: ReturnType<typeof setTimeout> | undefined;
  let leave: ReturnType<typeof setTimeout> | undefined;

  const close = (toast: Toast) => {
    clearTimeout(hold);
    setLeaving(true);
    leave = setTimeout(() => {
      setLeaving(false);
      dismiss(toast.id);
    }, LEAVE_MS);
  };

  createEffect(
    on(
      () => current()?.id,
      () => {
        const toast = current();
        if (!toast) return;
        chime(toast.tier);
        hold = setTimeout(() => close(toast), HOLD_MS);
      },
    ),
  );

  onCleanup(() => {
    clearTimeout(hold);
    clearTimeout(leave);
  });

  const handleDismiss = () => {
    const toast = current();
    if (toast) close(toast);
  };

  return (
    <div
      class="pointer-events-none fixed top-4 right-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] justify-end"
      role="status"
      aria-live="polite"
    >
      <Show when={current()} keyed>
        {(toast) => (
          <button
            type="button"
            onClick={handleDismiss}
            class={`trophy-toast tier-${toast.tier} pointer-events-auto flex w-full items-center gap-3.5 rounded-2xl p-3 pr-5 text-left`}
            classList={{ "trophy-toast-leaving": leaving() }}
          >
            <TrophyIcon tier={toast.tier} size={22} />
            <span class="min-w-0 flex-1">
              <span class="flex items-center gap-2 font-mono text-[0.65rem] tracking-widest text-zinc-400 uppercase">
                <span class="trophy-ink">{TIER_LABEL[toast.tier]} trophy</span>
                <Show when={toast.points !== undefined}>
                  <span>+{toast.points}</span>
                </Show>
                <Show when={toast.firstBlood}>
                  <span class="text-rose-400">first blood</span>
                </Show>
              </span>
              <span class="block truncate pt-0.5 text-[0.95rem] font-semibold text-white">
                {toast.title}
              </span>
              <span class="block pt-0.5 text-xs leading-snug text-zinc-400">{toast.quip}</span>
              <Show when={toast.fragment}>
                {(fragment) => (
                  <span class="block pt-1.5 font-mono text-[0.65rem] tracking-widest text-zinc-500 uppercase">
                    fragment {fragment().n}/{fragment().of} ·{" "}
                    <span class="trophy-ink normal-case">{fragment().text}</span>
                  </span>
                )}
              </Show>
            </span>
          </button>
        )}
      </Show>
    </div>
  );
}
