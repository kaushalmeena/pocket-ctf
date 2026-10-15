# Pocket CTF

A capture-the-flag site that generates its own puzzle data at build time from a
single answer key. The answers must never reach the repository or a built
bundle, which is the constraint behind most rules here.

## Done means `pnpm check` passes

`pnpm check` lints, type-checks, scans for leaked flags and runs the suite.
The flag scan (`pnpm verify:flags`) is the one that matters most — it is the
guard against an answer escaping into committed output. Note that `check` runs
against whatever challenge data is live, so on a fresh clone generate sample
data first.

## Reading the codebase

| Working on                                     | Read                                            |
| ---------------------------------------------- | ----------------------------------------------- |
| The build-time pipeline, the shared KDF        | [build-pipeline.md](docs/build-pipeline.md)     |
| Adding or removing a challenge                 | [challenges.md](docs/challenges.md)             |
| Anti-cheat measures and their limits           | [anti-cheat.md](docs/anti-cheat.md)             |
| Hosting, env vars, per-route indexing          | [deployment.md](docs/deployment.md)             |
| Principles, the single-accent colour rule      | [foundations.md](docs/foundations.md)           |
| What animates, the icon set                    | [motion.md](docs/motion.md)                     |
| Component patterns, accessibility, copy voice  | [components.md](docs/components.md)             |

## Conventions

**`flags.secret.json` is the only source of answers, and it is never committed.**
The build turns it into hashes, ciphertext and puzzle data. Nothing downstream
should ever hold a plaintext flag.

**The KDF module is shared verbatim between Node and the browser.** Build-time
and run-time verification must agree exactly; do not fork it for one side.

**One directory per challenge.** Adding or removing a challenge is a directory
operation plus a registry entry — see [challenges.md](docs/challenges.md).

**Regenerating must not wipe progress.** The pipeline is written so a rebuild
leaves existing players' state intact; preserve that when changing it.

## Gotchas

- Before proposing a tenth anti-cheat measure, read
  [anti-cheat.md](docs/anti-cheat.md) — it documents all nine, the limit each
  one runs into, and an explicit list of what none of them stop. This is a
  client-side CTF; the threat model is bounded on purpose.
- Challenge routes carry a per-route indexing policy that keeps payloads out of
  search caches. Adding a route means deciding its policy too.
