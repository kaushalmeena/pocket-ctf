import { createFileRoute, Link } from "@tanstack/solid-router";
import { ArrowRight } from "lucide-solid";
import { For, type JSX, Show } from "solid-js";

import { Terminal } from "~/components/Terminal";
import { getFrontPage } from "~/lib/api";
import { useGame } from "~/lib/game";
import { pageSeo, SITE_DESCRIPTION, structuredData } from "~/lib/seo";

export const Route = createFileRoute("/")({
  loader: () => getFrontPage(),
  component: Home,
  head: () => ({
    ...pageSeo({
      title: "A capture-the-flag hunt with no map",
      description: SITE_DESCRIPTION,
      path: "/",
    }),
    scripts: [{ type: "application/ld+json", children: JSON.stringify(structuredData()) }],
  }),
});

function Home() {
  const page = Route.useLoaderData();
  const { me } = useGame();

  return (
    <div class="space-y-16">
      <section class="animate-rise space-y-6">
        <p class="eyebrow">Capture the flag · no map provided</p>
        <h1 class="text-4xl leading-[1.05] font-semibold tracking-tight text-zinc-900 sm:text-5xl dark:text-zinc-50">
          The flags are hidden.
          <br />
          <span class="text-zinc-400 dark:text-zinc-600">So is everything else.</span>
        </h1>
        <p class="max-w-2xl text-[1.05rem] leading-relaxed text-zinc-600 dark:text-zinc-400">
          Somewhere on this site there are {me().total} flags: short strings shaped like{" "}
          <code class="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[0.85em] text-accent-700 dark:bg-zinc-800 dark:text-accent-400">
            pctf&#123;n1ce_try_but_no&#125;
          </code>
          . There is no list of challenges and nobody will tell you where to start. Some are in
          plain sight. Some are in things your browser was sent and never showed you. A few are
          in places this site would rather you did not go.
        </p>

        {/*
          Loose characters, in no order, taking up no room. Nothing on screen
          comes from these; they are here for whoever reads the document
          instead of the page.
        */}
        <div class="sr-only" aria-hidden="true">
          <For each={page().shards}>{(shard) => <i data-k={shard.k} data-v={shard.v} />}</For>
        </div>
      </section>

      <section class="space-y-4">
        <Terminal />
        <dl class="grid grid-cols-3 gap-3">
          <Stat label="Found">
            {me().found}
            <span class="text-zinc-400 dark:text-zinc-600">/{me().total}</span>
          </Stat>
          <Stat label="Score">{me().score}</Stat>
          <Stat label="Rank">
            <Show
              when={me().rank}
              fallback={<span class="text-zinc-400 dark:text-zinc-600">—</span>}
            >
              #{me().rank}
            </Show>
          </Stat>
        </dl>
      </section>

      <figure class="space-y-3">
        <svg
          viewBox={`0 0 ${page().drawing.width} ${page().drawing.height}`}
          class="w-full rounded-2xl border border-zinc-200 bg-zinc-50/60 text-accent-600 dark:border-zinc-800 dark:bg-zinc-900/40 dark:text-accent-400"
          role="img"
          aria-label="A jagged line chart"
        >
          <path
            d={page().drawing.path}
            fill="none"
            stroke="currentColor"
            stroke-width="1"
            stroke-linejoin="round"
          />
        </svg>
        <figcaption class="font-mono text-xs text-zinc-500">
          fig. 1 — site activity, last 24 hours. Decorative. Almost certainly decorative.
        </figcaption>
      </figure>

      <section class="space-y-5">
        <h2 class="section-title">How this works</h2>
        <div class="grid gap-4 sm:grid-cols-3">
          <Card n="01" title="Look at everything">
            Pages, their source, what arrived with them, what they left behind, the files every
            site is expected to have. If your browser received it, it is fair game.
          </Card>
          <Card n="02" title="Bring it back">
            Paste a flag into the prompt above. It will not ask which puzzle it came from. It
            never told you there were puzzles.
          </Card>
          <Card n="03" title="Collect the trophy">
            Every flag is a trophy; the harder it hid, the better the metal. Find them all and
            there is one more.
          </Card>
        </div>
      </section>

      <section class="grid gap-x-10 gap-y-6 sm:grid-cols-2">
        <Rule title="Your flags are yours">
          Everyone is dealt their own copy of each puzzle. A flag from a friend is a real flag;
          it is just not one of yours, and the site can tell.
        </Rule>
        <Rule title="Guessing is throttled">
          A few misses are free. After that the prompt starts taking longer and longer to
          forgive you. Looking, on the other hand, costs nothing.
        </Rule>
        <Rule title="Clues are for sale">
          Each hidden trophy will sell you clues, starting with where to look. Your score is
          never charged; instead every clue lowers what that flag pays when you find it.
        </Rule>
        <Rule title="Not everything is a flag">
          Some things here are just there to be found. Some are there to be found by people who
          were looking for a shortcut.
        </Rule>
      </section>

      <Link
        to="/trophies"
        class="group inline-flex items-center gap-2 rounded-xl bg-zinc-900 px-5 py-3 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
      >
        Open the trophy case
        <ArrowRight
          aria-hidden="true"
          size={15}
          class="transition-transform duration-200 group-hover:translate-x-0.5"
        />
      </Link>
    </div>
  );
}

function Stat(props: { label: string; children: JSX.Element }) {
  return (
    <div class="rounded-xl border border-zinc-200 px-4 py-3 dark:border-zinc-800">
      <dt class="font-mono text-[0.65rem] tracking-widest text-zinc-500 uppercase">
        {props.label}
      </dt>
      <dd class="pt-1 font-mono text-xl font-semibold text-zinc-900 tabular-nums dark:text-zinc-100">
        {props.children}
      </dd>
    </div>
  );
}

function Card(props: { n: string; title: string; children: JSX.Element }) {
  return (
    <div class="rounded-2xl border border-zinc-200 p-5 dark:border-zinc-800">
      <p class="font-mono text-xs text-accent-600 dark:text-accent-400">{props.n}</p>
      <h3 class="pt-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100">{props.title}</h3>
      <p class="prose-mini pt-1.5">{props.children}</p>
    </div>
  );
}

function Rule(props: { title: string; children: JSX.Element }) {
  return (
    <div>
      <h3 class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{props.title}</h3>
      <p class="prose-mini pt-1">{props.children}</p>
    </div>
  );
}
