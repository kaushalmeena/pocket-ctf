import { getCookie, setResponseStatus } from "@tanstack/solid-start/server";

import { GITHUB_ENABLED } from "./auth";
import { IS_SAMPLE, vaultFlag } from "./catalogue";
import { FINALE, finaleKey } from "./finale";
import { awardEgg, standing } from "./game";
import {
  CLEARANCE_COOKIE,
  currentPlayer,
  dealt,
  leave,
  type Player,
  secretOf,
  sha256,
  variantOf,
} from "./players";

/**
 * Where the puzzles are planted.
 *
 * Each function hands one place on the site the data it needs for the player
 * who is asking, and nothing else. Which challenge a piece of data belongs to
 * is known here and nowhere in the browser.
 */

/** Needed on every page: who you are, plus two things planted site-wide. */
export async function shell() {
  const player = await currentPlayer();
  const drawer = dealt(player, "local-records");
  return {
    me: await standing(player),
    sample: IS_SAMPLE,
    github: GITHUB_ENABLED,
    // Written into IndexedDB by every page, and never displayed.
    drawer: { name: drawer.dbName, store: drawer.store, records: drawer.records },
  };
}

/** The front page: loose characters in the markup, and a drawing. */
export async function frontPage() {
  const player = await currentPlayer();
  const drawing = dealt(player, "vector-tracing");
  return {
    shards: dealt(player, "first-light").shards as { k: number; v: string }[],
    drawing: {
      path: drawing.path as string,
      width: drawing.width as number,
      height: drawing.height as number,
    },
  };
}

/** The 404 page recites a poem. */
export async function lostAndFound() {
  const player = await currentPlayer();
  return { poem: dealt(player, "invisible-ink").poem as string };
}

/** The player's portrait, as PNG bytes. */
export async function portrait() {
  const player = await currentPlayer();
  const dataUri: string = dealt(player, "chromatic-aberration").dataUri;
  return Buffer.from(dataUri.slice(dataUri.indexOf(",") + 1), "base64");
}

export async function ghostStylesheet() {
  const player = await currentPlayer();
  return dealt(player, "stylesheet-secrets").stylesheet as string;
}

/** The rhythm the footer light keeps. */
export async function pulse() {
  const player = await currentPlayer();
  const { timeline, unitMs } = dealt(player, "dots-and-dashes");
  return { unitMs: unitMs as number, timeline: timeline as { on: boolean; ms: number }[] };
}

/** What the pulse endpoint gives up to a verb it was never meant to hear. */
export async function wrongVerb() {
  const player = await currentPlayer();
  return vaultFlag("wrong-verb", variantOf(player, "wrong-verb"));
}

export async function deadDrop() {
  const player = await currentPlayer();
  const { ciphertextHex, keyLength, bytes } = dealt(player, "the-repeat-offender");
  return { ciphertextHex, keyLength, bytes } as {
    ciphertextHex: string;
    keyLength: number;
    bytes: number;
  };
}

export async function radio() {
  const player = await currentPlayer();
  const { ciphertextHex, width, taps, bytes } = dealt(player, "feedback-loop");
  return { ciphertextHex, width, taps, bytes } as {
    ciphertextHex: string;
    width: number;
    taps: string;
    bytes: number;
  };
}

export async function machine() {
  const player = await currentPlayer();
  const { bytecode, opcodes, instructionCount } = dealt(player, "instruction-set");
  return { bytecode, opcodes, instructionCount } as {
    bytecode: string;
    opcodes: Record<string, string>;
    instructionCount: number;
  };
}

/**
 * The staff room believes a cookie.
 *
 * `clearance` is base64 of a small JSON object, unsigned, and this reads the
 * role straight out of it -- which is the vulnerability, on purpose.
 */
export async function staffRoom() {
  const player = await currentPlayer();
  let role = "nobody";
  try {
    const claim = JSON.parse(atob(getCookie(CLEARANCE_COOKIE) ?? ""));
    if (typeof claim?.role === "string") role = claim.role.slice(0, 40);
  } catch {
    role = "unreadable";
  }
  if (role.toLowerCase() !== "staff") return { granted: false as const, role };
  const flag = await vaultFlag("clearance", variantOf(player, "clearance"));
  return { granted: true as const, role, flag: flag ?? "" };
}

/** Visiting the teapot is its own reward. */
export async function teapot() {
  const player = await currentPlayer();
  setResponseStatus(418);
  return { trophies: await awardEgg(player, "teapot") };
}

