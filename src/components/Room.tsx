import type { JSX } from "solid-js";

/**
 * The frame every unlisted page shares.
 *
 * These pages are not linked from anywhere. Each is reached by noticing
 * something -- a header, a text file, a line in the prompt -- so they dress
 * alike, and a player who lands on one knows they are somewhere they found
 * rather than somewhere they were sent.
 */
export function Room(props: { label: string; title: string; children: JSX.Element }) {
  return (
    <article class="animate-rise mx-auto max-w-2xl space-y-6 py-4">
      <header class="space-y-3">
        <p class="eyebrow">{props.label}</p>
        <h1 class="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {props.title}
        </h1>
      </header>
      {props.children}
    </article>
  );
}
