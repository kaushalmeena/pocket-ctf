# Pocket CTF

Eleven capture-the-flag puzzles that run entirely in your browser. No server, no
accounts, no network. Each challenge is its own page, you submit a flag into a
box, and the site checks it without ever having stored what the answer looks
like.

Built with [TanStack Start](https://tanstack.com/start) (Solid), Tailwind v4 and
Biome, on pnpm. Every route is prerendered to static HTML, so the finished thing
is a folder of files that any file server can host — or that you can copy onto a
USB stick.

```bash
pnpm install
pnpm dev            # http://localhost:3000
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

### What this does not stop

Being honest about the boundary:

- **Someone who solved it can hand you their exported progress file.** The
  tokens are real, so they verify. That is sharing answers, and no client-side
  scheme can prevent it.
- **Someone with the repo can read `flags.secret.json`** if you give them the
  file. Don't.
- **Someone determined can read the bundle and reimplement a challenge's
  decryption.** For `one-frame-window` that *is* the intended solve.

The goal was never unbreakable. It was that the lazy path is slower than the
honest one, and that nothing is unlocked by editing a value.

## Authoring your own

1. Copy `flags.example.json` to `flags.secret.json` and write your flags.
   They must match `pctf{[a-z0-9_]+}` — submissions are normalised the same way
   the key is, so case and stray whitespace are forgiving.
2. Add metadata (title, tagline, category, points, three hints) to
   `CHALLENGES` in [`src/lib/challenges.ts`](src/lib/challenges.ts).
3. If the puzzle needs baked data, add a builder to
   [`scripts/generate.mjs`](scripts/generate.mjs). Derive it from the flag; never
   write the flag into a payload.
4. Add a route under `src/routes/c/` that wraps its content in
   `<ChallengeShell>`. The shell handles the timer, hints, submission,
   prerequisite gating and the sealed writeup.
5. Add a solver to [`scripts/selftest.mjs`](scripts/selftest.mjs).
6. `pnpm gen && pnpm check`.

Commit the generated files in `src/lib/generated/`. They contain no answers.

## Scripts

| Command             | What it does                                                        |
| ------------------- | ------------------------------------------------------------------- |
| `pnpm dev`          | Dev server on :3000                                                 |
| `pnpm build`        | Static site into `dist/client`, all 15 pages prerendered            |
| `pnpm gen`          | Rebuild the registry and payloads from the answer key               |
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
flags.secret.json         the answer key (gitignored)
scripts/generate.mjs      answer key -> hashes, ciphertext, puzzle payloads
scripts/selftest.mjs      solves every challenge from shipped data
scripts/verify-no-flags.mjs   leak scanner
src/lib/kdf.js            KDF primitives, loaded verbatim by Node *and* the
                          browser so the two can never drift apart
src/lib/challenges.ts     hand-written metadata: titles, points, hints
src/lib/progress.ts       proof-of-solve tokens, throttling, honeypots, stats
src/lib/generated/        committed build output; contains no answers
src/components/           ChallengeShell and friends
src/routes/c/*.tsx        one file per challenge
src/routes/vault/omega    the unlisted page
```

## Notes

- Light, dark and system themes; the class is set before first paint so
  navigating in dark mode never flashes white.
- Hints cost 15% of a challenge's points each, floored at a quarter. Take them.
- Ten badges, one of them hidden and unflattering.
- Progress exports to a file and imports with the same verification a page load
  uses, so a hand-written file buys nothing.
- `robots.txt` is real, and is a challenge.
