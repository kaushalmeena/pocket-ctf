import { createFileRoute } from "@tanstack/solid-router";
import { Droplet } from "lucide-solid";
import { createResource, createSignal, For, Match, Show, Switch } from "solid-js";

import { Markdown } from "~/components/Markdown";
import { TIER_LABEL, TrophyIcon } from "~/components/TrophyIcon";
import {
  getRecoveryCode,
  getTrophyCase,
  readWriteup,
  redeemRecoveryCode,
  takeClue,
} from "~/lib/api";
import { useGame } from "~/lib/game";
import { NO_INDEX } from "~/lib/seo";
import type { Slot, TrophyCase } from "~/lib/types";

export const Route = createFileRoute("/trophies")({
  loader: () => getTrophyCase(),
  head: () => ({ meta: [{ title: "Trophy case — Pocket CTF" }, NO_INDEX] }),
  component: Trophies,
});

const day = (ms: number) => new Date(ms).toISOString().slice(0, 10);

function Trophies() {
  const loaded = Route.useLoaderData();
  const { sync } = useGame();
  // Buying a clue returns the whole case again; show whichever is newer.
  const [bought, setBought] = createSignal<TrophyCase>();
  const view = () => bought() ?? loaded();

  const handleBuy = async (index: number) => {
    const next = await takeClue({ data: index });
    setBought(next);
    sync(next.me);
  };

  return (
    <div class="animate-rise space-y-10">
      <Profile view={view()} />

      <section class="space-y-4">
        <h2 class="section-title">Flags</h2>
        <div class="grid gap-3 sm:grid-cols-2">
          <For each={view().slots}>
            {(slot, i) => (
              <Switch>
                <Match when={slot.found && slot}>
                  {(found) => <FoundSlot slot={found()} index={i()} />}
                </Match>
                <Match when={!slot.found && slot}>
                  {(locked) => <LockedSlot slot={locked()} index={i()} onBuy={handleBuy} />}
                </Match>
              </Switch>
            )}
          </For>
        </div>
      </section>

      <section class="space-y-4">
        <h2 class="section-title">Secrets</h2>
        <p class="prose-mini">
          Not flags, and worth no points. Things the site noticed you doing.{" "}
          {view().secrets.length} of {view().secretsTotal} so far.
        </p>
        <div class="grid gap-3 sm:grid-cols-2">
          <For each={view().secrets}>
            {(secret) => (
              <div class="flex items-center gap-3.5 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
                <TrophyIcon tier="secret" size={16} />
                <div class="min-w-0">
                  <p class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    {secret.title}
                  </p>
                  <p class="pt-0.5 text-xs leading-snug text-zinc-500">{secret.quip}</p>
                </div>
              </div>
            )}
          </For>
        </div>
      </section>

      <Recovery />
    </div>
  );
}

/**
 * Progress hangs off a cookie. This is how it survives losing one: a code to
 * write down here, and a box to type it into anywhere else.
 */
function Recovery() {
  const [code, setCode] = createSignal<string>();
  const [message, setMessage] = createSignal<string>();
  const [busy, setBusy] = createSignal(false);
  let field!: HTMLInputElement;

  const handleIssue = async () => {
    setBusy(true);
    try {
      setCode(await getRecoveryCode());
    } finally {
      setBusy(false);
    }
  };

  const handleRedeem = async (event: SubmitEvent) => {
    event.preventDefault();
    const result = await redeemRecoveryCode({ data: field.value });
    setMessage(result.message);
    // A different player now: everything on the page is stale, so start over.
    if (result.ok) window.location.reload();
  };

  return (
    <section class="space-y-4">
      <h2 class="section-title">Keep your progress</h2>
      <div class="grid gap-3 sm:grid-cols-2">
        <div class="space-y-3 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800">
          <p class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Recovery code</p>
          <p class="text-xs leading-relaxed text-zinc-500">
            There are no accounts here, so your trophies live and die with a cookie. A recovery
            code brings them back in another browser, or after you clear this one.
          </p>
          <Show
            when={code()}
            fallback={
              <button
                type="button"
                onClick={handleIssue}
                disabled={busy()}
                class="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
              >
                Give me a code
              </button>
            }
          >
            <p class="blob text-center text-sm tracking-widest">{code()}</p>
            <p class="text-xs text-zinc-500">
              Write it down now. It will not be shown again, and asking for another cancels this
              one.
            </p>
          </Show>
        </div>

        <form
          onSubmit={handleRedeem}
          class="space-y-3 rounded-2xl border border-zinc-200 p-4 dark:border-zinc-800"
        >
          <p class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Have a code?</p>
          <p class="text-xs leading-relaxed text-zinc-500">
            Enter it and this browser becomes that player. Whatever this browser had found on
            its own stays behind.
          </p>
          <div class="flex gap-2">
            <input
              ref={field}
              type="text"
              autocomplete="off"
              spellcheck={false}
              maxLength={40}
              placeholder="XXXX-XXXX-XXXX-XXXX-XXXX"
              aria-label="Recovery code"
              class="min-w-0 flex-1 rounded-lg border border-zinc-300 bg-transparent px-3 py-1.5 font-mono text-xs uppercase dark:border-zinc-700"
            />
            <button
              type="submit"
              class="rounded-lg bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
            >
              Restore
            </button>
          </div>
          <Show when={message()}>
            <p class="text-xs text-zinc-600 dark:text-zinc-400">{message()}</p>
          </Show>
        </form>
      </div>
    </section>
  );
}

