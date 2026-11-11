# Challenges

> **Spoilers.** This page says where every flag is hidden. If you intend to
> play, close it and come back afterwards.

The layout that makes a challenge a self-contained unit, where each one is
planted, and what it takes to add or remove one.

## A challenge is a directory, and a hiding place

```
src/challenges/<slug>/
  meta.ts      title, quip, whereabouts, tier, points
  build.mjs    build({ flag, slug }) -> the payload     (puzzles only)
  solve.mjs    solve({ payload })    -> the flag, from the payload alone
```

`build.mjs` is called on the server with one player's own flag, the first time
that player's puzzle is wanted (`dealt()` in `src/server/catalogue.ts`), so it
must be deterministic and must not put the flag in its output in plain text.
`solve.mjs` is the reference solver the tests and the self-test use.

Challenges whose flag the server simply hands over once a request earns it have
nothing to build, so they have only `meta.ts`: their plant calls
`flagFor(player, slug)` at the moment the flag is earned.

There is no page component and no route per challenge. A challenge does not
have a page; it has a place on the site where its payload turns up, and that
place is the other half of it.

Everything in `meta.ts` is a spoiler, and the browser is handed its fields one
at a time: `whereabouts` when a player pays for the first clue, `title` and
`quip` when they submit the flag. The slug is never sent at all — the trophy
case addresses a challenge by its position.

Node finds challenges by reading the directory (`scripts/lib/discover.mjs`:
`slugs()` for every directory with a `meta.ts`, `puzzleSlugs()` for those with a
`build.mjs`); the server finds them with `import.meta.glob` over the same files
(`src/server/catalogue.ts`). Both read the same folders, and the catalogue
throws at startup if a challenge has no flag in the answer key or the key has a
flag for no challenge.

## Where everything is

Twenty flags, worth 2,800 points, and twelve secret trophies beside them --
thirty-two things to find. Thirteen flags have no page of their own, and one
has no hiding place of its own either.

They hide in three ways. Some are **in plain sight**, in something every visitor
is sent: the markup, the drawing, the poem, the footer light, a cookie. Some sit
**behind a mechanism you have to be told how to work**: a door with a code, a
badge to forge, an endpoint that only obeys "Simon says". And a few run on
**pop culture**: a bridge keeper with a famous trick question, and most of the
secret trophies.

