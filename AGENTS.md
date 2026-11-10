# Pocket CTF

A capture-the-flag hunt with no list of challenges: the flags are hidden in the
site itself, and a server decides who has found what. Puzzle data is generated
at build time from a single answer key. The answers must never reach the
repository or the browser, which is the constraint behind most rules here.

## Done means `pnpm check` passes

`pnpm check` lints, type-checks, scans for leaked flags and runs the suite.
The flag scan (`pnpm verify:flags`) is the one that matters most — it is the
guard against an answer escaping into committed output or a build. Note that
`check` runs against whatever challenge data is live, so on a fresh clone
generate sample data first.

If you moved, added or removed a hiding place, `check` is not enough: start the
site and run `pnpm self-test <url>`, which plays the whole hunt as a new visitor
and fails if any flag cannot be reached.

## Reading the codebase

| Working on                                          | Read                                        |
| --------------------------------------------------- | ------------------------------------------- |
| The build-time pipeline, the shared crypto module   | [build-pipeline.md](docs/build-pipeline.md) |
| Adding, removing or relocating a challenge          | [challenges.md](docs/challenges.md)         |
| What the server enforces, and its limits            | [anti-cheat.md](docs/anti-cheat.md)         |
| Hosting, the database, env vars, per-route indexing | [deployment.md](docs/deployment.md)         |
| Principles, the single-accent colour rule           | [foundations.md](docs/foundations.md)       |
| What animates, the icon set                         | [motion.md](docs/motion.md)                 |
| Component patterns, accessibility, copy voice       | [components.md](docs/components.md)         |

## Conventions

**`flags.secret.json` is the only source of answers, and it is never committed.**
The build turns it into digests, ciphertext and puzzle data. Nothing downstream
holds a readable flag: the server recognises a submission by its digest, and
the two flags it hands out itself are kept sealed until a request earns them.

**`src/server/` and `src/lib/generated/` stay on the server.** Import them only
from a server function in `src/lib/api.ts` or from a server route handler. The
compiler strips those handlers, and everything only they import, out of the
client bundle; a server module imported by a component ships the catalogue to
every visitor.

**Challenge metadata is a spoiler.** A title, a quip or a `whereabouts` reaching
the browser before the solve undoes the hunt. `src/challenges/*/meta.ts` is read
by `src/server/catalogue.ts` and by nothing else. The browser refers to a
challenge by its position in the trophy case, never by slug.

**The crypto module is shared verbatim between the generator and the server.**
`src/lib/kdf.js` is plain JavaScript with no imports so both load the same file;
do not fork it for one side.

**One directory per challenge, plus the place it is planted.** The directory
holds metadata, builder and solver. Where the puzzle surfaces is a function in
`src/server/plants.ts` and whatever route or component delivers it — see
[challenges.md](docs/challenges.md).

**Regenerating must not wipe progress.** Solves are rows in the database keyed
by player and slug, and depend on nothing the generator mints. Keep it that way.

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
  the player any other way and a first visit enrolls twice.
- Only `/` is indexable. Adding a route means giving it `NO_INDEX`, and usually
  a `Disallow` in `src/routes/robots[.]txt.ts`.
- Route files with a dot in the URL escape it as `[.]`. Quote those paths in a
  shell; zsh reads the brackets as a glob.
- `src/lib/kdf.js` contains a literal NUL byte as a separator, so `git` and
  `grep` treat it as binary. That is not corruption; leave it.
