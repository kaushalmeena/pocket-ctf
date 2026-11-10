# Deployment and indexing

Running the server, keeping the player database somewhere that survives, shipping
a real instance without committing the answers, and keeping the front page
findable while everything else stays out of search results.

## Deployment

Nothing is prerendered. Every page is rendered per request, for one player: the
markup, the cookies and the headers all carry puzzle data dealt to whoever is
asking, so there is no static file that would be right twice.

`pnpm build` writes `.output/` — a server and the static assets it serves.

```bash
pnpm build
node .output/server/index.mjs        # PORT=3000 by default
pnpm preview                         # the same build, through Vite
```

[Nitro](https://nitro.build) does the packaging. With no preset it produces a
plain Node server; on a host it recognises it produces that host's format
instead.

### Vercel

Nitro detects Vercel's build environment and emits serverless functions without
being asked, so there is no `vercel.json` and nothing to configure beyond the
environment variables below. Vercel's own notes are at
<https://vercel.com/docs/frameworks/full-stack/tanstack-start>.

The earlier static build had a `vercel.json` pointing at `dist/client`. It is
gone; if a project setting still names that output directory, clear it.

### The player database

Players, solves, clues and secret trophies live in a
[libSQL](https://github.com/tursodatabase/libsql) database — four tables,
created on first use by `src/server/db.ts`. One client covers both places this
runs:

| `DATABASE_URL`               | Where                                                           |
| ---------------------------- | --------------------------------------------------------------- |
| unset, or `file:./data/x.db` | A SQLite file. Right for development and for a host with a disk |
| `libsql://…` or `https://…`  | A hosted database, with `DATABASE_AUTH_TOKEN`                   |

The default is `file:./data/pocket-ctf.db`, relative to wherever the server is
started. `data/` is gitignored.

**A serverless host needs the second row.** Functions there have no disk that
outlives a request, so a `file:` database would be created empty on every cold
start and the board would forget everyone. Create a hosted libSQL database —
[Turso](https://turso.tech) is the usual one — and set both variables. The
schema is applied on the first request; there is no migration step.

Starting a fresh competition means an empty database, not a rebuild. Deleting
the file, or dropping the four tables, is the reset.

### Supplying the answer key to a hosted build

The wrinkle, on any host: a hosted build clones the repository, so the gitignored
answer key is absent and the deploy would ship the **demo** set. Supply the same
JSON through environment variables instead:

| Variable           | Contents                                         |
| ------------------ | ------------------------------------------------ |
| `POCKET_CTF_FLAGS` | the whole of your `flags.secret.json`            |
| `POCKET_CTF_SEEDS` | the whole of your `seeds.secret.json`            |
| `VITE_SITE_URL`    | your real origin, e.g. `https://ctf.example.com` |

Rather than minify that JSON by hand, generate the file:

```bash
pnpm gen:env --url=https://ctf.example.com
```

It reads the secrets already on your machine, writes a gitignored `.env`, and
reads it back to confirm both values round-trip through `JSON.parse`. Paste those
into your host's environment settings, or hand the file to a CLI that reads one.
The values are minified and unquoted on purpose: JSON cannot contain a raw
newline, and leaving it unquoted sidesteps the apostrophe problem, since dotenv
only strips quotes it finds at the start of a value.

That file is your plaintext answer key. Delete it once the host has what it
needs. It does not include the database variables; set those separately.

`scripts/bootstrap.mjs` runs on `postinstall` and `prebuild`. It generates from a
real key when one is reachable — file or environment — and otherwise seeds the
demo set. So `pnpm build` does the right thing locally and on any host without a
second command.

**Both** secret variables are needed. With only `POCKET_CTF_FLAGS`, the generator
mints fresh suffixes it cannot persist, so every deploy changes every flag
nobody has found yet. It warns when it detects this.

These are build-time inputs. The flags and seeds are consumed by the generator
and are not needed by the running server; only the database variables are read
at run time.

`VITE_SITE_URL` is not secret, but leaving it unset means the canonical tag, the
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
that a proxy ate a header or the database is read-only. It leaves one finished
player on the board; delete the row if that matters.

## SEO and indexing

There is a genuine conflict here: being findable matters for the front page, and
being _unfindable_ matters for everything else. The unlisted pages are puzzles,
and an indexed puzzle is a search result that says where it was hidden.

So indexing is opt-in per route, declared in `src/lib/seo.ts`:

| Route                               | Indexed | Why                                               |
| ----------------------------------- | ------- | ------------------------------------------------- |
| `/`                                 | Yes     | The introduction, with structured data            |
| `/trophies`                         | No      | One player's trophy case                          |
| `/board`                            | No      | Handles and scores; nothing a search should serve |
| `/staff`, `/dead-drop`, `/radio`, … | No      | Unlisted by design; `nofollow` as well            |

`robots.txt` is a server route now rather than a generated file, and it does two
jobs. It asks crawlers to stay out of `/trophies`, `/board`, `/api/` and
`/staff` — and that last line is how players find the staff room, which is the
oldest lesson there is about what `robots.txt` is for. The sitemap lists `/`
alone.

The front page carries `WebSite` and `SoftwareApplication` JSON-LD. There is no
hidden keyword block, and nothing is written for a machine that a person would
not want to read.

---

Next: [Build pipeline](build-pipeline.md) · [Back to the index](../README.md#documentation)
