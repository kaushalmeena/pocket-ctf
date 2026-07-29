import { createFileRoute } from "@tanstack/solid-router";
import { createSignal, For, Show } from "solid-js";
import { Pill } from "~/components/Pill";
import { ACHIEVEMENTS, earnedAchievements } from "~/lib/achievements";
import { CATEGORY_LABELS, type Category, CHALLENGES } from "~/lib/challenges";
import { useProgress } from "~/lib/store";

export const Route = createFileRoute("/progress")({
  component: ProgressPage,
  head: () => ({ meta: [{ title: "Progress — Pocket CTF" }] }),
});

function ProgressPage() {
  const { state, stats, ready, reset, exportState, importState } = useProgress();
  const [notice, setNotice] = createSignal<string | null>(null);
  const [confirming, setConfirming] = createSignal(false);

  const earned = () => new Set(earnedAchievements(state(), stats()).map((a) => a.id));
  const percent = () => Math.round((stats().solved / stats().total) * 100);

  /** Solved challenges paired with their record, in challenge order. */
  const solveLog = () =>
    CHALLENGES.flatMap((challenge) => {
      const record = state().solves[challenge.slug];
      return record ? [{ challenge, record }] : [];
    });

  const download = () => {
    const blob = new Blob([exportState()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "pocket-ctf-progress.json";
    a.click();
    URL.revokeObjectURL(url);
    setNotice("Exported. The file holds proofs, not flags.");
  };

  const upload = async (event: Event) => {
    const file = (event.currentTarget as HTMLInputElement).files?.[0];
    if (!file) return;
    const result = await importState(await file.text());
    setNotice(result.message);
  };

  return (
    <div class="space-y-10">
      <header class="space-y-2">
        <h1 class="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Progress
        </h1>
        <p class="text-sm text-zinc-600 dark:text-zinc-400">
          Stored in this browser only. No account, no sync, nothing sent anywhere.
        </p>
      </header>

      <Show when={ready()} fallback={<p class="text-sm text-zinc-400">Verifying solves…</p>}>
        <section class="space-y-4">
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Solved" value={`${stats().solved}/${stats().total}`} />
            <Stat label="Score" value={`${stats().score}`} sub={`of ${stats().maxScore}`} />
            <Stat label="Hints used" value={`${stats().hintsUsed}`} />
            <Stat
              label="Fastest solve"
              value={
                stats().fastestMs === null
                  ? "—"
                  : `${Math.round((stats().fastestMs ?? 0) / 1000)}s`
              }
            />
          </div>

          <div>
            <div
              class="h-2 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800"
              role="progressbar"
              aria-valuenow={percent()}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Challenges solved"
            >
              <div
                class="h-full rounded-full bg-accent-500 transition-[width] duration-500"
                style={{ width: `${percent()}%` }}
              />
            </div>
            <p class="pt-1.5 font-mono text-xs text-zinc-400 dark:text-zinc-600">
              {percent()}% complete
            </p>
          </div>
        </section>

        <Section title="By category">
          <div class="grid gap-2 sm:grid-cols-2">
            <For each={Object.entries(stats().byCategory)}>
              {([category, bucket]) => (
                <div class="flex items-center gap-3 rounded-lg border border-zinc-200 px-3 py-2 dark:border-zinc-800">
                  <span class="text-sm text-zinc-700 dark:text-zinc-300">
                    {CATEGORY_LABELS[category as Category] ?? category}
                  </span>
                  <span class="ml-auto font-mono text-xs text-zinc-400 tabular-nums dark:text-zinc-600">
                    {bucket.solved}/{bucket.total}
                  </span>
                </div>
              )}
            </For>
          </div>
        </Section>

        <Section title={`Badges — ${earned().size}/${ACHIEVEMENTS.length}`}>
          <ul class="grid gap-2 sm:grid-cols-2">
            <For each={ACHIEVEMENTS}>
              {(achievement) => {
                const has = () => earned().has(achievement.id);
                const hide = () => achievement.secret && !has();
                return (
                  <li
                    class="flex gap-3 rounded-lg border px-3 py-2.5 transition-colors"
                    classList={{
                      "border-accent-200 bg-accent-50/50 dark:border-accent-900 dark:bg-accent-950/30":
                        has(),
                      "border-zinc-200 dark:border-zinc-800": !has(),
                    }}
                  >
                    <span
                      aria-hidden="true"
                      class="mt-0.5 text-sm"
                      classList={{
                        "text-accent-600 dark:text-accent-400": has(),
                        "text-zinc-300 dark:text-zinc-700": !has(),
                      }}
                    >
                      {hide() ? "?" : achievement.icon}
                    </span>
                    <span>
                      <span
                        class="block text-sm font-medium"
                        classList={{
                          "text-zinc-900 dark:text-zinc-100": has(),
                          "text-zinc-500 dark:text-zinc-500": !has(),
                        }}
                      >
                        {hide() ? "Hidden badge" : achievement.title}
                      </span>
                      <span class="block text-xs text-zinc-500 dark:text-zinc-500">
                        {hide()
                          ? "You'll know it when you earn it. You won't be proud."
                          : achievement.description}
                      </span>
                    </span>
                  </li>
                );
              }}
            </For>
          </ul>
        </Section>

        <Section title="Solve log">
          <Show
            when={stats().solved > 0}
            fallback={
              <p class="text-sm text-zinc-500 dark:text-zinc-500">
                Nothing yet. That is the correct amount for someone who has just arrived.
              </p>
            }
          >
            <ul class="divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200 dark:divide-zinc-900 dark:border-zinc-800">
              <For each={solveLog()}>
                {({ challenge, record }) => (
                  <li class="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 text-sm">
                    <span class="font-medium text-zinc-800 dark:text-zinc-200">
                      {challenge.title}
                    </span>
                    <span class="font-mono text-xs text-zinc-400 dark:text-zinc-600">
                      {new Date(record.solvedAt).toLocaleDateString()}
                    </span>
                    <span class="ml-auto flex items-center gap-1.5">
                      <Show when={record.tries > 0}>
                        <Pill title="Wrong submissions before solving">
                          {`${record.tries} miss${record.tries === 1 ? "" : "es"}`}
                        </Pill>
                      </Show>
                      <Show when={record.hintsUsed > 0}>
                        <Pill title="Hints revealed">
                          {`${record.hintsUsed} hint${record.hintsUsed === 1 ? "" : "s"}`}
                        </Pill>
                      </Show>
                      <Show when={record.elapsedMs > 0}>
                        <Pill title="Time from opening the page to solving">
                          <span class="tabular-nums">
                            {Math.round(record.elapsedMs / 1000)}s
                          </span>
                        </Pill>
                      </Show>
                    </span>
                  </li>
                )}
              </For>
            </ul>
          </Show>
        </Section>

        <Section title="Your data">
          <div class="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={download}
              class="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
            >
              Export
            </button>
            <label class="cursor-pointer rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900">
              Import
              <input type="file" accept="application/json" class="hidden" onChange={upload} />
            </label>
            <Show
              when={confirming()}
              fallback={
                <button
                  type="button"
                  onClick={() => setConfirming(true)}
                  class="ml-auto rounded-lg px-3 py-1.5 text-sm text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
                >
                  Reset everything
                </button>
              }
            >
              <span class="ml-auto flex items-center gap-2">
                <span class="text-xs text-zinc-500">Erase all solves?</span>
                <button
                  type="button"
                  onClick={() => {
                    reset();
                    setConfirming(false);
                    setNotice("Progress cleared.");
                  }}
                  class="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-rose-500"
                >
                  Yes, reset
                </button>
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  class="rounded-lg px-2 py-1.5 text-sm text-zinc-500"
                >
                  Cancel
                </button>
              </span>
            </Show>
          </div>
          <Show when={notice()}>
            <p class="animate-rise pt-2 text-sm text-zinc-600 dark:text-zinc-400">{notice()}</p>
          </Show>
          <p class="prose-mini pt-2">
            An exported file contains proof-of-solve tokens, not flags. Importing someone else's
            file works, because they did solve it — that's sharing answers, and no offline
            scoreboard can prevent it. Importing a file you wrote by hand does not work, because
            the tokens won't verify.
          </p>
        </Section>
      </Show>
    </div>
  );
}

function Stat(props: { label: string; value: string; sub?: string }) {
  return (
    <div class="rounded-xl border border-zinc-200 px-3 py-2.5 dark:border-zinc-800">
      <p class="text-xs text-zinc-500 dark:text-zinc-500">{props.label}</p>
      <p class="pt-0.5 font-mono text-lg text-zinc-900 tabular-nums dark:text-zinc-100">
        {props.value}
        <Show when={props.sub}>
          <span class="text-xs text-zinc-400 dark:text-zinc-600"> {props.sub}</span>
        </Show>
      </p>
    </div>
  );
}

function Section(props: { title: string; children: unknown }) {
  return (
    <section class="space-y-3">
      <h2 class="border-b border-zinc-200 pb-2 text-sm font-semibold tracking-wide text-zinc-900 uppercase dark:border-zinc-800 dark:text-zinc-100">
        {props.title}
      </h2>
      {props.children as never}
    </section>
  );
}
