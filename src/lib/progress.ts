/**
 * Solve state, and the anti-cheat rules that guard it.
 *
 * The design goal is that flipping a value in localStorage gets you nothing.
 * Instead of a `solved: true` boolean, a solve stores a **proof-of-solve
 * token** -- PBKDF2(flag, tokenSalt) -- and the registry ships only
 * SHA-256(token). On load, every stored token is re-verified against that
 * digest, so a forged entry needs the flag it claims to prove.
 *
 * A second derived value, the seal key, is kept so the challenge's writeup can
 * be decrypted later. It is one-way with respect to the flag, so keeping it
 * around doesn't hand the answer back.
 */

import { CHALLENGE_BY_SLUG, CHALLENGES, type Challenge, pointsAfterHints } from "./challenges";
import registry from "./generated/registry.json";
import { derive, fromHex, normalizeFlag, PURPOSE, sha256Hex, toHex, unseal } from "./kdf.js";

const STORAGE_KEY = "pctf:progress";
const SCHEMA_VERSION = 2;

export type SolveRecord = {
  /** PBKDF2(flag, tokenSalt) -- validated against the registry on load. */
  token: string;
  /** PBKDF2(flag, sealSalt) -- decrypts this challenge's writeup. */
  sealKey: string;
  solvedAt: number;
  /** Wrong submissions before the right one. */
  tries: number;
  /** Hints revealed at the moment of solving; fixes the score. */
  hintsUsed: number;
  /** Time from first visit to solve, in ms. */
  elapsedMs: number;
};

export type ProgressState = {
  v: number;
  solves: Record<string, SolveRecord>;
  /** Hints revealed per challenge, including for unsolved ones. */
  hints: Record<string, number>;
  /** First time each challenge page was opened, for the timer. */
  openedAt: Record<string, number>;
  /** Wrong-answer bookkeeping, for the submission throttle. */
  attempts: Record<string, { wrong: number; lastAt: number }>;
  /** Honeypot flags submitted. Presence of any is its own little badge. */
  decoysTripped: number;
  createdAt: number;
};

export function emptyProgress(): ProgressState {
  return {
    v: SCHEMA_VERSION,
    solves: {},
    hints: {},
    openedAt: {},
    attempts: {},
    decoysTripped: 0,
    createdAt: Date.now(),
  };
}

type RegistryEntry = (typeof registry.challenges)[keyof typeof registry.challenges];

function entryFor(slug: string): RegistryEntry | undefined {
  return (registry.challenges as Record<string, RegistryEntry>)[slug];
}

/* ------------------------------------------------------------------ *
 * Persistence -- with token re-validation on every load
 * ------------------------------------------------------------------ */

/**
 * Read stored progress and discard anything that can't prove itself.
 *
 * Returns the surviving state plus the slugs that were rejected, so the UI can
 * say something about it rather than silently resetting someone's afternoon.
 */
export async function loadProgress(): Promise<{
  state: ProgressState;
  rejected: string[];
}> {
  const rejected: string[] = [];
  let parsed: Partial<ProgressState> | null = null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) parsed = JSON.parse(raw);
  } catch {
    parsed = null;
  }
  if (!parsed || parsed.v !== SCHEMA_VERSION) return { state: emptyProgress(), rejected };

  const state: ProgressState = { ...emptyProgress(), ...parsed, solves: {} };

  for (const [slug, record] of Object.entries(parsed.solves ?? {})) {
    const entry = entryFor(slug);
    if (!entry || typeof record?.token !== "string") {
      rejected.push(slug);
      continue;
    }
    // The whole anti-tamper story in one line: a solve is only real if the
    // stored token hashes to the digest baked into the registry at build time.
    if ((await sha256Hex(record.token)) !== entry.tokenHash) {
      rejected.push(slug);
      continue;
    }
    state.solves[slug] = record;
  }

  return { state, rejected };
}

export function saveProgress(state: ProgressState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Private browsing, quota, or a disabled store. The game still plays;
    // it just won't be there tomorrow.
  }
}

/* ------------------------------------------------------------------ *
 * Submission throttle
 * ------------------------------------------------------------------ */

/** Wrong answers before the throttle engages. */
const FREE_ATTEMPTS = 4;
const MAX_LOCKOUT_MS = 30_000;

/**
 * Exponential backoff after a few misses. Combined with a ~300 ms PBKDF2 check
 * per guess, this makes grinding the flag space thoroughly unappealing --
 * which is the only honest defence available to a client-side scoreboard.
 */
export function lockoutRemaining(state: ProgressState, slug: string, now = Date.now()) {
  const record = state.attempts[slug];
  if (!record || record.wrong < FREE_ATTEMPTS) return 0;
  const penalty = Math.min(MAX_LOCKOUT_MS, 2 ** (record.wrong - FREE_ATTEMPTS) * 1000);
  return Math.max(0, record.lastAt + penalty - now);
}

/* ------------------------------------------------------------------ *
 * Flag submission
 * ------------------------------------------------------------------ */

export type SubmitResult =
  | { status: "solved"; record: SolveRecord; points: number }
  | { status: "wrong"; wrongCount: number }
  | { status: "already" }
  | { status: "honeypot"; message: string }
  | { status: "malformed"; message: string }
  | { status: "locked"; msRemaining: number }
  | { status: "unknown-challenge" };

const FLAG_SHAPE = /^pctf\{[a-z0-9_]{2,64}\}$/;

/**
 * Check a submitted flag. Mutates nothing -- callers apply the returned result
 * so the store stays the single writer.
 */
