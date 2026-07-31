# Architecture

How Pocket CTF is put together, and why. Split by concern so each page stays
readable on its own; start wherever your question is.

- **[Build pipeline](build-pipeline.md)** — how `flags.secret.json` becomes
  hashes, ciphertext and puzzle data, why the KDF module is shared verbatim
  between Node and the browser, and how regenerating avoids wiping everyone's
  progress.
- **[Challenges](challenges.md)** — the one-directory-per-challenge layout, what
  it takes to add or remove one, the rules the current set holds to, and a map of
  every module in the project.
- **[Anti-cheat](anti-cheat.md)** — all nine measures, each with the limit it
  runs into, plus an explicit list of what none of them stop. Read this before
  proposing a tenth.
- **[Deployment and indexing](deployment.md)** — Vercel, the environment
  variables that let a hosted build generate real flags, and the per-route
  indexing policy that keeps challenge payloads out of search caches.

Design decisions -- colour, motion, typography, accessibility -- live in
[../design](../design/README.md).
