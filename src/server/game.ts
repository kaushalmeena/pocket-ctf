import { asc, count, desc, eq, gt, max, sql, sum } from "drizzle-orm";

import { flagDigest, normalizeFlag } from "~/lib/kdf.js";
import type { BoardRow, Me, Reply, Slot, Trophy, TrophyCase } from "~/lib/types";

import {
  BY_SLUG,
  CHALLENGES,
  DECOYS,
  FLAGS,
  hintCount,
  hintText,
  MAX_SCORE,
  PEPPER,
  writeupText,
} from "./catalogue";
import { db } from "./db";
import { fragmentOf } from "./finale";
import { newPage } from "./journal";
import { persist, type Player, variantOf } from "./players";
import { rarity } from "./rarity";
import { clues as cluesTable, eggs, players, solves } from "./schema";
import { runCommand } from "./terminal";
import { forgive, lockedFor, noteMiss } from "./throttle";

/**
 * The rules of the hunt: what a submission is worth, what a clue costs, and
 * what a player is allowed to know about the flags they have not found.
 */

/* ------------------------------------------------------------------ *
 * Scoring
 * ------------------------------------------------------------------ */

/** Each clue taken forfeits this fraction of a flag's points. */
const CLUE_COST = 0.15;

/** Points still on the table after `clues` clues, never below a quarter. */
const worth = (points: number, clues: number) =>
  Math.round(points * Math.max(0.25, 1 - clues * CLUE_COST));

/** The first clue says where to look; the rest come from the answer key. */
const clueCount = (slug: string) => 1 + hintCount(slug);

/* ------------------------------------------------------------------ *
 * Secret trophies
 * ------------------------------------------------------------------ */

/**
 * Trophies with no flag behind them. Worth nothing, deliberately: several can
 * be claimed from the browser, and a score anyone can award themselves is not
 * a score.
 */
/** `prior` is the guessed share of hunters who find it; see rarity.ts. */
const EGGS: Record<string, { title: string; quip: string; prior: number }> = {
  decoy: {
    title: "Curious Cat",
    quip: "You submitted a flag you found lying around. It was lying around on purpose.",
    prior: 0.35,
  },
  borrowed: {
    title: "Receiving Stolen Goods",
    quip: "A real flag, dealt to somebody else. We're not angry. We're just disappointed.",
    prior: 0.06,
  },
  sudo: {
    title: "Nice Try",
    quip: "This incident will be reported. (It won't. There is nobody to report it to.)",
    prior: 0.2,
  },
  teapot: {
    title: "Short and Stout",
    quip: "HTTP 418. The joke is older than some of the people who find it.",
    prior: 0.1,
  },
  konami: {
    title: "Thirty Lives",
    quip: "Up, up, down, down. Some muscle memory outlives the muscles.",
    prior: 0.08,
  },
  kenobi: {
    title: "General Kenobi",
    quip: "You said hello. The prompt said the only thing it could have said.",
    prior: 0.12,
  },
  towel: {
    title: "Don't Panic",
    quip: "The answer, without the question. Bring a towel next time.",
    prior: 0.1,
  },
  vim: {
    title: "Escape Artist",
    quip: "You typed :q into something that is not vim. Old habits.",
    prior: 0.1,
  },
  bobby: {
    title: "Little Bobby Tables",
    quip: "You typed a quote into a login form. The form has met your mother.",
    prior: 0.09,
  },
  robot: {
    title: "I Am Not a Robot",
    quip: "You told the site you were a search engine. It lied to you right back.",
    prior: 0.05,
  },
  offline: {
    title: "Touch Grass",
    quip: "You went offline in the middle of a web hunt, and came back. Healthy.",
    prior: 0.04,
  },
  pi: {
    title: "Pi O'Clock",
    quip: "3:14 on the clock and this page open. Either dedication or insomnia.",
    prior: 0.03,
  },
};

/** The ones the browser may ask for by name. The rest are awarded server-side. */
const CLAIMABLE = new Set(["konami", "offline", "pi"]);

const PLATINUM: Trophy = {
  tier: "platinum",
  title: "Nothing Left to Hide",
  quip: "Every flag on the site. Go outside. It's nice. Probably.",
};

