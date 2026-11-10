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
import { issueRecovery, persist, type Player, recover, variantOf } from "./players";
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
const EGGS: Record<string, { title: string; quip: string }> = {
  decoy: {
    title: "Curious Cat",
    quip: "You submitted a flag you found lying around. It was lying around on purpose.",
  },
  borrowed: {
    title: "Receiving Stolen Goods",
    quip: "A real flag, dealt to somebody else. We're not angry. We're just disappointed.",
  },
  sudo: {
    title: "Nice Try",
    quip: "This incident will be reported. (It won't. There is nobody to report it to.)",
  },
  teapot: {
    title: "Short and Stout",
    quip: "HTTP 418. The joke is older than some of the people who find it.",
  },
  konami: {
    title: "Thirty Lives",
    quip: "Up, up, down, down. Some muscle memory outlives the muscles.",
  },
  logo: {
    title: "Percussive Maintenance",
    quip: "Seven taps on the logo. It was working fine before you did that.",
  },
};

/** The ones the browser may ask for by name. The rest are awarded server-side. */
const CLAIMABLE = new Set(["konami", "logo"]);

const PLATINUM: Trophy = {
  tier: "platinum",
  title: "Nothing Left to Hide",
  quip: "Every flag on the site. Go outside. It's nice. Probably.",
};

/** Award a secret trophy. Returns the toast, or nothing if they had it. */
export async function awardEgg(player: Player, egg: string): Promise<Trophy[]> {
  const known = EGGS[egg];
  if (!known) return [];
  await persist(player);
  const client = await db();
  const result = await client.execute({
    sql: "INSERT OR IGNORE INTO eggs (player_id, egg, found_at) VALUES (?, ?, ?)",
    args: [player.id, egg, Date.now()],
  });
  return result.rowsAffected > 0 ? [{ tier: "secret", ...known }] : [];
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
  const client = await db();
  const result = await client.execute({
    sql: "SELECT slug, points, clues, first_blood, solved_at FROM solves WHERE player_id = ?",
    args: [player.id],
  });
  return new Map(
    result.rows
      // A solve for a challenge that has since been removed is not a trophy.
      .filter((row) => BY_SLUG.has(String(row.slug)))
      .map((row) => [
        String(row.slug),
        {
          slug: String(row.slug),
          points: Number(row.points),
          clues: Number(row.clues),
          firstBlood: Number(row.first_blood) === 1,
          solvedAt: Number(row.solved_at),
        },
      ]),
  );
}

async function cluesOf(player: Player): Promise<Map<string, number>> {
  const client = await db();
  const result = await client.execute({
    sql: "SELECT slug, taken FROM clues WHERE player_id = ?",
    args: [player.id],
  });
  return new Map(result.rows.map((row) => [String(row.slug), Number(row.taken)]));
}

