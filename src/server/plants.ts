import { getCookie, setResponseStatus } from "@tanstack/solid-start/server";

import { IS_SAMPLE, vaultFlag } from "./catalogue";
import { awardEgg, standing } from "./game";
import { CLEARANCE_COOKIE, currentPlayer, dealt, variantOf } from "./players";

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
