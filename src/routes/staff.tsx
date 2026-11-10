import { createFileRoute } from "@tanstack/solid-router";
import { LockKeyhole, LockKeyholeOpen } from "lucide-solid";
import { Show } from "solid-js";

import { Room } from "~/components/Room";
import { getStaffRoom } from "~/lib/api";
import { NO_INDEX } from "~/lib/seo";

export const Route = createFileRoute("/staff")({
  loader: () => getStaffRoom(),
  head: () => ({ meta: [{ title: "Staff room — Pocket CTF" }, NO_INDEX] }),
  component: StaffRoom,
});

function StaffRoom() {
  const room = Route.useLoaderData();
  const granted = () => {
    const state = room();
    return state.granted ? state : null;
  };

  return (
    <Room label="Staff only" title="The staff room">
      <Show
        when={granted()}
        fallback={
          <div class="space-y-5">
            <div class="flex items-center gap-4 rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800">
              <LockKeyhole aria-hidden="true" class="shrink-0 text-zinc-400" size={22} />
              <div>
                <p class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Access denied.
                </p>
                <p class="pt-0.5 font-mono text-xs text-zinc-500">
                  your clearance:{" "}
                  <span class="text-rose-600 dark:text-rose-400">{room().role}</span> ·
                  required: <span class="text-accent-700 dark:text-accent-400">staff</span>
                </p>
              </div>
            </div>
            <p class="prose-mini">
              This room is for staff. Your clearance was checked on the way in, the way it is
              checked on every visit: we asked your browser who you are, and we believed it.
            </p>
          </div>
        }
      >
        {(open) => (
          <div class="space-y-5">
            <div class="flex items-center gap-4 rounded-2xl border border-accent-500/40 bg-accent-50 p-5 dark:bg-accent-950/30">
              <LockKeyholeOpen
                aria-hidden="true"
                class="shrink-0 text-accent-600 dark:text-accent-400"
                size={22}
              />
              <div>
                <p class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Welcome back, colleague.
                </p>
                <p class="pt-0.5 font-mono text-xs text-zinc-500">
                  your clearance: {open().role}
                </p>
              </div>
            </div>
            <p class="prose-mini">
              Funny, we do not remember hiring you. Still, the badge checks out, and the badge
              is all we check. This was pinned to the noticeboard:
            </p>
            <p class="blob">{open().flag}</p>
          </div>
        )}
      </Show>
    </Room>
  );
}
