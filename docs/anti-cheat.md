# Anti-cheat

The earlier version of this project ran entirely in the browser, and its
anti-cheat design was an exercise in making shortcuts cost more than solving
when the scoreboard sits on the attacker's machine. It ended with the sentence
"if you need sharing actually prevented, you need a server."

There is a server now. Most of what used to be a speed bump is a wall, and this
page is correspondingly shorter. It still says plainly where each measure stops
working, because several of them do.

### 1. The answers are not in the browser

A submission is checked on the server. The answer key, the puzzle builders, the
challenge titles, the clue text and the writeups are imported only by server
code, and the compiler strips that code out of the client bundle. The key itself
is read when the server starts, from a gitignored file or an environment
variable, and is never part of any build.

What the bundle does contain is the interface and the route table — so the paths
of the unlisted pages (`/staff`, `/lounge`, `/radio` and the rest) are in it. That is left
alone on purpose. Reading the JavaScript a site sends you is a legitimate move
in a hunt, and it gets you an address, not an answer.

`pnpm verify:flags` enforces the rest: it scans `src/`, `scripts/`, `public/`,
`docs/` and whatever a build left in `dist/`, `.output/` or `.vercel/output/`,
classifies every flag-shaped string against the real answer key, and fails on a
match — a base flag, or a base flag with any suffix spliced in, since that is
somebody's working flag. It decodes HTML entities first, and it classifies
rather than allowlists, so prose like `pctf{some_words_x7fq2p}` never needs
registering as an exception.

### 2. A solve is a row, not a claim

Progress used to live in localStorage as a proof-of-solve token the browser
could re-verify. It now lives in the database, written by the server at the
moment it accepts a flag. There is nothing in the browser to edit: the page
shows what the server last said, and says it again on the next load.

Scores are fixed at the moment of the solve — points after clues taken — so
buying clues afterwards costs nothing and changes nothing.

### 3. Guessing is throttled, centrally

Wrong answers are counted in a `throttle` table against two keys at once: the
player, and a hash of the address the request came from. Five misses per player
are free, forty per address. After that each further miss doubles a lockout,
from one second to a cap of sixty, and a run of misses is forgotten after
fifteen quiet minutes. A correct flag clears the player's count; the address
keeps its own.

The second key exists because a session costs nothing to throw away. A script
that discards its cookies before every guess is a new player every time and the
same address every time. Addresses are stored only as a hash.

Only wrong flag-shaped submissions count. Terminal commands, malformed input and
decoys do not; nobody should be locked out for typing `ls`.

The throttle is the real cost of a guess. Checking a submission is twenty
short hashes, deliberately fast — see
[Flags and the answer key](build-pipeline.md) for why a slow hash would have been
the wrong tool once nothing derived from a flag leaves the server.

### 4. Every player is dealt their own flags

The answer key holds one phrase per challenge. The flag a player submits is that
phrase plus a six-character suffix derived from their seed, and the seed is
never sent to the browser: first it comes from their `pctf_deal` cookie, and from
enrolment onwards from their row, which keeps the same seed so the puzzles they
were looking at stay theirs. Each puzzle is built from the flag it hides, so
every player has a different flag, and a different puzzle, for every challenge.

So a flag passed to the person next to you is always wrong for them — and the
server knows the difference between wrong and borrowed. A flag whose phrase is
real but whose suffix is somebody else's is recognised, refused, and answered
with a secret trophy called Receiving Stolen Goods. It does not count against
the throttle.

That recognition has a cost, and it is worth saying what it is. "Borrowed"
confirms that a phrase is genuine. That gives nothing toward scoring, because
the phrase alone is not the flag, but it is a fact the server tells anyone who
already has the phrase.

The suffix is keyed with `POCKET_CTF_SECRET`, which only the server holds
(`src/server/secret.ts`). That matters because the seed alone is not private
enough: before enrolment it is derived from the `pctf_deal` cookie, which its
owner can read in devtools, and the derivation is in this repository. With the
secret in the mix, knowing the seed and the source still gets a player nothing.
The same key covers everything else derived from the seed -- the door and
lounge codes, the finale address, and the MACs on Simon's tickets and the
bridge cookie -- so none of those can be worked out from outside either.

The secret is only as good as its keeping. Anyone holding it, with the answer
key, can compute every player's flags; the development fallback is public,
which is why production refuses to start without a real one.

### 5. Decoys

Four flag-shaped strings sit where a shortcut-taker looks first: the example on
the front page, a comment at the top of the page source, a cookie named `flag`,
and an `X-Flag` response header. They are the only readable `pctf{...}` strings
in the project, each has its own reply, and submitting any of them earns a
secret trophy rather than a miss.

They do not count against the throttle. The point is the joke, not the penalty.

### 6. Every deployment has different flags

Each deployment's answer key is its own: the operator writes the phrases, and
the published demo phrases all start `demo_` so none can collide with a real
one. Answers leaked from one installation are therefore worthless against
another, and a flag is not guessable from its meaning.

To a guesser who does not know their suffix, the suffix alone is 32⁶ — about a
billion — candidates per phrase, at one guess a minute once the throttle is
engaged. To one who has worked it out (see above), what is left is the phrase,
which is why phrases should be ones nobody would guess.

