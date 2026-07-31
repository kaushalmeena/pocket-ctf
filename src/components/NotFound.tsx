import { Link } from "@tanstack/solid-router";
import { ArrowRight, Compass } from "lucide-solid";

/**
 * Shown for any path the router cannot match, including an unknown challenge
 * slug.
 *
 * It says outright that nothing is hidden here. In a CTF a bare "Not Found" is
 * an invitation -- players reasonably wonder whether a 404 is itself a puzzle,
 * and this site did once hide a challenge behind an unlisted URL. Being explicit
 * costs a sentence and saves someone an afternoon.
 */
export function NotFound() {
  return (
    <div class="space-y-5 py-8">
      <p class="flex items-center gap-2 font-mono text-xs tracking-widest text-zinc-400 uppercase dark:text-zinc-600">
        <Compass aria-hidden="true" size={13} />
        404
      </p>

      <h1 class="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        There is nothing at this address.
      </h1>

      <p class="prose-mini max-w-xl">
        Not a puzzle, not a hint, and not a challenge you were supposed to find by guessing.
        Every challenge on this site is listed on the challenges page and reachable from it —
        none of them is hidden behind a URL you have to discover.
      </p>

      <p class="prose-mini max-w-xl">
        If you typed the address, check the spelling. If you followed a link from within the
        site, that is a bug worth reporting.
      </p>

      <div class="flex flex-wrap gap-3 pt-1">
        <Link
          to="/challenges"
          class="group inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          All challenges
          <ArrowRight
            aria-hidden="true"
            size={15}
            class="transition-transform duration-200 group-hover:translate-x-0.5"
          />
        </Link>
        <Link
          to="/"
          class="inline-flex items-center rounded-lg border border-zinc-300 px-4 py-2.5 text-sm text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          Start over
        </Link>
      </div>
    </div>
  );
}
