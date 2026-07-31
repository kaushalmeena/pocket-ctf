import { Lightbulb, LoaderCircle } from "lucide-solid";
import { createSignal, For, Show } from "solid-js";
import { type Challenge, HINT_COST_RATIO, pointsAfterHints } from "~/lib/challenges";
import { revealHintText } from "~/lib/hints";
import { useProgress } from "~/lib/store";

export function HintPanel(props: { challenge: Challenge }) {
  const { state, revealHint, variant } = useProgress();

  /**
   * Decrypted hint text, keyed by index.
   *
   * Hints ship as ciphertext, so the text arrives after a key derivation rather
   * than being available synchronously. Already-revealed hints are decrypted
   * lazily when the panel first renders them, which is why this is a cache
   * rather than something the store holds.
   */
  const [text, setText] = createSignal<Record<number, string>>({});
  const [busy, setBusy] = createSignal(false);

  const used = () => state().hints[props.challenge.slug] ?? 0;
  const solved = () => state().solves[props.challenge.slug];
  const total = () => props.challenge.hintCount;
  const worth = () => pointsAfterHints(props.challenge, used());

  const load = async (index: number) => {
    if (text()[index] !== undefined) return;
    const decrypted = await revealHintText(
      props.challenge.slug,
      variant(props.challenge.slug),
      index,
    );
    setText((prev) => ({ ...prev, [index]: decrypted ?? "This hint could not be decrypted." }));
  };

  /** Charge for the hint first, then decrypt it. */
  const take = async () => {
    const index = used();
    setBusy(true);
    revealHint(props.challenge.slug);
    await load(index);
    setBusy(false);
  };

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
        <For each={Array.from({ length: used() }, (_, i) => i)}>
          {(index) => {
            // Revealed on a previous visit; fetch the plaintext on first render.
            void load(index);
            return (
              <div class="flex gap-3 px-4 py-3">
                <span class="mt-0.5 font-mono text-xs text-zinc-400 dark:text-zinc-600">
                  {index + 1}
                </span>
                <p class="prose-mini flex-1">
                  <Show
                    when={text()[index]}
                    fallback={<span class="text-zinc-400">Decrypting…</span>}
                  >
                    {text()[index]}
                  </Show>
                </p>
              </div>
            );
          }}
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
            onClick={take}
            disabled={busy()}
            class="inline-flex min-w-36 items-center justify-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50 disabled:opacity-60 dark:border-zinc-700 dark:text-zinc-300 dark:hover:border-zinc-600 dark:hover:bg-zinc-900"
          >
            <Show when={busy()}>
              <LoaderCircle aria-hidden="true" size={13} class="animate-spin" />
            </Show>
            {busy() ? "Decrypting" : `Reveal hint ${used() + 1}`}
          </button>
          <span class="text-xs text-zinc-400 dark:text-zinc-600">
            <Show when={!solved()} fallback="Already solved — this one is free.">
              costs {Math.round(HINT_COST_RATIO * 100)}% of the points
            </Show>
          </span>
        </div>
      </Show>

      {/* A deployment can legitimately ship none -- the demo set does. */}
      <Show when={total() === 0}>
        <p class="px-4 py-3 text-xs text-zinc-400 dark:text-zinc-600">
          This deployment ships no hints. They live in the answer key, so whoever built it chose
          not to include any.
        </p>
      </Show>
    </section>
  );
}
