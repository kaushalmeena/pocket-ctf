import { createFileRoute, Link } from "@tanstack/solid-router";
import { For, Show } from "solid-js";
import { CategoryPill, DifficultyPill } from "~/components/Pill";
import { CHALLENGES, type Challenge, TOTAL_POINTS } from "~/lib/challenges";
import { useProgress } from "~/lib/store";

export const Route = createFileRoute("/challenges")({
  component: ChallengeIndex,
  head: () => ({ meta: [{ title: "Challenges — Pocket CTF" }] }),
});

function ChallengeIndex() {
  const { stats, ready, rejected } = useProgress();

  return (
    <div class="space-y-6">
      <header class="space-y-2">
        <h1 class="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Challenges
        </h1>
        <p class="text-sm text-zinc-600 dark:text-zinc-400">
          Roughly in order of difficulty, but nothing stops you jumping around.
          <Show when={ready()}>
            {" "}
            <span class="font-mono text-zinc-500">
              {stats().solved}/{stats().total} solved · {stats().score}/{TOTAL_POINTS} pts
            </span>
          </Show>
        </p>
      </header>

      <Show when={rejected().length > 0}>
        <p class="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
          {rejected().length} stored solve{rejected().length === 1 ? "" : "s"} failed
          verification and {rejected().length === 1 ? "was" : "were"} discarded. Solve records
          are proofs, not flags — editing them doesn't work.
        </p>
      </Show>

      <ul class="space-y-2">
        <For each={CHALLENGES}>{(challenge) => <Row challenge={challenge} />}</For>
      </ul>
    </div>
  );
}

function Row(props: { challenge: Challenge }) {
  const { state, unlocked, ready } = useProgress();

  const record = () => state().solves[props.challenge.slug];
  const locked = () => ready() && !unlocked(props.challenge);
  const hintsTaken = () => state().hints[props.challenge.slug] ?? 0;

  return (
    <li>
      <Link
        to={props.challenge.path}
        class="group flex items-start gap-3.5 rounded-xl border border-zinc-200 px-4 py-3.5 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:border-zinc-700 dark:hover:bg-zinc-900/60"
        classList={{ "opacity-60": locked() }}
      >
        <span
          aria-hidden="true"
          class="mt-1 flex size-4 shrink-0 items-center justify-center rounded-full border text-[0.6rem] transition-colors"
          classList={{
            "border-accent-500 bg-accent-500 text-white": Boolean(record()),
            "border-zinc-300 dark:border-zinc-700": !record(),
          }}
        >
          <Show when={record()}>✓</Show>
        </span>

        <span class="min-w-0 flex-1">
          <span class="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <span class="font-medium text-zinc-900 dark:text-zinc-100">
              {props.challenge.title}
            </span>
            <Show when={locked()}>
              <span class="font-mono text-[0.7rem] text-zinc-400 dark:text-zinc-600">
                locked
              </span>
            </Show>
          </span>
          <span class="mt-0.5 block text-sm text-zinc-500 dark:text-zinc-500">
            {props.challenge.tagline}
          </span>
          <span class="mt-2 flex flex-wrap items-center gap-1.5">
            <CategoryPill category={props.challenge.category} />
            <DifficultyPill difficulty={props.challenge.difficulty} />
            <Show when={hintsTaken() > 0}>
              <span class="font-mono text-[0.7rem] text-amber-600 dark:text-amber-500">
                {hintsTaken()} hint{hintsTaken() === 1 ? "" : "s"}
              </span>
            </Show>
          </span>
        </span>

        <span class="shrink-0 pt-0.5 font-mono text-xs text-zinc-400 tabular-nums dark:text-zinc-600">
          {props.challenge.points}
        </span>
      </Link>
    </li>
  );
}
