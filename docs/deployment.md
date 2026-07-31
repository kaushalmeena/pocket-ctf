# Deployment and indexing

Shipping a real instance without ever committing the answers, and keeping the
landing page findable while the challenges stay out of search results.

## Deployment

Every route is prerendered to static HTML. `pnpm build` writes `dist/client` — a
plain folder of files with no server runtime, no API route and no server function
anywhere in the project. Any static host will serve it, and so will
`python3 -m http.server`.

```bash
pnpm build
pnpm preview                                   # or:
python3 -m http.server 4173 --directory dist/client
```

### What a host needs

Nothing exotic, but three settings are worth checking:

| Setting                     | Why                                                                                                                                         |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **Clean URLs**              | Pages are emitted as `c/first-light/index.html`. Hosts that do not resolve extensionless paths to `index.html` will 404 on every challenge. |
| **404 page**                | Point it at `404.html` if your host asks. The app also renders its own not-found page for client-side navigation.                           |
| **Immutable asset caching** | Everything under `/assets/` is content-hashed, so `Cache-Control: public, max-age=31536000, immutable` is safe and worth setting.           |

`vercel.json` in the repository root is a worked example of exactly these three
settings, kept because that is where this instance runs. It is one host's syntax
for host-agnostic requirements, not a dependency -- delete it and the build is
unchanged. Without it Vercel publishes `dist` rather than `dist/client`, so the
site lands one directory deep and every path 404s while the build still reports
success.

Security headers are a host concern rather than an application one, since there
is no server here to set them. `X-Content-Type-Options: nosniff`,
`Referrer-Policy: strict-origin-when-cross-origin` and a restrictive
`Permissions-Policy` are all sensible and none of them interfere with anything
the site does.

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
needs.

`scripts/bootstrap.mjs` runs on `postinstall` and `prebuild`. It generates from a
real key when one is reachable — file or environment — and otherwise seeds the
demo set. So `pnpm build` does the right thing locally and on any host without a
second command.

**Both** secret variables are needed. With only `POCKET_CTF_FLAGS`, the generator
mints fresh suffixes it cannot persist, so every deploy changes those flags and
voids everyone's progress. It warns when it detects this.

`VITE_SITE_URL` is not secret, but leaving it unset means canonical tags and the
sitemap advertise `http://localhost:3000`. `pnpm gen` warns about that too.

## SEO and indexing

There is a genuine conflict here: being findable matters for the landing page,
and being *unfindable* matters for the challenges. An indexed challenge page puts
its payload into a search cache, and an indexed writeup hands over answers to
anyone who types the right query.

So indexing is opt-in per route, declared in `src/lib/seo.ts`:

| Route         | Indexed | Why                                             |
| ------------- | ------- | ----------------------------------------------- |
| `/`           | Yes     | Landing page: description, FAQ, structured data |
| `/challenges` | Yes     | Titles and categories only; no puzzle content   |
| `/c/*`        | No      | Carries the payloads and the sealed writeups    |
| `/progress`   | No      | A localStorage scoreboard; nothing to index     |
| `/vault/*`    | No      | Unlisted by design; `nofollow` as well          |

`robots.txt` states the same rules at the crawler level and links the sitemap,
which lists only the two indexable URLs. The landing page carries `WebSite`,
`SoftwareApplication` and `FAQPage` JSON-LD generated from the same copy the
reader sees — there is no hidden keyword block, and nothing is written for a
machine that a person would not want to read.

---

Next: [Build pipeline](build-pipeline.md) · [Back to the index](../README.md#documentation)
