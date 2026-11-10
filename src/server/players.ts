import { createHash, randomBytes } from "node:crypto";

import { getCookie, getRequest, setCookie } from "@tanstack/solid-start/server";

import { payloadOf, variantCount } from "./catalogue";
import { db } from "./db";

/**
 * Who is asking.
 *
 * There are no accounts and no passwords. A visitor is a random token in an
 * http-only cookie, and everything about them -- id, handle, the seed that
 * deals their puzzles -- can be derived from that token alone.
 *
 * That is what lets enrolment be lazy. Looking at the site writes nothing: a
 * visitor only gets a row once they do something worth keeping, such as
 * submitting a flag or buying a clue. A crawler, or a script minting a fresh
 * cookie per request, leaves the database exactly as it found it.
 */

export type Player = {
  id: string;
  handle: string;
  named: boolean;
  /** Decides which variant of each challenge this player is dealt. */
  seed: string;
  /** Whether a row exists yet. See {@link persist}. */
  stored: boolean;
  /** Hash of the session token this request arrived with. */
  session: string;
};

const SESSION_COOKIE = "pctf_sid";
const TOKEN_SHAPE = /^[0-9a-f]{64}$/;
const YEAR = 60 * 60 * 24 * 365;

export const sha256 = (text: string) => createHash("sha256").update(text).digest("hex");

const ADJECTIVES = [
  "quiet", "idle", "lucid", "dusty", "brisk", "sly", "odd", "amber", "feral", "polite",
  "sleepy", "nimble", "static", "hollow", "patient", "wry", "lunar", "salty", "velvet", "rogue",
];
const ANIMALS = [
  "otter", "heron", "lynx", "moth", "newt", "ibis", "gecko", "raven", "stoat", "marmot",
  "wombat", "tapir", "finch", "badger", "puffin", "mantis", "ferret", "walrus", "magpie", "shrew",
];

/** A handle from four bytes: the same bytes always give the same name. */
function handleFrom(bytes: Buffer) {
  const adjective = ADJECTIVES[bytes[0]! % ADJECTIVES.length];
  const animal = ANIMALS[bytes[1]! % ANIMALS.length];
  return `${adjective}-${animal}-${1000 + (bytes.readUInt16BE(2) % 9000)}`;
}

/** Everything a visitor is, worked out from their token and nothing else. */
function sketch(token: string): Player {
  const digest = createHash("sha256").update(`pocket-ctf/player:${token}`).digest();
  return {
    id: digest.toString("hex").slice(0, 24),
    handle: handleFrom(digest.subarray(12)),
    named: false,
    seed: sha256(`pocket-ctf/seed:${token}`).slice(0, 32),
    stored: false,
    session: sha256(token),
  };
}

type Row = Record<string, unknown>;

async function resolve(): Promise<Player> {
  let token = getCookie(SESSION_COOKIE) ?? "";
  if (!TOKEN_SHAPE.test(token)) {
    token = randomBytes(32).toString("hex");
    setCookie(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: YEAR,
    });
    return sketch(token);
  }

  const session = sha256(token);
  const client = await db();
  const found = await client.execute({
    sql: `SELECT p.id, p.handle, p.named, p.seed
            FROM sessions s JOIN players p ON p.id = s.player_id
           WHERE s.token_hash = ?`,
    args: [session],
  });
  const row = found.rows[0] as Row | undefined;
  if (!row) return sketch(token);
  return {
    id: String(row.id),
    handle: String(row.handle),
    named: Number(row.named) === 1,
    seed: String(row.seed),
    stored: true,
    session,
  };
}

/*
 * One page load runs several server functions against the same request, and on
 * a first visit none of them has a cookie yet. Without this they would each
 * mint their own token and the last Set-Cookie would win.
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
 * Give the player a row, if they do not have one. Called before anything is
 * written on their behalf, and nowhere else.
 */
export async function persist(player: Player): Promise<void> {
  if (player.stored) return;
  const client = await db();

  // The derived handle can collide with one somebody chose. Try it, then vary.
  for (let attempt = 0; attempt < 4; attempt++) {
    const handle = attempt === 0 ? player.handle : handleFrom(randomBytes(4));
    await client.execute({
      sql: "INSERT OR IGNORE INTO players (id, handle, seed, created_at) VALUES (?, ?, ?, ?)",
      args: [player.id, handle, player.seed, Date.now()],
    });
    const row = await client.execute({
      sql: "SELECT handle FROM players WHERE id = ?",
      args: [player.id],
    });
    if (row.rows[0]) {
      player.handle = String(row.rows[0].handle);
      break;
    }
  }

  await client.execute({
    sql: "INSERT OR IGNORE INTO sessions (token_hash, player_id, created_at) VALUES (?, ?, ?)",
    args: [player.session, player.id, Date.now()],
  });
  player.stored = true;
}

/** Which of a challenge's variants this player was dealt. Stable for life. */
export function variantOf(player: Player, slug: string): number {
  const draw = createHash("sha256").update(`${player.seed}:${slug}`).digest().readUInt32BE();
  return draw % variantCount(slug);
}

/** The puzzle data this player was dealt for a challenge. */
export const dealt = (player: Player, slug: string) => payloadOf(slug, variantOf(player, slug));

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
  await persist(player);
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
