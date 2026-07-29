import { CircleCheck, CornerDownLeft, LoaderCircle } from "lucide-solid";
import { createSignal, onCleanup, onMount, Show } from "solid-js";
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

  onMount(() => {
    // "/" jumps to the flag box, as long as you aren't already typing
    // somewhere -- the puzzles involve a lot of switching between the page and
    // devtools, and hunting for the input every time gets old.
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const active = document.activeElement;
      if (
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        (active instanceof HTMLElement && active.isContentEditable)
      ) {
        return;
      }
      event.preventDefault();
      inputRef?.focus();
    };
    document.addEventListener("keydown", onKey);
    onCleanup(() => document.removeEventListener("keydown", onKey));
  });

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
            <CircleCheck aria-hidden="true" size={16} /> Solved
          </p>
        </div>
      }
    >
      <form onSubmit={onSubmit} class="space-y-2.5">
        <label
          for={`flag-${props.challenge.slug}`}
          class="flex items-center gap-2 text-sm font-medium text-zinc-800 dark:text-zinc-200"
        >
          Submit flag
          <kbd class="rounded border border-zinc-300 px-1.5 font-mono text-[0.65rem] font-normal text-zinc-400 dark:border-zinc-700 dark:text-zinc-600">
            /
          </kbd>
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
            class="shrink-0 rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            <Show
              when={busy()}
              fallback={
                <span class="inline-flex items-center gap-1.5">
                  {lockedMs() > 0 ? `${Math.ceil(lockedMs() / 1000)}s` : "Check"}
                  <Show when={lockedMs() === 0}>
                    <CornerDownLeft aria-hidden="true" size={13} class="opacity-60" />
                  </Show>
                </span>
              }
            >
              <span class="inline-flex items-center gap-1.5">
                <LoaderCircle aria-hidden="true" size={13} class="animate-spin" />
                Checking
              </span>
            </Show>
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
