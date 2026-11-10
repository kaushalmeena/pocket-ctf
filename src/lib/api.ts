import { createServerFn } from "@tanstack/solid-start";

import { profileOf } from "~/server/card";
import {
  board,
  buyClue,
  claimEgg,
  recoveryCode,
  restore,
  standing,
  transmit,
  trophyCase,
  writeup,
} from "~/server/game";
import * as plants from "~/server/plants";
import { currentPlayer, rename } from "~/server/players";

/**
 * Every call the browser can make.
 *
 * The handlers run on the server and are compiled out of the client bundle,
 * along with everything they import -- the catalogue, the digests and the
 * puzzle data stay behind. What crosses is a request and whatever one handler
 * chose to return.
 */

const text = (max: number) => (input: unknown) => String(input ?? "").slice(0, max);
const index = (input: unknown) => Math.trunc(Number(input));

export const getShell = createServerFn({ method: "GET" }).handler(() => plants.shell());
export const getFrontPage = createServerFn({ method: "GET" }).handler(() => plants.frontPage());
export const getLost = createServerFn({ method: "GET" }).handler(() => plants.lostAndFound());
export const getDeadDrop = createServerFn({ method: "GET" }).handler(() => plants.deadDrop());
export const getRadio = createServerFn({ method: "GET" }).handler(() => plants.radio());
export const getMachine = createServerFn({ method: "GET" }).handler(() => plants.machine());
export const getStaffRoom = createServerFn({ method: "GET" }).handler(() => plants.staffRoom());
export const getLounge = createServerFn({ method: "GET" }).handler(() => plants.lounge());
export const getTeapot = createServerFn({ method: "GET" }).handler(() => plants.teapot());

export const getTrophyCase = createServerFn({ method: "GET" }).handler(async () =>
  trophyCase(await currentPlayer()),
);

export const getBoard = createServerFn({ method: "GET" }).handler(async () =>
  board(await currentPlayer()),
);

/** Everything typed at the prompt: a flag, or anything else. */
export const sendLine = createServerFn({ method: "POST" })
  .validator(text(200))
  .handler(async ({ data }) => transmit(await currentPlayer(), data));

export const takeClue = createServerFn({ method: "POST" })
  .validator(index)
  .handler(async ({ data }) => buyClue(await currentPlayer(), data));

export const readWriteup = createServerFn({ method: "POST" })
  .validator(index)
  .handler(async ({ data }) => writeup(await currentPlayer(), data));

export const claimSecret = createServerFn({ method: "POST" })
  .validator(text(20))
  .handler(async ({ data }) => {
    const player = await currentPlayer();
    return { trophies: await claimEgg(player, data), me: await standing(player) };
  });

export const setHandle = createServerFn({ method: "POST" })
  .validator(text(40))
  .handler(async ({ data }) => {
    const player = await currentPlayer();
    const error = await rename(player, data);
    return { error, me: await standing(player) };
  });

/** Shown once; asking again cancels the previous one. */
export const getRecoveryCode = createServerFn({ method: "POST" }).handler(async () =>
  recoveryCode(await currentPlayer()),
);

export const redeemRecoveryCode = createServerFn({ method: "POST" })
  .validator(text(40))
  .handler(async ({ data }) => restore(await currentPlayer(), data));

export const getVault = createServerFn({ method: "GET" })
  .validator(text(80))
  .handler(({ data }) => plants.vault(data));

/** Anyone's public profile, by handle. Counts and metals, never titles. */
export const getProfile = createServerFn({ method: "GET" })
  .validator(text(40))
  .handler(({ data }) => profileOf(data));