/* ------------------------------------------------------------------ *
 * The scenic route
 * ------------------------------------------------------------------ */

/** Where the footer's outbound link is really going. */
const DESTINATION = "https://en.wikipedia.org/wiki/Capture_the_flag_(cybersecurity)";

/**
 * One hop of the redirect chain behind the footer link. Each carries a few
 * characters in a header a browser never shows, then sends the visitor on.
 */
export async function trail(hop: number) {
  const player = await currentPlayer();
  const hops: string[] = dealt(player, "paper-trail").hops;
  const piece = hops[hop];
  if (piece === undefined) return { piece: null, next: DESTINATION };
  return { piece, next: `/go/${hop + 1}` };
}

/* ------------------------------------------------------------------ *
 * Status, and what changed
 * ------------------------------------------------------------------ */

const REVISION = 7;
export const STATUS_ETAG = `W/"rev-${REVISION}"`;

const CHANGELOG: Record<number, string> = {
  2: "status now says 'online' instead of 'fine, thanks'",
  3: "responses carry a revision number and an ETag",
  4: "conditional requests: clients on an older revision are sent what changed",
  5: "debug: put a flag in the status output to test the alerting",
  6: "alerting works. nobody was alerted",
};

/**
 * What the footer asks on every page.
 *
 * A client that already holds the current revision gets `304`. One that claims
 * an *older* revision is helpfully sent everything that changed since -- and
 * one of those changes describes something that should not have been there.
 */
export async function status(ifNoneMatch: string | null) {
  const body = {
    status: "online",
    revision: REVISION,
    note: "Clients holding an older revision are sent what changed since.",
  };
  const claimed = Number(ifNoneMatch?.match(/rev-(\d+)/)?.[1]);
  if (claimed === REVISION) return { notModified: true as const };
  if (!Number.isInteger(claimed) || claimed < 1 || claimed > REVISION) {
    return { notModified: false as const, body };
  }

  const player = await currentPlayer();
  const flag = await vaultFlag("not-modified", variantOf(player, "not-modified"));
  const changes = [];
  for (let rev = claimed + 1; rev <= REVISION; rev++) {
    changes.push({
      revision: rev,
      change: CHANGELOG[rev] ?? `removed the flag (${flag}) from the status output`,
    });
  }
  return { notModified: false as const, body: { ...body, changes } };
}

/* ------------------------------------------------------------------ *
 * The lounge checks badges properly
 * ------------------------------------------------------------------ */

const BADGE_COOKIE = "badge";

/** Four digits. That is the vulnerability. */
const doorCode = (player: Player, purpose: string, digits: number) =>
  String(Number.parseInt(secretOf(player, purpose, 12), 16) % 10 ** digits).padStart(
    digits,
    "0",
  );

const sign = (code: string, payload: string) => sha256(`${code}.${payload}`).slice(0, 16);

/**
 * Upstairs from the staff room. Badges here are signed, so editing one is not
 * enough -- but the signing key is short enough to find by trying them all
 * against the badge the visitor was issued.
 */
export async function lounge() {
  const player = await currentPlayer();
  const code = doorCode(player, "lounge", 4);
  const [payload = "", signature = ""] = (getCookie(BADGE_COOKIE) ?? "").split(".");

  let role: string | null = null;
  if (payload && signature === sign(code, payload)) {
    try {
      const claim = JSON.parse(atob(payload));
      if (typeof claim?.role === "string") role = claim.role.slice(0, 40);
    } catch {
      role = null;
    }
  }

  // No badge, or one that does not check out: issue a fresh visitor's badge.
  if (role === null) {
    const fresh = btoa(JSON.stringify({ role: "visitor" }));
    leave(BADGE_COOKIE, `${fresh}.${sign(code, fresh)}`);
    return { granted: false as const, role: "visitor", reissued: Boolean(payload) };
  }
  if (role.toLowerCase() !== "executive")
    return { granted: false as const, role, reissued: false };
  const flag = await vaultFlag("forged", variantOf(player, "forged"));
  return { granted: true as const, role, flag: flag ?? "" };
}

/* ------------------------------------------------------------------ *
 * The door is slow in an informative way
 * ------------------------------------------------------------------ */

const DOOR_DIGITS = 6;
const PER_DIGIT_MS = 100;

const pause = (ms: number) => new Promise((done) => setTimeout(done, ms));

/**
 * Compare a guess to the door code one digit at a time, stopping at the first
 * that is wrong and pausing after each that is right. It never says how close
 * a guess was. How long it takes to refuse says it instead.
 */
