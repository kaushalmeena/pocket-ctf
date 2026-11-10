# Components, accessibility and voice

The recurring patterns, the accessibility rules they follow, and how the copy
is written.

## Component patterns

**`Terminal`** is the only form on the site. Flags go in, and so does anything
else: every line is sent to the server, which decides whether it was a flag, a
command or neither, and the reply is printed in the scrollback. Nothing the
prompt can say is in the bundle. It is dark in both themes — the one object
meant to look like a different kind of thing from the page around it — and
arrow keys walk back through what was typed, as a shell would.

**`TrophyToasts`** announces trophies in the top-right corner, **one at a
time**. A flag that also completes the set earns two, and stacking them would
bury the one that matters under the one that came first. Each holds for six and
a half seconds or until clicked, and arrives with a short chime synthesised by
`src/lib/chime.ts` — rarer metals climb higher and ring longer, and a browser
that refuses audio costs nobody their toast.

**`TrophyIcon`** is a trophy in its metal: a disc that reads `--metal` and
`--metal-deep` from whichever `.tier-*` class it sits under. Locked slots show
the same disc as an outline with a padlock, so the grade of a hidden trophy is
visible and nothing else about it is.

**`Room`** frames every unlisted page: an eyebrow, a title, a narrow column.
These pages are reached by noticing something, so they dress alike, and a player
who lands on one knows they are somewhere they found rather than somewhere they
were sent.

**`StatusLight`** is the lamp in the footer. It fetches a rhythm from
`/api/pulse` and keeps it on a loop, and takes its label from `/api/status`;
clicking it plays the same rhythm as a tone. It is a puzzle wearing a component's clothes, which is the pattern for
everything hidden in plain sight: it has to be a plausible piece of chrome
first.

**`Secrets`** renders almost nothing. It is where the things every page does
quietly live: the console greeting, the records filed in IndexedDB, and the
listener for one very old cheat code.

**The fragment line** sits under a trophy's quip, in its toast and in its slot:
`fragment 3/17 · a9`, in small mono capitals with the fragment itself left in
lower case. It is presented as an inventory detail rather than a clue, because
noticing that it adds up to something is the last puzzle.

**`Claim`**, at the foot of the trophy case, is the one place sign-in appears. It
offers GitHub to an anonymous player, says plainly when the server has no
GitHub app configured rather than showing a button that fails, and once claimed
shows the account name and a sign-out. Signing in and out reload the page: the
player has changed, and every number on it is stale. It goes through Better
Auth's browser client in `src/lib/auth.ts`, and never signs anyone in
anonymously — only the server does that.

**The profile page** (`/u/<handle>`) shows the server-drawn card and the case as
metals only, with a line saying it cannot tell you which flags they are. "Share
your card" in the trophy case copies its link, falling back to opening it where
the clipboard is refused, and appears only once there is something to share.

**Locked and found trophies are different components**, not one with a flag.
`FoundSlot` and `LockedSlot` in `src/routes/trophies.tsx` share a size and
nothing else, and the server sends them different shapes — a locked slot's data
has no title to leak.

**The writeup is a real `<details>`**, not a button plus a conditional div. It is
a disclosure, so it behaves like one for keyboard and assistive tech, and it
picks up the animated height for free. The text is fetched in `onToggle`, on
first open, and only for a flag the player holds.

**Handlers are named functions**, declared above the markup, not arrows inline
in JSX. `handleSubmit`, `handleBuy`, `handleDismiss`.

## Accessibility

- Every icon-only control has an `aria-label`; the theme switch is a
  `role="switch"` with `aria-checked`.
- Trophy grade is never conveyed by colour alone — every disc sits next to its
  tier in words, and a locked slot says "Hidden trophy".
- The progress bar is a real `role="progressbar"` with `aria-valuenow`.
- Focus is visible everywhere via a single `:focus-visible` outline rule in the
  accent colour.
- The prompt's scrollback is a `role="log"` and the toast region a
  `role="status"`, both polite, so a result is announced rather than only shown.
- The chime is an addition to the toast, never the only signal.
- Summaries are `user-select: none`: clicking one used to leave its label
  highlighted, which reads as a rendering glitch rather than intent.

One honest gap: several puzzles are visual by construction. A blinking light, a
noisy image and a jagged line are not accessible objects, and no amount of ARIA
makes them so. Each has a non-visual route to the same data — the timings are
JSON, the image is bytes, the line is a path string — and the light can be heard
as well as seen.

## Voice

Second person, plain, and never congratulatory. The site is dry about itself
and mildly rude about shortcuts.

**Nothing on a page says it is a puzzle.** Copy on the front page describes the
hunt in general terms and stops. The caption under the drawing calls it
decorative. A hiding place that announced itself would be a challenge page with
the navigation removed.

**Quips are one line, about the player, in the past tense** — "You gave yourself
a raise by editing a cookie." They are the reward, so they are specific to what
was just done and never explain it.

**Clues are progressively less coy** rather than progressively more explicit.
The first, `whereabouts`, says where to look and never how; it should be useless
to someone who has not been paying attention and obvious to someone who has.

**Decoys answer back.** Each planted flag has its own reply, about where it was
found.

Writeups explain _why the technique works_, not just which keys to press, because
the technique is the thing worth keeping. Where a design has a limit, the copy
says so: the front page states plainly that clues cost points, that guessing is
throttled, and that a friend's flag will not work.

---

Next: [Foundations](foundations.md) · [Motion](motion.md) · [Back to the index](../README.md#documentation)
