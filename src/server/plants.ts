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
  const ruleCount: number = dealt(player, "hard-copy").ruleCount;
  return {
    me: await standing(player),
    sample: IS_SAMPLE,
    github: GITHUB_ENABLED,
    // Written into IndexedDB by every page, and never displayed.
    drawer: { name: drawer.dbName, store: drawer.store, records: drawer.records },
    // Empty elements for the print stylesheet to fill. Same formula as
    // classFor() in src/challenges/hard-copy/build.mjs; numeric order, which
    // says nothing the stylesheet's own `order` does not.
    print: Array.from({ length: ruleCount }, (_, i) => (i * 37 + 11) % 97)
      .sort((a, b) => a - b)
      .map((n) => `hc-${n}`),
  };
}

/** The front page: loose characters in the markup, and a chart's description. */
export async function frontPage() {
  const player = await currentPlayer();
  return {
    shards: dealt(player, "first-light").shards as { k: number; v: string }[],
    spoken: dealt(player, "read-aloud").spoken as string,
  };
}

/**
 * The front page, for a client that asked for text. Same player, same deal,
 * none of the furniture -- and one line the HTML version never had.
 */
export async function plainFrontPage() {
  const player = await currentPlayer();
  const me = await standing(player);
  const flag = await vaultFlag("plain-speaking", variantOf(player, "plain-speaking"));
  return [
    "POCKET CTF",
    "==========",
    "",
    "The flags are hidden. So is everything else.",
    "",
    `Dealt to:  ${me.handle}`,
    `Found:     ${me.found}/${me.total}`,
    `Score:     ${me.score}`,
    "",
    "This is the text version of the front page. No stylesheet, no script,",
    "no chart, no prompt. Just the one thing the HTML version leaves out:",
    "",
    `    ${flag}`,
    "",
    "Not your handle above? This request arrived without your cookies, so it",
    "was dealt a stranger's copy. Ask again with them.",
    "",
  ].join("\n");
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

export async function printStylesheet() {
  const player = await currentPlayer();
  return dealt(player, "hard-copy").stylesheet as string;
}

/** The rhythm the footer light keeps. */
export async function pulse() {
  const player = await currentPlayer();
  const { timeline, unitMs } = dealt(player, "dots-and-dashes");
  return { unitMs: unitMs as number, timeline: timeline as { on: boolean; ms: number }[] };
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
 * Cloaking, as a courtesy
 * ------------------------------------------------------------------ */

/**
 * The page a search engine is shown instead of the real one -- the oldest
 * trick in bad SEO, played on whoever claims to be one. Only a request that
 * already carries this site's cookies gets here, which no real crawler does.
 */
export async function forCrawlers() {
  const player = await currentPlayer();
  await awardEgg(player, "robot");
  return `<!doctype html>
<html lang="en">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Pocket CTF | Best CTF | Free CTF | Capture The Flag Online 2026 | CTF Near Me</title>
<meta name="keywords" content="ctf, capture the flag, flags, free flags, best flags, flag near me, hacking, cyber, synergy">
<style>body{font:16px/1.6 system-ui,sans-serif;max-width:40rem;margin:3rem auto;padding:0 1rem}</style>
<h1>Welcome, esteemed crawler.</h1>
<p>This is the version of the front page we show to search engines. It is much better.
It has keywords. Capture the flag. Free capture the flag. Capture the flag near me.</p>
<p>Humans get a different page. You, we are told, are not a human.</p>
<p>Although: search engines do not usually arrive carrying our cookies. If you are a
person who changed their User-Agent to see what would happen, there is a secret trophy
in your case now. Change it back and come home.</p>
</html>`;
}

/* ------------------------------------------------------------------ *
 * The admin login, which logs nobody in
 * ------------------------------------------------------------------ */

/** The usual openings of an injection: a quote that closes, then SQL. */
const INJECTION =
  /['"`]\s*(\)\s*)?(or|and|union|;|--|#|\/\*)|\b(or|and)\s+['"\d\w]+\s*=\s*['"\d\w]+|;\s*(drop|delete|insert|update|select)\b|\bunion\b.+\bselect\b|--\s*$/i;

const REFUSALS = [
  "Invalid credentials. There are no valid credentials.",
  "Access denied. This form has never let anybody in, and it is not starting with you.",
  "Wrong. Also: please don't type real passwords into strange login forms.",
  "Nope. The admin is on holiday, and took the password with them.",
];

/**
 * A login form left lying around, with nothing behind it. What is typed is
 * matched against a pattern and dropped: nothing is stored, logged or
 * compared with anything.
 */
export async function adminLogin(username: string, password: string, attempt: number) {
  if (INJECTION.test(username) || INJECTION.test(password)) {
    const player = await currentPlayer();
    return {
      line: "Did you really name your son Robert'); DROP TABLE Students;-- ? There are no tables here to drop. There is barely a login.",
      trophies: await awardEgg(player, "bobby"),
    };
  }
  return { line: REFUSALS[attempt % REFUSALS.length]!, trophies: [] };
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
