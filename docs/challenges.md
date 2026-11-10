# Challenges

> **Spoilers.** This page says where every flag is hidden. If you intend to
> play, close it and come back afterwards.

The layout that makes a challenge a self-contained unit, where each one is
planted, and what it takes to add or remove one.

## A challenge is a directory, and a hiding place

```
src/challenges/<slug>/
  meta.ts      title, quip, whereabouts, tier, points
  build.mjs    build({ flag, seal, slug, variant }) -> the payload
  solve.mjs    solve({ payload, slug, variant })   -> the flag, from the payload alone
```

There is no page component and no route per challenge. A challenge does not
have a page; it has a place on the site where its payload turns up, and that
place is the other half of it.

Everything in `meta.ts` is a spoiler, and the browser is handed its fields one
at a time: `whereabouts` when a player pays for the first clue, `title` and
`quip` when they submit the flag. The slug is never sent at all — the trophy
case addresses a challenge by its position.

Node finds challenges by reading the directory (`scripts/lib/discover.mjs`); the
server finds them with `import.meta.glob` over the `meta.ts` files
(`src/server/catalogue.ts`). Both read the same folders, and the catalogue
throws at startup if a directory has no generated data or generated data has no
directory.

## Where everything is

Thirteen flags. Eight have no page at all.

| Slug                   | Trophy               | Tier   | Pts | Where it is                                                               | Found by                                       |
| ---------------------- | -------------------- | ------ | --- | ------------------------------------------------------------------------- | ---------------------------------------------- |
| `first-light`          | First Light          | bronze | 50  | Zero-size `<i data-k data-v>` elements in the front page's markup         | Viewing source or the Elements panel           |
| `invisible-ink`        | Between the Lines    | bronze | 75  | Zero-width characters in the poem on the 404 page                         | Visiting any address that does not exist       |
| `russian-dolls`        | Cookie Monster       | bronze | 75  | The `matryoshka` cookie, five encodings deep                              | Looking at cookies                             |
| `clearance`            | Self-Promotion       | silver | 100 | `/staff`, which believes the unsigned `clearance` cookie                  | `Disallow: /staff` in `robots.txt`             |
| `dots-and-dashes`      | Blinkenlights        | silver | 125 | The footer light, blinking Morse; timings from `GET /api/pulse`           | Watching it, or the Network panel              |
| `stylesheet-secrets`   | Ghost in the Cascade | silver | 125 | `/ghost.css`, linked from every page and used by none                     | The `<head>`, or the Network panel             |
| `local-records`        | Bottom Drawer        | silver | 125 | IndexedDB database `pctf-archive`, written by every page                  | The Application / Storage panel                |
| `wrong-verb`           | Verbal Abuse         | silver | 125 | `PUT /api/pulse`                                                          | `OPTIONS /api/pulse`, or the 405 from a `POST` |
| `chromatic-aberration` | Self Portrait        | silver | 150 | `/avatar.png`, the player's portrait: blue-channel LSB                    | It is in the header of every page              |
| `vector-tracing`       | Line Reader          | silver | 150 | The "decorative" SVG chart on the front page: parity of each y coordinate | Reading the path data                          |
| `feedback-loop`        | Number Station       | gold   | 175 | `/radio`                                                                  | `ls -a` then `cat .radio` at the prompt        |
| `the-repeat-offender`  | Dead Drop            | gold   | 200 | `/dead-drop`                                                              | `Contact:` in `/.well-known/security.txt`      |
| `instruction-set`      | Deus Ex Machina      | gold   | 200 | `/machine`                                                                | The `Link` header on every response            |

Finding every one earns the platinum, **Nothing Left to Hide**.

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

And six secret trophies, worth no points:

| Trophy                 | Earned by                                                   |
| ---------------------- | ----------------------------------------------------------- |
| Curious Cat            | Submitting a decoy                                          |
| Receiving Stolen Goods | Submitting a real flag that was dealt to a different player |
| Nice Try               | `sudo` anything at the prompt                               |
| Short and Stout        | Visiting `/teapot`, which answers 418                       |
| Thirty Lives           | The Konami code, which also toggles a scanline overlay      |
| Percussive Maintenance | Seven quick taps on the logo                                |

Also present and worth nothing: a greeting in the console, `/humans.txt`, an
`X-Powered-By: curiosity` header, and a prompt that answers `ls`, `cat`,
`whoami`, `help` and a number of commands it does not list.

## Adding one