export async function checkFlag(
  state: ProgressState,
  slug: string,
  input: string,
): Promise<SubmitResult> {
  const challenge = CHALLENGE_BY_SLUG[slug];
  const entry = entryFor(slug);
  if (!challenge || !entry) return { status: "unknown-challenge" };
  if (state.solves[slug]) return { status: "already" };

  const locked = lockoutRemaining(state, slug);
  if (locked > 0) return { status: "locked", msRemaining: locked };

  const flag = normalizeFlag(input);
  if (!FLAG_SHAPE.test(flag)) {
    return {
      status: "malformed",
      // Phrased rather than shown: a literal example here would be the only
      // flag-shaped string in src/, and verify-no-flags.mjs would flag it.
      message: "Flags are pctf, then braces around lowercase words and underscores.",
    };
  }

  const attempt = toHex(await derive(flag, PURPOSE.verify, fromHex(entry.verifySalt)));
  if (attempt === entry.verifyHash) {
    const hintsUsed = state.hints[slug] ?? 0;
    const openedAt = state.openedAt[slug] ?? Date.now();
    const record: SolveRecord = {
      token: toHex(await derive(flag, PURPOSE.token, fromHex(entry.tokenSalt))),
      sealKey: toHex(await derive(flag, PURPOSE.seal, fromHex(entry.sealSalt))),
      solvedAt: Date.now(),
      tries: state.attempts[slug]?.wrong ?? 0,
      hintsUsed,
      elapsedMs: Math.max(0, Date.now() - openedAt),
    };
    return { status: "solved", record, points: pointsAfterHints(challenge, hintsUsed) };
  }

  // Was it one of the planted decoys? Those are the only readable flags in the
  // project, so submitting one says something specific about how you got here.
  for (const decoy of registry.honeypots) {
    const hash = toHex(await derive(flag, PURPOSE.verify, fromHex(decoy.salt)));
    if (hash === decoy.hash) return { status: "honeypot", message: decoy.message };
  }

  return { status: "wrong", wrongCount: (state.attempts[slug]?.wrong ?? 0) + 1 };
}

/* ------------------------------------------------------------------ *
 * Sealed content
 * ------------------------------------------------------------------ */

/**
 * Decrypt a challenge's writeup. Needs the seal key that only a real solve
 * produces -- there is no code path that renders this text otherwise, because
 * the plaintext genuinely isn't in the bundle.
 */
export async function revealWriteup(
  state: ProgressState,
  slug: string,
): Promise<string | null> {
  const entry = entryFor(slug);
  const record = state.solves[slug];
  if (!entry || !record) return null;
  return unsealWithKey(record.sealKey, entry.writeup, entry.sealIv);
}

/** AES-GCM open using an already-derived key, bypassing PBKDF2. */
async function unsealWithKey(keyHex: string, ctHex: string, ivHex: string) {
  try {
    const key = await crypto.subtle.importKey("raw", fromHex(keyHex), "AES-GCM", false, [
      "decrypt",
    ]);
    const pt = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromHex(ivHex) },
      key,
      fromHex(ctHex),
    );
    return new TextDecoder().decode(pt);
  } catch {
    return null;
  }
}

/**
 * Open a payload sealed under a publicly discoverable string -- a URL path, a
 * slug, a phrase on the page. Used by challenges whose difficulty is *finding*
 * the key rather than keeping it.
 */
export async function unsealPublic(
  secret: string,
  sealed: { salt: string; iv: string; ct: string },
) {
  return unseal(secret, fromHex(sealed.salt), sealed.ct, fromHex(sealed.iv));
}

/**
 * The meta challenge's instructions are sealed under every other
 * proof-of-solve token concatenated in challenge order. No shortcut: the page
 * cannot describe the task until the ten solves genuinely exist.
 */
export function chainSecret(state: ProgressState, required: readonly string[]) {
  const tokens = required.map((slug) => state.solves[slug]?.token);
  return tokens.every(Boolean) ? tokens.join("") : null;
}

/* ------------------------------------------------------------------ *
 * Derived stats
 * ------------------------------------------------------------------ */

export type Stats = {
  solved: number;
  total: number;
  score: number;
  maxScore: number;
  hintsUsed: number;
  fastestMs: number | null;
  totalTries: number;
  byCategory: Record<string, { solved: number; total: number }>;
};

export function computeStats(state: ProgressState): Stats {
  const byCategory: Stats["byCategory"] = {};
  let score = 0;
  let hintsUsed = 0;
  let totalTries = 0;
  let fastestMs: number | null = null;

  for (const challenge of CHALLENGES) {
    const bucket = byCategory[challenge.category] ?? { solved: 0, total: 0 };
    byCategory[challenge.category] = bucket;
    bucket.total++;
    const record = state.solves[challenge.slug];
    if (!record) continue;
    bucket.solved++;
    score += pointsAfterHints(challenge, record.hintsUsed);
    hintsUsed += record.hintsUsed;
    totalTries += record.tries;
    if (record.elapsedMs > 0 && (fastestMs === null || record.elapsedMs < fastestMs)) {
      fastestMs = record.elapsedMs;
    }
  }

  return {
    solved: Object.keys(state.solves).length,
    total: CHALLENGES.length,
    score,
    maxScore: CHALLENGES.reduce((sum, c) => sum + c.points, 0),
    hintsUsed,
    fastestMs,
    totalTries,
    byCategory,
  };
}

/** A challenge is playable when its prerequisites are genuinely proven. */
export function isUnlocked(state: ProgressState, challenge: Challenge) {
  return (challenge.requires ?? []).every((slug) => Boolean(state.solves[slug]));
}
