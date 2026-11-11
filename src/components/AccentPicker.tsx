import { useAccent } from "~/lib/accent";

/**
 * A swatch in the header. Each press moves to the next palette; the swatch is
 * drawn in whatever the accent currently is, so it always shows its own state.
 */
export function AccentPicker() {
  const { current, cycle } = useAccent();

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`Accent colour: ${current().label}. Change`}
      title={`Accent: ${current().label}`}
      class="flex size-7 shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-zinc-100 hover:border-zinc-300 dark:border-zinc-700 dark:bg-zinc-800 dark:hover:border-zinc-600"
    >
      <span class="size-3.5 rounded-full bg-accent-500 shadow-sm ring-2 ring-accent-500/25" />
    </button>
  );
}
