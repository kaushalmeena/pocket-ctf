# Deployment and indexing

Running the server, the Postgres database and its migrations, sign-in with
GitHub, shipping a real instance without committing the answers, and keeping the
front page findable while everything else stays out of search results.

## Deployment

Nothing is prerendered. Every page is rendered per request, for one player: the
markup, the cookies and the headers all carry puzzle data dealt to whoever is
asking, so there is no static file that would be right twice.

`pnpm build` writes `.output/` — a server and the static assets it serves.

```bash
pnpm build
pnpm start                           # node .output/server/index.mjs, with .env
pnpm preview                         # the same build, through Vite
```

[Nitro](https://nitro.build) does the packaging. With no preset it produces a
plain Node server; on a host it recognises it produces that host's format
instead.

### Vercel

Nitro detects Vercel's build environment and emits serverless functions without
being asked, so there is no `vercel.json` and nothing to configure beyond the
environment variables: `POCKET_CTF_URL`, `BETTER_AUTH_SECRET`, the answer key's two
below, the two database strings, and the GitHub pair if players are to claim
progress. `pnpm gen:env` writes all of them to one file (below), or Neon's
Vercel integration can supply the database strings; make sure they reach the build as well as the
functions, since the build applies migrations. Vercel's own notes are at
<https://vercel.com/docs/frameworks/full-stack/tanstack-start>.

The earlier static build had a `vercel.json` pointing at `dist/client`. It is
gone; if a project setting still names that output directory, clear it.

### The database

Everything lives in Postgres: Better Auth's users, sessions and linked accounts,
and the hunt's players, solves, clues, secret trophies and throttle counts. The
project is set up for [Neon](https://neon.com), and talks to it through
[Drizzle](https://orm.drizzle.team) over node-postgres.

Two connection strings, both of which `neon init` writes into `.env`:

| Variable                | Used by                                                         |
| ----------------------- | --------------------------------------------------------------- |
| `DATABASE_URL`          | The running server. Neon's **pooled** string; a small pool each |
| `DATABASE_URL_UNPOOLED` | Migrations, which need a direct connection. Falls back to above |

```bash
neon init        # link this repository to a Neon project, write .env
```

Any other Postgres works the same way: set the variables by hand.

**Migrations.** Every table is declared in `src/server/schema.ts`. A change there
is followed by `pnpm db:generate`, which writes a SQL migration to `drizzle/`;
that file is committed. `scripts/migrate.mjs` applies whatever is pending, and it
runs before `pnpm dev` and `pnpm build` — so a deploy brings its schema with it,
as long as the build can reach the database. With no connection string at all
it warns and steps aside, so a clone or CI can still build and test. Run it by
hand with `pnpm db:migrate`; inspect the data with `pnpm db:studio`.

**Branches.** Neon branches are instant copy-on-write clones, each with its own
endpoint. This project keeps two:

| Branch       | Used by                                     | Expires |
| ------------ | ------------------------------------------- | ------- |
| `production` | the deployed site; Neon's default branch    | never   |
| `dev`        | `pnpm dev`, local play and `pnpm self-test` | never   |

`.neon` pins the branch this checkout is on, and `.env` holds that branch's
connection strings. Switch with `neon checkout <branch>`, which rewrites both:

```bash
neon checkout dev          # local work, the default for this repository
neon checkout production   # only to inspect or migrate production by hand
```

Restart the dev server after switching; `.env` is read at startup. `neon.ts`
exempts `dev` from expiry and gives any other new branch seven days, so
`neon checkout feature-x --create` is safe to forget about.

A migration should run on `dev` first, where a mistake costs nothing: generate
it, let `pnpm dev` apply it, play. The deployed build then applies it to
`production`, whose connection strings live in the host's settings, not in
`.env`. To give `dev` a fresh copy of production -- new real data, or after
breaking it -- reset it from its parent:

```bash
neon branches reset dev --parent
```

That discards everything on `dev`, test players included.

Starting a fresh competition means an empty database, not a rebuild: truncate
the hunt's tables (`players`, `solves`, `clues`, `eggs`, `throttle`), and
Better Auth's if accounts should go too.

### Sign-in

Players never have to sign in. The server makes each one an anonymous
[Better Auth](https://www.better-auth.com) user the first time there is
something to save, and Better Auth's endpoints are mounted at `/api/auth/*`.
Claiming progress with GitHub is optional, and switched on by configuring it:

1. Create an OAuth app under GitHub → Settings → Developer settings → OAuth
   Apps. Its homepage is your origin, and its **authorization callback URL** is
   `<origin>/api/auth/callback/github` — for local development,
   `http://localhost:3000/api/auth/callback/github`. GitHub allows one callback
   per app, so use one app per environment.
2. Set `GITHUB_CLIENT_ID` (its client ID) and `GITHUB_CLIENT_SECRET` from it.

Without both, the trophy case says claiming is not set up, and nothing else
changes.

| Variable               | Notes                                                                                                                     |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `BETTER_AUTH_SECRET`   | Signs session cookies. `openssl rand -base64 32`. In production the server refuses every request without it               |
| `POCKET_CTF_URL`       | Your public origin. In production it is also Better Auth's base URL; in development Better Auth reads it off each request |
| `GITHUB_CLIENT_ID`     | The OAuth app's client ID                                                                                                 |
| `GITHUB_CLIENT_SECRET` | The OAuth app's client secret                                                                                             |

`POCKET_CTF_URL` is deliberately ignored by Better Auth outside production: a
local `.env` usually carries the deployed origin for canonical tags, and using it
on a laptop would send every GitHub sign-in back to the live site. For the same
reason there is no `BETTER_AUTH_URL`; Better Auth would read that by itself,
everywhere.

Changing `BETTER_AUTH_SECRET` signs everybody out. Anonymous players then have no
way back to their progress; players who claimed sign in with GitHub again.

### Supplying the answer key to a hosted build

The wrinkle, on any host: a hosted build clones the repository, so the gitignored
answer key is absent and the deploy would ship the **demo** set. Supply the same
JSON through environment variables instead:

| Variable           | Contents                                         |
| ------------------ | ------------------------------------------------ |
| `POCKET_CTF_FLAGS` | the whole of your `flags.secret.json`            |
| `POCKET_CTF_SEEDS` | the whole of your `seeds.secret.json`            |
| `POCKET_CTF_URL`   | your real origin, e.g. `https://ctf.example.com` |

Rather than minify that JSON by hand, generate the file:

```bash
pnpm gen:env --url=https://ctf.example.com
```

It reads the secrets already on your machine, writes a gitignored
`.env.deploy` -- not `.env`, which holds this machine's Neon connection
strings -- and reads it back to confirm both values round-trip through
`JSON.parse`. Alongside the answer key it writes:

- `BETTER_AUTH_SECRET`, freshly generated the first time;
- the `GITHUB_CLIENT_ID` / `GITHUB_CLIENT_SECRET` pair, empty the first time,
  with the callback URL to register;
- `DATABASE_URL` and `DATABASE_URL_UNPOOLED` for Neon's `production` branch,
  fetched with `neon connection-string` (`--db-branch=<name>` for another).
  Never `.env`'s, which point at `dev`.

Rewriting with `--force` keeps the existing file's URL, session secret and
GitHub pair, unless the environment sets them -- a new session secret would
sign every player out. Paste the file into your host's environment settings, or
hand it to a CLI that reads one. The values are minified and unquoted on
purpose: JSON cannot contain a raw newline, and leaving it unquoted sidesteps
the apostrophe problem, since dotenv only strips quotes it finds at the start of
a value.

That file is your plaintext answer key and your production database password.
Delete it once the host has what it needs.

With the Vercel CLI, after `vercel link`, each line goes in with
`vercel env add <NAME> production` (the value on stdin), and
`vercel deploy --prod` builds and ships.

`scripts/bootstrap.mjs` runs on `postinstall` and `prebuild`. It generates from a
real key when one is reachable — file or environment — and otherwise seeds the
demo set. So `pnpm build` does the right thing locally and on any host without a
second command.

**Both** secret variables are needed. With only `POCKET_CTF_FLAGS`, the generator
mints fresh suffixes it cannot persist, so every deploy changes every flag
nobody has found yet. It warns when it detects this.

These are build-time inputs. The flags and seeds are consumed by the generator
and are not needed by the running server, which reads the database and sign-in
variables. The build needs the database variables too, to apply migrations.

`POCKET_CTF_URL` is not secret -- `vite.config.ts` hands that one variable to
the client by name, never the whole `POCKET_CTF_` prefix, which would ship the
answer key -- but leaving it unset means the canonical tag, the
sitemap and — less forgivably — the contact address in `security.txt` all
advertise `http://localhost:3000`.

### Headers and caching

`src/start.ts` sets headers on every response: `X-Content-Type-Options`,
`Referrer-Policy`, a restrictive `Permissions-Policy`, and
`Cache-Control: private, no-store` wherever a route has not chosen its own. Two
more are for players rather than browsers — a `Link` header and a decoy `X-Flag`
— and a proxy that strips unknown headers will quietly remove a challenge.

Do not put a shared cache in front of pages. Hashed files under `/assets/` are
safe to cache forever; everything else is one player's.

### Checking a deployment

```bash
pnpm self-test https://ctf.example.com
```

It plays the whole hunt against the live site as a new visitor and fails if any
flag cannot be reached or is not accepted. It is the quickest way to find out
that a proxy ate a header or a migration did not run. It leaves one finished
player on the board. Against a local server that is the `dev` branch, which is
the point of having one.

## SEO and indexing

There is a genuine conflict here: being findable matters for the front page, and
being _unfindable_ matters for everything else. The unlisted pages are puzzles,
and an indexed puzzle is a search result that says where it was hidden.

So indexing is opt-in per route, declared in `src/lib/seo.ts`:

| Route                              | Indexed | Why                                               |
| ---------------------------------- | ------- | ------------------------------------------------- |
| `/`                                | Yes     | The introduction, with structured data            |
| `/trophies`                        | No      | One player's trophy case                          |
| `/board`                           | No      | Handles and scores; nothing a search should serve |
| `/staff`, `/lounge`, `/vault/…`, … | No      | Unlisted by design; `nofollow` as well            |

`robots.txt` is a server route now rather than a generated file, and it does two
jobs. It asks crawlers to stay out of `/trophies`, `/board`, `/u/`, `/api/` and
`/staff` — and that last line is how players find the staff room, which is the
oldest lesson there is about what `robots.txt` is for. The sitemap lists `/`
alone.

A profile page carries `og:` and `twitter:` tags whose image is
`/u/<handle>/card.png`, so a shared link unfurls as that player's trophy card.

The front page carries `WebSite` and `SoftwareApplication` JSON-LD. There is no
hidden keyword block, and nothing is written for a machine that a person would
not want to read.

---

Next: [Build pipeline](build-pipeline.md) · [Back to the index](../README.md#documentation)
