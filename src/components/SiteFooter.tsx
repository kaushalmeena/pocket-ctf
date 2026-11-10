import { StatusLight } from "./StatusLight";

export function SiteFooter() {
  return (
    <footer class="border-t border-zinc-200 dark:border-zinc-800">
      <div class="mx-auto flex w-full max-w-4xl flex-wrap items-center gap-x-4 gap-y-2 px-5 py-6 text-xs text-zinc-500 sm:px-6">
        <StatusLight />
        <span aria-hidden="true" class="text-zinc-300 dark:text-zinc-700">
          ·
        </span>
        <span>Everything on this domain is in scope. Nothing off it is.</span>
        <span class="ml-auto font-mono">pocket/ctf</span>
      </div>
    </footer>
  );
}
