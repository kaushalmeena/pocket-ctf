import { createFileRoute, notFound } from "@tanstack/solid-router";
import { Show } from "solid-js";
import { Dynamic } from "solid-js/web";
import { pageFor } from "~/challenges/registry";
import { ChallengeShell } from "~/components/ChallengeShell";
import { CHALLENGE_BY_SLUG } from "~/lib/challenges";
import payloads from "~/lib/generated/payloads.json";
import { NO_INDEX } from "~/lib/seo";
import { useProgress } from "~/lib/store";

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

type Payloads = Record<string, { variants: unknown[] } | string | undefined>;

function ChallengePage() {
  const params = Route.useParams();
  const { ready, variant } = useProgress();
  const meta = () => CHALLENGE_BY_SLUG[params().slug];

  /**
   * The payload for the variant this browser drew.
   *
   * Prerendering cannot know which that is, so the puzzle itself renders on the
   * client. The surrounding page -- title, tagline, hints, submission -- is
   * still server-rendered; only the payload waits, and only for as long as the
   * store takes to read localStorage.
   */
  const payload = () => {
    const slug = params().slug;
    const entry = (payloads as Payloads)[slug];
    // The file also carries banner strings; only challenge keys have variants.
    return typeof entry === "object" ? entry?.variants[variant(slug)] : undefined;
  };

  return (
    <Show when={meta()} keyed>
      {(challenge) => (
        <ChallengeShell challenge={challenge}>
          <Show
            when={ready() && payload()}
            fallback={
              <p class="text-sm text-zinc-400 dark:text-zinc-600">Preparing your puzzle…</p>
            }
          >
            <Dynamic component={pageFor(challenge.slug)} payload={payload()} />
          </Show>
        </ChallengeShell>
      )}
    </Show>
  );
}
