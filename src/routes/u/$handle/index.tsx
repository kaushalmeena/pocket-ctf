import { createFileRoute, Link, notFound } from "@tanstack/solid-router";
import { ArrowRight } from "lucide-solid";
import { For } from "solid-js";

import { TrophyIcon } from "~/components/TrophyIcon";
import { getProfile } from "~/lib/api";
import { NO_INDEX, SITE_NAME, SITE_URL } from "~/lib/seo";

/**
 * A player's public page: what a shared link opens.
 *
 * It shows how much they have found and never what, so sharing it costs the
 * next player nothing.
 */
export const Route = createFileRoute("/u/$handle/")({
  loader: async ({ params }) => {
    const profile = await getProfile({ data: params.handle });
    if (!profile) throw notFound();
    return profile;
  },
  head: ({ loaderData, params }) => {
    const handle = loaderData?.handle ?? params.handle;
    const title = `${handle} — ${SITE_NAME}`;
    const description = loaderData
      ? `${handle} has found ${loaderData.found} of ${loaderData.total} hidden flags. Can you?`
      : "A capture-the-flag hunt with no map.";
    const image = `${SITE_URL}/u/${encodeURIComponent(handle)}/card.png`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        NO_INDEX,
        { property: "og:type", content: "profile" },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:image", content: image },
        { property: "og:image:width", content: "1200" },
        { property: "og:image:height", content: "630" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: image },
      ],
    };
  },
  component: ProfilePage,
});

function ProfilePage() {
  const profile = Route.useLoaderData();

  return (
    <div class="animate-rise space-y-8">
      <header class="space-y-3">
        <p class="eyebrow">Player</p>
        <h1 class="truncate text-4xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          {profile().handle}
        </h1>
        <p class="font-mono text-sm text-zinc-500 tabular-nums">
          {profile().found}/{profile().total} flags · {profile().score}/{profile().maxScore} pts
          · rank #{profile().rank}
        </p>
      </header>

      <img
        src={`/u/${encodeURIComponent(profile().handle)}/card.png`}
        alt={`${profile().handle} has found ${profile().found} of ${profile().total} flags`}
        width={1200}
        height={630}
        class="w-full rounded-2xl border border-zinc-200 dark:border-zinc-800"
      />

      <section class="space-y-4">
        <h2 class="section-title">Their case</h2>
        <div class="flex flex-wrap gap-2.5">
          <For each={profile().slots}>
            {(slot) => <TrophyIcon tier={slot.tier} size={14} locked={!slot.held} />}
          </For>
        </div>
        <p class="prose-mini">
          Metals only. Which flags these are, and where they were, is not something this page
          knows how to say.
        </p>
      </section>

      <Link
        to="/"
        class="group inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
      >
        Start your own hunt
        <ArrowRight
          aria-hidden="true"
          size={15}
          class="transition-transform duration-200 group-hover:translate-x-0.5"
        />
      </Link>
    </div>
  );
}
