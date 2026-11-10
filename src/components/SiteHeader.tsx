import { Link } from "@tanstack/solid-router";
import { Flag } from "lucide-solid";
import { createSignal } from "solid-js";

import { ThemeToggle } from "~/components/ThemeToggle";
import { useGame } from "~/lib/game";

/** Taps on the logo before it gives in. */
const TAPS = 7;

export function SiteHeader() {
  const { me, claim } = useGame();
  const [wobble, setWobble] = createSignal(false);
  let taps = 0;
  let reset: ReturnType<typeof setTimeout> | undefined;

  /** Seven quick taps on the flag. There is no reason to do this, which is the reason. */
  const handleLogoClick = () => {
    taps += 1;
    clearTimeout(reset);
    reset = setTimeout(() => (taps = 0), 1500);
    if (taps < TAPS) return;
    taps = 0;
    setWobble(true);
    setTimeout(() => setWobble(false), 900);
    void claim("logo");
  };

  return (
    <header class="sticky top-0 z-20 border-b border-zinc-200/80 bg-white/80 backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-950/80">
      <div class="mx-auto flex w-full max-w-4xl items-center gap-3 px-5 py-3 sm:gap-5 sm:px-6">
        <Link
          to="/"
          onClick={handleLogoClick}
          class="group flex items-center gap-2 font-mono text-sm font-semibold"
        >
          <Flag
            aria-hidden="true"
            size={15}
            class="text-accent-500 transition-transform duration-200 group-hover:-rotate-12"
            classList={{ "animate-wobble": wobble() }}
          />
          pocket<span class="text-zinc-400 dark:text-zinc-600">/</span>ctf
        </Link>

        <nav class="flex items-center gap-1 text-sm">
          <HeaderLink to="/trophies">Trophies</HeaderLink>
          <HeaderLink to="/board">Board</HeaderLink>
        </nav>

        <div class="ml-auto flex items-center gap-3">
          <Link
            to="/trophies"
            class="flex items-center gap-2 rounded-full border border-zinc-200 py-0.5 pr-3 pl-0.5 hover:border-zinc-300 dark:border-zinc-800 dark:hover:border-zinc-700"
            title={`${me().handle} — ${me().found} of ${me().total} found`}
          >
            {/* Issued by the server, one per player. */}
            <img
              src="/avatar.png"
              alt=""
              width={24}
              height={24}
              class="pixelated size-6 rounded-full"
            />
            <span class="hidden max-w-32 truncate font-mono text-xs text-zinc-600 sm:inline dark:text-zinc-400">
              {me().handle}
            </span>
            <span class="font-mono text-xs font-semibold text-zinc-900 tabular-nums dark:text-zinc-100">
              {me().score}
            </span>
          </Link>
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
      class="rounded-md px-2 py-1 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
      activeProps={{ class: "!text-zinc-900 dark:!text-zinc-100 font-medium" }}
    >
      {props.children}
    </Link>
  );
}
