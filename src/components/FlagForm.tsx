import { createSignal, onCleanup, Show } from "solid-js";
import type { Challenge } from "~/lib/challenges";
import { lockoutRemaining } from "~/lib/progress";
import { useProgress } from "~/lib/store";

type Feedback =
  | { tone: "ok"; text: string }
  | { tone: "bad"; text: string }
  | { tone: "warn"; text: string }
  | null;

export function FlagForm(props: { challenge: Challenge }) {
  const { submit, state } = useProgress();
  const [value, setValue] = createSignal("");
  const [busy, setBusy] = createSignal(false);
  const [feedback, setFeedback] = createSignal<Feedback>(null);
  const [shaking, setShaking] = createSignal(false);
  const [now, setNow] = createSignal(Date.now());

  /** Retrigger the CSS animation by removing the class and putting it back. */
  const bump = () => {
    setShaking(false);
    requestAnimationFrame(() => {
      setShaking(true);
      setTimeout(() => setShaking(false), 400);
    });
    inputRef?.select();
  };

  // Drives the lockout countdown. One second is plenty; nothing here is precise.
  const ticker = setInterval(() => setNow(Date.now()), 500);
  onCleanup(() => clearInterval(ticker));

  const solved = () => Boolean(state().solves[props.challenge.slug]);
  const lockedMs = () => lockoutRemaining(state(), props.challenge.slug, now());

  let inputRef: HTMLInputElement | undefined;

  const onSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    if (busy() || solved()) return;

    setBusy(true);
    setFeedback(null);
    const result = await submit(props.challenge.slug, value());
    setBusy(false);

    switch (result.status) {
      case "solved":
        setFeedback({ tone: "ok", text: `Correct. +${result.points} points.` });
        setValue("");
        break;
      case "already":
        setFeedback({ tone: "ok", text: "Already solved." });
        break;
      case "honeypot":
        setFeedback({ tone: "warn", text: result.message });
        bump();
        break;
      case "malformed":
        setFeedback({ tone: "bad", text: result.message });
        break;
      case "locked":
        setFeedback({
          tone: "warn",
          text: `Too many attempts. Wait ${Math.ceil(result.msRemaining / 1000)}s.`,
        });
        break;
      case "wrong":
        setFeedback({
          tone: "bad",
          text:
            result.wrongCount >= 4
              ? `Not it. That's ${result.wrongCount} misses — submissions are slowing down now.`
              : "Not it.",
        });
        bump();
        break;
      default:
        setFeedback({ tone: "bad", text: "Something went wrong checking that." });
    }
  };

  return (
    <Show
      when={!solved()}
      fallback={
        <div class="rounded-xl border border-accent-200 bg-accent-50/60 p-4 dark:border-accent-900 dark:bg-accent-950/40">
          <p class="flex items-center gap-2 text-sm font-medium text-accent-700 dark:text-accent-200">
            <span aria-hidden="true">✓</span> Solved
          </p>
        </div>
      }
    >
      <form onSubmit={onSubmit} class="space-y-2.5">
        <label
          for={`flag-${props.challenge.slug}`}
          class="block text-sm font-medium text-zinc-800 dark:text-zinc-200"
        >
          Submit flag
        </label>
        <div class="flex gap-2" classList={{ "animate-shake": shaking() }}>
          <input
            id={`flag-${props.challenge.slug}`}
            ref={inputRef}
            type="text"
            value={value()}
            onInput={(e) => setValue(e.currentTarget.value)}
            placeholder="pctf{...}"
            autocomplete="off"
            autocapitalize="off"
            spellcheck={false}
            disabled={busy()}
            class="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 font-mono text-sm text-zinc-900 placeholder:text-zinc-400 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-600"
          />
          <button
            type="submit"
            disabled={busy() || lockedMs() > 0 || value().trim().length === 0}
            class="shrink-0 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            {busy()
              ? "Checking…"
              : lockedMs() > 0
                ? `${Math.ceil(lockedMs() / 1000)}s`
                : "Check"}
          </button>
        </div>

        <Show when={feedback()}>
          {(f) => (
            <p
              role="status"
              class="animate-rise text-sm"
              classList={{
                "text-accent-700 dark:text-accent-300": f().tone === "ok",
                "text-rose-600 dark:text-rose-400": f().tone === "bad",
                "text-amber-700 dark:text-amber-400": f().tone === "warn",
              }}
            >
              {f().text}
            </p>
          )}
        </Show>

        <Show when={busy()}>
          <p class="text-xs text-zinc-400 dark:text-zinc-600">
            Deriving a 310,000-round key — the same cost that makes guessing expensive.
          </p>
        </Show>
      </form>
    </Show>
  );
}