/** Award a secret trophy. Returns the toast, or nothing if they had it. */
export async function awardEgg(player: Player, egg: string): Promise<Trophy[]> {
  const known = EGGS[egg];
  if (!known) return [];
  const { title, quip, prior } = known;
  await persist(player);
  const inserted = await db()
    .insert(eggs)
    .values({ playerId: player.id, egg, foundAt: Date.now() })
    .onConflictDoNothing()
    .returning({ egg: eggs.egg });
  if (inserted.length === 0) return [];
  const rare = await rarity({ fresh: true });
  return [{ tier: "secret", title, quip, rarity: rare.egg(egg, prior) }];
}

export async function claimEgg(player: Player, egg: string): Promise<Trophy[]> {
  return CLAIMABLE.has(egg) ? awardEgg(player, egg) : [];
}

/* ------------------------------------------------------------------ *
 * A player's standing
 * ------------------------------------------------------------------ */

type SolveRow = {
  slug: string;
  points: number;
  clues: number;
  firstBlood: boolean;
  solvedAt: number;
};

async function solvesOf(player: Player): Promise<Map<string, SolveRow>> {
  if (!player.stored) return new Map();
  const rows = await db().select().from(solves).where(eq(solves.playerId, player.id));
  return new Map(
    rows
      // A solve for a challenge that has since been removed is not a trophy.
      .filter((row) => BY_SLUG.has(row.slug))
      .map((row) => [row.slug, row]),
  );
}

async function cluesOf(player: Player): Promise<Map<string, number>> {
  if (!player.stored) return new Map();
  const rows = await db().select().from(cluesTable).where(eq(cluesTable.playerId, player.id));
  return new Map(rows.map((row) => [row.slug, row.taken]));
}

/** How many players have a strictly higher score. */
export async function playersAhead(score: number) {
  const totals = db()
    .select({ score: sum(solves.points).mapWith(Number).as("score") })
    .from(solves)
    .groupBy(solves.playerId)
    .as("totals");
  const [row] = await db().select({ n: count() }).from(totals).where(gt(totals.score, score));
  return row?.n ?? 0;
}

export async function standing(player: Player): Promise<Me> {
  const owned = await solvesOf(player);
  const score = [...owned.values()].reduce((total, s) => total + s.points, 0);
  const [secrets] = player.stored
    ? await db().select({ n: count() }).from(eggs).where(eq(eggs.playerId, player.id))
    : [{ n: 0 }];

  return {
    handle: player.handle,
    named: player.named,
    account: player.account,
    found: owned.size,
    total: CHALLENGES.length,
    score,
    maxScore: MAX_SCORE,
    secrets: secrets?.n ?? 0,
    rank: owned.size > 0 ? (await playersAhead(score)) + 1 : null,
  };
}

/* ------------------------------------------------------------------ *
 * Submission
 * ------------------------------------------------------------------ */

const FLAG_SHAPE = /^pctf\{[a-z0-9_]{2,64}\}$/;

const MISSES = [
  "No flag by that name. Whatever that was, it wasn't hidden here.",
  "Not one of ours. It has the right shape and the wrong everything else.",
  "Nope. Close only counts in horseshoes and timing attacks.",
  "That is a string in braces. A flag is a string in braces that was hidden.",
  "Wrong. The site remains unimpressed, but it admires the confidence.",
];

const ordinal = (n: number) => {
  const tens = n % 100;
  const suffix = tens >= 11 && tens <= 13 ? "th" : (["th", "st", "nd", "rd"][n % 10] ?? "th");
  return `${n}${suffix}`;
};

/** Said after every decoy: misery loves a headcount. */
async function hallOfShame() {
  const [row] = await db().select({ n: count() }).from(eggs).where(eq(eggs.egg, "decoy"));
  const n = Math.max(1, row?.n ?? 1);
  return n === 1
    ? "You are the first hunter on this server to fall for one. Someone had to be."
    : `You are the ${ordinal(n)} hunter on this server to fall for one of these.`;
}

