# Build pipeline

How one answer key becomes a playable site, and why nothing readable survives
the trip.

Nothing about a challenge is written by hand twice. One answer key feeds a
generator, and everything the server needs falls out of it.

```
flags.secret.json          base flags you author        (gitignored)
seeds.secret.json          random suffix per variant    (gitignored, generated)
        │
        ├── scripts/answers.mjs      splices base + suffix -> the real flag
        │
        └── scripts/generate.mjs
                 ├── src/lib/generated/registry.json   digests, sealed hints and writeups
                 ├── src/lib/generated/payloads.json   puzzle data
                 └── ANSWERS.secret.md                 resolved flags, for you
```

Both generated files are read by the server and by nothing else. Neither is
bundled for the browser — `src/server/catalogue.ts` is their only importer, and
it is reachable only from server functions and server routes.

For each variant of each flag the generator produces four things:

| Output    | How                                      | Purpose                                     |
| --------- | ---------------------------------------- | ------------------------------------------- |
| `digest`  | HMAC-SHA256 under a per-run pepper       | How the server recognises a submitted flag  |
| `hints`   | AES-GCM, key from slug + variant + index | Sold one at a time from the trophy case     |
| `writeup` | AES-GCM, key from slug + variant         | Released once the player holds that flag    |
| payload   | That challenge's own `build.mjs`         | The puzzle itself, computed _from_ the flag |

That last row is the load-bearing one. Challenge content is **derived from the
flag**, not written alongside it: the zero-width poem, the stego PNG's pixel
plane, the XOR ciphertext, the bytecode and the Morse timings are all functions
of their flag. There is nowhere for a plaintext answer to sit.

Several challenges are the exception that keeps the rule. `plain-speaking`,
`clearance`, `not-modified`, `forged`, `tick-tock`, `simon-says`, `bridge-keeper`
and `last-word` have nothing
to derive — the server hands the flag over when a request earns it — so their
payload is the flag itself, sealed, by the shared `src/challenges/vault.mjs`. The
per-player values those challenges turn on (the lounge's key, the door's code,
the finale's address) are not generated at all: the server derives them from
the player's seed at request time. The generated
data therefore holds no readable flag for any challenge, and `pnpm verify:flags`
can go on enforcing that without a carve-out.

### Why the digest is fast

The previous design verified in the browser, so each flag had its own salt and a
310,000-round PBKDF2 hash: slow on purpose, because the attacker held the hash.

A submission now names no challenge — the player was never told there were
challenges — so it has to be looked up among every flag at once. One slow
derivation per candidate would be several seconds of server CPU per guess, which
is a denial-of-service lever attached to a form. So the registry keeps one
HMAC-SHA256 digest per flag under a single pepper, the server computes one HMAC
per submission, and the lookup is a `Map`.

What bounds guessing is no longer the cost of a hash. It is the submission
throttle, the random suffix on every flag, and the fact that the digests never
leave the server. See [Anti-cheat](anti-cheat.md).

### What sealing is, and is not

Hints, writeups and the two vault flags are encrypted under keys built from a
slug, a variant and an index (`SEALED` in `src/lib/kdf.js`) — all things the
server knows. That is obfuscation, not secrecy, and it is worth saying so
plainly: the server can open any of them whenever it likes.

What it buys is that the text is not readable in the generated files or the
repository, and that the only route to it is the endpoint that charges for it.
Opening a seal costs one PBKDF2 run, so the server caches each result for the
life of the process.

`src/lib/kdf.js` is deliberately plain JavaScript with no imports, because Node
(the generator) and the server load _that exact file_. If they ever drifted,
every digest in the registry would silently stop matching.

### Regenerating never resets anyone

Progress used to be a proof-of-solve token in localStorage, derived under a salt
the generator minted, so regenerating carelessly voided every player's solves
and the pipeline went to some trouble to reuse salts.

None of that machinery remains, because the thing it protected moved. A solve is
a row in the database keyed by player and slug. The pepper is minted fresh on
every run and nothing a player holds depends on it, so `pnpm gen` after fixing a
typo in a writeup changes nothing anyone can see.

Two things do still change what players experience:

- **Changing a base flag** changes that flag for anyone who has not found it.
  Existing solves stand; they are recorded against the slug, not the string.
- **`pnpm gen --rotate`** mints new suffixes, so every unfound flag changes.
  Solves already recorded still stand. That is what you want when standing up a
  fresh instance, along with an empty database.

Removing a challenge directory orphans its solve rows. The server ignores solves
for slugs it no longer knows, so the score drops rather than the page breaking.

---

Next: [Challenges](challenges.md) · [Anti-cheat](anti-cheat.md) · [Back to the index](../README.md#documentation)