function Profile(props: { view: TrophyCase }) {
  const { me, rename } = useGame();
  const [editing, setEditing] = createSignal(false);
  const [error, setError] = createSignal<string | null>(null);
  let field!: HTMLInputElement;

  const handleEdit = () => {
    setError(null);
    setEditing(true);
    queueMicrotask(() => field.focus());
  };

  const handleCancel = () => setEditing(false);

  const handleSave = async (event: SubmitEvent) => {
    event.preventDefault();
    const problem = await rename(field.value);
    setError(problem);
    if (!problem) setEditing(false);
  };

  const platinum = () => props.view.platinum;

  return (
    <section class="space-y-5">
      <div class="flex flex-wrap items-center gap-5">
        {/* Your portrait. The server drew it for you, and only for you. */}
        <img
          src="/avatar.png"
          alt="Your portrait"
          width={72}
          height={72}
          class="pixelated size-18 rounded-2xl border border-zinc-200 dark:border-zinc-800"
        />
        <div class="min-w-0 flex-1 space-y-1.5">
          <p class="eyebrow">Trophy case</p>
          <Show
            when={editing()}
            fallback={
              <div class="flex flex-wrap items-baseline gap-3">
                <h1 class="truncate text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
                  {me().handle}
                </h1>
                <button
                  type="button"
                  onClick={handleEdit}
                  class="text-xs text-zinc-500 underline decoration-zinc-300 underline-offset-2 hover:text-zinc-900 dark:decoration-zinc-700 dark:hover:text-zinc-100"
                >
                  {me().named ? "rename" : "pick your own handle"}
                </button>
              </div>
            }
          >
            <form onSubmit={handleSave} class="flex flex-wrap items-center gap-2">
              <input
                ref={field}
                type="text"
                value={me().handle}
                maxLength={20}
                autocomplete="off"
                spellcheck={false}
                aria-label="Handle"
                class="w-56 rounded-lg border border-zinc-300 bg-transparent px-3 py-1.5 font-mono text-sm dark:border-zinc-700"
              />
              <button
                type="submit"
                class="rounded-lg bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
              >
                Save
              </button>
              <button type="button" onClick={handleCancel} class="px-2 text-sm text-zinc-500">
                Cancel
              </button>
            </form>
          </Show>
          <Show when={error()}>
            <p class="text-xs text-rose-600 dark:text-rose-400">{error()}</p>
          </Show>
          <p class="font-mono text-xs text-zinc-500 tabular-nums">
            {me().found}/{me().total} flags · {me().score}/{me().maxScore} pts
            <Show when={me().rank}> · rank #{me().rank}</Show>
          </p>
        </div>
      </div>

      <div
        class="h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-900"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={me().total}
        aria-valuenow={me().found}
        aria-label="Flags found"
      >
        <div
          class="h-full rounded-full bg-accent-500 transition-[width] duration-500"
          style={{ width: `${(me().found / Math.max(1, me().total)) * 100}%` }}
        />
      </div>

      <div
        class="flex items-center gap-4 rounded-2xl border p-4"
        classList={{
          "tier-platinum trophy-card": Boolean(platinum()),
          "border-dashed border-zinc-300 dark:border-zinc-700": !platinum(),
        }}
      >
        <TrophyIcon tier="platinum" size={20} locked={!platinum()} />
        <div>
          <p class="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {platinum()?.title ?? "Platinum"}
          </p>
          <p class="pt-0.5 text-xs text-zinc-500">
            {platinum()?.quip ??
              "Awarded for finding every flag on the site. No clues for sale."}
          </p>
        </div>
      </div>
    </section>
  );
}

