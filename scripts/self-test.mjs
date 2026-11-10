#!/usr/bin/env node
/**
 * Play the whole hunt against a running instance, as a stranger would.
 *
 *   pnpm self-test                      # http://localhost:3000
 *   pnpm self-test https://ctf.example.com
 *
 * It arrives with no cookies and no knowledge of the answer key, finds every
 * flag from what the server actually sends -- markup, headers, cookies, files,
 * endpoints -- recovers each with that challenge's own reference solver, and
 * submits it. If a flag cannot be reached or is not accepted, this fails.
 *
 * `pnpm test` proves each puzzle is solvable from its generated data. This
 * proves the data is really planted where the hunt says it is, for the variant
 * the server dealt, and that the server takes the answer.
 *
 * It enrolls one new player per run, and that player ends up on the board. The
 * timing puzzle is solved by actually timing it, so a run takes a while.
 */

import { createHash } from "node:crypto";

import { solverFor } from "./lib/discover.mjs";

const BASE = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");

/* ------------------------------------------------------------------ *
 * A browser's worth of state
 * ------------------------------------------------------------------ */

const jar = new Map();

async function visit(path, init = {}) {
  const cookie = [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
  const response = await fetch(`${BASE}${path}`, {
    redirect: "manual",
    ...init,
    headers: { ...init.headers, ...(cookie ? { cookie } : {}) },
  });
  for (const line of response.headers.getSetCookie()) {
    const pair = line.split(";")[0];
    jar.set(pair.slice(0, pair.indexOf("=")), pair.slice(pair.indexOf("=") + 1));
  }
  return response;
}

const text = async (path) => (await visit(path)).text();

/** The first long hex run in a page: every ciphertext blob is one. */
const hexBlob = (html) => html.match(/>([0-9a-f]{40,})</)?.[1];

const number = (html, pattern) => Number(html.replace(/<!--.*?-->/g, "").match(pattern)?.[1]);

/* ------------------------------------------------------------------ *
 * Where each flag is, and how to lift its puzzle off the site
 * ------------------------------------------------------------------ */

const home = await text("/");
if (!jar.has("pctf_sid")) {
  console.error(`✗ ${BASE} set no session cookie -- is this a Pocket CTF instance?`);
  process.exit(1);
}

const HUNT = {
  // Loose characters in the front page's markup.
  "first-light": () => ({
    shards: [...home.matchAll(/data-k="(\d+)" data-v="([^"]*)"/g)].map((m) => ({
      k: Number(m[1]),
      v: m[2],
    })),
  }),

  // The poem on any page that does not exist.
  "invisible-ink": async () => {
    const lost = await text("/a-page-that-does-not-exist");
    return { poem: lost.slice(lost.indexOf("<blockquote"), lost.indexOf("</blockquote>")) };
  },

  // A cookie handed over on arrival.
  "russian-dolls": () => ({ blob: decodeURIComponent(jar.get("matryoshka") ?? "") }),

  // The staff room believes whatever the clearance cookie says.
  clearance: async () => {
    const before = jar.get("clearance");
    jar.set("clearance", btoa(JSON.stringify({ role: "staff" })));
    const room = await text("/staff");
    jar.set("clearance", before);
    // Not the first flag-shaped string on the page: that one is in a source
    // comment, and it is bait.
    return { found: room.match(/class="blob[^>]*>(pctf\{[a-z0-9_]+\})</)?.[1] };
  },

  // The rhythm the footer light keeps.
  "dots-and-dashes": async () => (await visit("/api/pulse")).json(),

  // The same endpoint, asked with a verb the site never sends.
  "wrong-verb": async () => {
    const allowed = (await visit("/api/pulse", { method: "OPTIONS" })).headers.get("allow");
    if (!allowed?.includes("PUT")) throw new Error(`OPTIONS advertised "${allowed}"`);
    return { found: (await (await visit("/api/pulse", { method: "PUT" })).json()).flag };
  },

  // A stylesheet every page links and none uses.
  "stylesheet-secrets": async () => ({ stylesheet: await text("/ghost.css") }),

  // Records every page files in IndexedDB, as shipped in the page data.
  "local-records": () => ({
    records: [...home.matchAll(/seq:(\d+),data:"([^"]+)"/g)].map((m) => ({
      seq: Number(m[1]),
      data: m[2],
    })),
  }),

  // The portrait each player is issued.
  "chromatic-aberration": async () => {
    const png = Buffer.from(await (await visit("/avatar.png")).arrayBuffer());
    return {
      size: png.readUInt32BE(16),
      dataUri: `data:image/png;base64,${png.toString("base64")}`,
    };
  },

  // The drawing on the front page.
  "vector-tracing": () => ({ path: home.match(/<path d="(M [^"]+)"/)?.[1] }),

  // Named in a dotfile the prompt will show to anyone who lists them.
  "feedback-loop": async () => {
    const listing = await say("cat .radio");
    const path = listing.lines.join(" ").match(/\/[a-z-]+/)?.[0];
    const page = await text(path);
    return {
      ciphertextHex: hexBlob(page),
      width: number(page, /Register width: <code[^>]*>(\d+)/),
      taps: page.replace(/<!--.*?-->/g, "").match(/polynomial: <code[^>]*>(0x[0-9a-f]+)/)?.[1],
    };
  },

  // The contact address in security.txt.
  "the-repeat-offender": async () => {
    const contact = (await text("/.well-known/security.txt")).match(
      /Contact: \S+?(\/[a-z-]+)\s/,
    );
    const page = await text(contact[1]);
    return {
      ciphertextHex: hexBlob(page),
      keyLength: number(page, /<strong[^>]*>(\d+)\s*bytes/),
    };
  },

  // A link in the footer that goes the long way round.
  "paper-trail": async () => {
    const hops = [];
    let next = home.match(/href="(\/go\/\d+)"/)?.[1];
    while (next?.startsWith("/go/")) {
      const hop = await visit(next);
      const piece = hop.headers.get("x-trail");
      if (piece !== null) hops.push(piece);
      next = hop.headers.get("location");
    }
    return { hops };
  },

  // The status endpoint tells a client that says it is behind what changed.
  "not-modified": async () => {
    const stale = await visit("/api/status", { headers: { "if-none-match": 'W/"rev-1"' } });
    const changes = (await stale.json()).changes ?? [];
    return { found: JSON.stringify(changes).match(/pctf\{[a-z0-9_]+\}/)?.[0] };
  },

  // The lounge signs its badges with a key short enough to try them all.
  forged: async () => {
    const clearance = jar.get("clearance");
    jar.set("clearance", btoa(JSON.stringify({ role: "staff" })));
    const upstairs = (await text("/staff")).match(/<code[^>]*>(\/[a-z]+)<\/code>/)?.[1];
    jar.set("clearance", clearance);

    await visit(upstairs);
    const [payload, signature] = jar.get("badge").split(".");
    const sign = (code, body) =>
      createHash("sha256").update(`${code}.${body}`).digest("hex").slice(0, 16);
    let code;
    for (let guess = 0; guess < 10_000 && code === undefined; guess++) {
      const candidate = String(guess).padStart(4, "0");
      if (sign(candidate, payload) === signature) code = candidate;
    }
    if (code === undefined)
      throw new Error("no four-digit code reproduces the badge signature");

    const forged = btoa(JSON.stringify({ role: "executive" }));
    jar.set("badge", `${forged}.${sign(code, forged)}`);
    return {
      found: (await text(upstairs)).match(/class="blob[^>]*>(pctf\{[a-z0-9_]+\})</)?.[1],
    };
  },

  // A door that takes longer to refuse the closer the guess is.
  "tick-tock": async () => {
    const note = (await say("cat door.txt")).lines.join(" ");
    const [, path, blanks] = note.match(/(\/api\/[a-z]+\?code=)(_+)/);
    let known = "";
    for (let position = 0; position < blanks.length; position++) {
      let slowest = { digit: "0", ms: -1 };
      for (let digit = 0; digit <= 9; digit++) {
        const guess = `${known}${digit}`.padEnd(blanks.length, "x");
        const started = performance.now();
        const response = await visit(`${path}${guess}`);
        const body = await response.json();
        if (body.open) return { found: body.flag };
        const ms = performance.now() - started;
        if (ms > slowest.ms) slowest = { digit: String(digit), ms };
      }
      known += slowest.digit;
    }
    return { found: (await (await visit(`${path}${known}`)).json()).flag };
  },

  // The Link header on every response.
  "instruction-set": async () => {
    const link = (await visit("/")).headers.get("link")?.match(/<([^>]+)>/)?.[1];
    return { bytecode: hexBlob(await text(link)) };
  },
};

/** Every flag but the last hands over a numbered piece of an address. */
const fragments = [];

// Nowhere to look for this one: its address is what the others add up to.
HUNT["last-word"] = async () => {
  const address = fragments
    .sort((a, b) => a.n - b.n)
    .map((f) => f.text)
    .join("");
  const page = await text(`/vault/${address}`);
  return { found: page.match(/class="blob[^>]*>(pctf\{[a-z0-9_]+\})</)?.[1] };
};

async function say(line) {
  const response = await visit("/api/flag", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ flag: line }),
  });
  return response.json();
}

