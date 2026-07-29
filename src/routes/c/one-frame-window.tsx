import { createFileRoute } from "@tanstack/solid-router";
import { RefreshCw } from "lucide-solid";
import { createSignal, onMount, Show } from "solid-js";
import { ChallengeShell } from "~/components/ChallengeShell";
import { getChallenge } from "~/lib/challenges";
import payloads from "~/lib/generated/payloads.json";
import { unsealPublic } from "~/lib/progress";
import { NO_INDEX } from "~/lib/seo";
import { useProgress } from "~/lib/store";

export const Route = createFileRoute("/c/one-frame-window")({
  component: OneFrameWindow,
  head: () => ({ meta: [{ title: "One Frame Window — Pocket CTF" }, NO_INDEX] }),
});

const challenge = getChallenge("one-frame-window");
const { sealed, maskLength } = payloads["one-frame-window"];

/**
 * Exactly as many blocks as the flag has characters, so swapping one for the
 * other changes nothing about the element's size. A mask that was shorter than
 * the flag meant the reveal visibly grew the box and spilled past the bar.
 */
const MASK = "\u2588".repeat(maskLength);

function OneFrameWindow() {
  const { noteEngagement } = useProgress();
  const [armed, setArmed] = createSignal(false);
  const [failed, setFailed] = createSignal(false);
  const [reveals, setReveals] = createSignal(0);

  let target: HTMLParagraphElement | undefined;

  const mask = () => {
    if (target) target.textContent = MASK;
  };

  /** Resolves the next time the document is actually on screen. */
  const whenVisible = () =>
    new Promise<void>((resolve) => {
      if (document.visibilityState === "visible") return resolve();
      const onChange = () => {
        if (document.visibilityState !== "visible") return;
        document.removeEventListener("visibilitychange", onChange);
        resolve();
      };
      document.addEventListener("visibilitychange", onChange);
    });

  /**
   * Put the plaintext in the DOM for exactly one animation frame.
   *
   * Nothing here is obfuscated on purpose: the ciphertext ships with the page
   * and so does the key material, because the lesson isn't "secrets can be
   * hidden in a client". It's the opposite. Anything the browser renders, the
   * browser can be stopped on -- a DOM-mutation breakpoint catches this cold,
   * and so does calling the decrypt yourself from the console.
   */
  const flash = async () => {
    if (armed()) return;
    setArmed(true);

    // Animation frames don't fire in a background tab. Revealing anyway would
    // leave the plaintext painted until the tab came back -- handing the flag
    // to anyone who merely switched away. Wait until a real frame is coming.
    await whenVisible();

    const plaintext = await unsealPublic(challenge.slug, sealed);
    if (!plaintext || !target) {
      setFailed(true);
      setArmed(false);
      return;
    }

    // Written directly rather than through a signal: this has to land in one
    // paint, and a framework update is free to batch itself into another.
    target.textContent = plaintext;

    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      mask();
      setReveals((n) => n + 1);
      setArmed(false);
    };

    requestAnimationFrame(() => requestAnimationFrame(settle));
    // Backstop. If frames stop being delivered mid-reveal -- throttling, a
    // tab switch, a stalled renderer -- the plaintext still has to come down.
    setTimeout(settle, 120);
  };

  onMount(() => {
    // Fires once on arrival, unprompted. You have already missed it.
    void flash();
  });

  return (
    <ChallengeShell challenge={challenge}>
      <div class="space-y-5">
        <p class="prose-mini">
          The flag was displayed in the box below for one animation frame, about sixteen
          milliseconds, immediately when this page loaded. It has already happened. Your
          reaction time is roughly fifteen of those frames, so there was never a version of this
          where you saw it.
        </p>

        <div class="rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
          <p class="text-xs tracking-wider text-zinc-400 uppercase dark:text-zinc-600">
            Reveal target
          </p>
          {/* Static child, not a signal: flash() owns this node's text
              imperatively, and a reactive binding would fight it. */}
          <p
            ref={target}
            // `break-all` keeps a narrow viewport wrapping inside the card
            // instead of overflowing it; both states wrap identically because
            // they are the same length.
            class="min-h-7 pt-2 font-mono text-lg break-all text-zinc-900 dark:text-zinc-100"
            aria-live="off"
          >
            {MASK}
          </p>
        </div>

        <Show when={failed()}>
          <p class="text-sm text-rose-600 dark:text-rose-400">
            The payload would not decrypt. That is a bug on my side, not a puzzle.
          </p>
        </Show>

        <div class="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => {
              noteEngagement(challenge.slug, "replayed-reveal");
              void flash();
            }}
            disabled={armed()}
            class="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
          >
            <RefreshCw aria-hidden="true" size={13} classList={{ "animate-spin": armed() }} />
            Flash it again
          </button>
          <span class="font-mono text-xs text-zinc-400 dark:text-zinc-600">
            {reveals()} reveal{reveals() === 1 ? "" : "s"} so far
          </span>
        </div>

        <p class="prose-mini">
          You may press that as many times as you like. It will be exactly as fast every time,
          because the problem is not that the window is small — it is that you are trying to
          solve a timing problem with timing. Change what the page is allowed to do instead.
        </p>

        <Show when={reveals() >= 4}>
          <p class="animate-rise text-sm text-amber-700 dark:text-amber-400">
            {reveals()} attempts. Consider that the browser ships with a tool whose entire
            purpose is stopping JavaScript in the middle of doing something.
          </p>
        </Show>

        <details class="rounded-lg border border-zinc-200 px-4 py-3 dark:border-zinc-800">
          <summary class="cursor-pointer text-sm font-medium text-zinc-800 dark:text-zinc-200">
            Things that will not work
          </summary>
          <div class="prose-mini space-y-2 pt-3">
            <p>
              <strong>Reloading faster.</strong> The reveal is scheduled against the frame
              clock, not the wall clock.
            </p>
            <p>
              <strong>Searching the bundle for the flag.</strong> What ships is AES-GCM
              ciphertext. Searching for <code>pctf&#123;</code> finds decoys.
            </p>
            <p>
              <strong>Screenshotting at the right moment.</strong> Technically possible with a
              screen recorder at 60fps, and honestly a fine solve if you pull it off. It is just
              much harder than the easy way.
            </p>
          </div>
        </details>
      </div>
    </ChallengeShell>
  );
}