type Found = Extract<Slot, { found: true }>;
type Locked = Extract<Slot, { found: false }>;

function FoundSlot(props: { slot: Found; index: number }) {
  const [open, setOpen] = createSignal(false);
  // Fetched the first time it is opened, and only for a flag you hold.
  const [writeup] = createResource(open, () => readWriteup({ data: props.index }));

  const handleToggle = (event: Event) =>
    setOpen((event.currentTarget as HTMLDetailsElement).open);

  return (
    <div class={`tier-${props.slot.tier} trophy-card space-y-3 rounded-2xl border p-4`}>
      <div class="flex items-start gap-3.5">
        <TrophyIcon tier={props.slot.tier} size={18} />
        <div class="min-w-0 flex-1">
          <p class="flex flex-wrap items-center gap-x-2 font-mono text-[0.65rem] tracking-widest text-zinc-500 uppercase">
            <span class="trophy-ink">{TIER_LABEL[props.slot.tier]}</span>
            <span>+{props.slot.points}</span>
            <span>{day(props.slot.foundAt)}</span>
            <Show when={props.slot.firstBlood}>
              <span class="inline-flex items-center gap-1 text-rose-600 dark:text-rose-400">
                <Droplet size={10} aria-hidden="true" />
                first blood
              </span>
            </Show>
          </p>
          <p class="pt-1 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            {props.slot.title}
          </p>
          <p class="pt-0.5 text-xs leading-snug text-zinc-500">{props.slot.quip}</p>
        </div>
      </div>
      <details onToggle={handleToggle} class="text-sm">
        <summary class="cursor-pointer text-xs font-medium text-zinc-600 dark:text-zinc-400">
          How it worked
        </summary>
        <div class="pt-2">
          <Show when={writeup()} fallback={<p class="text-xs text-zinc-500">Fetching…</p>}>
            {(text) => <Markdown source={text()} />}
          </Show>
        </div>
      </details>
    </div>
  );
}

function LockedSlot(props: {
  slot: Locked;
  index: number;
  onBuy: (index: number) => Promise<void>;
}) {
  const [busy, setBusy] = createSignal(false);

  const handleBuy = async () => {
    setBusy(true);
    try {
      await props.onBuy(props.index);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div class="space-y-3 rounded-2xl border border-dashed border-zinc-300 p-4 dark:border-zinc-700">
      <div class="flex items-start gap-3.5">
        <TrophyIcon tier={props.slot.tier} size={18} locked />
        <div class="min-w-0 flex-1">
          <p class="font-mono text-[0.65rem] tracking-widest text-zinc-500 uppercase">
            {TIER_LABEL[props.slot.tier]} · worth {props.slot.points}
          </p>
          <p class="pt-1 text-sm font-semibold text-zinc-400 dark:text-zinc-600">
            Hidden trophy
          </p>
          <p class="pt-0.5 text-xs text-zinc-500">Still wherever it was hidden.</p>
        </div>
      </div>

      <Show when={props.slot.clues.length > 0}>
        <ol class="space-y-1.5 border-l-2 border-accent-500/50 pl-3">
          <For each={props.slot.clues}>
            {(clue) => (
              <li class="text-xs leading-relaxed text-zinc-600 dark:text-zinc-400">{clue}</li>
            )}
          </For>
        </ol>
      </Show>

      <Show
        when={props.slot.nextWorth !== null}
        fallback={
          <p class="text-xs text-zinc-500">No clues left. You know everything we do.</p>
        }
      >
        <button
          type="button"
          onClick={handleBuy}
          disabled={busy()}
          class="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs text-zinc-700 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-900"
        >
          {props.slot.clues.length === 0 ? "Buy a clue" : "Buy another"} · drops it to{" "}
          {props.slot.nextWorth} pts
        </button>
      </Show>
    </div>
  );
}
