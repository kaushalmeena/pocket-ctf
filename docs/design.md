# Design

The interface has one job: get out of the way of the puzzle. A CTF is almost
entirely text and small pieces of generated data, so the design is mostly about
restraint — and about the handful of places where motion or colour genuinely
carries information.

- [Principles](#principles)
- [Colour and theme](#colour-and-theme)
- [Typography](#typography)
- [Motion](#motion)
- [Iconography](#iconography)
- [Component patterns](#component-patterns)
- [Accessibility](#accessibility)
- [Voice](#voice)

## Principles

**One accent, used sparingly.** A single green (`--color-accent-*`, OKLCH around
hue 165) marks exactly three things: success, unlocked content, and progress.
Everything else is zinc. When the whole page is neutral, one green tick is
unmissable; if buttons and links were green too, it would be noise.

**Nothing decorative that could be mistaken for a clue.** In a CTF, ornament is
actively harmful — a stray glyph or an unexplained colour reads as a puzzle
element. Every visual element on a challenge page either *is* the puzzle or is
plainly chrome.

**Generated data gets its own treatment.** Hex blobs, base64, 124-digit integers
and the zero-width poem are all rendered in `.blob` or `.carrier`: monospace,
selectable, `break-all` where wrapping is safe and `whitespace-pre-wrap` where
byte-exactness matters. The `.carrier` class exists specifically so the
steganography challenge's text survives copy-paste unchanged.

## Colour and theme

Dark mode is a `class="dark"` on `<html>`, not the `prefers-color-scheme` media
query, because the visitor can override it. Tailwind v4 is told so with
`@custom-variant dark (&:where(.dark, .dark *))`.

The class is set by a **synchronous inline script, first thing in `<head>`**
(`THEME_BOOTSTRAP` in `src/lib/theme.tsx`). It runs before `<body>` is parsed and
before first paint, so a dark-mode visitor never sees a white flash — on the
first load or on any navigation.

Absence of a stored preference means *follow the OS*, and the media query stays
live until the switch is touched. There is no third "system" button: it was more
chrome than the choice deserved.

### Why the switch is CSS-driven

The knob position and icon opacity come from `dark:` variants, not from the
`theme()` signal. Prerendered HTML cannot know a visitor's preference, so
anything driven by JS state ships in the light position and gets corrected at
hydration — which happens *after* first paint, so the visitor watches the switch
flip itself on every load. The `dark` class is already correct before paint, so
CSS simply draws the knob in the right place and the transition only ever fires
on a real click.

`aria-checked` and `title` still come from the signal, since they are never
painted; being correct one frame after hydration is soon enough.

## Typography

System sans for prose, system monospace for anything a machine produced. That
split is load-bearing rather than aesthetic: monospace is how the reader knows
they are looking at data rather than at writing.

Prose is capped at `max-w-3xl` with `leading-7`. Long-form explanation is the
main content of this site, and a comfortable measure matters more than filling
the viewport.

## Motion

Transitions live in the base layer, applied to interactive elements as a short
explicit property list — colour, border, opacity, shadow, transform — rather than
`transition-all`, which would animate layout and cost far more than it looks.
Buttons scale to `0.985` while held, which is the cheapest way to make a control
feel like a control.

**Route changes cross-fade** through the View Transitions API
(`defaultViewTransition` on the router). A plain dissolve, no movement: sliding
text while the reader's eye is already tracking it is worse than a fade.

**Disclosures animate their height** with `interpolate-size: allow-keywords` and
`::details-content`. `height: auto` is not normally interpolable — the usual
workaround is JavaScript measuring `scrollHeight` — so this gets every `<details>`
on the site a smooth open and close from a single rule, with nothing to measure.
`content-visibility` needs `allow-discrete`, or the content vanishes on the first
frame of closing and the height animates against nothing. Browsers without
support snap open, which is the behaviour we had before.

**Theme switches cross-fade surfaces only.** A temporary `.theme-transition`
class on `<html>` transitions `background-color` and `border-color` for 280ms.
`color` is deliberately excluded: animating text colour looks fine on body copy
and wrong on anything large — the wordmark and the page heading visibly trailed
the background, which reads as lag rather than as a transition. It is temporary
because a permanent global colour transition makes ordinary hovers sluggish.

Two smaller pieces: `animate-rise` for content that appears on demand, and
`animate-shake` on a wrong flag, retriggered by removing and re-adding the class.

**Overscroll is disabled** on `html` and `body`. Challenge pages involve a lot of
scrolling between the puzzle and the submission box, and an accidental
pull-to-refresh mid-solve is worse than annoying — `one-frame-window` fires its
reveal on load.

`prefers-reduced-motion: reduce` collapses all of it to near-instant rather than
merely faster, and drops the press transform.

## Iconography

[Lucide](https://lucide.dev) via `lucide-solid`, inlined as SVG so the site stays
self-contained and offline. Icons are always paired with a label or carry an
`aria-label`; none of them is the sole carrier of meaning.

Deprecated Lucide aliases keep working and never warn, so they rot silently.
`pnpm lint:icons` reads the `@deprecated` annotations out of the installed
package and fails if a renamed alias is still imported — the list therefore
tracks whichever version is installed rather than a hand-kept copy.

The app mark is a pennant on a pole, echoing the wordmark's `flag` icon. Its
geometry lives once in `scripts/build-icons.mjs` as normalised coordinates, and
both the SVG writer and the rasteriser read it from there, so the favicon, the
PNG fallbacks, the apple-touch icon and the Open Graph card cannot disagree. The
rasteriser supersamples 4×4 per pixel, which is what keeps the rounded corners
and the pennant's diagonal from stepping at 16px.

## Component patterns

**`ChallengeShell`** frames every challenge: breadcrumb, title, category and
difficulty pills, a live timer, the submission form, hints, prerequisite gating
and the sealed writeup. Puzzle files therefore contain only their puzzle.

**Controls that change their label carry a `min-w-*`.** `Play`/`Stop`,
`Check`/`Checking`, `Copy the number`/`Copied` and `Unlock`/`Deriving…` all
resize as they toggle, which shoves whatever sits beside them. Centring the
content in a fixed-width box fixes it.

**The writeup is a real `<details>`**, not a button plus a conditional div. It is
a disclosure, so it behaves like one for keyboard and assistive tech, and it picks
up the animated height for free. Decryption happens in `onToggle`, on first open.

**Masks match what they hide.** The one-frame reveal's placeholder is built from
the flag's length, so the text swaps into precisely the bar's footprint — no
reflow, and one less tell about when the reveal happened.

## Accessibility

- Every icon-only control has an `aria-label`; the theme switch is a
  `role="switch"` with `aria-checked`.
- Badge state is never conveyed by colour alone — earned badges also carry a
  checkmark and an `sr-only` "Earned:" / "Not yet earned:" prefix.
- The progress bar is a real `role="progressbar"` with `aria-valuenow`.
- Focus is visible everywhere via a single `:focus-visible` outline rule in the
  accent colour.
- `/` focuses the flag input, and refuses to when you are already typing in a
  field.
- Feedback after a submission is a `role="status"` region, so the result is
  announced rather than only shown.
- Summaries are `user-select: none`: clicking one used to leave its label
  highlighted, which reads as a rendering glitch rather than intent.

## Voice

Second person, plain, and never congratulatory. Hints are progressively less coy
rather than progressively more explicit. Taglines intrigue without instructing —
"A dull poem that counts its own pauses" tells you where to look without telling
you what to do.

Writeups explain *why the technique works*, not just which keys to press, because
the technique is the thing worth keeping. Where a design has a limit, the copy
says so: the progress page explains that "hands off" is a fingerprint rather than
a lock, and the home page states plainly that hints cost points and wrong answers
slow you down.
