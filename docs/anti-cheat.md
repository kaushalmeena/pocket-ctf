# Anti-cheat

The earlier version of this project ran entirely in the browser, and its
anti-cheat design was an exercise in making shortcuts cost more than solving
when the scoreboard sits on the attacker's machine. It ended with the sentence
"if you need sharing actually prevented, you need a server."

There is a server now. Most of what used to be a speed bump is a wall, and this
page is correspondingly shorter. It still says plainly where each measure stops
working, because several of them do.

### 1. The answers are not in the browser

A submission is checked on the server. The registry of digests, the puzzle
payloads, the challenge titles, the clue text and the writeups are imported only
by server code, and the compiler strips that code out of the client bundle.

What the bundle does contain is the interface and the route table — so the paths
of the unlisted pages (`/staff`, `/lounge`, `/radio` and the rest) are in it. That is left
alone on purpose. Reading the JavaScript a site sends you is a legitimate move
in a hunt, and it gets you an address, not an answer.

`pnpm verify:flags` enforces the rest: it scans `src/`, `public/`, `docs/` and
whatever a build left in `dist/`, `.output/` or `.vercel/output/`, classifies
every flag-shaped string against the real answer key, and fails on a match. It
decodes HTML entities first, and it classifies rather than allowlists, so prose
like `pctf{some_words_x7fq2p}` never needs registering as an exception.

### 2. A solve is a row, not a claim

Progress used to live in localStorage as a proof-of-solve token the browser
could re-verify. It now lives in the database, written by the server at the
moment it accepts a flag. There is nothing in the browser to edit: the page
shows what the server last said, and says it again on the next load.

Scores are fixed at the moment of the solve — points after clues taken — so
buying clues afterwards costs nothing and changes nothing.

### 3. Guessing is throttled, centrally

Wrong answers are counted in a `throttle` table against two keys at once: the
player, and a hash of the address the request came from. Five misses per player
are free, forty per address. After that each further miss doubles a lockout,
from one second to a cap of sixty, and a run of misses is forgotten after
fifteen quiet minutes. A correct flag clears the player's count; the address
keeps its own.

The second key exists because a session costs nothing to throw away. A script
that discards its cookies before every guess is a new player every time and the
same address every time. Addresses are stored only as a hash.

Only wrong flag-shaped submissions count. Terminal commands, malformed input and
decoys do not; nobody should be locked out for typing `ls`.

The throttle is the real cost of a guess. The digest itself is a single
HMAC-SHA256, deliberately fast — see [Build pipeline](build-pipeline.md) for why
a slow hash would have been the wrong tool once the server holds it.

### 4. Every player is dealt their own puzzles

Each challenge ships four variants, each with its own flag and its own puzzle
data. Which one a player gets is derived from a seed that is never sent to the
browser: first from their `pctf_deal` cookie, and from enrolment onwards from
their row, which keeps the same seed so the puzzles they were looking at stay
theirs.

So a flag passed to the person next to you is wrong three times in four — and,
unlike before, the server knows the difference between wrong and borrowed. A
real flag for a variant you were not dealt is recognised, refused, and answered
with a secret trophy called Receiving Stolen Goods.

It is still one in four. Four variants is a knob (`VARIANT_COUNT` in
`scripts/answers.mjs`), and raising it multiplies generation time and the size
of the payload file. A flag per player would close the gap entirely; it would
also mean generating puzzle data at request time, which this design does not do.

### 5. Decoys

Four flag-shaped strings sit where a shortcut-taker looks first: the example on
the front page, a comment at the top of the page source, a cookie named `flag`,
and an `X-Flag` response header. They are the only readable `pctf{...}` strings
in the project, each has its own reply, and submitting any of them earns a
secret trophy rather than a miss.

They do not count against the throttle. The point is the joke, not the penalty.

### 6. Every deployment has different flags

The answer key holds _base_ flags. `pnpm gen` mints a random six-character
suffix per variant and splices it in, so the submitted flag is
`pctf{some_words_x7fq2p}`.

A flag is therefore not guessable from its meaning, and answers leaked from one
installation are worthless against another. Combined with the throttle, the
suffix alone is about a billion guesses at one a minute.

### 7. A public repository gives no flag away

