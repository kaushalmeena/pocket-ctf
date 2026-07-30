import { createFileRoute, notFound } from "@tanstack/solid-router";
import { Show } from "solid-js";
import { Dynamic } from "solid-js/web";
import { pageFor } from "~/challenges/registry";
import { ChallengeShell } from "~/components/ChallengeShell";
import { CHALLENGE_BY_SLUG } from "~/lib/challenges";
import payloads from "~/lib/generated/payloads.json";
import { NO_INDEX } from "~/lib/seo";

/**
 * Every challenge, through one route.
 *
 * Challenges used to need a route file each, so adding one meant five edits in
 * five places and forgetting any of them failed differently. Now the registry is
 * the only list, and it builds itself from the directories under src/challenges.
 */
export const Route = createFileRoute("/c/$slug")({
  loader: ({ params }) => {
    if (!CHALLENGE_BY_SLUG[params.slug]) throw notFound();
    return null;
  },
  head: ({ params }) => ({
    meta: [
      { title: `${CHALLENGE_BY_SLUG[params.slug]?.title ?? "Challenge"} — Pocket CTF` },
      // Challenge pages carry their puzzle payloads; an indexed payload is a
      // cached spoiler.
      NO_INDEX,
    ],
  }),
  component: ChallengePage,
});

function ChallengePage() {
  const params = Route.useParams();
  const meta = () => CHALLENGE_BY_SLUG[params().slug];
  const payload = () => (payloads as Record<string, unknown>)[params().slug];

  return (
    <Show when={meta()} keyed>
      {(challenge) => (
        <ChallengeShell challenge={challenge}>
          <Dynamic component={pageFor(challenge.slug)} payload={payload()} />
        </ChallengeShell>
      )}
    </Show>
  );
}
