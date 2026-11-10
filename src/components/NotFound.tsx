import { Link } from "@tanstack/solid-router";
import { ArrowLeft } from "lucide-solid";
import { createResource, Show } from "solid-js";

import { getLost } from "~/lib/api";

/**
 * Shown for any path the router cannot match.
 *
 * On a site where guessing addresses is part of the game, this is the page a
 * player sees most. It has a poem on it, to pass the time.
 */
export function NotFound() {
  const [lost] = createResource(() => getLost());

  return (
    <div class="animate-rise mx-auto max-w-2xl space-y-6 py-6">
      <p class="eyebrow">404 · not here</p>

      <h1 class="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        Nothing at this address.
      </h1>

      <p class="prose-mini">
        A good guess, though, and guessing is allowed. Since you have come all this way, here is
        a poem. It is not a very good poem.
      </p>

      <Show when={lost()}>
        {(found) => (
          <blockquote class="carrier border-l-2 border-accent-500/60 py-1 pl-5 text-zinc-600 dark:text-zinc-400">
            {found().poem}
          </blockquote>
        )}
      </Show>

      <Link
        to="/"
        class="group inline-flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-zinc-100"
      >
        <ArrowLeft
          aria-hidden="true"
          size={15}
          class="transition-transform duration-200 group-hover:-translate-x-0.5"
        />
        Back to the front page
      </Link>
    </div>
  );
}
