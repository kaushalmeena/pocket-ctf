import { For } from "solid-js";
import { type Theme, useTheme } from "~/lib/theme";

const OPTIONS: { value: Theme; label: string; glyph: string }[] = [
  { value: "light", label: "Light", glyph: "☀" },
  { value: "system", label: "System", glyph: "◐" },
  { value: "dark", label: "Dark", glyph: "☾" },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <fieldset class="flex items-center gap-0.5 rounded-full border border-zinc-200 p-0.5 dark:border-zinc-800">
      <legend class="sr-only">Colour theme</legend>
      <For each={OPTIONS}>
        {(option) => (
          <button
            type="button"
            onClick={() => setTheme(option.value)}
            aria-pressed={theme() === option.value}
            title={option.label}
            class="flex size-7 items-center justify-center rounded-full text-xs transition-colors
              aria-pressed:bg-zinc-900 aria-pressed:text-white
              hover:bg-zinc-100 dark:hover:bg-zinc-800
              dark:aria-pressed:bg-zinc-100 dark:aria-pressed:text-zinc-900"
          >
            <span aria-hidden="true">{option.glyph}</span>
            <span class="sr-only">{option.label}</span>
          </button>
        )}
      </For>
    </fieldset>
  );
}
