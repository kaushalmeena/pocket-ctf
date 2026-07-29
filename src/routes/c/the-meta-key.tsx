import { createFileRoute } from "@tanstack/solid-router";
import { Check, KeyRound, Minus } from "lucide-solid";
import { createResource, For, Show } from "solid-js";
import { ChallengeShell } from "~/components/ChallengeShell";
import { CHALLENGE_BY_SLUG, getChallenge } from "~/lib/challenges";
import payloads from "~/lib/generated/payloads.json";
import { chainSecret, unsealPublic } from "~/lib/progress";
import { NO_INDEX } from "~/lib/seo";
import { useProgress } from "~/lib/store";

export const Route = createFileRoute("/c/the-meta-key")({
  component: TheMetaKey,
  head: () => ({ meta: [{ title: "The Meta Key — Pocket CTF" }, NO_INDEX] }),
});

const challenge = getChallenge("the-meta-key");
const { recipe, requires } = payloads["the-meta-key"];

function TheMetaKey() {
  const { state } = useProgress();

  /**
   * The instructions are sealed under all ten proof-of-solve tokens
   * concatenated in challenge order. This is the gating: not a boolean check
   * that hides readable text, but a key that does not exist until the ten
   * solves do.
   */
  const [instructions] = createResource(
    () => chainSecret(state(), requires),
    (secret) => unsealPublic(secret, recipe),
  );

  return (
    <ChallengeShell challenge={challenge}>
      <div class="space-y-5">
        <p class="prose-mini">
          Ten challenges, ten flags. This one is assembled from them, and the instructions for
          assembling it were encrypted at build time under a key derived from all ten of your
          proof-of-solve tokens. There is no version of this page that could have told you the
          answer early.
        </p>

        <section class="space-y-3">
          <h2 class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Your ten keys</h2>
          <ol class="divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200 dark:divide-zinc-900 dark:border-zinc-800">
            <For each={requires}>
              {(slug, i) => {
                const meta = CHALLENGE_BY_SLUG[slug];
                const record = () => state().solves[slug];
                return (
                  <li class="flex items-center gap-3 px-4 py-2.5 text-sm">
                    <span class="w-5 font-mono text-xs text-zinc-400 tabular-nums dark:text-zinc-600">
                      {String(i() + 1).padStart(2, "0")}
                    </span>
                    <span
                      class="font-medium"
                      classList={{
                        "text-zinc-900 dark:text-zinc-100": Boolean(record()),
                        "text-zinc-400 dark:text-zinc-600": !record(),
                      }}
                    >
                      {meta?.title ?? slug}
                    </span>
                    <span class="ml-auto font-mono text-xs">
                      <Show
                        when={record()}
                        fallback={
                          <Minus
                            aria-hidden="true"
                            size={13}
                            class="text-zinc-300 dark:text-zinc-700"
                          />
                        }
                      >
                        <Check
                          aria-hidden="true"
                          size={13}
                          class="text-accent-600 dark:text-accent-400"
                        />
                      </Show>
                    </span>
                  </li>
                );
              }}
            </For>
          </ol>
        </section>

        <Show
          when={instructions()}
          fallback={
            <div class="rounded-xl border border-dashed border-zinc-300 p-5 dark:border-zinc-700">
              <p class="text-sm text-zinc-500 dark:text-zinc-500">
                <Show when={instructions.loading} fallback="Instructions still sealed.">
                  Deriving the chain key…
                </Show>
              </p>
            </div>
          }
        >
          {(text) => (
            <div class="animate-rise rounded-xl border border-accent-200 bg-accent-50/60 p-5 dark:border-accent-900 dark:bg-accent-950/40">
              <p class="flex items-center gap-2 text-xs tracking-wider text-accent-700 uppercase dark:text-accent-300">
                <KeyRound aria-hidden="true" size={13} />
                Unsealed with your ten tokens
              </p>
              <p class="pt-2 text-[1.05rem] leading-relaxed text-accent-900 dark:text-accent-50">
                {text()}
              </p>
            </div>
          )}
        </Show>

        <p class="prose-mini">
          Everything you need is written down somewhere you have already been. If you kept the
          flags, this takes a minute. If you did not, the writeups are still sitting on each
          solved challenge, decryptable with the solve you already have.
        </p>
      </div>
    </ChallengeShell>
  );
}
