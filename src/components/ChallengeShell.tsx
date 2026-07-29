import { Link } from "@tanstack/solid-router";
import { createEffect, createSignal, type JSX, onCleanup, onMount, Show } from "solid-js";
import { FlagForm } from "~/components/FlagForm";
import { HintPanel } from "~/components/HintPanel";
import { Markdown } from "~/components/Markdown";
import { CategoryPill, DifficultyPill, Pill } from "~/components/Pill";
import { CHALLENGES, type Challenge } from "~/lib/challenges";
import { useProgress } from "~/lib/store";

function formatDuration(ms: number) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}:${String(s % 60).padStart(2, "0")}`;
  return `${Math.floor(m / 60)}h ${m % 60}m`;
}

/**
 * Every challenge page is this frame plus a body. Keeps the puzzle files free
 * to be about the puzzle: the timer, hints, submission, gating and writeup
 * behave identically everywhere.
 */
export function ChallengeShell(props: { challenge: Challenge; children: JSX.Element }) {
  const { state, markOpened, writeup, unlocked, ready } = useProgress();
  const [now, setNow] = createSignal(Date.now());
  const [writeupText, setWriteupText] = createSignal<string | null>(null);
  const [showWriteup, setShowWriteup] = createSignal(false);

  const index = () => CHALLENGES.findIndex((c) => c.slug === props.challenge.slug);
  const next = () => CHALLENGES[index() + 1];
  const record = () => state().solves[props.challenge.slug];

  // Start the clock only once the store has finished re-verifying stored
  // tokens. Writing on mount would race that async load and be overwritten by
  // it, which quietly pinned every solve time to zero. markOpened is
  // idempotent, so re-running the effect is harmless.
  createEffect(() => {
    if (ready()) markOpened(props.challenge.slug);
  });

  onMount(() => {
    const ticker = setInterval(() => setNow(Date.now()), 1000);
    onCleanup(() => clearInterval(ticker));
  });

  const elapsed = () => {
    const solved = record();
    if (solved) return solved.elapsedMs;
    const opened = state().openedAt[props.challenge.slug];
    return opened ? now() - opened : 0;
  };

  const openWriteup = async () => {
    setShowWriteup(true);
    if (writeupText() === null) setWriteupText(await writeup(props.challenge.slug));
  };

  return (
    <article class="space-y-8">
      <header class="space-y-3">
        <div class="flex items-center gap-2 text-xs">
          <Link
            to="/challenges"
            class="text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-500 dark:hover:text-zinc-100"
          >
            ← All challenges
          </Link>
          <span class="font-mono text-zinc-300 dark:text-zinc-700">
            {String(index() + 1).padStart(2, "0")}/{CHALLENGES.length}
          </span>
        </div>

        <h1 class="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl dark:text-zinc-50">
          {props.challenge.title}
        </h1>

        <div class="flex flex-wrap items-center gap-2">
          <CategoryPill category={props.challenge.category} />
          <DifficultyPill difficulty={props.challenge.difficulty} />
          <Pill title="Points before hint deductions">{`${props.challenge.points} pts`}</Pill>
          <Show when={ready() && elapsed() > 0}>
            <Pill title={record() ? "Time taken" : "Time on this challenge"}>
              <span class="tabular-nums">{formatDuration(elapsed())}</span>
            </Pill>
          </Show>
        </div>

        <p class="text-[1.05rem] text-zinc-600 dark:text-zinc-400">{props.challenge.tagline}</p>
      </header>

      <Show
        when={!ready() || unlocked(props.challenge)}
        fallback={<LockedNotice challenge={props.challenge} />}
      >
        <div class="space-y-8">
          {props.children}

          <FlagForm challenge={props.challenge} />
          <HintPanel challenge={props.challenge} />

          <Show when={record()}>
            <section class="rounded-xl border border-zinc-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={openWriteup}
                class="flex w-full items-center gap-2 px-4 py-3 text-left text-sm font-semibold text-zinc-900 dark:text-zinc-100"
                aria-expanded={showWriteup()}
              >
                Writeup
                <span class="font-mono text-xs font-normal text-zinc-400 dark:text-zinc-600">
                  decrypted with your solve
                </span>
                <span
                  aria-hidden="true"
                  class="ml-auto text-zinc-400 transition-transform dark:text-zinc-600"
                  classList={{ "rotate-90": showWriteup() }}
                >
                  ›
                </span>
              </button>
              <Show when={showWriteup()}>
                <div class="animate-rise border-t border-zinc-200 px-4 py-4 dark:border-zinc-800">
                  <Show
                    when={writeupText()}
                    fallback={<p class="text-sm text-zinc-400">Decrypting…</p>}
                  >
                    {(text) => <Markdown source={text()} />}
                  </Show>
                </div>
              </Show>
            </section>

            <Show when={next()}>
              {(n) => (
                <Link
                  to={n().path}
                  class="flex items-center justify-between rounded-xl border border-zinc-200 px-4 py-3.5 transition-colors hover:border-zinc-300 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:border-zinc-700 dark:hover:bg-zinc-900"
                >
                  <span>
                    <span class="block text-xs text-zinc-500 dark:text-zinc-500">Next up</span>
                    <span class="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {n().title}
                    </span>
                  </span>
                  <span aria-hidden="true" class="text-zinc-400 dark:text-zinc-600">
                    →
                  </span>
                </Link>
              )}
            </Show>
          </Show>
        </div>
      </Show>
    </article>
  );
}

function LockedNotice(props: { challenge: Challenge }) {
  const { state } = useProgress();
  const missing = () =>
    (props.challenge.requires ?? []).filter((slug) => !state().solves[slug]);

  return (
    <section class="rounded-xl border border-dashed border-zinc-300 p-6 text-center dark:border-zinc-700">
      <p class="text-sm font-medium text-zinc-900 dark:text-zinc-100">Locked</p>
      <p class="prose-mini mx-auto max-w-md pt-2">
        This one needs {missing().length} more solve{missing().length === 1 ? "" : "s"}. Not as
        a formality — the instructions are encrypted with the proof-of-solve tokens from the
        other challenges, so there is nothing here to read yet.
      </p>
      <Link
        to="/challenges"
        class="mt-4 inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
      >
        Back to the list
      </Link>
    </section>
  );
}
