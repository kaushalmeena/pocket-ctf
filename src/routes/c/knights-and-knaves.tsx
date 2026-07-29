import { createFileRoute } from "@tanstack/solid-router";
import { For } from "solid-js";
import { ChallengeShell } from "~/components/ChallengeShell";
import { getChallenge } from "~/lib/challenges";

export const Route = createFileRoute("/c/knights-and-knaves")({
  component: KnightsAndKnaves,
  head: () => ({ meta: [{ title: "Knights and Knaves — Pocket CTF" }] }),
});

const challenge = getChallenge("knights-and-knaves");

/**
 * Hand-authored, and verified by scripts/selftest.mjs to admit exactly one
 * consistent assignment. The flag is that assignment, so a second solution
 * would make the challenge unanswerable rather than merely easier.
 */
const ISLANDERS: { name: string; says: string }[] = [
  { name: "A", says: "B is a knave." },
  { name: "B", says: "C is a knight." },
  { name: "C", says: "A and B are both knaves." },
  { name: "D", says: "Exactly four of us are knights." },
  { name: "E", says: "H is a knave." },
  { name: "F", says: "D is a knave." },
  { name: "G", says: "C is a knave." },
  { name: "H", says: "The number of knights among us is odd." },
];

function KnightsAndKnaves() {
  return (
    <ChallengeShell challenge={challenge}>
      <div class="space-y-5">
        <p class="prose-mini">
          On this island every inhabitant is either a <strong>knight</strong>, who says only
          true things, or a <strong>knave</strong>, who says only false things. There is no
          third kind, nobody stays silent, and nobody is mistaken. Eight of them have something
          to say about each other.
        </p>

        <ul class="divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200 dark:divide-zinc-900 dark:border-zinc-800">
          <For each={ISLANDERS}>
            {(islander) => (
              <li class="flex items-baseline gap-4 px-4 py-3">
                <span class="w-4 shrink-0 font-mono text-sm font-semibold text-accent-600 dark:text-accent-400">
                  {islander.name}
                </span>
                <span class="text-sm text-zinc-700 dark:text-zinc-300">
                  &ldquo;{islander.says}&rdquo;
                </span>
              </li>
            )}
          </For>
        </ul>

        <div class="rounded-xl border border-zinc-200 bg-zinc-50/60 p-4 dark:border-zinc-800 dark:bg-zinc-900/40">
          <p class="text-sm font-medium text-zinc-900 dark:text-zinc-100">Flag format</p>
          <p class="prose-mini pt-1.5">
            Eight characters, one per islander in order A through H: <code>k</code> for knight,{" "}
            <code>n</code> for knave. Wrap it in the usual braces — so if all eight were knights
            you would submit <code class="whitespace-nowrap">pctf&#123;kkkkkkkk&#125;</code>.
          </p>
        </div>

        <p class="prose-mini">
          Exactly one assignment of the eight is consistent with all eight statements at once.
          There is no ambiguity to resolve and no guessing to do — but there is a single
          observation that turns this from eight puzzles into one, and finding it is the whole
          exercise.
        </p>
      </div>
    </ChallengeShell>
  );
}