| Slug                   | Trophy             | Tier   | Pts | Where it is                                                                   | Found by                                      |
| ---------------------- | ------------------ | ------ | --- | ----------------------------------------------------------------------------- | --------------------------------------------- |
| `first-light`          | First Light        | bronze | 50  | Zero-size `<i data-k data-v>` elements in the front page's markup             | Viewing source or the Elements panel          |
| `invisible-ink`        | Between the Lines  | bronze | 75  | Zero-width characters in the poem on the 404 page                             | Visiting any address that does not exist      |
| `russian-dolls`        | Cookie Monster     | bronze | 75  | The `matryoshka` cookie, five encodings deep                                  | Looking at cookies                            |
| `clearance`            | Self-Promotion     | silver | 100 | `/staff`, which believes the unsigned `clearance` cookie                      | `Disallow: /staff` in `robots.txt`            |
| `dots-and-dashes`      | Blinkenlights      | silver | 125 | The footer light, blinking Morse; timings from `GET /api/pulse`               | Watching it, or the Network panel             |
| `hard-copy`            | Hard Copy          | silver | 125 | `/print.css`, linked `media="print"`: one character per rule, in flex `order` | Print preview, or the `<head>`                |
| `local-records`        | Bottom Drawer      | silver | 125 | IndexedDB database `pctf-archive`, written by every page                      | The Application / Storage panel               |
| `plain-speaking`       | Plain Speaking     | silver | 125 | `GET /` with `Accept: text/plain`: a text front page with one extra line      | `rel="alternate"` in the head; `Vary: Accept` |
| `chromatic-aberration` | Self Portrait      | silver | 150 | `/avatar.png`, the player's portrait: blue-channel LSB                        | It is in the header of every page             |
| `read-aloud`           | Read Aloud         | silver | 150 | The front-page chart's `<desc>`: the flag in the phonetic alphabet            | A screen reader, or the Accessibility pane    |
| `feedback-loop`        | Number Station     | gold   | 175 | `/radio`                                                                      | `ls -a` then `cat .radio` at the prompt       |
| `the-repeat-offender`  | Dead Drop          | gold   | 200 | `/dead-drop`                                                                  | `Contact:` in `/.well-known/security.txt`     |
| `instruction-set`      | Deus Ex Machina    | gold   | 200 | `/machine`                                                                    | The `Link` header on every response           |
| `paper-trail`          | Paper Trail        | silver | 100 | An `X-Trail` header on each hop of the redirect chain from `/go/0`            | The footer's "What is a CTF?" link            |
| `not-modified`         | Not Modified       | silver | 125 | `GET /api/status` with `If-None-Match: W/"rev-N"` for an older revision       | The footer light's label polls it; its `ETag` |
| `forged`               | Middle Management  | gold   | 175 | `/lounge`, with a `badge` cookie forged for the role `executive`              | A line inside the staff room, once you are in |
| `tick-tock`            | Tick Tock          | gold   | 200 | `GET /api/door?code=` with the right six digits                               | `cat door.txt` at the prompt                  |
| `simon-says`           | Simon Says         | silver | 150 | `/api/simon`, four rounds; only instructions prefixed "Simon says" count      | `cat todo.txt` at the prompt                  |
| `bridge-keeper`        | Unladen            | silver | 125 | The prompt, after `cross bridge`: name, quest, then the swallow question      | `ls -a` then `cat .bridge` at the prompt      |
| `last-word`            | The Long Way Round | gold   | 250 | `/vault/<key>`, where the key is this player's fragments joined in order      | Finding every other flag                      |

Finding every one earns the platinum, **Nothing Left to Hide**.

A few of those need more than the table says:

- **`forged`.** The lounge signs its badges: a badge is `payload.signature`,
  where the payload is base64 JSON with a `role` and the signature is the first
  16 hex characters of `SHA-256(code + "." + payload)`. The code is four digits,
  derived per player. The visitor's own badge is a known plaintext and
  signature, so the key falls to ten thousand offline hashes, after which a
  badge for `executive` verifies. The lounge reissues a visitor's badge whenever
  one fails to verify.
- **`tick-tock`.** The door compares a six-digit per-player code a digit at a
  time, stops at the first wrong one, and pauses 100 ms after each digit it
  accepts. It never says how close a guess was; the response time does. Ten
  requests per position, six positions.
- **`not-modified`.** The current revision gets `304`. A client that claims an
  older one is sent every change since, and one of the changes is the removal
  of the flag, quoting it.
- **`simon-says`.** Each reply carries one instruction prefixed `Simon says`
  and one that is not, in varying order; obeying the wrong one resets the game.
  The rounds: bring the ticket back; add `X-Simon: please`; wait five seconds;
  ask with `PUT`. Tickets are `step-issuedAt-mac`, signed with the player's
  seed, so the server keeps no state and the wait is checked against the stamp.
- **`bridge-keeper`.** The keeper's state is a `bridge` cookie signed with the
  player's seed. The name must be the player's handle, the quest must mention
  flags, and the swallow question is answered by asking whether it is African
  or European. Any wrong answer clears the cookie: back to the first question.
- **`last-word`.** Every other trophy carries a numbered two-character fragment
  (`src/server/finale.ts`), shown in its toast and its slot in the case. In
  order, they are a 38-character key derived from the player's own seed, so one
  player's fragments open nobody else's vault and no address is guessable. Every
  other key, and every partial one, is a 404.

### Things that are not flags

Four decoys, the only readable `pctf{...}` strings in the project. Submitting
any of them earns the secret trophy **Curious Cat** and a remark about where it
was found:

| Decoy lives in                         | For whoever                       |
| -------------------------------------- | --------------------------------- |
| The example flag on the front page     | Submits the first flag they see   |
| An HTML comment at the top of `<body>` | Greps the source                  |
| A cookie named `flag`                  | Reads their cookies for that word |
| An `X-Flag` response header            | Reads headers for that word       |

After any decoy the prompt also says how many hunters on this server have fallen
for one. Misery loves a headcount.

And twelve secret trophies, worth no points. Three of them the browser notices and
claims for itself (`CLAIMABLE` in `src/server/game.ts`), which is exactly why
none of them is worth anything:

| Trophy                 | Earned by                                                   |
| ---------------------- | ----------------------------------------------------------- |
| Curious Cat            | Submitting a decoy                                          |
| Receiving Stolen Goods | Submitting a real flag that was dealt to a different player |
| Nice Try               | `sudo` anything at the prompt                               |
| Short and Stout        | Visiting `/teapot`, which answers 418                       |
| Thirty Lives           | The Konami code, which also toggles a scanline overlay      |
| General Kenobi         | `hello there` at the prompt                                 |
| Don't Panic            | `42` at the prompt                                          |
| Escape Artist          | `:q`, `:wq` and friends at the prompt                       |
| Little Bobby Tables    | An SQL injection into `/admin` (from `robots.txt`)          |
| I Am Not a Robot       | Asking for a page as a search engine, with our cookies      |
| Touch Grass            | Coming back after the service worker's offline page         |
| Pi O'Clock             | Having a page open at 3:14 on your own clock                |

The trails to the new four are a line in `robots.txt`, a `tEXt` chunk in every
trophy card PNG (`/u/<handle>/card.png`), and the journal.

**The journal.** `ls` at the prompt grows as flags are found: seven entries,
unlocked at 1, 4, 8, 12, 16 and 19 flags and at the platinum, telling the week
of the sysadmin told to remove every flag before an audit. The player is doing
their job for them, and is named in it. Entries hint at the newer hiding places
and the secret trophies; the last one is the epilogue. It lives in
`src/server/journal.ts`, a pure module the prompt asks per command, and finding a flag that unlocks an entry says so.

The logo still wobbles after seven taps, and the tab title still talks to an
empty chair; neither is a trophy any more.

Also present and worth nothing: a greeting in the console, `/humans.txt`, an
`X-Powered-By: curiosity` header, and a prompt that answers `ls`, `cat`,
`whoami`, `help` and a number of commands it does not list.

## Adding one

1. **Create the directory** with `meta.ts`, plus `build.mjs` and `solve.mjs` if
   the flag hides in a puzzle.
2. **Add its flag** to the answer key — a base flag in `flags.secret.json`, and a
   `demo_` phrase in `flags.sample.json` — with hints and a writeup in the
   secret one.
3. **Plant it.** Add a function to `src/server/plants.ts` that returns this
   player's puzzle (`dealt(player, slug)`) or, for a flag that is handed over,
   this player's flag (`flagFor(player, slug)`), and deliver it wherever it is
   meant to surface: a route loader via `src/lib/api.ts`, a server route, a
   cookie in `src/server/players.ts`, a header in `src/start.ts`.
4. **Leave a trail.** Something a player can notice has to lead there, and
   `whereabouts` has to point at that something without naming it.
5. **Teach the self-test to find it.** Add a lift function to the `HUNT` table
   in `scripts/self-test.mjs` that recovers the payload, or the flag itself,
   from what the server sends.
6. Run `pnpm check`, then start the site and run `pnpm self-test`. A running dev
   server needs a restart to read a changed answer key.

Steps 3 to 5 are the ones no audit enforces. The catalogue will tell you about a
challenge with no flag, and the tests about a puzzle its own solver cannot
solve; nothing but the self-test will tell you about a flag nobody can reach.

**To remove one:** delete the directory, its answer-key entries in both files,
its plant and its line in the self-test. Solves already recorded for it are
ignored.

