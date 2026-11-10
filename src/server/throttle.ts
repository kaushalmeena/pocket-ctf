import { getRequestIP } from "@tanstack/solid-start/server";

import { db } from "./db";
import { type Player, sha256 } from "./players";

/**
 * Backoff for wrong answers.
 *
 * Two counters run side by side. One follows the player, and is the one an
 * honest person meets: a few free misses, then a wait that doubles. The other
 * follows the address the request came from, with a much longer leash, and
 * exists because a session costs nothing to throw away -- a script that mints
 * a fresh cookie per guess has a new player every time and the same address.
 *
 * Kept in its own table rather than on the player, so that being wrong does
 * not enrol anyone.
 */

const MAX_LOCKOUT_MS = 60_000;

/** A run of misses is forgotten after this long without another. */
const FORGET_MS = 15 * 60_000;

/** Misses allowed before the waiting starts. */
const FREE = { player: 5, address: 40 } as const;

type Key = { key: string; free: number };

function keysFor(player: Player): Key[] {
  const keys: Key[] = [{ key: `p:${player.id}`, free: FREE.player }];
  const ip = getRequestIP({ xForwardedFor: true });
  // Hashed so the table holds no addresses, only something to count against.
  if (ip)
    keys.push({
      key: `a:${sha256(`pocket-ctf/address:${ip}`).slice(0, 32)}`,
      free: FREE.address,
    });
  return keys;
}

/** Milliseconds until this player may guess again. Zero if they may now. */
export async function lockedFor(player: Player, now = Date.now()): Promise<number> {
  const client = await db();
  let longest = 0;
  for (const { key, free } of keysFor(player)) {
    const found = await client.execute({
      sql: "SELECT wrong, last_at FROM throttle WHERE key = ?",
      args: [key],
    });
    const row = found.rows[0];
    if (!row) continue;
    const [wrong, lastAt] = [Number(row.wrong), Number(row.last_at)];
    if (wrong < free || now - lastAt > FORGET_MS) continue;
    const penalty = Math.min(MAX_LOCKOUT_MS, 2 ** (wrong - free) * 1000);
    longest = Math.max(longest, lastAt + penalty - now);
  }
  return Math.max(0, longest);
}

/** Record a miss. Returns how many this player has now made in a row. */
export async function noteMiss(player: Player, now = Date.now()): Promise<number> {
  const client = await db();
  let own = 1;
  for (const { key } of keysFor(player)) {
    const result = await client.execute({
      sql: `INSERT INTO throttle (key, wrong, last_at) VALUES (?, 1, ?)
            ON CONFLICT (key) DO UPDATE SET
              wrong = CASE WHEN ? - last_at > ? THEN 1 ELSE wrong + 1 END,
              last_at = excluded.last_at
            RETURNING wrong`,
      args: [key, now, now, FORGET_MS],
    });
    if (key.startsWith("p:")) own = Number(result.rows[0]?.wrong ?? 1);
  }
  // Housekeeping, on the path that is already slow by design.
  if (own === 1) {
    await client.execute({
      sql: "DELETE FROM throttle WHERE last_at < ?",
      args: [now - 86_400_000],
    });
  }
  return own;
}

/** A right answer wipes the player's own slate. The address keeps its count. */
export async function forgive(player: Player): Promise<void> {
  const client = await db();
  await client.execute({ sql: "DELETE FROM throttle WHERE key = ?", args: [`p:${player.id}`] });
}