/**
 * Everything typed at the prompt arrives here: flags, and anything else.
 *
 * A submission does not say which challenge it is for -- the player was never
 * told there were challenges -- so the flag is looked up among all of them.
 */
export async function transmit(player: Player, raw: string): Promise<Reply> {
  const input = raw.trim().slice(0, 200);
  const reply = async (
    tone: Reply["tone"],
    lines: string[],
    trophies: Trophy[] = [],
    clear = false,
  ): Promise<Reply> => ({ tone, lines, trophies, clear, me: await standing(player) });

  if (!/^pctf\b|^pctf\{/i.test(input)) {
    const found = (await solvesOf(player)).size;
    const out = await runCommand(player, input, { found, total: CHALLENGES.length });
    const trophies = out.egg ? await awardEgg(player, out.egg) : [];
    return reply("info", out.lines, trophies, out.clear);
  }

  const locked = await lockedFor(player);
  if (locked > 0) {
    return reply("err", [
      `Too many misses. The prompt is sulking for another ${Math.ceil(locked / 1000)}s.`,
    ]);
  }

  const flag = normalizeFlag(input);
  if (!FLAG_SHAPE.test(flag)) {
    return reply("err", [
      "That isn't flag-shaped. pctf, then braces around lowercase words, digits and underscores.",
    ]);
  }

  const digest = await flagDigest(flag, PEPPER);

  const decoy = DECOYS.get(digest);
  if (decoy) {
    const trophies = await awardEgg(player, "decoy");
    return reply("err", [decoy, await hallOfShame()], trophies);
  }

  const hit = FLAGS.get(digest);
  if (!hit) {
    const misses = await noteMiss(player);
    return reply("err", [MISSES[misses % MISSES.length]!]);
  }

  // Real, but dealt to another player: every challenge ships several variants.
  if (hit.variant !== variantOf(player, hit.slug)) {
    return reply(
      "err",
      ["That flag is genuine. It also belongs to somebody else's copy of this puzzle."],
      await awardEgg(player, "borrowed"),
    );
  }

  const challenge = BY_SLUG.get(hit.slug)!;
  await persist(player);
  const clues = (await cluesOf(player)).get(hit.slug) ?? 0;
  const points = worth(challenge.points, clues);

  const [prior] = await db()
    .select({ n: count() })
    .from(solves)
    .where(eq(solves.slug, hit.slug));
  const firstBlood = (prior?.n ?? 0) === 0;

  const inserted = await db()
    .insert(solves)
    .values({
      playerId: player.id,
      slug: hit.slug,
      points,
      clues,
      firstBlood,
      solvedAt: Date.now(),
    })
    .onConflictDoNothing()
    .returning({ slug: solves.slug });
  if (inserted.length === 0) {
    return reply("info", [`Already in your case: ${challenge.title}. It only counts once.`]);
  }
  await forgive(player);
  const rare = await rarity({ fresh: true });

  const trophies: Trophy[] = [
    {
      tier: challenge.tier,
      title: challenge.title,
      quip: challenge.quip,
      points,
      firstBlood,
      fragment: fragmentOf(player, hit.slug),
      rarity: rare.flag(hit.slug),
    },
  ];
  const me = await standing(player);
  if (me.found === me.total) trophies.push({ ...PLATINUM, rarity: rare.platinum() });

  const lines = [`Flag accepted: ${challenge.title}. +${points} points.`];
  if (firstBlood) lines.push("First blood. Nobody on this server had found that one.");
  const fragment = trophies[0]?.fragment;
  if (fragment)
    lines.push(`It came with fragment ${fragment.n} of ${fragment.of}: ${fragment.text}`);
  lines.push(
    me.found === me.total
      ? "That was the last of them."
      : `${me.found} of ${me.total} found. The rest are still where they were.`,
  );
  const page = newPage(me);
  if (page) lines.push(`A new file appeared: ${page}`);
  return { tone: "ok", lines, trophies, me };
}

/* ------------------------------------------------------------------ *
 * Trophy case
 * ------------------------------------------------------------------ */

async function revealedClues(player: Player, slug: string, taken: number) {
  const meta = BY_SLUG.get(slug)!;
  const out: string[] = [];
  for (let i = 0; i < taken; i++) {
    out.push(
      i === 0
        ? meta.whereabouts
        : ((await hintText(slug, variantOf(player, slug), i - 1)) ?? "This clue went missing."),
    );
  }
  return out;
}

export async function trophyCase(player: Player): Promise<TrophyCase> {
  const [owned, clues, me, rare] = await Promise.all([
    solvesOf(player),
    cluesOf(player),
    standing(player),
    rarity(),
  ]);

  const slots: Slot[] = [];
  for (const challenge of CHALLENGES) {
    const solve = owned.get(challenge.slug);
    const rarityOf = rare.flag(challenge.slug);
    if (solve) {
      slots.push({
        found: true,
        tier: challenge.tier,
        title: challenge.title,
        quip: challenge.quip,
        points: solve.points,
        cluesUsed: solve.clues,
        foundAt: solve.solvedAt,
        firstBlood: solve.firstBlood,
        fragment: fragmentOf(player, challenge.slug),
        rarity: rarityOf,
      });
      continue;
    }
    const taken = clues.get(challenge.slug) ?? 0;
    const left = clueCount(challenge.slug) - taken;
    slots.push({
      found: false,
      tier: challenge.tier,
      points: worth(challenge.points, taken),
      full: challenge.points,
      clues: await revealedClues(player, challenge.slug, taken),
      cluesLeft: left,
      nextWorth: left > 0 ? worth(challenge.points, taken + 1) : null,
      rarity: rarityOf,
    });
  }

  const found = player.stored
    ? await db()
        .select()
        .from(eggs)
        .where(eq(eggs.playerId, player.id))
        .orderBy(asc(eggs.foundAt))
    : [];

  return {
    me,
    slots,
    secrets: found
      .filter((row) => EGGS[row.egg])
      .map((row) => {
        const { title, quip, prior } = EGGS[row.egg]!;
        return { title, quip, foundAt: row.foundAt, rarity: rare.egg(row.egg, prior) };
      }),
    secretsTotal: Object.keys(EGGS).length,
    platinum: me.found === me.total ? { ...PLATINUM, rarity: rare.platinum() } : null,
  };
}

/** A slot is addressed by position, so the request never names a challenge. */
const slotAt = (index: number) => CHALLENGES[index];

export async function buyClue(player: Player, index: number): Promise<TrophyCase> {
  const challenge = slotAt(index);
  if (challenge && !(await solvesOf(player)).has(challenge.slug)) {
    const taken = (await cluesOf(player)).get(challenge.slug) ?? 0;
    if (taken < clueCount(challenge.slug)) {
      await persist(player);
      await db()
        .insert(cluesTable)
        .values({ playerId: player.id, slug: challenge.slug, taken: 1 })
        .onConflictDoUpdate({
          target: [cluesTable.playerId, cluesTable.slug],
          set: { taken: sql`${cluesTable.taken} + 1` },
        });
    }
  }
  return trophyCase(player);
}

/** The explanation of a technique, for a flag the player actually holds. */
export async function writeup(player: Player, index: number): Promise<string | null> {
  const challenge = slotAt(index);
  if (!challenge || !(await solvesOf(player)).has(challenge.slug)) return null;
  return writeupText(challenge.slug, variantOf(player, challenge.slug));
}

/* ------------------------------------------------------------------ *
 * The board
 * ------------------------------------------------------------------ */

export async function board(player: Player): Promise<BoardRow[]> {
  const score = sum(solves.points).mapWith(Number);
  const lastAt = max(solves.solvedAt).mapWith(Number);
  const rows = await db()
    .select({ id: players.id, handle: players.handle, found: count(), score, lastAt })
    .from(solves)
    .innerJoin(players, eq(players.id, solves.playerId))
    .groupBy(players.id, players.handle)
    .orderBy(desc(score), asc(lastAt))
    .limit(50);
  return rows.map((row, i) => ({
    rank: i + 1,
    handle: row.handle,
    found: row.found,
    score: row.score,
    lastAt: row.lastAt,
    you: row.id === player.id,
    platinum: row.found >= CHALLENGES.length,
  }));
}
