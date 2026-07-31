# Components, accessibility and voice

The recurring patterns, the accessibility rules they follow, and how the copy
is written.

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

---

Next: [Foundations](foundations.md) · [Motion](motion.md) · [Back to the index](README.md)
