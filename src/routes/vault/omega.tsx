import { createFileRoute, Link } from "@tanstack/solid-router";
import { createSignal, onMount, Show } from "solid-js";
import payloads from "~/lib/generated/payloads.json";
import { unsealPublic } from "~/lib/progress";

export const Route = createFileRoute("/vault/omega")({
  component: Vault,
  head: () => ({
    meta: [{ title: "· · ·" }, { name: "robots", content: "noindex, nofollow" }],
  }),
});

const { sealed } = payloads["nowhere-to-be-found"];

function Vault() {
  const [flag, setFlag] = createSignal<string | null>(null);
  const [failed, setFailed] = createSignal(false);

  onMount(async () => {
    /*
     * The key is this page's own path. Deriving it from location.pathname
     * rather than a literal means the bundle contains neither the flag nor a
     * hardcoded string to grep for -- whoever knows the URL holds the key, and
     * knowing the URL is the challenge.
     */
    const path = window.location.pathname.replace(/\/+$/, "") || "/";
    const opened = await unsealPublic(path, sealed);
    if (opened) setFlag(opened);
    else setFailed(true);
  });

  return (
    <div class="space-y-6 py-10">
      <p class="font-mono text-xs tracking-widest text-zinc-400 uppercase dark:text-zinc-600">
        unlisted
      </p>

      <h1 class="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        You read the file.
      </h1>

      <p class="prose-mini max-w-xl">
        Nothing links here. No sitemap mentions it, no navigation includes it, and the crawler
        that built this site had to be told the path by hand. You got here because you thought
        to ask a machine-readable file what it was hiding, which is most of what reconnaissance
        is.
      </p>

      <Show
        when={flag()}
        fallback={
          <div class="rounded-xl border border-zinc-200 p-6 dark:border-zinc-800">
            <Show
              when={failed()}
              fallback={<p class="text-sm text-zinc-400">Deriving key from this URL…</p>}
            >
              <p class="text-sm text-rose-600 dark:text-rose-400">
                The key derived from this URL did not open the payload. If you rewrote the path
                to get here, put it back the way robots.txt spelled it.
              </p>
            </Show>
          </div>
        }
      >
        {(value) => (
          <div class="animate-rise rounded-xl border border-accent-200 bg-accent-50/60 p-6 dark:border-accent-900 dark:bg-accent-950/40">
            <p class="text-xs tracking-wider text-accent-700 uppercase dark:text-accent-300">
              Decrypted with the path you had to know
            </p>
            <p class="pt-2 font-mono text-lg break-all text-accent-800 select-all dark:text-accent-100">
              {value()}
            </p>
          </div>
        )}
      </Show>

      <p class="prose-mini max-w-xl">Take it back to the challenge page and submit it there.</p>

      <Link
        to="/c/nowhere-to-be-found"
        class="inline-block rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
      >
        ← Nowhere To Be Found
      </Link>
    </div>
  );
}
