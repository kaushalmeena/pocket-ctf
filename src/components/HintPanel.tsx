import { Lightbulb } from "lucide-solid";
import { For, Show } from "solid-js";
import { type Challenge, HINT_COST_RATIO, pointsAfterHints } from "~/lib/challenges";
import { useProgress } from "~/lib/store";

export function HintPanel(props: { challenge: Challenge }) {
  const { state, revealHint } = useProgress();

  const used = () => state().hints[props.challenge.slug] ?? 0;
  const solved = () => state().solves[props.challenge.slug];
  const total = () => props.challenge.hints.length;
  const worth = () => pointsAfterHints(props.challenge, used());

  return (
    <section class="rounded-xl border border-zinc-200 dark:border-zinc-800">
      <div class="flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-zinc-200 px-4 py-3 dark:border-zinc-800">
        <h2 class="flex items-center gap-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          <Lightbulb aria-hidden="true" size={15} class="text-zinc-400 dark:text-zinc-600" />
          Hints
        </h2>
        <span class="font-mono text-xs text-zinc-400 dark:text-zinc-600">
          {used()}/{total()} revealed
        </span>
        <span class="ml-auto font-mono text-xs text-zinc-500 dark:text-zinc-500">
          worth {worth()}
          <Show when={worth() < props.challenge.points}>
            <span class="text-zinc-300 line-through dark:text-zinc-700">
              {" "}
              {props.challenge.points}
            </span>
          </Show>{" "}
          pts
        </span>
      </div>

      <div class="divide-y divide-zinc-100 dark:divide-zinc-900">
        <For each={props.challenge.hints.slice(0, used())}>
          {(hint, i) => (
            <div class="flex gap-3 px-4 py-3">
              <span class="mt-0.5 font-mono text-xs text-zinc-400 dark:text-zinc-600">
                {i() + 1}
              </span>
              <p class="prose-mini flex-1">{hint}</p>
            </div>
          )}
        </For>
      </div>

      <Show
        when={used() < total()}
        fallback={
          <Show when={total() > 0}>
            <p class="px-4 py-3 text-xs text-zinc-400 dark:text-zinc-600">
              That's all of them. The rest is the writeup, and the writeup needs the flag.
            </p>
          </Show>
        }
      >
        <div class="flex flex-wrap items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => revealHint(props.challenge.slug)}
            class="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 transition-colors hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-900"
          >
            Reveal hint {used() + 1}
          </button>
          <span class="text-xs text-zinc-400 dark:text-zinc-600">
            <Show when={!solved()} fallback="Already solved — this one is free.">
              costs {Math.round(HINT_COST_RATIO * 100)}% of the points
            </Show>
          </span>
        </div>
      </Show>
    </section>
  );
}
