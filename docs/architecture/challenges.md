# Challenges

The layout that makes a challenge a self-contained unit, and what it takes to
add or remove one.

A challenge is a directory. Everything it needs lives inside, and nothing
outside it has to be told the challenge exists.

```
src/challenges/<slug>/
  meta.ts      title, tagline, category, difficulty, points
  build.mjs    build({ flag, seal }) -> the payload that ships
  solve.mjs    solve({ payload })    -> the flag, from shipped data alone
  Page.tsx     the puzzle UI, given its payload
  index.ts     re-exports meta and Page
```

The browser finds them with `import.meta.glob`; Node finds them by reading the
directory. Both read the same folders, so there is no manifest to fall out of
sync, and one dynamic route (`src/routes/c/$slug.tsx`) serves all of them.

**To add one:** create the directory, add its flag (and optionally hints and a
writeup) to the answer key, and run `pnpm gen && pnpm test`. The registry, the
route, the prerender list, the index page and the test suite all pick it up.

**To remove one:** delete the directory and its answer-key entries. The registry
audit throws at build time if the two ever disagree, so a half-removal fails
loudly rather than rendering a broken page.

Two rules the current set holds to, and which the audit does not enforce for
you:

- **The only accepted input is the flag.** No challenge asks for an intermediate
  answer in some other format.
- **No challenge displays its own flag, and none depends on another.** Payloads
  encode the flag; they do not print it.

## Module map

```
flags.sample.json          public demo key; what a fresh clone plays
flags.secret.json          base flags you author (gitignored)
deployment.secret.json     this install's random suffixes (gitignored)
ANSWERS.secret.md          resolved flags, for whoever runs the CTF (gitignored)

scripts/answers.mjs        splices base + suffix; the single source of truth for
                           what a flag actually is
scripts/generate.mjs       answer key -> hashes, ciphertext, puzzle payloads
scripts/bootstrap.mjs      generates from a real key, or seeds the demo set
scripts/lib/encoding.mjs   transforms shared by builders and solvers
scripts/lib/discover.mjs   the Node half of challenge discovery
tests/                     Vitest: solvability, crypto properties, hygiene
scripts/leak-scan.mjs      fails the build on a readable flag
scripts/build-icons.mjs    one SVG geometry -> favicons, OG card, manifest
scripts/png-write.mjs      minimal PNG encoder, no dependencies

src/lib/kdf.js             KDF primitives, loaded verbatim by Node *and* the
                           browser so the two cannot drift
src/lib/challenges.ts      hand-written metadata: titles, points, hints
src/lib/progress.ts        proof-of-solve tokens, throttling, honeypots, stats
src/lib/store.tsx          the reactive store wrapping all of it
src/lib/seo.ts             per-route indexing policy and metadata
src/lib/generated/         live data (gitignored)
src/lib/generated/sample/  committed demo data; flags end in _sample

src/components/            ChallengeShell and friends
src/routes/c/*.tsx         one file per challenge
src/routes/vault/$key.tsx  the unlisted page; path minted per deployment
```

---

Next: [Anti-cheat](anti-cheat.md) · [Deployment](deployment.md) · [Back to the index](README.md)
