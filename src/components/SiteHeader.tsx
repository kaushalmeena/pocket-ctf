import { Link } from "@tanstack/solid-router";
import { Flag } from "lucide-solid";
import { Show } from "solid-js";
import { ThemeToggle } from "~/components/ThemeToggle";
import { TOTAL_POINTS } from "~/lib/challenges";
import { useProgress } from "~/lib/store";

export function SiteHeader() {
  const { stats, ready } = useProgress();

  return (
    <header class="sticky top-0 z-20 border-b border-zinc-200 bg-white/85 backdrop-blur-sm dark:border-zinc-800 dark:bg-zinc-950/85">
      <div class="mx-auto flex w-full max-w-3xl items-center gap-4 px-5 py-3 sm:px-6">
        <Link to="/" class="group flex items-center gap-2 font-mono text-sm font-semibold">
          <Flag
            aria-hidden="true"
            size={15}
            class="text-accent-500 transition-transform duration-200 group-hover:-rotate-12"
          />
          pocket<span class="text-zinc-400 dark:text-zinc-600">/</span>ctf
        </Link>

        <nav class="flex items-center gap-1 text-sm">
          <HeaderLink to="/challenges">Challenges</HeaderLink>
          <HeaderLink to="/progress">Progress</HeaderLink>
        </nav>

        <div class="ml-auto flex items-center gap-3">
          <Show when={ready()}>
            <span
              class="hidden font-mono text-xs text-zinc-500 tabular-nums sm:inline dark:text-zinc-500"
              title={`${stats().solved} of ${stats().total} solved`}
            >
              {stats().score}
              <span class="text-zinc-300 dark:text-zinc-700">/{TOTAL_POINTS}</span>
            </span>
          </Show>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

function HeaderLink(props: { to: string; children: string }) {
  return (
    <Link
      to={props.to}
      class="rounded-md px-2 py-1 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
      activeProps={{ class: "!text-zinc-900 dark:!text-zinc-100 font-medium" }}
    >
      {props.children}
    </Link>
  );
}
