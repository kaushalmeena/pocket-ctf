import { createSignal, For, onMount } from "solid-js";

import { useGame } from "~/lib/game";
import type { Reply } from "~/lib/types";

type Line = { kind: "in" | Reply["tone"]; text: string };

const GREETING: Line[] = [
  { kind: "info", text: "Found something? Type it here and press enter." },
  { kind: "info", text: "Found nothing yet? Try help." },
];

/**
 * The only form on the site.
 *
 * Flags go in here, and so does anything else: every line is sent to the
 * server, which decides whether it was a flag, a command, or neither. Nothing
 * the prompt can say is in the bundle.
 */
export function Terminal() {
  const { me, send } = useGame();
  const [lines, setLines] = createSignal<Line[]>(GREETING);
  const [busy, setBusy] = createSignal(false);
  const [shake, setShake] = createSignal(false);

  let input!: HTMLInputElement;
  let scroller!: HTMLDivElement;
  const history: string[] = [];
  let cursor = 0;

  const prompt = () => `${me().handle}@pocket:~$`;

  const scrollToEnd = () =>
    requestAnimationFrame(() => scroller.scrollTo({ top: scroller.scrollHeight }));

  const print = (next: Line[], clear = false) => {
    setLines((current) => (clear ? next : [...current, ...next]));
    scrollToEnd();
  };

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text || busy()) return;

    history.push(text);
    cursor = history.length;
    input.value = "";
    print([{ kind: "in", text: `${prompt()} ${text}` }]);
    setBusy(true);

    try {
      const reply = await send(text);
      print(
        reply.lines.map((line) => ({ kind: reply.tone, text: line })),
        reply.clear,
      );
      if (reply.tone === "err") {
        setShake(true);
        setTimeout(() => setShake(false), 360);
      }
    } catch {
      print([{ kind: "err", text: "The line went dead. Try that again in a moment." }]);
    } finally {
      setBusy(false);
      input.focus();
    }
  };

  /** Up and down walk back through what was typed, as a shell would. */
  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    if (history.length === 0) return;
    event.preventDefault();
    cursor = Math.max(0, Math.min(history.length, cursor + (event.key === "ArrowUp" ? -1 : 1)));
    input.value = history[cursor] ?? "";
  };

  onMount(scrollToEnd);

  return (
    <section
      class="terminal overflow-hidden rounded-2xl"
      classList={{ "animate-shake": shake() }}
      aria-label="Flag submission"
    >
      <header class="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
        <span class="size-2.5 rounded-full bg-zinc-700" />
        <span class="size-2.5 rounded-full bg-zinc-700" />
        <span class="size-2.5 rounded-full bg-accent-500/80" />
        <span class="ml-2 font-mono text-xs text-zinc-500">flag intake</span>
        <span class="ml-auto font-mono text-xs text-zinc-500 tabular-nums">
          {me().found}/{me().total} found
        </span>
      </header>

      <div
        ref={scroller}
        class="h-56 overflow-y-auto px-4 py-3 font-mono text-[0.8rem] leading-6"
        role="log"
        aria-live="polite"
      >
        <For each={lines()}>
          {(line) => (
            <p class={`terminal-${line.kind} wrap-break-word whitespace-pre-wrap`}>
              {line.text || " "}
            </p>
          )}
        </For>
      </div>

      <form
        onSubmit={handleSubmit}
        class="flex items-center gap-2 border-t border-white/10 px-4 py-3 font-mono text-[0.8rem]"
      >
        <label for="prompt" class="hidden shrink-0 text-accent-400 sm:inline">
          {prompt()}
        </label>
        <span class="shrink-0 text-accent-400 sm:hidden" aria-hidden="true">
          $
        </span>
        <input
          ref={input}
          id="prompt"
          name="line"
          type="text"
          autocomplete="off"
          autocapitalize="off"
          autocorrect="off"
          spellcheck={false}
          maxLength={200}
          placeholder="pctf{...}"
          onKeyDown={handleKeyDown}
          aria-label="Flag or command"
          class="min-w-0 flex-1 bg-transparent text-zinc-100 caret-accent-400 outline-none placeholder:text-zinc-600"
        />
        <button
          type="submit"
          disabled={busy()}
          class="shrink-0 rounded-md bg-accent-500 px-3 py-1 text-xs font-semibold text-zinc-950 hover:bg-accent-400 disabled:opacity-50"
        >
          {busy() ? "…" : "Send"}
        </button>
      </form>
    </section>
  );
}
