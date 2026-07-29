import { ExternalLink } from "lucide-solid";

export function SiteFooter() {
  return (
    <footer class="border-t border-zinc-200 dark:border-zinc-800">
      <div class="mx-auto flex w-full max-w-3xl flex-wrap items-center gap-x-4 gap-y-2 px-5 py-6 text-xs text-zinc-500 sm:px-6 dark:text-zinc-500">
        <span class="font-mono">pocket/ctf</span>
        <span aria-hidden="true" class="text-zinc-300 dark:text-zinc-700">
          ·
        </span>
        <span>Runs offline. Nothing you type leaves this machine.</span>
        <a
          href="https://github.com/topics/capture-the-flag"
          class="ml-auto inline-flex items-center underline decoration-zinc-300 underline-offset-2 transition-colors hover:text-zinc-900 dark:decoration-zinc-700 dark:hover:text-zinc-100"
          rel="noreferrer"
        >
          What is a CTF?
          <ExternalLink aria-hidden="true" size={11} class="ml-1 inline align-baseline" />
        </a>
      </div>
    </footer>
  );
}