export async function door(guess: string) {
  const player = await currentPlayer();
  const code = doorCode(player, "door", DOOR_DIGITS);
  let matched = 0;
  while (matched < DOOR_DIGITS && guess[matched] === code[matched]) {
    matched++;
    await pause(PER_DIGIT_MS);
  }
  if (matched < DOOR_DIGITS || guess.length !== DOOR_DIGITS) return null;
  return vaultFlag("tick-tock", variantOf(player, "tick-tock"));
}

/* ------------------------------------------------------------------ *
 * The last address
 * ------------------------------------------------------------------ */

/** The page at the end of the fragments. Anyone else's address is a 404. */
export async function vault(key: string) {
  const player = await currentPlayer();
  if (key !== finaleKey(player)) return null;
  return { flag: (await vaultFlag(FINALE, variantOf(player, FINALE))) ?? "" };
}

/* ------------------------------------------------------------------ *
 * Simon says
 * ------------------------------------------------------------------ */

const SIMON_WAIT_MS = 5000;
const TICKET_TTL_MS = 10 * 60_000;

type SimonReply = { status: number; body: Record<string, unknown> };

/*
 * A ticket is `step-issuedAt-mac`, signed with the player's own seed. The
 * server keeps no memory of how far anyone has got: the ticket says it, and
 * cannot be forged or carried to another player.
 */
const simonMac = (player: Player, step: number, at: number) =>
  secretOf(player, `simon/${step}/${at}`, 12);

function ticketFor(player: Player, step: number) {
  const at = Date.now();
  return `${step}-${at}-${simonMac(player, step, at)}`;
}

function readTicket(player: Player, ticket: string) {
  const [step, at, mac] = ticket.split("-");
  const [n, issued] = [Number(step), Number(at)];
  if (!Number.isInteger(n) || !Number.isFinite(issued) || !mac) return null;
  if (mac !== simonMac(player, n, issued) || Date.now() - issued > TICKET_TTL_MS) return null;
  return { step: n, issued };
}

/** Two instructions, one real. Which comes first varies, so order is no tell. */
const pair = (real: string, decoy: string, realFirst: boolean) =>
  realFirst ? [`Simon says: ${real}`, decoy] : [decoy, `Simon says: ${real}`];

const reset = (why: string): SimonReply => ({
  status: 400,
  body: { simon: false, says: [why, "Back to the start. Ask again without a ticket."] },
});

/**
 * An endpoint that only answers to instructions prefixed "Simon says". Every
 * reply carries one real instruction and one tempting one; following the
 * wrong one, or anything else, sends the caller back to the start.
 */
export async function simon(method: string, ticket: string | null, polite: boolean) {
  const player = await currentPlayer();
  const next = (step: number, says: string[]): SimonReply => ({
    status: 200,
    body: { simon: true, says, ticket: ticketFor(player, step) },
  });

  if (!ticket) {
    if (method !== "GET") return reset("Simon didn't say to do that.");
    return next(
      1,
      pair("ask me again, and bring your ticket.", "Clap twice and give up.", true),
    );
  }

  const held = readTicket(player, ticket);
  if (!held) return reset("That ticket isn't one of Simon's. Or it went stale.");

  switch (held.step) {
    case 1:
      if (method !== "GET") return reset("Simon didn't say to change verbs.");
      return next(
        2,
        pair(
          "ask again with the header X-Simon: please",
          "Now ask again, but with POST.",
          false,
        ),
      );
    case 2:
      if (method !== "GET") return reset("Simon didn't say POST. Simon never says POST.");
      if (!polite) return reset("Simon said please. You didn't.");
      return next(
        3,
        pair("wait five seconds, then ask again.", "Hurry! Ask again right now!", false),
      );
    case 3:
      if (method !== "GET") return reset("Simon didn't say to change verbs.");
      if (Date.now() - held.issued < SIMON_WAIT_MS) {
        return reset("Simon didn't say hurry. Patience was the whole instruction.");
      }
      return next(
        4,
        pair("ask again with PUT.", "Touch your nose, then ask with PATCH.", true),
      );
    case 4: {
      if (method !== "PUT") return reset("Simon didn't say touch your nose.");
      const flag = await vaultFlag("simon-says", variantOf(player, "simon-says"));
      return { status: 200, body: { simon: true, says: ["Simon says: well played."], flag } };
    }
    default:
      return reset("Simon has never issued that ticket.");
  }
}
