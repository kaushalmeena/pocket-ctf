import { eq } from "drizzle-orm";

import { db } from "./db";
import { clues, eggs, players, solves } from "./schema";

/**
 * Move one player's hunt onto another: an anonymous player claiming with
 * GitHub, possibly onto an account that already has progress of its own from
 * another browser. Whatever either of them found is kept, once.
 */
export async function merge(from: string, into: string) {
  if (from === into) return;
  await db().transaction(async (tx) => {
    const [existing] = await tx
      .select({ id: players.id })
      .from(players)
      .where(eq(players.id, into));

    if (!existing) {
      // Nothing on the account yet: the anonymous player simply becomes it.
      await tx.update(players).set({ id: into }).where(eq(players.id, from));
      await tx.update(solves).set({ playerId: into }).where(eq(solves.playerId, from));
      await tx.update(clues).set({ playerId: into }).where(eq(clues.playerId, from));
      await tx.update(eggs).set({ playerId: into }).where(eq(eggs.playerId, from));
      return;
    }

    // Both have progress. The account's own seed and handle win; finds are pooled.
    const theirSolves = await tx.select().from(solves).where(eq(solves.playerId, from));
    const theirClues = await tx.select().from(clues).where(eq(clues.playerId, from));
    const theirEggs = await tx.select().from(eggs).where(eq(eggs.playerId, from));
    if (theirSolves.length > 0) {
      await tx
        .insert(solves)
        .values(theirSolves.map((row) => ({ ...row, playerId: into })))
        .onConflictDoNothing();
    }
    if (theirClues.length > 0) {
      await tx
        .insert(clues)
        .values(theirClues.map((row) => ({ ...row, playerId: into })))
        .onConflictDoNothing();
    }
    if (theirEggs.length > 0) {
      await tx
        .insert(eggs)
        .values(theirEggs.map((row) => ({ ...row, playerId: into })))
        .onConflictDoNothing();
    }
    await tx.delete(solves).where(eq(solves.playerId, from));
    await tx.delete(clues).where(eq(clues.playerId, from));
    await tx.delete(eggs).where(eq(eggs.playerId, from));
    await tx.delete(players).where(eq(players.id, from));
  });
}
