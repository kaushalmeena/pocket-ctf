import { createFileRoute, Link } from "@tanstack/solid-router";
import { ArrowRight, ChevronRight } from "lucide-solid";
import { For, Show } from "solid-js";
import { CHALLENGES, TOTAL_POINTS } from "~/lib/challenges";
import { pageSeo, SITE_DESCRIPTION, structuredData } from "~/lib/seo";
import { useProgress } from "~/lib/store";

/**
 * Questions a newcomer actually arrives with, answered in prose.
 *
 * Doubles as FAQPage structured data, so the same words serve the reader and
 * the crawler -- there is no hidden keyword block anywhere on this page, and
 * nothing here is written for a machine that a person would not want to read.
 */
const FAQ = [
  {
    q: "What is a capture-the-flag challenge?",
    a:
      "A CTF is a security puzzle that hides a short marker string — the flag — " +
      "somewhere you have to work to find. You submit the flag to prove you got " +
      "there. Real competitions run for teams over a weekend; these eleven are " +
      "single-player and take a few minutes each.",
  },
  {
    q: "Do I need to install anything?",
    a:
      "No. Pocket CTF is a static website that runs entirely in your browser, " +
      "with no account, no server and no network calls. Browser devtools are the " +
      "only tool several puzzles need, and every browser already ships them.",
  },
  {
    q: "Is it suitable for beginners?",
    a:
      "Yes. The first three challenges teach inspecting the DOM, spotting " +
      "invisible Unicode and recognising an encoding by its shape. Each " +
      "challenge has three progressive hints, and solving one unlocks a writeup " +
      "explaining the technique and why it works.",
  },
  {
    q: "What skills do the challenges cover?",
    a:
      "Browser devtools and recon, zero-width Unicode and image steganography, " +
      "layered encodings, Morse audio, propositional logic, prime factorisation, " +
      "and breaking repeating-key XOR by frequency analysis.",
  },
  {
    q: "Can I cheat by reading the source code?",
    a:
      "Not usefully. No flag exists in plaintext anywhere in the site — each one " +
      "is stored as a salted PBKDF2 hash, and every puzzle's content is derived " +
      "from its flag at build time. Four decoy flags are planted where a " +
      "shortcut-taker looks first.",
  },
  {
    q: "Is Pocket CTF free and open source?",
    a:
      "Yes, MIT licensed. You can clone it, write your own answer key and deploy " +
      "your own instance, whose flags will differ from every other instance.",
  },
];

export const Route = createFileRoute("/")({
  component: Home,
  head: () => ({
    ...pageSeo({
      title: "Learn security by solving puzzles in your browser",
      description: SITE_DESCRIPTION,
      path: "/",
    }),
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify(structuredData(FAQ)),
      },
    ],
  }),
});