export async function standing(player: Player): Promise<Me> {
  const client = await db();
  const solves = await solvesOf(player);
  const score = [...solves.values()].reduce((sum, s) => sum + s.points, 0);
  const eggs = await client.execute({
    sql: "SELECT COUNT(*) AS n FROM eggs WHERE player_id = ?",
    args: [player.id],
  });

  let rank: number | null = null;
  if (solves.size > 0) {
    const ahead = await client.execute({
      sql: `SELECT COUNT(*) AS n FROM (
              SELECT SUM(points) AS score FROM solves GROUP BY player_id HAVING score > ?
            )`,
      args: [score],
    });
    rank = Number(ahead.rows[0]?.n ?? 0) + 1;
  }

  return {
    handle: player.handle,
    named: player.named,
    found: solves.size,
    total: CHALLENGES.length,
    score,
    maxScore: MAX_SCORE,
    secrets: Number(eggs.rows[0]?.n ?? 0),
    rank,
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

  if (/^restore\b/i.test(input)) {
    const result = await restore(player, input.slice("restore".length));
    return reply(result.ok ? "ok" : "err", [result.message]);
  }

  if (!/^pctf\b|^pctf\{/i.test(input)) {
    const out = await runCommand(player, input);
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
  if (decoy) return reply("err", [decoy], await awardEgg(player, "decoy"));

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
  const client = await db();
  const clues = (await cluesOf(player)).get(hit.slug) ?? 0;
  const points = worth(challenge.points, clues);

  const prior = await client.execute({
    sql: "SELECT COUNT(*) AS n FROM solves WHERE slug = ?",
    args: [hit.slug],
  });
  const firstBlood = Number(prior.rows[0]?.n ?? 0) === 0;

  const inserted = await client.execute({
    sql: `INSERT OR IGNORE INTO solves (player_id, slug, points, clues, first_blood, solved_at)
          VALUES (?, ?, ?, ?, ?, ?)`,
    args: [player.id, hit.slug, points, clues, firstBlood ? 1 : 0, Date.now()],
  });
  if (inserted.rowsAffected === 0) {
    return reply("info", [`Already in your case: ${challenge.title}. It only counts once.`]);
  }
  await forgive(player);

  const trophies: Trophy[] = [
    {
      tier: challenge.tier,
      title: challenge.title,
      quip: challenge.quip,
      points,
      firstBlood,
      fragment: fragmentOf(player, hit.slug),
    },
  ];
  const me = await standing(player);
  if (me.found === me.total) trophies.push(PLATINUM);

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
  return { tone: "ok", lines, trophies, me };
}

/* ------------------------------------------------------------------ *
 * Recovery
 * ------------------------------------------------------------------ */

export const recoveryCode = (player: Player) => issueRecovery(player);

/**
 * Redeem a recovery code. Throttled like a flag, because it is one: a string
 * that is worth something to whoever guesses it.
 */
export async function restore(player: Player, code: string) {
  const locked = await lockedFor(player);
  if (locked > 0) {
    return {
      ok: false,
      message: `Too many misses. Try again in ${Math.ceil(locked / 1000)}s.`,
    };
  }
  if (!(await recover(player, code))) {
    await noteMiss(player);
    return { ok: false, message: "No player answers to that code." };
  }
  return {
    ok: true,
    message: `Welcome back, ${player.handle}. Everything is where you left it.`,
  };
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
  const client = await db();
  const [solves, clues, me] = [
    await solvesOf(player),
    await cluesOf(player),
    await standing(player),
  ];

  const slots: Slot[] = [];
  for (const challenge of CHALLENGES) {
    const solve = solves.get(challenge.slug);
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
      });
      continue;
    }
    const taken = clues.get(challenge.slug) ?? 0;
    const left = clueCount(challenge.slug) - taken;
    slots.push({
      found: false,
      tier: challenge.tier,
      points: worth(challenge.points, taken),
      clues: await revealedClues(player, challenge.slug, taken),
      cluesLeft: left,
      nextWorth: left > 0 ? worth(challenge.points, taken + 1) : null,
    });
  }

  const eggs = await client.execute({
    sql: "SELECT egg, found_at FROM eggs WHERE player_id = ? ORDER BY found_at",
    args: [player.id],
  });

  return {
    me,
    slots,
    secrets: eggs.rows
      .filter((row) => EGGS[String(row.egg)])
      .map((row) => ({ ...EGGS[String(row.egg)]!, foundAt: Number(row.found_at) })),
    secretsTotal: Object.keys(EGGS).length,
    platinum: me.found === me.total ? PLATINUM : null,
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
      const client = await db();
      await client.execute({
        sql: `INSERT INTO clues (player_id, slug, taken) VALUES (?, ?, 1)
              ON CONFLICT (player_id, slug) DO UPDATE SET taken = taken + 1`,
        args: [player.id, challenge.slug],
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
  const client = await db();
  const result = await client.execute(
    `SELECT p.id, p.handle, COUNT(*) AS found, SUM(s.points) AS score, MAX(s.solved_at) AS last_at
       FROM solves s JOIN players p ON p.id = s.player_id
      GROUP BY p.id
      ORDER BY score DESC, last_at ASC
      LIMIT 50`,
  );
  return result.rows.map((row, i) => ({
    rank: i + 1,
    handle: String(row.handle),
    found: Number(row.found),
    score: Number(row.score),
    lastAt: Number(row.last_at),
    you: String(row.id) === player.id,
    platinum: Number(row.found) >= CHALLENGES.length,
  }));
}
