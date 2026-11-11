# Flags and the answer key

How one answer key becomes every player's flags and puzzles, and why nothing is
made from it ahead of time.

Nothing about a challenge is written by hand twice. One answer key holds a
phrase per challenge, and the server works out everything else from it, per
player, when it is asked.

```
flags.secret.json          base flags, hints, writeups, decoys   (gitignored)
  or POCKET_CTF_FLAGS      the same JSON, for a host without the file
  or flags.sample.json     the public demo key, when neither exists
        │
        └── src/server/key.ts            read once, when the server starts
                 │
                 └── src/server/catalogue.ts
                          ├── flagFor(player, slug)   base flag + this player's suffix
                          ├── dealt(player, slug)     that flag through build.mjs, memoised
                          ├── identify(player, raw)   flag, borrowed, decoy or miss
                          └── hints, writeups         read straight from the key
```

There is no build step in that picture, and that is the point. The build
compiles the interface and applies migrations; it never sees an answer.

### Where the key comes from

`src/server/key.ts` looks in three places, in order: the `POCKET_CTF_FLAGS`
environment variable (the whole of `flags.secret.json` as one line of JSON),
then `flags.secret.json` in the working directory, then the committed
`flags.sample.json`. The last is public, so a server running on it sets
`IS_SAMPLE` and every page carries a banner saying these are demo flags.

The catalogue checks the key against the challenge directories as it loads. A
challenge with no flag cannot be solved, and a flag with no challenge is a
typo; both would be silent at runtime, so the server refuses to start instead.

Because the key is read at startup, editing a hint or a writeup is an edit to
the file or the variable and a restart. Nothing needs rebuilding.

`key.ts` is server code like the rest of `src/server/`: imported only by server
functions and server routes, and stripped from the client bundle with them.

### A flag per player

The key holds one _base_ flag per challenge, `pctf{some_memorable_phrase}`. The
flag a player submits is that phrase with a six-character suffix spliced in
before the closing brace: `pctf{some_memorable_phrase_k3x9qa}`.

The suffix comes from `scripts/lib/flag.mjs`: HMAC-SHA256, keyed with
`POCKET_CTF_SECRET`, over the player's seed and the challenge's slug, the first six bytes mapped onto a 32-symbol alphabet that
leaves out the characters easily misread for one another. The seed is the
player's own and stays on the server — derived from their http-only
`pctf_deal` cookie until they enrol, and stored in `players.seed` from then on,
unchanged, so the flags they were looking at stay theirs.

The seed is never sent to the browser, but on its own it is not secret enough:
before enrolment it comes from a cookie its owner can read. The key is what
makes the suffix impossible to work out from outside the server; see
[Anti-cheat](anti-cheat.md).

So every player has a different flag for every challenge, and none of them is
stored anywhere. The derivation is deterministic: the same seed and slug give
the same suffix on any server with the same secret, on any day, which is what
lets the server hold nothing but the key, the secret and the seed.

Submissions are normalised before they are compared — trimmed, whitespace
collapsed, lower-cased — so the server is forgiving about how a flag was typed
and strict about what it says.

### Puzzles are built on request

Challenge content is **derived from the flag**, not written alongside it: the
zero-width poem, the stego PNG's pixel plane, the XOR ciphertext, the bytecode
and the Morse timings are all functions of their flag. There is nowhere for a
plaintext answer to sit.

Since every player's flag differs, so does every player's puzzle. `dealt(player,
slug)` runs the challenge's `build.mjs` on that player's flag the first time it
is asked for, and keeps the result in an in-process `Map`. Building is
deterministic, so the memo is only about cost — the portrait and the bytecode
are the expensive ones — and once it holds 4,000 puzzles the oldest are simply
dropped and rebuilt if they are wanted again. A serverless host starts each
instance with an empty memo; that costs time, never correctness.

Several challenges have nothing to build. `plain-speaking`, `clearance`,
`not-modified`, `forged`, `tick-tock`, `simon-says`, `bridge-keeper` and
`last-word` hand the flag over when a request earns it, so they have a `meta.ts`
and no `build.mjs`: the plant calls `flagFor(player, slug)` at that moment. The
per-player values those challenges turn on (the lounge's key, the door's code,
the finale's address) come from the same seed, through `secretOf` in
`src/server/players.ts`.

### Recognising a submission

A submission names no challenge — the player was never told there were
challenges — so `identify(player, raw)` works out what it is. Decoys are
checked first, by exact match. Then the submission is compared with this
player's own flag for each challenge: twenty short hashes, which is nothing.
Failing that, `baseOf` strips anything shaped like a suffix and looks the rest
up among the base flags; a hit means the right phrase with somebody else's
suffix, and the verdict is _borrowed_. Anything else is a miss.

There is no slow hash anywhere in this. The browser-only predecessor gave every
flag its own salt and 310,000 rounds of key stretching, because the attacker
held the hash. Here nothing derived from a flag ever leaves the server, so there
is no hash to take away and crack, and a deliberately slow comparison would only
be a denial-of-service lever attached to a form. What bounds guessing is the
submission throttle and the length of a phrase nobody has seen. See
[Anti-cheat](anti-cheat.md).

### Clues and writeups are plain text, on the server

Hints, writeups and decoy replies are read straight from the key. They are not
encrypted: the server is the party that decides who may read them, and
encrypting them under keys it also holds would be obfuscation. The only route
to a clue is the endpoint that charges for it, and the only route to a writeup
is holding its flag.

The repository never contains them, since the real key is gitignored, and
`flags.sample.json` leaves its hints and writeups empty so that the demo spoils
nothing for a real deployment.

### Changing the key never resets anyone

A solve is a row in the database keyed by player and slug. It records that the
player found the flag, not which string they sent, so nothing in the key can
take it back.

What changes what players experience:

- **Editing a hint, a writeup or a decoy** changes what is shown from the next
  restart. Nobody's progress moves.
- **Changing a base flag** changes that challenge's flag, and so its puzzle, for
  every player who has not found it. Someone half-way through will find their
  puzzle different on the next page load. Existing solves stand.

There is no separate rotation step. Suffixes depend only on each player's seed,
so the way to give a fresh instance new flags is new phrases and an empty
database.

Removing a challenge directory orphans its solve rows. The server ignores solves
for slugs it no longer knows, so the score drops rather than the page breaking.

---

Next: [Challenges](challenges.md) · [Anti-cheat](anti-cheat.md) · [Back to the index](../README.md#documentation)
