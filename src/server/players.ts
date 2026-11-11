import { createHash, randomBytes } from "node:crypto";

import { getCookie, getRequest, setCookie } from "@tanstack/solid-start/server";
import { eq, sql } from "drizzle-orm";

import { auth } from "./auth";
import { dealt } from "./catalogue";
import { db } from "./db";
import { players } from "./schema";

/**
 * Who is asking.
 *
 * Identity is Better Auth's (see auth.ts). What this adds is the part before
 * there is any identity at all: looking at the site writes nothing. A visitor
 * with no session is dealt their puzzles from a random `pctf_deal` cookie, and
 * their handle and seed are derived from it, so a crawler -- or a script that
 * throws its cookies away every request -- leaves the database as it found it.
 *
 * The first time they do something worth keeping, {@link persist} signs them
 * in as an anonymous Better Auth user and saves the seed they were dealt, so
 * the puzzles they have been looking at stay theirs.
 */

export type Player = {
  /** Better Auth's user id once stored; derived from the deal cookie before. */
  id: string;
  handle: string;
  named: boolean;
  /** Never sent to the browser. Decides this player's flags, and so their puzzles. */
  seed: string;
  /** Whether a player row (and a Better Auth user) exists yet. */
  stored: boolean;
  /** The name on a linked GitHub account, once claimed. */
  account: string | null;
};

const DEAL_COOKIE = "pctf_deal";
const TOKEN_SHAPE = /^[0-9a-f]{64}$/;
const YEAR = 60 * 60 * 24 * 365;

export const sha256 = (text: string) => createHash("sha256").update(text).digest("hex");

const ADJECTIVES = [
  "quiet",
  "idle",
  "lucid",
  "dusty",
  "brisk",
  "sly",
  "odd",
  "amber",
  "feral",
  "polite",
  "sleepy",
  "nimble",
  "static",
  "hollow",
  "patient",
  "wry",
  "lunar",
  "salty",
  "velvet",
  "rogue",
];
const ANIMALS = [
  "otter",
  "heron",
  "lynx",
  "moth",
  "newt",
  "ibis",
  "gecko",
  "raven",
  "stoat",
  "marmot",
  "wombat",
  "tapir",
  "finch",
  "badger",
  "puffin",
  "mantis",
  "ferret",
  "walrus",
  "magpie",
  "shrew",
];

/** A handle from four bytes: the same bytes always give the same name. */
function handleFrom(bytes: Buffer) {
  const adjective = ADJECTIVES[bytes[0]! % ADJECTIVES.length];
  const animal = ANIMALS[bytes[1]! % ANIMALS.length];
  return `${adjective}-${animal}-${1000 + (bytes.readUInt16BE(2) % 9000)}`;
}

/** The deal cookie, minting one if the visitor has none. */
function dealToken() {
  const existing = getCookie(DEAL_COOKIE) ?? "";
  if (TOKEN_SHAPE.test(existing)) return existing;
  const token = randomBytes(32).toString("hex");
  setCookie(DEAL_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: YEAR,
  });
  return token;
}

/** A visitor nobody has saved yet, worked out from their deal cookie alone. */
function sketch(token: string): Player {
  const digest = createHash("sha256").update(`pocket-ctf/player:${token}`).digest();
  return {
    id: `visitor:${digest.toString("hex").slice(0, 24)}`,
    handle: handleFrom(digest.subarray(12)),
    named: false,
    seed: sha256(`pocket-ctf/seed:${token}`).slice(0, 32),
    stored: false,
    account: null,
  };
}

/**
 * Insert the hunt's row for a Better Auth user, dealt from `from`. The derived
 * handle can collide with one somebody chose, so it is tried, then varied.
 */
async function insertPlayer(id: string, from: Player) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const handle = attempt === 0 ? from.handle : handleFrom(randomBytes(4));
    const [row] = await db()
      .insert(players)
      .values({ id, handle, seed: from.seed, createdAt: Date.now() })
      .onConflictDoNothing()
      .returning();
    if (row) return row;
    // Either the id exists already (a race with another request) or the handle
    // was taken. Only the first is a reason to stop.
    const [mine] = await db().select().from(players).where(eq(players.id, id));
    if (mine) return mine;
  }
  throw new Error("could not find a free handle");
}