### 7. A public repository gives no flag away

The answer key is gitignored, and nothing is generated from it into the tree: a
fresh clone has no flags at all beyond the public `flags.sample.json`. A server
started without a real key runs on that demo key, and a banner across every page
says so.

The repository does give away the _map_. See below.

### 8. Identity is Better Auth's, and is lazy

Looking at the site writes nothing. A visitor without a session is dealt their
puzzles from an http-only `pctf_deal` cookie, and their handle and seed are
derived from it. The first time they do something worth keeping — a flag, a
clue, a secret trophy, a new handle — the server signs them in as an anonymous
[Better Auth](https://www.better-auth.com) user and saves what they were dealt.
Crawlers, link previews and scripts that mint a cookie per request leave the
database as they found it.

Sessions are Better Auth's: signed cookies, a server-side session table, one
year long. Claiming with GitHub links the anonymous user to a GitHub account,
and `src/server/merge.ts` moves the hunt's rows onto it — or, if that account
already has progress from another browser, pools the finds, each counted once,
with the account's own handle and seed kept.

### 9. Server functions refuse other sites

Every state-changing call the interface makes — the prompt, clues, renames —
is a TanStack Start server function, and those go through its CSRF middleware,
which rejects requests from another origin. The plain `/api/*` routes are left
open on purpose: poking them with `curl` is part of the hunt, and none of them
changes anything a player owns.

### 10. Clues lower what a flag pays

Each hidden trophy sells clues: the first says where to look, the rest come from
the answer key and say progressively more about how. Each one takes 15% off what
that flag pays when it is found, down to a floor of a quarter. Nothing is taken
from the player's score at the time, so a clue is never free: a player on zero
still pays, later, in a smaller reward. Charging the score directly would either
let it go negative or, floored at zero, make clues cost nothing to anyone who
has not scored yet. Clue text lives only in the answer key on the server, and
is sent only when paid for, so it cannot be read ahead of the charge.

## What this does not stop

Being explicit about the boundary:

- **The repository is a walkthrough.** This is an open-source project, so where
  every flag is hidden is in `src/server/plants.ts`, in `docs/challenges.md`,
  and in a script (`scripts/self-test.mjs`) that plays the whole hunt
  unattended. Anyone who would rather read than look can. What the repository
  does not contain is any deployment's flags, so reading it gets you directions
  and still leaves you a puzzle to solve at the end of each.
- **Every challenge ships a working solver** in `src/challenges/<slug>/solve.mjs`.
  Same trade: it needs the puzzle a deployment dealt you.
- **Someone who solved it can tell you how.** Per-player flags stop a pasted
  flag. They do nothing about a pasted method, and nothing can.
- **The server secret is the whole game.** `POCKET_CTF_SECRET` plus the answer
  key is every player's flags. Keep both where only the server can read them,
  and rotate the secret if either leaks -- progress survives, unsubmitted flags
  do not.
- **A GitHub account is the only durable identity.** Until a player claims,
  they are an anonymous session, and clearing cookies makes them somebody else
  — losing that progress, and letting one person hold several rows on the
  board. Claiming fixes the first; nothing stops someone with several GitHub
  accounts.
- **The address key is only as good as the address.** It reads
  `X-Forwarded-For` so that it works behind a proxy, which also means a client
  that reaches the server directly can supply its own. Behind a host that sets
  the header itself — Vercel does — this is not a concern. Players sharing one
  address, such as a classroom behind one NAT, share its forty free misses.
- **The development secret is public.** Without `BETTER_AUTH_SECRET` the server
  falls back to a fixed value, so that a clone runs. Anyone who knows it can
  sign a session for any user, which is why production refuses to run
  without a real one.
- **Three secret trophies are claimed by the browser.** The Konami code, coming
  back from the offline page and being here at 3:14 are noticed client-side and
  reported to the server, so anyone can claim them with one request. (The
  offline page also appears when the server is down, which counts.) That is why
  secret trophies are worth no points: a score anyone can award themselves is
  not a score.
- **Rarity is a guess until it isn't.** Each trophy's percentage starts from a
  prior and is outvoted by real finds (`src/server/rarity.ts`), so a young
  deployment shows plausible numbers rather than "100% of 1 hunter". The
  numbers are site-wide and public by design.
- **Some weaknesses are the puzzles.** The `clearance` cookie is unsigned, the
  lounge signs its badges with a four-digit key, and the door leaks its code
  through how long it takes to say no. None of that is an oversight. The cookie
  that actually identifies a player is Better Auth's signed session.
- **Handles are not moderated**, beyond a character set and a length. A public
  instance will want a word list.
- **The board is public.** It shows handles, counts and scores, never which
  flags — but it does tell everyone how far ahead the leader is.

The goal was never unbreakable. It is that the only way to a trophy is to send
the server a flag it dealt you, and that everything short of that is either
slower than looking or a joke at your expense.

---

Next: [Deployment](deployment.md) · [Flags and the answer key](build-pipeline.md) · [Back to the index](../README.md#documentation)
