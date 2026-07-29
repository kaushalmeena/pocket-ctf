import { createFileRoute } from "@tanstack/solid-router";
import { For } from "solid-js";
import { ChallengeShell } from "~/components/ChallengeShell";
import { getChallenge } from "~/lib/challenges";
import payloads from "~/lib/generated/payloads.json";

export const Route = createFileRoute("/c/first-light")({
  component: FirstLight,
  head: () => ({ meta: [{ title: "First Light — Pocket CTF" }] }),
});

const challenge = getChallenge("first-light");
const { shards } = payloads["first-light"];

function FirstLight() {
  return (
    <ChallengeShell challenge={challenge}>
      <div class="space-y-5">
        <p class="prose-mini">
          Welcome. This challenge exists to make one point, and the point is that a web page
          shows you a rendering, not a truth. Everything the browser received is still there,
          whether or not it ended up on your screen.
        </p>

        <div class="rounded-xl border border-zinc-200 p-6 text-center dark:border-zinc-800">
          <p class="text-xs tracking-wider text-zinc-400 uppercase dark:text-zinc-600">
            Your flag
          </p>
          <p class="pt-2 font-mono text-xl font-semibold text-zinc-900 select-all dark:text-zinc-100">
            pctf&#123;n1ce_try_but_no&#125;
          </p>
          <p class="pt-2 text-xs text-zinc-400 dark:text-zinc-600">Go on, then. Submit it.</p>
        </div>

        <p class="prose-mini">
          When that doesn't work — and it won't — the real one is on this page too. It is just
          not <em>painted</em> on this page. Twenty-nine fragments are sitting in the document
          with zero width and zero height, each one carrying a character and the position that
          character belongs in.
        </p>

        {/*
          The flag exists only as 29 disconnected characters in shuffled document
          order. There is no substring anywhere in this file, or in the shipped
          bundle, that spells it out -- see scripts/verify-no-flags.mjs.
        */}
        <div class="sr-only" aria-hidden="true">
          <For each={shards}>{(shard) => <i data-k={shard.k} data-v={shard.v} />}</For>
        </div>

        <details class="rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <summary class="cursor-pointer text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Never opened devtools before?
          </summary>
          <div class="prose-mini pt-3">
            <p>
              <code>F12</code>, or <code>Cmd+Option+I</code> on a Mac, or right-click → Inspect.
              The Elements panel is the live document; the Console lets you run JavaScript
              against it. Both are yours, and neither asks permission.
            </p>
            <p>
              A one-liner in the Console will do it. Selecting every element with a{" "}
              <code>data-k</code> attribute, sorting by that number, and joining the{" "}
              <code>data-v</code> values takes about sixty characters.
            </p>
          </div>
        </details>
      </div>
    </ChallengeShell>
  );
}
