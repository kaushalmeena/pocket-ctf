import { createSignal, onCleanup, onMount, Show } from "solid-js";

/**
 * An indeterminate progress bar for waits with no measurable progress.
 *
 * Deliberately delayed. The wait it covers -- reading storage and drawing this
 * browser's challenge variant -- is usually a frame or two, and an indicator
 * that appears and vanishes inside 100ms reads as a rendering glitch rather than
 * as feedback. Below the delay nothing is drawn at all; past it, the wait was
 * long enough to be worth acknowledging.
 *
 * There is no percentage to show, so the bar sweeps rather than fills. Under
 * `prefers-reduced-motion` it holds still at partial width instead, which still
 * says "working" without the movement.
 */
export function LoadingBar(props: {
  /** Announced to assistive tech, which never sees the animation. */
  label: string;
  /** Milliseconds to wait before showing anything. */
  delayMs?: number;
}) {
  const [visible, setVisible] = createSignal(false);

  onMount(() => {
    const timer = setTimeout(() => setVisible(true), props.delayMs ?? 120);
    onCleanup(() => clearTimeout(timer));
  });

  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span class="sr-only">{props.label}</span>
      <Show when={visible()}>
        <div
          aria-hidden="true"
          class="animate-rise h-0.5 w-full overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-900"
        >
          <div class="animate-sweep h-full w-2/5 rounded-full bg-accent-500" />
        </div>
      </Show>
    </div>
  );
}
