# Deployment and indexing

Shipping a real instance without ever committing the answers, and keeping the
landing page findable while the challenges stay out of search results.

## Deployment

Every route is prerendered to static HTML. The build output in `dist/client` is a
plain folder any file server can host — there is no server runtime, no API route
and no server function anywhere in the project.

### Vercel

`vercel.json` sets the build command, points `outputDirectory` at `dist/client`,
enables `cleanUrls`, and adds long-lived caching for hashed assets plus a few
security headers. Pushing to `main` is enough.

The wrinkle is that a hosted build clones the repo, so the gitignored answer key
is absent — which would deploy the **demo** set. To deploy a real instance,
supply the same JSON through environment variables:

| Variable                  | Contents                                       |
| ------------------------- | ---------------------------------------------- |
| `POCKET_CTF_FLAGS`        | the whole of your `flags.secret.json`          |
| `POCKET_CTF_DEPLOYMENT`   | the whole of your `deployment.secret.json`     |
| `VITE_SITE_URL`           | e.g. `https://ctf.example.com`                 |

`scripts/bootstrap.mjs` runs on `postinstall` and `prebuild`. It generates from a
real key when one is reachable — file or environment — and otherwise seeds the
demo set. So `pnpm build` does the right thing locally and on Vercel without a
second command.

**Both** secret variables are needed. With only `POCKET_CTF_FLAGS`, the generator
mints fresh suffixes it cannot persist, so every deploy changes those flags and
voids everyone's progress. The generator warns when it detects this.

### Anywhere else

```bash
pnpm build
pnpm preview                                   # or:
python3 -m http.server 4173 --directory dist/client
```

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

Next: [Build pipeline](build-pipeline.md) · [Back to the index](README.md)
