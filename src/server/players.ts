import { createHash, randomBytes } from "node:crypto";

import { getCookie, getRequest, setCookie } from "@tanstack/solid-start/server";

import { payloadOf, variantCount } from "./catalogue";
import { db } from "./db";

/**
 * Who is asking.
 *
 * There are no accounts and no passwords. A visitor is a random token in an
 * http-only cookie; the database keeps only its hash, so a leaked table cannot
 * be replayed as sessions. The handle is a label on that row -- the server
 * invents one on arrival and the player can swap it for their own.
 */

export type Player = {
  id: string;
  handle: string;
  named: boolean;
  /** Decides which variant of each challenge this player is dealt. */
  seed: string;
  wrong: number;
  lastWrongAt: number;
};

const SESSION_COOKIE = "pctf_sid";
const YEAR = 60 * 60 * 24 * 365;

const sha256 = (text: string) => createHash("sha256").update(text).digest("hex");

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

const pick = <T>(list: readonly T[]) => list[randomBytes(1)[0]! % list.length]!;

const inventHandle = () =>
  `${pick(ADJECTIVES)}-${pick(ANIMALS)}-${1000 + (randomBytes(2).readUInt16BE() % 9000)}`;

type Row = Record<string, unknown>;

const fromRow = (row: Row): Player => ({
  id: String(row.id),
  handle: String(row.handle),
  named: Number(row.named) === 1,
  seed: String(row.seed),
  wrong: Number(row.wrong),
  lastWrongAt: Number(row.last_wrong_at),
});

async function enroll(): Promise<Player> {
  const client = await db();
  const token = randomBytes(32).toString("hex");
  const player: Player = {
    id: randomBytes(12).toString("hex"),
    handle: inventHandle(),
    named: false,
    seed: randomBytes(16).toString("hex"),
    wrong: 0,
    lastWrongAt: 0,
  };
  await client.execute({
    sql: "INSERT INTO players (id, token_hash, handle, seed, created_at) VALUES (?, ?, ?, ?, ?)",
    args: [player.id, sha256(token), player.handle, player.seed, Date.now()],
  });
  setCookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: YEAR,
  });
  return player;
}

async function resolve(): Promise<Player> {
  const token = getCookie(SESSION_COOKIE);
  if (token) {
    const client = await db();
    const found = await client.execute({
      sql: "SELECT * FROM players WHERE token_hash = ?",
      args: [sha256(token)],
    });
    if (found.rows[0]) return fromRow(found.rows[0] as Row);
  }
  return enroll();
}

/*
 * One page load runs several server functions against the same request, and on
 * a first visit none of them has a cookie yet. Without this they would each
 * enroll their own player and the last Set-Cookie would win.
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

/** Which of a challenge's variants this player was dealt. Stable for life. */
export function variantOf(player: Player, slug: string): number {
  const draw = createHash("sha256").update(`${player.seed}:${slug}`).digest().readUInt32BE();
  return draw % variantCount(slug);
}

/** The puzzle data this player was dealt for a challenge. */
export const dealt = (player: Player, slug: string) => payloadOf(slug, variantOf(player, slug));

/* ------------------------------------------------------------------ *
 * Things a visitor is handed at the door
 * ------------------------------------------------------------------ */

export const CLEARANCE_COOKIE = "clearance";

/**
 * Three cookies besides the session, all readable from script on purpose.
 *
 * One carries a puzzle, one is a claim about who the visitor is that the server
 * is foolish enough to believe, and one is a flag-shaped decoy for whoever goes
 * through their cookies looking for the word "flag".
 */
function leavePocketLitter(player: Player) {
  const lax = { sameSite: "lax", path: "/", maxAge: YEAR } as const;
  const blob: string | undefined = dealt(player, "russian-dolls")?.blob;
  if (blob && getCookie("matryoshka") !== blob) setCookie("matryoshka", blob, lax);
  if (!getCookie(CLEARANCE_COOKIE)) {
    setCookie(CLEARANCE_COOKIE, btoa(JSON.stringify({ role: "visitor" })), lax);
  }
  if (!getCookie("flag")) setCookie("flag", "pctf{th4ts_a_decoy_friend}", lax);
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
  const client = await db();
  try {
    await client.execute({
      sql: "UPDATE players SET handle = ?, named = 1 WHERE id = ?",
      args: [handle, player.id],
    });
  } catch {
    return "Somebody already answers to that.";
  }
  player.handle = handle;
  player.named = true;
  return null;
}
