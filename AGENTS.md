# Pocket CTF

A capture-the-flag hunt with no list of challenges: the flags are hidden in the
site itself, and a server decides who has found what. Progress lives in Postgres
(Neon, through Drizzle); identity is Better Auth, anonymous until a player
claims with GitHub. The server reads a single answer key at startup and works
out every player's own flags and puzzles from it on request. The answers must
never reach the repository or the browser, which is the constraint behind most
rules here.

## Done means `pnpm check` passes

`pnpm check` lints, type-checks, scans for leaked flags and runs the suite.
The flag scan (`pnpm verify:flags`) is the one that matters most — it is the
guard against an answer escaping into committed output or a build. `check` runs
against whichever answer key is reachable: `flags.secret.json` or
`POCKET_CTF_FLAGS` if present, otherwise the public `flags.sample.json`, so a
fresh clone needs no setup.

If you moved, added or removed a hiding place, `check` is not enough: start the
site and run `pnpm self-test <url>`, which plays the whole hunt as a new visitor
and fails if any flag cannot be reached.

## Reading the codebase

| Working on                                      | Read                                        |
| ----------------------------------------------- | ------------------------------------------- |
| The answer key, per-player flags and puzzles    | [build-pipeline.md](docs/build-pipeline.md) |
| Adding, removing or relocating a challenge      | [challenges.md](docs/challenges.md)         |
| What the server enforces, and its limits        | [anti-cheat.md](docs/anti-cheat.md)         |
| Hosting, the database, auth, env vars, indexing | [deployment.md](docs/deployment.md)         |
| Principles, the single-accent colour rule       | [foundations.md](docs/foundations.md)       |
| What animates, the icon set                     | [motion.md](docs/motion.md)                 |
| Component patterns, accessibility, copy voice   | [components.md](docs/components.md)         |

## Conventions

**`flags.secret.json` is the only source of answers, and it is never committed.**
`src/server/key.ts` reads it at startup (`POCKET_CTF_FLAGS` first, then the
file, then the public demo key). Nothing is generated from it into the tree or
the build: each player's flag is the base flag plus a suffix from their seed
(`scripts/lib/flag.mjs`), and each puzzle is built from that flag on request by
`dealt()` in `src/server/catalogue.ts`. Never write a flag, base or personal,
into anything committed or bundled.

**`src/server/` stays on the server.** Import it only
from a server function in `src/lib/api.ts` or from a server route handler. The
compiler strips those handlers, and everything only they import, out of the
client bundle; a server module imported by a component ships the catalogue to
every visitor.

**Challenge metadata is a spoiler.** A title, a quip or a `whereabouts` reaching
the browser before the solve undoes the hunt. `src/challenges/*/meta.ts` is read
by `src/server/catalogue.ts` and by nothing else. The browser refers to a
challenge by its position in the trophy case, never by slug.

**What a flag is lives in one place.** `scripts/lib/flag.mjs` is plain
JavaScript so the server, the tests and the tools load the same file; do not
fork it for one side. Changing the suffix derivation changes every player's
unfound flags.

**One directory per challenge, plus the place it is planted.** The directory
holds `meta.ts` and, for a puzzle, `build.mjs` and `solve.mjs`; a challenge
whose flag the server hands over has only `meta.ts`. Where the puzzle surfaces is a function in
`src/server/plants.ts` and whatever route or component delivers it — see
[challenges.md](docs/challenges.md).

**Changing the answer key must not wipe progress.** Solves are rows in the
database keyed by player and slug, and record nothing derived from the flag
string. Keep it that way.

**Every table is declared in `src/server/schema.ts`.** A schema change is an edit
there, then `pnpm db:generate`, and the migration it writes to `drizzle/` is
committed; `scripts/migrate.mjs` applies it before `dev` and `build`. Never edit
an applied migration. The `user`, `session`, `account` and `verification` tables
belong to Better Auth: change them only to follow Better Auth, and only through
the same route.

**Nothing is written until there is something to keep.** A visitor without a
session is a sketch derived from the `pctf_deal` cookie. Anything that writes on
a player's behalf calls `persist(player)` first, which signs them in as an
anonymous Better Auth user and saves the seed they were dealt. Writing with a
sketch's id stores rows nobody owns.

## Gotchas

- This is an open-source project, so the hiding places are public. Before
  proposing a measure to conceal them, read [anti-cheat.md](docs/anti-cheat.md)
  — it lists what is enforced, the limit each measure runs into, and what none
  of them stop.
- Every page is rendered for one player and carries data dealt to them. Nothing
  may be prerendered or shared-cached; responses default to
  `Cache-Control: private, no-store` in `src/start.ts`.
- One page load runs several server functions against the same request. They
  share a player through a per-request memo in `src/server/players.ts`; resolve
  the player any other way and a first visit mints two deals.
- `players` has no foreign key to Better Auth's `user`, on purpose. Claiming with
  GitHub deletes the anonymous user, and `merge()` in `src/server/merge.ts` has
  to move the hunt's rows first rather than have them cascade away. Anything new
  keyed by player id needs a line in `merge()` too.
- Local work runs against the Neon `dev` branch, not `production`: `.neon` pins
  it and `neon checkout <branch>` rewrites `.env` to match. Never point `.env`
  at `production` to test something; migrations and `pnpm self-test` write to
  whatever it names. See the branches section of
  [deployment.md](docs/deployment.md).
- The dev server and migrations need `DATABASE_URL` (and preferably
  `DATABASE_URL_UNPOOLED`). `neon init` writes both to `.env`, which
  `vite.config.ts` loads into the server's `process.env` and `pnpm start` passes
  to Node. Without them pages fail on their first query; the unit suite does not
  need a database.
- Server functions go through TanStack Start's CSRF middleware (`src/start.ts`).
  The plain `/api/*` routes do not, deliberately — players are meant to poke
  them with `curl`. Keep anything that changes a player's state behind a server
  function.
- Only `/` is indexable. Adding a route means giving it `NO_INDEX`, and usually
  a `Disallow` in `src/routes/robots[.]txt.ts`.
- Route files with a dot in the URL escape it as `[.]`. Quote those paths in a
  shell; zsh reads the brackets as a glob.
- The answer key is read once, at startup. After editing `flags.secret.json`,
  restart the dev server; a running one keeps the old key.
