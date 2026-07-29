# Pocket CTF

Eleven capture-the-flag puzzles that run entirely in your browser. No server, no
accounts, no network. Each challenge is its own page, you submit a flag into a
box, and the site checks it without ever having stored what the answer looks
like.

Flags look like `pctf{some_words_x7fq2p}`. That trailing noise is random and
minted per installation, so no two deployments share a flag.

Built with [TanStack Start](https://tanstack.com/start) (Solid), Tailwind v4 and
Biome, on pnpm. Every route is prerendered to static HTML, so the finished thing
is a folder of files that any file server can host — or that you can copy onto a
USB stick.

```bash
pnpm install        # also seeds the demo challenge data
pnpm dev            # http://localhost:3000
```

That runs the **demo** set, whose flags are public in `flags.sample.json`. For a
real instance, write your own answer key and generate from it:

```bash
cp flags.example.json flags.secret.json   # then fill in your flags
pnpm gen
```

To build and play the static output with no dev server at all:

```bash
pnpm build && python3 -m http.server 4173 --directory dist/client
```

## The challenges

| #  | Challenge             | Category | Difficulty | Points |
| -- | --------------------- | -------- | ---------- | ------ |
| 01 | First Light           | recon    | easy       | 50     |
| 02 | Invisible Ink         | stego    | easy       | 75     |
| 03 | Russian Dolls         | encoding | easy       | 75     |
| 04 | Knights and Knaves    | logic    | medium     | 125    |
| 05 | Chromatic Aberration  | stego    | medium     | 150    |
| 06 | Dots and Dashes       | audio    | medium     | 125    |
| 07 | One Frame Window      | web      | medium     | 150    |
| 08 | Nowhere To Be Found   | recon    | medium     | 125    |
| 09 | Prime Cuts            | math     | hard       | 200    |
| 10 | The Repeat Offender   | crypto   | hard       | 200    |
| 11 | The Meta Key          | meta     | hard       | 300    |

None of them need a tool you don't already have. Devtools, a console one-liner,
pen and paper, or your ears will do. What they want is for you to look at an
ordinary thing and notice it isn't ordinary.

## How flags are checked

<a name="anti-cheat"></a>

The awkward fact about an offline CTF is that the scoreboard runs on the
attacker's machine. You cannot hide a secret in a client. So the design doesn't
try to — it makes the shortcuts cost more than solving.

### 1. Flags are not in the shipped site

The plaintext answers live in one gitignored file, `flags.secret.json`, which is
never committed and never bundled. `pnpm gen` reads it and derives everything
the site actually needs:

- **a salted PBKDF2 hash** to check submissions against
- **a second salted hash** for the proof-of-solve token (below)
- **an AES-GCM key** that encrypts that challenge's writeup
- **the puzzle payload itself** — the zero-width poem, the stego PNG's pixels,
  the prime product, the XOR ciphertext, the morse timings

That last point is the important one. Challenge content is *derived from the
flag*, not written alongside it. Grepping the production bundle for `pctf{`
returns four hits and all four are decoys.

`pnpm verify:flags` enforces this. It scans `src/`, `public/` and the built
`dist/` for anything matching the flag grammar, classifies each hit against the
real answer key, and fails the build on a match. It decodes HTML entities first,
because prerendered markup carries `pctf&#123;…&#125;` — an escaped leak used to
slip past an earlier version of the check.

### 2. Solves are proofs, not booleans

Setting `solved: true` in localStorage should not unlock anything, so nothing
like it is ever written. A solve stores

```
token = PBKDF2(flag, tokenSalt, 310_000 rounds)
```

and the registry ships only `SHA-256(token)`. On every page load each stored
token is re-hashed and compared. Forging an entry means finding a preimage;
copying another challenge's real token fails too, because the salts differ.

Try it — the site will tell you what it threw away:

```js
const p = JSON.parse(localStorage.getItem('pctf:progress'));
p.solves['prime-cuts'] = { ...p.solves['first-light'] };  // replay a real token
localStorage.setItem('pctf:progress', JSON.stringify(p));
// reload: "1 stored solve failed verification and was discarded"
```

### 3. Content that genuinely cannot be read early

Writeups are AES-GCM ciphertext keyed by the flag. There is no branch in the
code that hides readable text behind an `if` — the plaintext is not in the
bundle at all, and a solve produces the key as a side effect.

The meta challenge takes this further: its instructions are sealed under all ten
proof-of-solve tokens concatenated. The page physically cannot describe its own
task until ten genuine solves exist.

The unlisted `/vault/omega` page derives its decryption key from
`location.pathname`, so neither the flag *nor the path* appears as a literal
anywhere. Knowing the URL is the key.

### 4. Guessing is expensive

Each submission costs one 310,000-round PBKDF2 derivation (~300 ms), and after
four misses the form backs off exponentially, to a 30-second cap. Brute force
stops being a strategy and becomes a waiting game.

### 5. Honeypots

Four decoy flags are planted where a shortcut-taker looks first: painted on a
page in 24pt type, in a source comment, in `payloads.json`, in `registry.json`.
Each has its own message when submitted, and tripping one earns a badge you
won't enjoy. They are the only readable `pctf{...}` strings in the project,
which is what makes grepping a trap rather than a shortcut.

### 6. Every deployment has different flags

The answer key holds *base* flags — `pctf{some_words}`. `pnpm gen` mints a random
six-character suffix per challenge into `deployment.secret.json` and splices it
in, so the flag players actually submit is `pctf{some_words_x7fq2p}`.

This closes two holes. A flag was previously only as strong as its own
semantics: a writeup, a screenshot, or a friend running another copy of the site
handed over a working answer. And some were outright guessable — the logic
puzzle's answer space is 256 strings, grindable through the submission box
alone. Six random characters take that to roughly two billion.

Most challenges encode the flag into shipped data, so the suffix falls out of
solving for free. Two challenges are *derive-type*, where you reason to an answer
rather than extract it, and no amount of reasoning produces six random
characters. Those seal the flag under the answer itself: enter the answer, get
the flag. A wrong answer decrypts to nothing, which is stricter than merely
checking it would have been.

### 7. A public repository gives nothing away

This one was a real hole, found by cloning the repo and checking. The generated
files used to be committed, which meant they were *this deployment's* payloads —
so a clone with no secret files at all could recover live flags:

```
$ git clone … && node -e "…solve payloads.json…"
{ "first-light": "pctf{devtools_are_your_friend_<that instance's real suffix>}", … }
```

So `src/lib/generated/{registry,payloads}.json` and `public/robots.txt` are now
gitignored. A fresh clone is seeded from the committed demo set in
`src/lib/generated/sample/`, whose answer key is the public
`flags.sample.json`, and the UI says so in a banner across the top. Running
`pnpm gen` with your own `flags.secret.json` replaces it, and that output is
never committed.

The unlisted page's path moved too. It used to be the literal
`src/routes/vault/omega.tsx` — a public repo answered the recon challenge with
`ls`. The route is now a dynamic segment and the real path is minted per
deployment, appearing only in the generated `robots.txt`, which is exactly where
the challenge intends you to find it.

Also dropped: a `length` field in the registry that quietly published each
flag's character count.

### 8. Player-to-player sharing: what is and isn't possible

Two people on the *same* deployment share the same flags, so one can simply tell
the other. That cannot be fixed client-side, and it is worth being precise about
why rather than hand-waving.

Whether a submission is correct is decided by `verifyHash` and `verifySalt`,
which are baked into the bundle at build time. Every browser that loads the site
gets the same two values, so every browser accepts the same flag. A per-player
flag would need per-player check material — and any material the client can
derive, the sharer's client can derive too, and hand over along with the flag.
Worse, if the client could *compute* its own flag, the flag would exist in the
client, which destroys the one property the whole design rests on.

Two things that genuinely help, and one that doesn't:

- **Doesn't help: a per-browser identity.** Anything in localStorage is
  transferable, so binding a flag to a browser id just means sharing the id too.
- **Helps a little: shipping N variants of each challenge** and picking one per
  browser. A borrowed flag then fails unless both players drew the same variant.
  It is an N-fold speed bump rather than a wall — the variant index lives in
  localStorage and can be edited — and it multiplies the payload budget and the
  authoring work. Not implemented; it is the obvious next step if you need it.
- **Implemented: recording proof of engagement.** Two challenges cannot yield
  their flag without an interaction this app can observe — exchanging the
  verdicts for the logic puzzle, and loading the unlisted page. Solving either
  with no interaction recorded is the signature of a flag from elsewhere, and the
  progress page labels it *hands off*. It also gates the **Hands On** badge.

That last one is a fingerprint, not a lock: it makes a borrowed run visibly
different from a solved one without pretending to prevent anything. Only the two
unambiguous challenges are judged. The morse timings can legitimately be read
instead of heard, and the one-frame reveal can be breakpointed on first load
without ever pressing replay, so treating a missing interaction as suspicious
there would libel honest players.

**If you need sharing actually prevented, you need a server.** It can issue
per-player flags, hold the check server-side where the client cannot see it,
rate-limit centrally, and notice the same flag arriving from thirty browsers in
four minutes. None of that is available to a static site, which is the trade this
project made on purpose.

### What this does not stop

Being honest about the boundary:

- **Someone who solved it can hand you their exported progress file, or just
  tell you the flag.** The tokens are real, so they verify; the flag is
  deployment-wide, so it validates. See §8 for why, and for what is recorded
  instead.
- **Someone with the repo can read `flags.secret.json`** if you give them the
  file. Don't.
- **Someone determined can read the bundle and reimplement a challenge's
  decryption.** For `one-frame-window` that *is* the intended solve.
- **Hints are still readable in `src/lib/challenges.ts`.** They cost points in
  the app and nothing in the repo. Moving them into the answer key and shipping
  them sealed would fix it; it is the largest remaining gap.
- **`scripts/selftest.mjs` is a working solver for all eleven.** Publishing it
  publishes the techniques. That is a spoiler rather than a hole now that the
  live payloads aren't committed — the solvers need data only the deployed site
  has — but read it and you have read the answers.
- **The submission throttle is client-side.** Anyone willing to call the
  derivation directly skips it. The 310,000 PBKDF2 rounds are the real cost;
  the backoff only makes the lazy path slow. Offline, a derive-type challenge
  like the logic puzzle can still be enumerated — 256 candidates at ~300 ms is
  about a minute — which the writeup treats as a legitimate solve anyway.

The goal was never unbreakable. It was that the lazy path is slower than the
honest one, and that nothing is unlocked by editing a value.

## Authoring your own

1. Copy `flags.example.json` to `flags.secret.json` and write your *base*
   flags. They must match `pctf{[a-z0-9_]+}` — submissions are normalised the
   same way the key is, so case and stray whitespace are forgiving. `pnpm gen`
   appends this deployment's random suffix; you never write that part.
2. Add metadata (title, tagline, category, points, three hints) to
   `CHALLENGES` in [`src/lib/challenges.ts`](src/lib/challenges.ts).
3. If the puzzle needs baked data, add a builder to
   [`scripts/generate.mjs`](scripts/generate.mjs). Derive it from the flag; never
   write the flag into a payload.
4. Add a route under `src/routes/c/` that wraps its content in
   `<ChallengeShell>`. The shell handles the timer, hints, submission,
   prerequisite gating and the sealed writeup.
5. Add a solver to [`scripts/selftest.mjs`](scripts/selftest.mjs).
6. `pnpm gen && pnpm check`. The resolved flags land in `ANSWERS.secret.md`.

If the answer is *reasoned* rather than extracted, seal the flag under that
answer and drop a `<DerivedUnlock>` on the page — see
`src/routes/c/knights-and-knaves.tsx`. Otherwise the random suffix would make
your challenge unsolvable.

Commit the generated files in `src/lib/generated/`. They contain no answers.

### Regenerating without resetting everyone

Players store `PBKDF2(flag, tokenSalt)` as their proof of solve, so a new
`tokenSalt` silently invalidates their progress. `pnpm gen` therefore **reuses
each challenge's existing salts** whenever that challenge's flag is unchanged —
fixing a typo in one writeup no longer wipes the scoreboard. A flag that *does*
change gets fresh salts, because its old hash would no longer match anything.

The AES-GCM IV is always regenerated, even when the salts are kept. Encrypting
new plaintext under the same key and nonce is a genuine break, and the writeup is
exactly what tends to change between runs.

To deliberately invalidate every saved solve:

```bash
pnpm gen --rotate
```

## Scripts

| Command             | What it does                                                        |
| ------------------- | ------------------------------------------------------------------- |
| `pnpm dev`          | Dev server on :3000                                                 |
| `pnpm build`        | Static site into `dist/client`, all 15 pages prerendered            |
| `pnpm gen`          | Rebuild the registry and payloads from the answer key               |
| `pnpm gen:sample`   | Rebuild the committed demo set from `flags.sample.json`             |
| `pnpm icons`        | Redraw the app icon and favicons from `scripts/build-icons.mjs`     |
| `pnpm selftest`     | **Solve every challenge** from shipped data and check the answers   |
| `pnpm verify:flags` | Fail if a real flag is readable anywhere outside the answer key      |
| `pnpm check`        | lint + typecheck + verify:flags + selftest                          |

`pnpm selftest` is the one that matters. It doesn't test that the code runs — it
plays the game: peels the five encodings, reads the zero-width bits, extracts
the stego PNG's blue-channel LSBs, factors the 93-digit composite, breaks the
repeating-key XOR by frequency analysis with **no knowledge of the key**, and
brute-forces the logic puzzle to assert it has exactly one solution. A challenge
that can't be solved from what ships fails the build.

Run `pnpm build && pnpm verify:flags` for the leak check that counts — the built
output is what players actually receive.

## Project layout

```
flags.sample.json         public demo key; what a fresh clone plays
flags.secret.json         base flags you author (gitignored)
deployment.secret.json    this install's random suffixes (gitignored, generated)
ANSWERS.secret.md         resolved flags, for whoever runs the CTF (gitignored)
scripts/answers.mjs       splices base + suffix; the one source of truth for
                          what a flag actually is
scripts/bootstrap.mjs     seeds the sample set when live data is missing
scripts/build-icons.mjs   one SVG geometry -> favicon, PNGs, manifest
scripts/generate.mjs      answer key -> hashes, ciphertext, puzzle payloads
scripts/selftest.mjs      solves every challenge from shipped data
scripts/leak-scan.mjs   leak scanner
src/lib/kdf.js            KDF primitives, loaded verbatim by Node *and* the
                          browser so the two can never drift apart
src/lib/challenges.ts     hand-written metadata: titles, points, hints
src/lib/progress.ts       proof-of-solve tokens, throttling, honeypots, stats
src/lib/generated/        live data (gitignored)
src/lib/generated/sample/ committed demo data; flags end in _sample
src/components/           ChallengeShell and friends
src/routes/c/*.tsx        one file per challenge
src/routes/vault/omega    the unlisted page
```

## Notes

- A single dark-mode switch, defaulting to your OS preference until you touch
  it. The class is set before first paint, so navigating in dark mode never
  flashes white, and the whole palette cross-fades on toggle.
- Routes cross-fade via the View Transitions API where available. Hover, press
  and focus are all transitioned; overscroll bounce and pull-to-refresh are
  disabled, since an accidental reload mid-solve is worse than annoying.
- Icons are [Lucide](https://lucide.dev) (`lucide-solid`), inlined as SVG.
- Hints cost 15% of a challenge's points each, floored at a quarter. Take them.
- Ten badges, one of them hidden and unflattering.
- Progress exports to a file and imports with the same verification a page load
  uses, so a hand-written file buys nothing.
- `robots.txt` is real, and is a challenge.