Rules the current set holds to:

- **The only accepted input is the flag.** No challenge asks for an intermediate
  answer in some other format.
- **No challenge depends on another**, and none needs anything outside this
  domain.
- **A payload is planted for the player asking.** Every player has their own
  flag for every challenge (`scripts/lib/flag.mjs`), and so their own puzzle,
  so a plant must go through `dealt()` or `flagFor()` with the current player
  rather than building or computing anything itself.
- **Nothing decorative may look like a plant unless it is one, or a decoy.** A
  player who chases a stray string should end up with a flag or a joke.

## Module map

```
flags.sample.json          public demo key; what a fresh clone plays
flags.secret.json          base flags, hints, writeups, decoys you author (gitignored)

scripts/answers.mjs        reads the answer key for the tools; env variable names
scripts/lib/flag.mjs       what a flag is: base + this player's suffix, and back
scripts/env-write.mjs      the secrets as .env.deploy, for a hosted server
scripts/lib/encoding.mjs   transforms shared by builders and solvers
scripts/lib/discover.mjs   the Node half of challenge discovery
tests/                     Vitest: solvability per player, personal flags, progress
scripts/self-test.mjs      plays a running instance end to end, as a stranger
scripts/leak-scan.mjs      fails the build on a readable flag
scripts/build-icons.mjs    one SVG geometry -> favicons, OG card, manifest
scripts/png-write.mjs      minimal PNG encoder, no dependencies

src/challenges/<slug>/     meta, and for a puzzle its builder and solver

src/server/schema.ts       every table: Better Auth's four, the hunt's five
src/server/db.ts           the Postgres pool and its Drizzle handle
src/server/auth.ts         Better Auth: anonymous sessions, GitHub, cookies
src/server/merge.ts        folds an anonymous player into the account that claims it
src/server/key.ts          the answer key, read at startup; demo key as fallback
src/server/catalogue.ts    every challenge; each player's flags and puzzles; identify()
src/server/players.ts      deals, persist(), handles, seeds, cookies at the door
src/server/throttle.ts     wrong-answer backoff, per player and per address
src/server/game.ts         submission, scoring, clues, trophies, the board
src/server/finale.ts       the fragments, and the key they add up to
src/server/card.ts         public profiles and the PNG trophy card
src/server/terminal.ts     what the prompt says to anything that is not a flag
src/server/plants.ts       one function per hiding place

drizzle/                   generated migrations, committed
scripts/migrate.mjs        applies them; runs before dev and build

src/lib/api.ts             the server functions the browser may call
src/lib/auth.ts            Better Auth's browser client: GitHub sign-in, sign-out
src/lib/types.ts           the shapes that cross the wire
src/lib/game.tsx           the browser's mirror of the player's standing
src/lib/seo.ts             per-route indexing policy and metadata
src/start.ts               headers on every response, two of them for players

src/routes/index.tsx       the front page: intro, prompt, two plants
src/routes/trophies.tsx    the trophy case: slots, clues, writeups, handle, claim
src/routes/board.tsx       the board
src/routes/u/$handle/      public profile, and card.png
src/routes/{staff,lounge,dead-drop,radio,machine,teapot,admin}.tsx   unlisted rooms
src/routes/vault/$key.tsx  the finale
src/routes/go/$hop.ts      the redirect chain
src/routes/api/            pulse, status, door, simon, flag (POST),
                           and auth/$ for Better Auth
src/routes/*[.]*.ts        robots.txt, sitemap.xml, humans.txt, print.css, sw.js,
                           avatar.png, .well-known/security.txt
src/start.ts               headers, plus the text/plain front page and the cloak
src/server/rarity.ts       trophy rarity: a prior, outvoted by real finds
src/server/journal.ts      the prompt's journal, unlocked by progress
```

---

Next: [Anti-cheat](anti-cheat.md) · [Deployment](deployment.md) · [Back to the index](../README.md#documentation)
