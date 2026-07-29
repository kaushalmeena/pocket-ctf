import { useTheme } from "~/lib/theme";

/**
 * A single switch. The knob slides, the icons cross-fade, and the whole page's
 * colours transition with it (see `.theme-transition` in app.css).
 */
export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const dark = () => theme() === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      role="switch"
      aria-checked={dark()}
      aria-label="Dark mode"
      title={dark() ? "Switch to light mode" : "Switch to dark mode"}
      class="relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border border-zinc-200
        bg-zinc-100 transition-colors duration-200 hover:border-zinc-300
        dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-zinc-600"
    >
      {/* The sliding knob. */}
      <span
        aria-hidden="true"
        class="absolute left-0.5 flex size-6 items-center justify-center rounded-full bg-white
          text-[0.7rem] shadow-sm transition-transform duration-300 ease-out
          dark:bg-zinc-950"
        classList={{ "translate-x-5": dark() }}
      >
        {/* Both glyphs are always mounted and cross-faded, so the swap has
            something to animate between. */}
        <span
          class="absolute transition-opacity duration-200"
          classList={{ "opacity-0": dark(), "opacity-100": !dark() }}
        >
          ☀
        </span>
        <span
          class="absolute text-accent-400 transition-opacity duration-200"
          classList={{ "opacity-100": dark(), "opacity-0": !dark() }}
        >
          ☾
        </span>
      </span>
    </button>
  );
}
