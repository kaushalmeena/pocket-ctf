import { Moon, Sun } from "lucide-solid";
import { useTheme } from "~/lib/theme";

/**
 * A single switch: the knob slides, the icons cross-fade, and the page's colours
 * transition with it (see `.theme-transition` in app.css).
 *
 * The knob position and icon opacity come from Tailwind's `dark:` variants
 * rather than from the `theme()` signal. That is deliberate. Prerendered HTML
 * cannot know the visitor's preference, so anything driven by JS state ships in
 * the light position and is corrected at hydration -- which happens after the
 * first paint, so the visitor watches the switch flip itself on every load. The
 * `dark` class, by contrast, is on <html> before the first paint (see
 * THEME_BOOTSTRAP), so a CSS-driven knob is simply drawn in the right place to
 * begin with, and the transition only ever fires on a real click.
 *
 * `aria-checked` and `title` still come from the signal: they aren't painted, so
 * being correct immediately after hydration is soon enough.
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
      // Exempts this control from the page-wide colour-only transition that is
      // applied while the theme changes -- see app.css.
      data-theme-switch
      class="relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border border-zinc-200
        bg-zinc-100 transition-colors duration-200 hover:border-zinc-300
        dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-zinc-600"
    >
      {/* The sliding knob. */}
      <span
        aria-hidden="true"
        class="absolute left-0.5 flex size-6 items-center justify-center rounded-full bg-white
          text-[0.7rem] shadow-sm transition-transform duration-300 ease-out
          dark:translate-x-5 dark:bg-zinc-950"
      >
        {/* Both icons stay mounted and cross-fade, so the swap has something to
            animate between rather than popping. */}
        <Sun
          size={13}
          class="absolute text-amber-500 opacity-100 transition-opacity duration-200 dark:opacity-0"
        />
        <Moon
          size={13}
          class="absolute text-accent-400 opacity-0 transition-opacity duration-200 dark:opacity-100"
        />
      </span>
    </button>
  );
}