/* ------------------------------------------------------------------ *
 * Play
 * ------------------------------------------------------------------ */

console.log(`Playing ${BASE} as a new visitor\n`);

let failures = 0;
let last;

for (const [slug, lift] of Object.entries(HUNT)) {
  try {
    const payload = await lift();
    // Two flags are handed over by the server rather than derived; for the
    // rest, the reference solver works from what was lifted off the site.
    const flag = payload.found ?? (await (await solverFor(slug)).solve({ payload }));
    last = await say(flag);
    if (last.tone !== "ok") throw new Error(`submitted, and the site said: ${last.lines?.[0]}`);
    const trophy = last.trophies[0];
    if (trophy.fragment) fragments.push(trophy.fragment);
    console.log(
      `  ✔ ${slug.padEnd(22)} ${trophy.tier.padEnd(7)} ${trophy.title} (+${trophy.points})`,
    );
  } catch (error) {
    failures++;
    console.log(`  ✗ ${slug.padEnd(22)} ${error.message}`);
  }
}

console.log("");

const expected = Object.keys(HUNT).length;
if (last?.me && last.me.total !== expected) {
  failures++;
  console.log(
    `  ✗ the site has ${last.me.total} flags but this script knows ${expected} hiding places`,
  );
}

if (failures > 0) {
  console.error(
    `✗ ${failures} problem${failures === 1 ? "" : "s"}. The hunt cannot be finished as it stands.`,
  );
  process.exit(1);
}

const platinum = last.trophies.some((t) => t.tier === "platinum");
console.log(
  `✔ All ${expected} flags found and accepted as ${last.me.handle}: ` +
    `${last.me.score}/${last.me.maxScore} points${platinum ? ", platinum awarded" : ""}.`,
);
