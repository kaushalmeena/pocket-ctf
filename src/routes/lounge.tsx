import { createFileRoute } from "@tanstack/solid-router";
import { BadgeCheck, BadgeX } from "lucide-solid";
import { Show } from "solid-js";

import { Room } from "~/components/Room";
import { getLounge } from "~/lib/api";
import { NO_INDEX } from "~/lib/seo";

export const Route = createFileRoute("/lounge")({
  loader: () => getLounge(),
  head: () => ({ meta: [{ title: "Executive lounge — Pocket CTF" }, NO_INDEX] }),
  component: Lounge,
});

function Lounge() {
  const room = Route.useLoaderData();
  const granted = () => {
    const state = room();
    return state.granted ? state : null;
  };
  const reissued = () => {
    const state = room();
    return !state.granted && state.reissued;
  };

  return (
    <Room label="Executives only" title="The lounge">
      <Show
        when={granted()}
        fallback={
          <div class="space-y-5">
            <div class="flex items-center gap-4 rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800">
              <BadgeX aria-hidden="true" class="shrink-0 text-zinc-400" size={22} />
              <div>
                <p class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {reissued() ? "That badge is a forgery." : "Not on the list."}
                </p>
                <p class="pt-0.5 font-mono text-xs text-zinc-500">
                  your badge:{" "}
                  <span class="text-rose-600 dark:text-rose-400">{room().role}</span> ·
                  required: <span class="text-accent-700 dark:text-accent-400">executive</span>
                </p>
              </div>
            </div>
            <Show when={reissued()}>
              <p class="prose-mini">
                The signature did not match, so we have torn it up and issued you a new
                visitor's badge. No hard feelings.
              </p>
            </Show>
            <p class="prose-mini">
              Downstairs they believe whatever your browser tells them. We learned from that. Up
              here every <code>badge</code> is signed, and a badge that has been altered will
              not verify.
            </p>
            <div class="rounded-2xl border border-zinc-200 bg-zinc-50/60 p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
              <p class="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                How a badge is made
              </p>
              <ul class="prose-mini list-disc space-y-1 pt-2 pl-5">
                <li>
                  A badge is <code>payload.signature</code>. The payload is base64 of a small
                  JSON object with a <code>role</code>.
                </li>
                <li>
                  The signature is the first 16 hex characters of{" "}
                  <code>SHA-256(code + "." + payload)</code>.
                </li>
                <li>
                  The code is the lounge's door code. It is four digits, because the facilities
                  team has to remember it.
                </li>
              </ul>
            </div>
          </div>
        }
      >
        {(open) => (
          <div class="space-y-5">
            <div class="flex items-center gap-4 rounded-2xl border border-accent-500/40 bg-accent-50 p-5 dark:bg-accent-950/30">
              <BadgeCheck
                aria-hidden="true"
                class="shrink-0 text-accent-600 dark:text-accent-400"
                size={22}
              />
              <div>
                <p class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  Signature verified. Do come in.
                </p>
                <p class="pt-0.5 font-mono text-xs text-zinc-500">your badge: {open().role}</p>
              </div>
            </div>
            <p class="prose-mini">
              A properly signed badge, for an executive nobody has met. The signature is
              genuine, which is all we check, and all anyone can check. This was left on the
              good chair:
            </p>
            <p class="blob">{open().flag}</p>
          </div>
        )}
      </Show>
    </Room>
  );
}