async function resolve(): Promise<Player> {
  const visitor = sketch(dealToken());
  const signedIn = await auth().api.getSession({ headers: getRequest().headers });
  if (!signedIn) return visitor;

  const { user } = signedIn;
  const [row] = await db().select().from(players).where(eq(players.id, user.id));
  // A GitHub sign-in from a browser that never saved anything: deal them in now.
  const player = row ?? (await insertPlayer(user.id, visitor));
  return {
    id: player.id,
    handle: player.handle,
    named: player.named,
    seed: player.seed,
    stored: true,
    account: user.isAnonymous ? null : user.name,
  };
}

/*
 * One page load runs several server functions against the same request, and on
 * a first visit none of them has a cookie yet. Without this they would each
 * mint their own deal and the last Set-Cookie would win.
 */
const perRequest = new WeakMap<Request, Promise<Player>>();

export function currentPlayer(): Promise<Player> {
  const request = getRequest();
  let pending = perRequest.get(request);
  if (!pending) {
    pending = resolve().then((player) => {
      leavePocketLitter(player);
      return player;
    });
    perRequest.set(request, pending);
  }
  return pending;
}

/**
 * Give the visitor an identity, if they have none: an anonymous Better Auth
 * user, signed in on this response, with the seed they were dealt. Called
 * before anything is written on their behalf, and nowhere else.
 */
export async function persist(player: Player): Promise<void> {
  if (player.stored) return;
  const { user } = await auth().api.signInAnonymous({ headers: getRequest().headers });
  const row = await insertPlayer(user.id, player);
  Object.assign(player, { id: row.id, handle: row.handle, stored: true });
}

/** A per-player value nobody else can compute: `length` hex characters. */
export const secretOf = (player: Player, purpose: string, length: number) =>
  sha256(`${player.seed}:pocket-ctf/${purpose}`).slice(0, length);

/* ------------------------------------------------------------------ *
 * Things a visitor is handed at the door
 * ------------------------------------------------------------------ */

export const CLEARANCE_COOKIE = "clearance";

const LAX = { sameSite: "lax", path: "/", maxAge: YEAR } as const;

/** Set a cookie the page's own script is allowed to read. */
export const leave = (name: string, value: string) => setCookie(name, value, LAX);

/**
 * Three cookies besides the session, all readable from script on purpose.
 *
 * One carries a puzzle, one is a claim about who the visitor is that the server
 * is foolish enough to believe, and one is a flag-shaped decoy for whoever goes
 * through their cookies looking for the word "flag".
 */
function leavePocketLitter(player: Player) {
  const blob: string | undefined = dealt(player, "russian-dolls")?.blob;
  if (blob && getCookie("matryoshka") !== blob) leave("matryoshka", blob);
  if (!getCookie(CLEARANCE_COOKIE)) {
    leave(CLEARANCE_COOKIE, btoa(JSON.stringify({ role: "visitor" })));
  }
  if (!getCookie("flag")) leave("flag", "pctf{th4ts_a_decoy_friend}");
}

/* ------------------------------------------------------------------ *
 * Handles
 * ------------------------------------------------------------------ */

const HANDLE_SHAPE = /^[a-z0-9][a-z0-9_-]{2,19}$/i;

export async function rename(player: Player, wanted: string): Promise<string | null> {
  const handle = wanted.trim();
  if (!HANDLE_SHAPE.test(handle)) {
    return "Handles are 3 to 20 letters, digits, dashes or underscores.";
  }
  const [taken] = await db()
    .select({ id: players.id })
    .from(players)
    .where(sql`lower(${players.handle}) = lower(${handle})`);
  if (taken && taken.id !== player.id) return "Somebody already answers to that.";

  await persist(player);
  try {
    await db().update(players).set({ handle, named: true }).where(eq(players.id, player.id));
  } catch {
    // Lost a race for it.
    return "Somebody already answers to that.";
  }
  player.handle = handle;
  player.named = true;
  return null;
}
