import { createFileRoute } from "@tanstack/solid-router";
import { ShieldAlert } from "lucide-solid";
import { createSignal } from "solid-js";

import { Room } from "~/components/Room";
import { tryAdmin } from "~/lib/api";
import { useGame } from "~/lib/game";
import { NO_INDEX } from "~/lib/seo";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin — Pocket CTF" }, NO_INDEX] }),
  component: Admin,
});

const FIELD =
  "w-full rounded-lg border border-zinc-300 bg-transparent px-3 py-2 font-mono text-sm text-zinc-900 outline-none focus:border-accent-500 dark:border-zinc-700 dark:text-zinc-100";

function Admin() {
  const { award } = useGame();
  const [line, setLine] = createSignal("Authorised personnel only.");
  const [busy, setBusy] = createSignal(false);
  let attempt = 0;

  const handleSubmit = async (event: SubmitEvent) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget as HTMLFormElement);
    setBusy(true);
    try {
      const result = await tryAdmin({
        data: {
          username: String(form.get("username") ?? ""),
          password: String(form.get("password") ?? ""),
          attempt: attempt++,
        },
      });
      setLine(result.line);
      award(result.trophies);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Room label="Legacy · scheduled for removal" title="Administration">
      <form
        onSubmit={handleSubmit}
        autocomplete="off"
        class="space-y-3 rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800"
      >
        <div class="flex items-center gap-2 pb-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          <ShieldAlert aria-hidden="true" size={16} class="text-amber-500" />
          Sign in to continue
        </div>
        <label class="block space-y-1">
          <span class="text-xs text-zinc-500">Username</span>
          <input name="username" type="text" spellcheck={false} class={FIELD} />
        </label>
        <label class="block space-y-1">
          <span class="text-xs text-zinc-500">Password</span>
          <input name="password" type="password" autocomplete="off" class={FIELD} />
        </label>
        <button
          type="submit"
          disabled={busy()}
          class="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          Sign in
        </button>
        {/* Two lines reserved, so a longer reply never pushes anything down. */}
        <p
          class="line-clamp-2 min-h-10 font-mono text-xs leading-5 text-zinc-500"
          aria-live="polite"
        >
          {line()}
        </p>
      </form>
      <p class="prose-mini">
        Nothing typed here is stored, logged or checked against anything. There is no admin.
        Even so: never type a real password into a login form you found by reading robots.txt.
      </p>
    </Room>
  );
}
