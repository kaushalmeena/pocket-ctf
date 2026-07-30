import {
  type Accessor,
  createContext,
  createMemo,
  createSignal,
  type JSX,
  onMount,
  useContext,
} from "solid-js";
import {
  checkFlag,
  computeStats,
  emptyProgress,
  loadProgress,
  type ProgressState,
  revealWriteup,
  type Stats,
  type SubmitResult,
  saveProgress,
} from "./progress";

type Store = {
  /** Null until the async token re-validation finishes. */
  ready: Accessor<boolean>;
  state: Accessor<ProgressState>;
  stats: Accessor<Stats>;
  /** Slugs whose stored proof-of-solve failed validation on load. */
  rejected: Accessor<string[]>;
  submit: (slug: string, input: string) => Promise<SubmitResult>;
  revealHint: (slug: string) => void;
  markOpened: (slug: string) => void;
  /** Record that the player actually interacted with a puzzle. */
  noteEngagement: (slug: string, signal: string) => void;
  writeup: (slug: string) => Promise<string | null>;
  reset: () => void;
  importState: (json: string) => Promise<{ ok: boolean; message: string }>;
  exportState: () => string;
};

const Ctx = createContext<Store>();

export function ProgressProvider(props: { children: JSX.Element }) {
  const [state, setState] = createSignal<ProgressState>(emptyProgress());
  const [ready, setReady] = createSignal(false);
  const [rejected, setRejected] = createSignal<string[]>([]);

  const commit = (next: ProgressState) => {
    setState(next);
    saveProgress(next);
  };

  onMount(async () => {
    const { state: loaded, rejected: bad } = await loadProgress();
    setState(loaded);
    setRejected(bad);
    setReady(true);
    // Persist immediately if validation dropped anything, so a tampered entry
    // doesn't sit around waiting to be re-evaluated on every page load.
    if (bad.length > 0) saveProgress(loaded);
  });

  const stats = createMemo(() => computeStats(state()));

  const submit = async (slug: string, input: string): Promise<SubmitResult> => {
    const current = state();
    const result = await checkFlag(current, slug, input);

    switch (result.status) {
      case "solved":
        commit({
          ...current,
          solves: { ...current.solves, [slug]: result.record },
          attempts: { ...current.attempts, [slug]: { wrong: 0, lastAt: Date.now() } },
        });
        break;
      case "wrong":
        commit({
          ...current,
          attempts: {
            ...current.attempts,
            [slug]: { wrong: result.wrongCount, lastAt: Date.now() },
          },
        });
        break;
      case "honeypot":
        commit({
          ...current,
          decoysTripped: current.decoysTripped + 1,
          attempts: {
            ...current.attempts,
            [slug]: {
              wrong: (current.attempts[slug]?.wrong ?? 0) + 1,
              lastAt: Date.now(),
            },
          },
        });
        break;
      default:
        break;
    }
    return result;
  };

  const revealHint = (slug: string) => {
    const current = state();
    commit({
      ...current,
      hints: { ...current.hints, [slug]: (current.hints[slug] ?? 0) + 1 },
    });
  };

  /**
   * Deduplicated, and a no-op once solved -- the point is what happened *before*
   * the answer went in.
   */
  const noteEngagement = (slug: string, signal: string) => {
    const current = state();
    if (current.solves[slug]) return;
    const seen = current.engaged[slug] ?? [];
    if (seen.includes(signal)) return;
    commit({ ...current, engaged: { ...current.engaged, [slug]: [...seen, signal] } });
  };

  const markOpened = (slug: string) => {
    const current = state();
    if (current.openedAt[slug]) return; // the clock starts once
    commit({ ...current, openedAt: { ...current.openedAt, [slug]: Date.now() } });
  };

  const reset = () => commit(emptyProgress());

  const exportState = () => JSON.stringify(state(), null, 2);

  /**
   * Import is validated the same way a page load is: tokens that don't hash to
   * the registry's digests are dropped. Hand-written JSON therefore buys you
   * nothing, though a file from someone who genuinely solved it will work --
   * that is just sharing answers, and no client-side scheme can stop it.
   */
  const importState = async (json: string) => {
    try {
      const parsed = JSON.parse(json) as ProgressState;
      saveProgress(parsed);
      const { state: loaded, rejected: bad } = await loadProgress();
      setState(loaded);
      setRejected(bad);
      saveProgress(loaded);
      const kept = Object.keys(loaded.solves).length;
      return {
        ok: true,
        message:
          bad.length > 0
            ? `Imported ${kept} solve(s); rejected ${bad.length} that failed verification.`
            : `Imported ${kept} verified solve(s).`,
      };
    } catch {
      return { ok: false, message: "That is not valid progress JSON." };
    }
  };

  const store: Store = {
    ready,
    state,
    stats,
    rejected,
    submit,
    revealHint,
    markOpened,
    noteEngagement,
    writeup: (slug) => revealWriteup(state(), slug),
    reset,
    importState,
    exportState,
  };

  return <Ctx.Provider value={store}>{props.children}</Ctx.Provider>;
}

export function useProgress() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useProgress must be used inside <ProgressProvider>");
  return ctx;
}
