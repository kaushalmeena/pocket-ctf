import { createFileRoute } from "@tanstack/solid-router";
import { For, Show } from "solid-js";

import { TrophyIcon } from "~/components/TrophyIcon";
import { getBoard } from "~/lib/api";
import { NO_INDEX } from "~/lib/seo";

export const Route = createFileRoute("/board")({
  loader: () => getBoard(),
  head: () => ({ meta: [{ title: "Board — Pocket CTF" }, NO_INDEX] }),
  component: Board,
});

const day = (ms: number) => new Date(ms).toISOString().slice(0, 10);

function Board() {
  const rows = Route.useLoaderData();

  return (
    <div class="animate-rise space-y-8">
      <header class="space-y-3">
        <p class="eyebrow">The board</p>
        <h1 class="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Who has found what.
        </h1>
        <p class="prose-mini max-w-2xl">
          Ranked by score, and by who got there first when scores tie. It says how many flags
          each player holds and nothing about which, so it is no help to you at all.
        </p>
      </header>

      <Show
        when={rows().length > 0}
        fallback={
          <p class="rounded-2xl border border-dashed border-zinc-300 p-8 text-center text-sm text-zinc-500 dark:border-zinc-700">
            Nobody has found anything yet. The top of this page is wide open.
          </p>
        }
      >
        <div class="overflow-hidden rounded-2xl border border-zinc-200 dark:border-zinc-800">
          <table class="w-full text-sm">
            <thead class="border-b border-zinc-200 bg-zinc-50/60 text-left font-mono text-[0.65rem] tracking-widest text-zinc-500 uppercase dark:border-zinc-800 dark:bg-zinc-900/40">
              <tr>
                <th class="w-14 px-4 py-2.5 font-medium">#</th>
                <th class="px-4 py-2.5 font-medium">Player</th>
                <th class="px-4 py-2.5 text-right font-medium">Flags</th>
                <th class="px-4 py-2.5 text-right font-medium">Score</th>
                <th class="hidden px-4 py-2.5 text-right font-medium sm:table-cell">
                  Last find
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-zinc-100 dark:divide-zinc-900">
              <For each={rows()}>
                {(row) => (
                  <tr classList={{ "bg-accent-50 dark:bg-accent-950/40": row.you }}>
                    <td class="px-4 py-2.5 font-mono text-zinc-500 tabular-nums">{row.rank}</td>
                    <td class="px-4 py-2.5">
                      <span class="flex items-center gap-2 font-medium text-zinc-900 dark:text-zinc-100">
                        <span class="truncate">{row.handle}</span>
                        <Show when={row.platinum}>
                          <TrophyIcon tier="platinum" size={9} />
                        </Show>
                        <Show when={row.you}>
                          <span class="font-mono text-[0.65rem] tracking-widest text-accent-700 uppercase dark:text-accent-400">
                            you
                          </span>
                        </Show>
                      </span>
                    </td>
                    <td class="px-4 py-2.5 text-right font-mono tabular-nums">{row.found}</td>
                    <td class="px-4 py-2.5 text-right font-mono font-semibold text-zinc-900 tabular-nums dark:text-zinc-100">
                      {row.score}
                    </td>
                    <td class="hidden px-4 py-2.5 text-right font-mono text-xs text-zinc-500 sm:table-cell">
                      {day(row.lastAt)}
                    </td>
                  </tr>
                )}
              </For>
            </tbody>
          </table>
        </div>
      </Show>
    </div>
  );
}
