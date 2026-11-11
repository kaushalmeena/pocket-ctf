<div align="center">

<img src="public/icon.svg" alt="Pocket CTF logo" width="96" height="96" />

# Pocket CTF

[![License: MIT](https://img.shields.io/badge/License-MIT-3DA639?logo=opensourceinitiative&logoColor=white)](LICENSE) [![Solid](https://img.shields.io/badge/Solid-1.9-2C4F7C?logo=solid&logoColor=white)](https://www.solidjs.com) [![TanStack Start](https://img.shields.io/badge/TanStack_Start-1.x-C2255C?logo=react&logoColor=white)](https://tanstack.com/start) [![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-0B7285?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

**Twenty flags, twelve secrets, no list of challenges, and nobody to tell you where to start.**

A free, open-source capture-the-flag hunt. There are no challenge pages and no
categories: the flags are hidden in the site itself, and the front page is an
introduction and a prompt to submit them to. Every flag is checked on the
server, every player is dealt their own copy of each puzzle, and nothing in the
browser bundle says what the puzzles are.

[**Try it live**](https://pocket-ctf.vercel.app)

</div>

---

## Features

- **The whole site is the hunt** — no challenge index, no puzzle pages to click
  through. Some flags sit in plain sight, some are in things the browser was
  sent and never showed you, and some are behind addresses nothing links to.
- **One prompt takes everything** — paste a flag and it works out which puzzle
  you solved. Type anything else and it answers that too; it is a small
  terminal, and not every command is listed.
- **Trophies, not checkmarks** — a flag earns a bronze, silver or gold trophy
  that slides in at the top-right with a chime and a line of commentary. Find
  all of them for the platinum. Twelve secret trophies reward things that are
  not flags at all.
- **A palette of your own** — the accent colour is dealt at random on your first
  visit, from six, and a swatch in the header changes it.
- **Clues are for sale** — every hidden trophy will sell you clues, starting
  with where to look and ending with how to solve it. None is charged to your
  score; each one lowers what its flag pays when you find it.
- **Server-side verification** — the answers, the puzzle list and the clue text
  never reach the browser. The bundle carries the interface and nothing else.
- **Per-player puzzles** — each challenge ships several variants and every
  player is dealt one, so a flag borrowed from a friend is recognised as real
  and rejected as not yours.
- **No sign-up to play** — you arrive with an invented handle, swap it for your
  own, and appear on the board with your first flag. Just looking writes nothing
  at all; the server only remembers you once there is something to remember.
- **Claim it with GitHub** — progress starts out anonymous. Claim it with GitHub
  and it follows you to any browser; anything found anonymously before signing
  in elsewhere is merged into the same case.
- **A card to show off** — every player has a public profile whose link unfurls
  as a trophy card drawn on the server. It says how much you found and never
  what.
- **A finale you cannot shortcut** — every trophy carries a numbered fragment of
  an address that exists only for you. The last flag is there.
- **Unguessable, per-deployment flags** — a random suffix per challenge means no
  two installations share an answer, so answers copied from elsewhere fail.
- **Plug-and-play challenges** — one directory per puzzle holding its metadata,
  builder and reference solver, plus the place it is planted.
- **Light and dark themes** — follows your system preference until you say
  otherwise, with no flash of the wrong theme on load.

## How It Works

1. **Author** — you write base flags into a gitignored `flags.secret.json`.
2. **Generate** — `pnpm gen` derives, per flag, a keyed digest the server
   recognises it by, sealed hints and a sealed writeup, a random per-deployment
   suffix, and the puzzle payload itself.
3. **Plant** — the server works each player's payload into what it sends them:
   markup, headers, cookies, files, endpoints.
4. **Hunt** — players look at everything. Devtools, `curl`, a console one-liner,
   pen and paper. There is no intended tool, only an intended insight.
5. **Verify** — a submission is hashed and looked up on the server. A correct
   answer is recorded against the player and announced as a trophy.

> If you would rather not have the hunt spoiled, stay out of
> [docs/challenges.md](docs/challenges.md) and `src/server/`. This is an
> open-source project, so where everything is hidden is a matter of public
> record — see [Anti-cheat](docs/anti-cheat.md) for what that does and does not
> cost.

## Tech Stack

| Area          | Tools                                                                                                                           |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Framework** | [Solid](https://www.solidjs.com) · [TanStack Start](https://tanstack.com/start) · [Nitro](https://nitro.build)                  |
| **Styling**   | [Tailwind CSS v4](https://tailwindcss.com) · [Lucide](https://lucide.dev)                                                       |
| **Database**  | [Postgres](https://www.postgresql.org) on [Neon](https://neon.com) · [Drizzle ORM](https://orm.drizzle.team) and drizzle-kit    |
| **Auth**      | [Better Auth](https://www.better-auth.com) — anonymous sessions, GitHub OAuth to claim progress                                 |
| **Crypto**    | [Web Crypto](https://developer.mozilla.org/docs/Web/API/Web_Crypto_API) (HMAC-SHA256, PBKDF2, AES-GCM)                          |
| **Build**     | [Vite](https://vite.dev) · [TypeScript](https://www.typescriptlang.org)                                                         |
| **Testing**   | [Vitest](https://vitest.dev)                                                                                                    |
| **Tooling**   | [oxlint](https://oxc.rs/docs/guide/usage/linter) · [oxfmt](https://oxc.rs/docs/guide/usage/formatter) · [pnpm](https://pnpm.io) |
| **Hosting**   | Any Node host, or a serverless one such as Vercel                                                                               |

## Getting Started

These instructions will get you a copy of the project up and running on your
local machine for development purposes.

### Requirements

To install and run this project you need:

- [Node.js](https://nodejs.org/) 20 or newer
- [pnpm](https://pnpm.io/installation)
- [git](https://git-scm.com/downloads) (only to clone this repository)
- A Postgres database. The project is set up for [Neon](https://neon.com); the
  [Neon CLI](https://neon.com/docs/cli/install) connects one in a single
  command

### Installation

To set up everything on your local machine, follow these steps:

1. Clone this repo and then change directory to the `pocket-ctf` folder:

```bash
git clone https://github.com/kaushalmeena/pocket-ctf.git
cd pocket-ctf
```

2. Install project dependencies using pnpm:

```bash
pnpm install
```

Installing also seeds the challenge data. A fresh clone plays the **demo** set,
whose flags are public in `flags.sample.json` and which the app labels with a
banner. To create a real instance with unguessable flags, write your own answer
key and generate from it:

```bash
cp flags.sample.json flags.secret.json
# then replace every phrase -- the demo ones are published
pnpm gen
```

Your resolved flags are written to `ANSWERS.secret.md`, which is gitignored — it
is the only readable copy, so keep a backup outside the repository.

3. Connect a database. With the Neon CLI signed in, this links the repository to
   a Neon project and writes `DATABASE_URL` and `DATABASE_URL_UNPOOLED` into a
   gitignored `.env`:

```bash
neon init
neon checkout dev --create   # work on a copy, not on production
```

The second line gives local play its own Neon branch, so test players never
reach the real board. Any Postgres will do: set the two variables by hand instead. The schema is
created by the migrations in `drizzle/`, which `pnpm dev` and `pnpm build` apply
before they start.

4. Optionally, let players claim their progress with GitHub. Create a GitHub
   OAuth app whose callback URL is `http://localhost:3000/api/auth/callback/github`
   and add its `BETTER_AUTH_GITHUB_ID` and `BETTER_AUTH_GITHUB_SECRET` to `.env`. Without
   them the trophy case says that claiming is not set up, and everything else
   works.

### Running

To run the project simply run:

```bash
pnpm dev
```

Your app should now be running on [localhost:3000](http://localhost:3000/).
Players and their progress are kept in the database. `pnpm db:studio` opens
Drizzle Studio on it; a schema change is an edit to `src/server/schema.ts`
followed by `pnpm db:generate`, and the migration it writes is committed.

### Testing

The suite runs under [Vitest](https://vitest.dev). The tests that matter drive
each challenge's own reference solver against the payload that was actually
generated, so a puzzle that cannot be solved fails the build:

```bash
pnpm test
```

To lint, typecheck, scan for leaked flags and run the suite together:

```bash
pnpm check
```

`pnpm check` proves each puzzle is solvable from its data. It does not prove the
data is planted where a player can reach it. For that, start the site and play
it:

```bash
pnpm self-test                          # http://localhost:3000
pnpm self-test https://ctf.example.com  # or any running instance
```

It arrives as a new visitor with no cookies and no answer key, finds every flag
from what the server sends, solves each with that challenge's reference solver
and submits it. It fails if any flag cannot be reached or is not accepted. Each
run enrolls one player, who ends up at the top of the board. The timing puzzle
is solved by actually timing it, so a run takes a little while.

### Building

To create a production build:

```bash
pnpm build
```

The server is written to `.output/`. Run it with `pnpm start` (which reads
`.env`), or preview it with `pnpm preview`. Re-run the
leak scan against the real artifact with `pnpm build && pnpm verify:flags`.

## Deployment

There is a server now, so there is something to deploy: `.output/` runs on any
Node host, and Nitro packages the same build as serverless functions on hosts it
recognises — Vercel among them, with no configuration file.

Three things need supplying. A hosted build clones the repository, so the
gitignored answer key is absent and the deploy would ship the demo set: run
`pnpm gen:env --url=https://your-origin` to write those secrets to `.env.deploy` and hand
them to your host. The database connection strings, which the build also uses to
apply migrations. And Better Auth's secret, plus the GitHub OAuth app if players
are to claim progress. Full details are in
[docs/deployment.md](docs/deployment.md).

## Configuration

Each of the project's own variables is prefixed with the domain it configures:
`POCKET_CTF_` for the app and `BETTER_AUTH_` for sign-in, two prefixes of
nearly the same length. The `DATABASE_URL` pair keeps the names the Neon CLI
writes.

| Variable                    | Default                 | Notes                                                                                                                    |
| --------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `POCKET_CTF_URL`            | `http://localhost:3000` | Your public origin: canonical URLs, the sitemap, `security.txt`, social cards, and in production Better Auth's base URL. |
| `POCKET_CTF_FLAGS`          | `—`                     | The whole of `flags.secret.json`, for hosted builds. Without it a deploy ships the public demo set.                      |
| `POCKET_CTF_SEEDS`          | `—`                     | The whole of `seeds.secret.json`. **Required** alongside the above, or every deploy changes your flags.                  |
| `BETTER_AUTH_SECRET`        | a development value     | Signs session cookies. **Required in production**, where the server refuses every request without it.                    |
| `BETTER_AUTH_GITHUB_ID`     | `—`                     | Client ID of the GitHub OAuth app players claim progress with. Without both GitHub variables, claiming is switched off.  |
| `BETTER_AUTH_GITHUB_SECRET` | `—`                     | That app's client secret.                                                                                                |
| `DATABASE_URL`              | `—`                     | **Required.** Postgres, pooled. What the running server connects with. `neon init` writes it.                            |
| `DATABASE_URL_UNPOOLED`     | `—`                     | Postgres, direct. Used by migrations, which a pooled connection cannot run. Falls back to `DATABASE_URL`.                |

Do not set `BETTER_AUTH_URL`. Better Auth reads it by itself, in development
too; `POCKET_CTF_URL` stands in for it in production only.

## Documentation

Full documentation is available in the [`/docs`](./docs) directory.

**Core Concepts:**

- [Build Pipeline](./docs/build-pipeline.md) — how `flags.secret.json` becomes digests, ciphertext and puzzle data, and why regenerating never resets anyone.
- [Challenges](./docs/challenges.md) — the one-directory-per-challenge layout, what it takes to add one, and **where every flag is hidden**. Spoilers.
- [Anti-Cheat](./docs/anti-cheat.md) — what the server makes possible, the limit each measure runs into, and what none of them stop.

**Design System:**

- [Foundations](./docs/foundations.md) — the principles, the single-accent colour rule and its one exception, and why the theme switch is CSS-driven.
- [Motion](./docs/motion.md) — what animates, what deliberately does not, and the icon set.
- [Components](./docs/components.md) — the recurring patterns, the accessibility rules they follow, and the voice of the copy.

**Advanced:**

- [Deployment and Indexing](./docs/deployment.md) — running the server, the Neon database and its migrations, sign-in with GitHub, the environment variables a hosted build needs, and the per-route indexing policy.

## Contributing

Contributions are welcome! If you find a bug or have a feature request, please
[open an issue](https://github.com/kaushalmeena/pocket-ctf/issues/new/choose)
first to discuss it. For code changes, fork the repository, create a branch, and
open a pull request. Please do not paste flags, hiding places or full solutions
into issues or pull requests.

## License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file
for details.
