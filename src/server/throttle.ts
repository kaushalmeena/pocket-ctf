import { getRequestIP } from "@tanstack/solid-start/server";
import { eq, inArray, lt, sql } from "drizzle-orm";

import { db } from "./db";
import { type Player, sha256 } from "./players";
import { throttle } from "./schema";

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
  const keys = keysFor(player);
  const rows = await db()
    .select()
    .from(throttle)
    .where(
      inArray(
        throttle.key,
        keys.map((k) => k.key),
      ),
    );
  let longest = 0;
  for (const row of rows) {
    const free = keys.find((k) => k.key === row.key)?.free ?? FREE.player;
    if (row.wrong < free || now - row.lastAt > FORGET_MS) continue;
    const penalty = Math.min(MAX_LOCKOUT_MS, 2 ** (row.wrong - free) * 1000);
    longest = Math.max(longest, row.lastAt + penalty - now);
  }
  return Math.max(0, longest);
}

/** Record a miss. Returns how many this player has now made in a row. */
export async function noteMiss(player: Player, now = Date.now()): Promise<number> {
  let own = 1;
  for (const { key } of keysFor(player)) {
    const [row] = await db()
      .insert(throttle)
      .values({ key, wrong: 1, lastAt: now })
      .onConflictDoUpdate({
        target: throttle.key,
        set: {
          // A run of misses is forgotten after a quiet spell.
          wrong: sql`CASE WHEN ${now} - ${throttle.lastAt} > ${FORGET_MS} THEN 1 ELSE ${throttle.wrong} + 1 END`,
          lastAt: now,
        },
      })
      .returning({ wrong: throttle.wrong });
    if (key.startsWith("p:")) own = row?.wrong ?? 1;
  }
  // Housekeeping, on the path that is already slow by design.
  if (own === 1)
    await db()
      .delete(throttle)
      .where(lt(throttle.lastAt, now - 86_400_000));
  return own;
}

/** A right answer wipes the player's own slate. The address keeps its count. */
export async function forgive(player: Player): Promise<void> {
  await db()
    .delete(throttle)
    .where(eq(throttle.key, `p:${player.id}`));
}