function Home() {
  const { stats, ready } = useProgress();

  return (
    <div class="space-y-14">
      <section class="space-y-5">
        <p class="font-mono text-xs tracking-widest text-accent-600 uppercase dark:text-accent-400">
          Capture the flag · offline · no accounts
        </p>
        <h1 class="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl dark:text-zinc-50">
          Eleven puzzles. One browser.
          <br />
          <span class="text-zinc-400 dark:text-zinc-500">No server to ask for help.</span>
        </h1>
        <p class="max-w-xl text-[1.05rem] leading-relaxed text-zinc-600 dark:text-zinc-400">
          Each challenge hides a <em>flag</em> — a short string shaped like{" "}
          <code class="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-[0.85em] text-accent-600 dark:bg-zinc-800 dark:text-accent-400">
            pctf&#123;some_words_x7fq2p&#125;
          </code>
          . Find it, type it in, move on. Nothing here rewards guessing, and none of the puzzles
          want you to know a tool you don't already have. They want you to look at an ordinary
          thing and notice it is not ordinary.
        </p>

        <div class="flex flex-wrap items-center gap-3 pt-1">
          <Link
            to="/challenges"
            class="group inline-flex items-center gap-2 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
          >
            {ready() && stats().solved > 0 ? "Keep going" : "Start with First Light"}
            <ArrowRight
              aria-hidden="true"
              size={15}
              class="transition-transform duration-200 group-hover:translate-x-0.5"
            />
          </Link>
          <Show when={ready() && stats().solved > 0}>
            <span class="font-mono text-xs text-zinc-500">
              {stats().solved}/{stats().total} solved · {stats().score} pts
            </span>
          </Show>
        </div>
      </section>

      <Section title="How it works">
        <ul class="space-y-3">
          <Step n="1">
            Open a challenge. Each one is its own page, with its own puzzle and its own
            submission box.
          </Step>
          <Step n="2">
            Solve it however you like. Devtools, a console one-liner, pen and paper, your ears.
            There is no intended tool, only an intended <em>insight</em>.
          </Step>
          <Step n="3">
            Submit the flag. It is checked against a salted hash, so the site can confirm you
            are right without ever having stored what right looks like.
          </Step>
          <Step n="4">
            Solving unlocks that challenge's writeup — encrypted until the moment you earn it.
            Points, badges and a timer come along for free.
          </Step>
        </ul>
      </Section>

      <Section title="The rules, such as they are">
        <div class="grid gap-x-8 gap-y-4 sm:grid-cols-2">
          <Fact label="Flags are not in the source">
            Not in the HTML, not in the JavaScript, not in the registry. Grep the whole bundle
            for <code>pctf&#123;</code> and you will find four results, all four of them lies.
          </Fact>
          <Fact label="Hints cost points">
            Three per challenge, progressively less coy. Take them — a stuck player learns
            nothing. Just know the scoreboard remembers.
          </Fact>
          <Fact label="Wrong answers slow you down">
            After four misses, submissions back off exponentially. Brute force is not a strategy
            here; it is a waiting game you lose.
          </Fact>
          <Fact label="Every flag ends in noise">
            That trailing gibberish is random, and different on every installation of this site.
            Answers copied from someone else's copy will not work on yours.
          </Fact>

          <Fact label="Progress lives in your browser">
            No account, no sync, no telemetry. Export it to a file if you want it elsewhere.
          </Fact>
        </div>
      </Section>

      <Section title="What you're in for">
        <div class="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
          <For each={CHALLENGES}>
            {(challenge, i) => (
              <div
                class="flex items-baseline gap-3 px-4 py-2.5 text-sm not-last:border-b not-last:border-zinc-100 dark:not-last:border-zinc-900"
                classList={{ "bg-zinc-50/60 dark:bg-zinc-900/30": i() % 2 === 1 }}
              >
                <span class="w-5 shrink-0 font-mono text-xs text-zinc-400 tabular-nums dark:text-zinc-600">
                  {String(i() + 1).padStart(2, "0")}
                </span>
                <span class="font-medium text-zinc-800 dark:text-zinc-200">
                  {challenge.title}
                </span>
                <span class="ml-auto shrink-0 font-mono text-xs text-zinc-400 dark:text-zinc-600">
                  {challenge.points}
                </span>
              </div>
            )}
          </For>
        </div>
        <p class="pt-3 text-sm text-zinc-500 dark:text-zinc-500">
          {TOTAL_POINTS} points available. The eleventh needs the other ten first, and it means
          it — its instructions are encrypted with the proof you earned solving them.
        </p>
      </Section>

      <Section title="Questions">
        <div class="divide-y divide-zinc-100 overflow-hidden rounded-xl border border-zinc-200 dark:divide-zinc-900 dark:border-zinc-800">
          <For each={FAQ}>
            {(item) => (
              <details class="group">
                <summary class="flex cursor-pointer list-none items-center gap-3 px-4 py-3 text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  {item.q}
                  <ChevronRight
                    aria-hidden="true"
                    size={15}
                    class="ml-auto shrink-0 text-zinc-400 transition-transform duration-200 group-open:rotate-90 dark:text-zinc-600"
                  />
                </summary>
                <p class="prose-mini px-4 pb-4">{item.a}</p>
              </details>
            )}
          </For>
        </div>
      </Section>

      <section class="rounded-xl border border-zinc-200 bg-zinc-50/70 p-5 dark:border-zinc-800 dark:bg-zinc-900/40">
        <h2 class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          One piece of advice
        </h2>
        <p class="prose-mini pt-2">
          When you are stuck, you are almost always looking at the puzzle the way it wants to be
          looked at. Try the other way. Read the thing that isn't the content, listen to the
          thing that isn't music, count the thing that isn't the letters.
        </p>
      </section>
    </div>
  );
}

function Section(props: { title: string; children: unknown }) {
  return (
    <section class="space-y-4">
      <h2 class="border-b border-zinc-200 pb-2 text-sm font-semibold tracking-wide text-zinc-900 uppercase dark:border-zinc-800 dark:text-zinc-100">
        {props.title}
      </h2>
      {props.children as never}
    </section>
  );
}

function Step(props: { n: string; children: unknown }) {
  return (
    <li class="flex gap-3.5">
      <span class="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-zinc-900 font-mono text-[0.65rem] text-white dark:bg-zinc-100 dark:text-zinc-900">
        {props.n}
      </span>
      <span class="prose-mini">{props.children as never}</span>
    </li>
  );
}

function Fact(props: { label: string; children: unknown }) {
  return (
    <div>
      <h3 class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{props.label}</h3>
      <p class="prose-mini pt-1">{props.children as never}</p>
    </div>
  );
}
