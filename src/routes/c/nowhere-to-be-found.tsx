import { createFileRoute } from "@tanstack/solid-router";
import { ChallengeShell } from "~/components/ChallengeShell";
import { getChallenge } from "~/lib/challenges";
import { NO_INDEX } from "~/lib/seo";

export const Route = createFileRoute("/c/nowhere-to-be-found")({
  component: NowhereToBeFound,
  head: () => ({ meta: [{ title: "Nowhere To Be Found — Pocket CTF" }, NO_INDEX] }),
});

const challenge = getChallenge("nowhere-to-be-found");

function NowhereToBeFound() {
  return (
    <ChallengeShell challenge={challenge}>
      <div class="space-y-5">
        <p class="prose-mini">
          This page does not contain the flag, and it is not being coy — there is genuinely
          nothing hidden here. The flag is on a different page of this site. Nothing links to
          that page. It is not in the navigation, it is not in the challenge list, and no amount
          of clicking around will land you on it.
        </p>

        <p class="prose-mini">
          It is still reachable. Every site quietly serves a handful of files at paths that were
          standardised decades ago, and it is worth developing the habit of reading them before
          you read anything the site actually wanted to show you.
        </p>

        <div class="rounded-xl border border-zinc-200 bg-zinc-50/60 p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
          <p class="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            The thought to have
          </p>
          <p class="prose-mini pt-1.5">
            Some of those files exist to <em>request</em> that automated visitors stay away from
            certain paths. Which means they are, by construction, a list of paths somebody would
            rather you did not visit — written down, published, and served to anyone who asks.
          </p>
        </div>

        <p class="prose-mini">
          When you find the page, the flag will be waiting there in plain text. Not because it
          was left lying around, but because the URL you needed to know <em>is</em> the
          decryption key — the page derives it from its own address. Nothing in this bundle
          spells the flag out, and nothing in it spells out the path either.
        </p>
      </div>
    </ChallengeShell>
  );
}