1. **Create the directory** with `meta.ts`, `build.mjs` and `solve.mjs`.
2. **Add its flag** to the answer key — `flags.secret.json`, and a `demo_`
   phrase in `flags.sample.json` — with hints and a writeup in the secret one.
3. **Plant it.** Add a function to `src/server/plants.ts` that returns this
   player's payload (`dealt(player, slug)`), and deliver it wherever it is meant
   to surface: a route loader via `src/lib/api.ts`, a server route, a cookie in
   `src/server/players.ts`, a header in `src/start.ts`.
4. **Leave a trail.** Something a player can notice has to lead there, and
   `whereabouts` has to point at that something without naming it.
5. **Teach the self-test to find it.** Add a lift function to the `HUNT` table
   in `scripts/self-test.mjs` that recovers the payload from what the server
   sends.
6. Run `pnpm gen && pnpm gen:sample && pnpm check`, then start the site and run
   `pnpm self-test`.

Steps 3 to 5 are the ones no audit enforces. The catalogue will tell you about a
directory with no data; nothing but the self-test will tell you about a flag
nobody can reach.

**To remove one:** delete the directory, its answer-key entries, its plant and
its line in the self-test. Solves already recorded for it are ignored.

Rules the current set holds to:

- **The only accepted input is the flag.** No challenge asks for an intermediate
  answer in some other format.
- **No challenge depends on another**, and none needs anything outside this
  domain.
- **A payload is planted for the player asking.** Every challenge ships
  `VARIANT_COUNT` variants (four; `scripts/answers.mjs`) and `variantOf` in
  `src/server/players.ts` deals one per player, so a plant must go through
  `dealt()` rather than reading a payload directly.
- **Nothing decorative may look like a plant unless it is one, or a decoy.** A
  player who chases a stray string should end up with a flag or a joke.

## Module map

```
flags.sample.json          public demo key; what a fresh clone plays
flags.secret.json          base flags you author (gitignored)
seeds.secret.json          this install's random suffixes (gitignored)
ANSWERS.secret.md          resolved flags, for whoever runs the CTF (gitignored)

scripts/answers.mjs        splices base + suffix; the single source of truth for
                           what a flag actually is
scripts/generate.mjs       answer key -> digests, ciphertext, puzzle payloads
scripts/bootstrap.mjs      generates from a real key, or seeds the demo set
scripts/env-write.mjs      the secrets as a .env, for a hosted build
scripts/lib/encoding.mjs   transforms shared by builders and solvers
scripts/lib/discover.mjs   the Node half of challenge discovery
tests/                     Vitest: solvability, crypto properties, hygiene
scripts/self-test.mjs      plays a running instance end to end, as a stranger
scripts/leak-scan.mjs      fails the build on a readable flag
scripts/build-icons.mjs    one SVG geometry -> favicons, OG card, manifest
scripts/png-write.mjs      minimal PNG encoder, no dependencies

src/challenges/<slug>/     meta, builder, solver
src/lib/kdf.js             crypto primitives, loaded verbatim by the generator
                           *and* the server so the two cannot drift
src/lib/generated/         live data, server-only (gitignored)
src/lib/generated/sample/  committed demo data; flags end in _sample

src/server/db.ts           the libSQL client and the schema
src/server/catalogue.ts    every challenge and what was generated for it
src/server/players.ts      sessions, handles, variants, the cookies left at the door
src/server/game.ts         submission, scoring, clues, trophies, the board
src/server/terminal.ts     what the prompt says to anything that is not a flag
src/server/plants.ts       one function per hiding place

src/lib/api.ts             the server functions the browser may call
src/lib/types.ts           the shapes that cross the wire
src/lib/game.tsx           the browser's mirror of the player's standing
src/lib/seo.ts             per-route indexing policy and metadata
src/start.ts               headers on every response, two of them for players

src/routes/index.tsx       the front page: intro, prompt, two plants
src/routes/trophies.tsx    the trophy case: slots, clues, writeups, handle
src/routes/board.tsx       the board
src/routes/{staff,dead-drop,radio,machine,teapot}.tsx   unlisted rooms
src/routes/api/            pulse (GET, OPTIONS, PUT) and flag (POST)
src/routes/*[.]*.ts        robots.txt, sitemap.xml, humans.txt, ghost.css,
                           avatar.png, .well-known/security.txt
```

---

Next: [Anti-cheat](anti-cheat.md) · [Deployment](deployment.md) · [Back to the index](../README.md#documentation)
