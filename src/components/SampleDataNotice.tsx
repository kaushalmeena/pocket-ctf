import { TriangleAlert } from "lucide-solid";
import { Show } from "solid-js";
import registry from "~/lib/generated/registry.json";

/**
 * Says so, loudly, when this instance is running the committed demo flags.
 *
 * A fresh clone is seeded from `src/lib/generated/sample/`, whose answer key
 * (`flags.sample.json`) is public. That is fine for a demo and useless for
 * anything competitive, and the difference is invisible without saying it out
 * loud -- so it gets said out loud.
 */
export function SampleDataNotice() {
  // Older generated files predate the flag; treat a missing value as "real",
  // since a real deployment is the case that must never be mislabelled.
  const isSample = () => (registry as { sample?: boolean }).sample === true;

  return (
    <Show when={isSample()}>
      <div class="border-b border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/50">
        <p class="mx-auto flex w-full max-w-3xl items-start gap-2.5 px-5 py-2.5 text-xs text-amber-900 sm:px-6 dark:text-amber-200">
          <TriangleAlert aria-hidden="true" size={14} class="mt-px shrink-0" />
          <span>
            <strong class="font-semibold">Demo instance.</strong> These flags come from{" "}
            <code class="font-mono">flags.sample.json</code>, which is committed to the
            repository — anyone can look them up. Run <code class="font-mono">pnpm gen</code>{" "}
            with your own answer key to get a real deployment with unguessable flags.
          </span>
        </p>
      </div>
    </Show>
  );
}