`src/lib/generated/{registry,payloads}.json` are gitignored, along with the
answer key, the suffixes and the resolved answers. A fresh clone is seeded from
the committed demo set in `src/lib/generated/sample/`, whose key is the public
`flags.sample.json`, and a banner across every page says so.

The repository does give away the _map_. See below.

### 8. Identity is Better Auth's, and is lazy

Looking at the site writes nothing. A visitor without a session is dealt their
puzzles from an http-only `pctf_deal` cookie, and their handle and seed are
derived from it. The first time they do something worth keeping — a flag, a
clue, a secret trophy, a new handle — the server signs them in as an anonymous
[Better Auth](https://www.better-auth.com) user and saves what they were dealt.
Crawlers, link previews and scripts that mint a cookie per request leave the
database as they found it.

Sessions are Better Auth's: signed cookies, a server-side session table, one
year long. Claiming with GitHub links the anonymous user to a GitHub account,
and `src/server/merge.ts` moves the hunt's rows onto it — or, if that account
already has progress from another browser, pools the finds, each counted once,
with the account's own handle and seed kept.

### 9. Server functions refuse other sites

Every state-changing call the interface makes — the prompt, clues, renames —
is a TanStack Start server function, and those go through its CSRF middleware,
which rejects requests from another origin. The plain `/api/*` routes are left
open on purpose: poking them with `curl` is part of the hunt, and none of them
changes anything a player owns.

### 10. Clues cost points

Each hidden trophy sells clues: the first says where to look, the rest come from
the answer key and say progressively more about how. Each one takes 15% off what
that flag is worth, down to a floor of a quarter. Clue text is sealed in the
registry and opened by the server only when paid for, so it cannot be read ahead
of the charge.

## What this does not stop

Being explicit about the boundary:

- **The repository is a walkthrough.** This is an open-source project, so where
  every flag is hidden is in `src/server/plants.ts`, in `docs/challenges.md`,
  and in a script (`scripts/self-test.mjs`) that plays the whole hunt
  unattended. Anyone who would rather read than look can. What the repository
  does not contain is any deployment's flags, so reading it gets you directions
  and still leaves you a puzzle to solve at the end of each.
- **Every challenge ships a working solver** in `src/challenges/<slug>/solve.mjs`.
  Same trade: it needs the payload a deployment dealt you.
- **Someone who solved it can tell you how.** Variants stop a pasted flag. They
  do nothing about a pasted method, and nothing can.
- **A GitHub account is the only durable identity.** Until a player claims,
  they are an anonymous session, and clearing cookies makes them somebody else
  — losing that progress, and letting one person hold several rows on the
  board. Claiming fixes the first; nothing stops someone with several GitHub
  accounts.
- **The address key is only as good as the address.** It reads
  `X-Forwarded-For` so that it works behind a proxy, which also means a client
  that reaches the server directly can supply its own. Behind a host that sets
  the header itself — Vercel does — this is not a concern. Players sharing one
  address, such as a classroom behind one NAT, share its forty free misses.
- **The development secret is public.** Without `AUTH_SECRET` the server
  falls back to a fixed value, so that a clone runs. Anyone who knows it can
  sign a session for any user, which is why production refuses to run
  without a real one.
- **Two secret trophies are claimed by the browser.** The Konami code and the
  logo taps are noticed client-side and reported to the server, so anyone can
  claim them with one request. That is why secret trophies are worth no points:
  a score anyone can award themselves is not a score.
- **Some weaknesses are the puzzles.** The `clearance` cookie is unsigned, the
  lounge signs its badges with a four-digit key, and the door leaks its code
  through how long it takes to say no. None of that is an oversight. The cookie
  that actually identifies a player is Better Auth's signed session.
- **Handles are not moderated**, beyond a character set and a length. A public
  instance will want a word list.
- **The board is public.** It shows handles, counts and scores, never which
  flags — but it does tell everyone how far ahead the leader is.

The goal was never unbreakable. It is that the only way to a trophy is to send
the server a flag it dealt you, and that everything short of that is either
slower than looking or a joke at your expense.

---

Next: [Deployment](deployment.md) · [Build pipeline](build-pipeline.md) · [Back to the index](../README.md#documentation)
