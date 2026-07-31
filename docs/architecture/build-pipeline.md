# Build pipeline

How one answer key becomes a playable site, and why nothing readable survives
the trip.

Nothing about a challenge is written by hand twice. One answer key feeds a
generator, and everything the site needs falls out of it.

```
flags.secret.json          base flags you author        (gitignored)
seeds.secret.json     random suffix per challenge  (gitignored, generated)
        │
        ├── scripts/answers.mjs      splices base + suffix -> the real flag
        │
        └── scripts/generate.mjs
                 ├── src/lib/generated/registry.json   hashes, sealed writeups
                 ├── src/lib/generated/payloads.json   puzzle data
                 ├── public/robots.txt                 names the unlisted path
                 ├── public/sitemap.xml
                 └── ANSWERS.secret.md                 resolved flags, for you
```

For each flag the generator derives four things, all with domain-separated
PBKDF2 (310,000 rounds, SHA-256, 16-byte salt):

| Derivation | Purpose                                                       |
| ---------- | ------------------------------------------------------------- |
| `verify`   | Checked against a submission                                  |
| `token`    | Stored as proof of solve; the registry ships only its SHA-256  |
| `seal`     | AES-GCM key encrypting that challenge's writeup               |
| payload    | The puzzle itself, computed *from* the flag                   |

That last row is the load-bearing one. Challenge content is **derived from the
flag**, not written alongside it: the zero-width poem, the stego PNG's pixel
plane, the 124-digit prime product, the XOR ciphertext and the Morse timings are
all functions of their flag. There is nowhere for a plaintext answer to sit.

`src/lib/kdf.js` is deliberately plain JavaScript with no imports, because Node
(the generator) and the browser (the verifier) load *that exact file*. If they
ever drifted, every hash in the registry would silently stop matching.

### Regenerating without resetting everyone

Players store `PBKDF2(flag, tokenSalt)` as proof of solve, so a new `tokenSalt`
silently invalidates their progress. `pnpm gen` therefore **reuses each
challenge's existing salts** whenever that challenge's flag is unchanged, which
it establishes by re-deriving the old `verifyHash`. Fixing a typo in one writeup
no longer wipes the scoreboard. A flag that *does* change gets fresh salts,
because its old hash would no longer match anything.

The AES-GCM IV is always regenerated, even when the salts are kept. Encrypting
new plaintext under the same key and nonce is a real break, and the writeup is
exactly what tends to change between runs.

`pnpm gen --rotate` deliberately invalidates everything: new suffixes, new salts,
every flag changed, all saved progress void. That is what you want when standing
up a fresh instance.

---

Next: [Challenges](challenges.md) · [Anti-cheat](anti-cheat.md) · [Back to the index](README.md)
