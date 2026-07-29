import { KeyRound, LockOpen } from "lucide-solid";
import { createSignal, Show } from "solid-js";
import { unsealPublic } from "~/lib/progress";
import { useProgress } from "~/lib/store";

/**
 * Trades a derived answer for the flag it unseals.
 *
 * Most challenges encode the flag in shipped data, so a random per-deployment
 * suffix comes out of the puzzle for free. A challenge you *reason* to an answer
 * can't work that way -- no amount of thinking produces six random characters.
 *
 * So the flag is AES-GCM encrypted under the answer itself. Type the answer, get
 * the flag. This is stricter than checking the answer would be: a wrong answer
 * produces no flag at all, which is what stops a small answer space (256 strings
 * for the logic puzzle) from being ground out through the submission box.
 */
export function DerivedUnlock(props: {
  /** Slug this unlock belongs to, for recording engagement. */
  slug: string;
  /** What to call the thing being entered, e.g. "eight verdicts". */
  label: string;
  placeholder: string;
  /** Expected answer length, used only to nudge before wasting a derivation. */
  expectedLength?: number;
  sealed: { salt: string; iv: string; ct: string };
}) {
  const { noteEngagement } = useProgress();
  const [value, setValue] = createSignal("");
  const [busy, setBusy] = createSignal(false);
  const [flag, setFlag] = createSignal<string | null>(null);
  const [error, setError] = createSignal<string | null>(null);

  const attempt = async (event: SubmitEvent) => {
    event.preventDefault();
    const answer = value().trim().toLowerCase();
    if (!answer || busy()) return;

    if (props.expectedLength && answer.length !== props.expectedLength) {
      setError(`That should be exactly ${props.expectedLength} characters.`);
      return;
    }

    setBusy(true);
    setError(null);
    const opened = await unsealPublic(answer, props.sealed);
    setBusy(false);

    if (opened) {
      noteEngagement(props.slug, "derived-answer");
      setFlag(opened);
    } else
      setError("That answer does not open it. No partial credit, no hints from the error.");
  };

  return (
    <section class="rounded-xl border border-zinc-200 p-5 dark:border-zinc-800">
      <Show
        when={flag()}
        fallback={
          <form onSubmit={attempt} class="space-y-3">
            <div class="flex items-center gap-2">
              <KeyRound aria-hidden="true" size={15} class="text-zinc-400 dark:text-zinc-600" />
              <h2 class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Exchange your answer for the flag
              </h2>
            </div>

            <p class="prose-mini">
              This challenge is reasoned, not extracted, so the flag is encrypted with{" "}
              <em>your {props.label}</em> as the key. Get them right and it decrypts. Get them
              wrong and there is nothing to submit — so there is no point guessing at the
              submission box below.
            </p>

            <div class="flex gap-2">
              <input
                type="text"
                value={value()}
                onInput={(e) => setValue(e.currentTarget.value)}
                placeholder={props.placeholder}
                autocomplete="off"
                autocapitalize="off"
                spellcheck={false}
                disabled={busy()}
                aria-label={props.label}
                class="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-sm tracking-widest text-zinc-900 placeholder:tracking-normal placeholder:text-zinc-400 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-600"
              />
              <button
                type="submit"
                disabled={busy() || value().trim().length === 0}
                class="shrink-0 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
              >
                {busy() ? "Deriving…" : "Unlock"}
              </button>
            </div>

            <Show when={error()}>
              <p class="animate-rise text-sm text-rose-600 dark:text-rose-400">{error()}</p>
            </Show>
          </form>
        }
      >
        {(value) => (
          <div class="animate-rise space-y-2">
            <div class="flex items-center gap-2">
              <LockOpen
                aria-hidden="true"
                size={15}
                class="text-accent-600 dark:text-accent-400"
              />
              <h2 class="text-sm font-semibold text-accent-700 dark:text-accent-300">
                Correct. Here is your flag.
              </h2>
            </div>
            <p class="font-mono text-lg break-all text-zinc-900 select-all dark:text-zinc-100">
              {value()}
            </p>
            <p class="prose-mini">
              The suffix is random and unique to this installation, which is why it had to be
              handed to you rather than deduced. Submit the whole thing below.
            </p>
          </div>
        )}
      </Show>
    </section>
  );
}
