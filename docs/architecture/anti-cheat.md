# Anti-cheat

The awkward fact about an offline CTF is that the scoreboard runs on the
attacker's machine. The design never tries to hide a secret in a client -- it
makes the shortcuts cost more than solving, and says plainly where each measure
stops working.

### 1. No flag is readable in the shipped site

Grepping the production bundle for `pctf{` returns four hits and all four are
decoys. `pnpm verify:flags` enforces this: it scans `src/`, `public/` and the
built `dist/`, classifies every flag-shaped string against the real answer key,
and fails the build on a match.

It decodes HTML entities first, because prerendered markup carries
`pctf&#123;…&#125;` — an escaped leak slipped past an earlier version of the
check. It also classifies rather than allowlists, so prose like
`pctf{some_words_x7fq2p}` never needs registering as an exception.

### 2. Solves are proofs, not booleans

Setting `solved: true` in localStorage should not unlock anything, so nothing
like it is ever written. A solve stores

```
token = PBKDF2(flag, tokenSalt, 310_000 rounds)
```

and the registry ships only `SHA-256(token)`. Every stored token is re-hashed and
compared on each page load. Forging an entry means finding a preimage; copying
another challenge's real token fails too, because the salts differ.

Try it — the site will tell you what it discarded:

```js
const p = JSON.parse(localStorage.getItem('pctf:progress'));
p.solves['prime-cuts'] = { ...p.solves['first-light'] };  // replay a real token
localStorage.setItem('pctf:progress', JSON.stringify(p));
// reload: "1 stored solve failed verification and was discarded"
```

A second derived value, the seal key, is kept so writeups stay decryptable after
a solve. It is one-way with respect to the flag, so keeping it around does not
hand the answer back.

### 3. Content that genuinely cannot be read early

Writeups are AES-GCM ciphertext keyed by the flag. No branch in the code hides
readable text behind an `if` — the plaintext is not in the bundle at all, and a
solve produces the key as a side effect.

The meta challenge goes further: its instructions are sealed under all ten
proof-of-solve tokens concatenated, so the page cannot describe its own task
until ten genuine solves exist.

The unlisted vault page derives its decryption key from `location.pathname`, so
neither the flag *nor the path* appears as a literal anywhere.

### 4. Guessing is expensive

Each submission costs one 310,000-round PBKDF2 derivation (~300 ms), and after
four misses the form backs off exponentially to a 30-second cap.

### 5. Honeypots

Four decoy flags sit where a shortcut-taker looks first: painted on a page in
24pt type, in a source comment, in `payloads.json`, in `registry.json`. Each has
its own message when submitted, and tripping one earns a badge you won't enjoy.
They are the only readable `pctf{...}` strings in the project, which is what
makes grepping a trap rather than a shortcut.

### 6. Every deployment has different flags

The answer key holds *base* flags. `pnpm gen` mints a random six-character
suffix per challenge and splices it in, so the submitted flag is
`pctf{some_words_x7fq2p}`.

This closes two holes. A flag used to be only as strong as its own semantics — a
writeup, a screenshot, or a friend on another copy of the site handed over a
working answer. And some were outright guessable: the logic puzzle's answer space
is 256 strings, grindable through the submission box alone. Six random characters
take that to roughly two billion.

Most challenges encode the flag into shipped data, so the suffix falls out of
solving for free. Two are **derive-type**, where you reason to an answer rather
than extract it, and no amount of reasoning produces six random characters. Those
seal the flag under the answer itself: enter the answer, get the flag. A wrong
answer decrypts to nothing, which is stricter than merely checking it would be.

### 7. A public repository gives nothing away

This was a real hole, found by cloning the repo and trying it. The generated
files used to be committed, and they were *this deployment's* payloads — so a
clone with no secret files could recover live flags in one command.

So `src/lib/generated/{registry,payloads}.json`, `public/robots.txt` and
`public/sitemap.xml` are gitignored. A fresh clone is seeded by
`scripts/bootstrap.mjs` from the committed demo set in
`src/lib/generated/sample/`, whose answer key is the public `flags.sample.json`,
and a banner across every page says so. Running `pnpm gen` with your own key
replaces it, and that output is never committed.

The unlisted page's path moved too. It used to be the literal
`src/routes/vault/omega.tsx`, so a public repo answered the recon challenge with
`ls`. The route is a dynamic segment now and the real path is minted per
deployment, appearing only in the generated `robots.txt` — which is exactly where
the challenge intends you to find it.

### 8. Player-to-player sharing

Two people on the same deployment share the same flags, so one can simply tell
the other. **That cannot be fixed client-side**, and the reason is worth stating
precisely rather than hand-waving.

Whether a submission is correct is decided by `verifyHash` and `verifySalt`,
baked into the bundle at build time. Every browser that loads the site gets the
same two values, so every browser accepts the same flag. A per-player flag would
need per-player check material — and any material the client can derive, the
sharer's client can derive too and hand over with the flag. Worse, if the client
could *compute* its own flag, the flag would exist in the client, which destroys
the property everything else rests on.

Two things help, and one does not:

- **Doesn't help: a per-browser identity.** Anything in localStorage is
  transferable, so binding a flag to a browser id just means sharing the id too.
- **Helps a little: shipping N variants** of each challenge and picking one per
  browser. A borrowed flag then fails unless both players drew the same variant.
  It is an N-fold speed bump rather than a wall — the variant index lives in
  localStorage and can be edited — and it multiplies the payload budget and the
  authoring work. Not implemented; it is the obvious next step if you need it.
- **Implemented: recording proof of engagement.** Two challenges cannot yield
  their flag without an interaction the app observes — exchanging the verdicts,
  and loading the unlisted page. Solving either with nothing recorded is the
  signature of a flag from elsewhere, and the progress page labels it *hands
  off*. It also gates the **Hands On** badge.

That last one is a fingerprint, not a lock. Only the two unambiguous challenges
are judged: the Morse timings can legitimately be read instead of heard, and the
one-frame reveal can be breakpointed on first load without pressing replay, so
treating a missing interaction as suspicious there would libel honest players.

**If you need sharing actually prevented, you need a server.** It can issue
per-player flags, hold the check where the client cannot see it, rate-limit
centrally, and notice the same flag arriving from thirty browsers in four
minutes. None of that is available to a static site, which is the trade this
project made on purpose.

## What this does not stop

Being explicit about the boundary:

- **Someone who solved it can hand you their exported progress file, or just
  tell you the flag.** The tokens are real, so they verify; the flag is
  deployment-wide, so it validates.
- **Someone with the repo can read `flags.secret.json`** if you give them the
  file. Don't.
- **Someone determined can read the bundle and reimplement a challenge's
  decryption.** For `one-frame-window` that *is* the intended solve.
- **Hints are readable in `src/lib/challenges.ts`.** They cost points in the app
  and nothing in the repo. Moving them into the answer key and shipping them
  sealed would fix it; it is the largest remaining gap.
- **`scripts/selftest.mjs` is a working solver for all eleven.** That is a
  spoiler rather than a hole now that live payloads aren't committed — the
  solvers need data only the deployed site has — but read it and you have read
  the answers.
- **The submission throttle is client-side.** Anyone willing to call the
  derivation directly skips it. The 310,000 rounds are the real cost; the backoff
  only slows the lazy path.

The goal was never unbreakable. It was that the lazy path is slower than the
honest one, and that nothing is unlocked by editing a value.

---

Next: [Deployment](deployment.md) · [Build pipeline](build-pipeline.md) · [Back to the index](README.md)
