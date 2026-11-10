# Motion and iconography

Where the interface moves, where it deliberately does not, and where the icons
come from.

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
`animate-shake` on the prompt when a line is refused.

**Trophies slide in from the right** with a slight overshoot and leave the same
way, 420ms in and 300ms out. It is the one piece of motion on the site that is
meant to be noticed, so it is the only one with any bounce in it.

**The footer light does not transition.** Everything else interactive fades
between states; the lamp snaps on and off, because its timing is a message and
an eased edge would smear a dot into a dash.

**The logo wobbles** when tapped seven times, and **a scanline overlay**
flickers over the whole page after the Konami code until the code is entered
again. Both are rewards for doing something pointless, and neither does anything
else.

There is no loading indicator. The old challenge pages had one for the wait
while the browser read storage and drew a variant; pages now arrive rendered,
with the player's data already in them. The prompt's Send button shows an
ellipsis while a line is in flight, and that is the only wait there is.

**Overscroll is disabled** on `html` and `body`. An accidental pull-to-refresh
wipes the prompt's scrollback mid-thought.

`prefers-reduced-motion: reduce` collapses all of it to near-instant rather than
merely faster, and drops the press transform. Trophies still arrive and still
leave; they just do not travel. The wobble and the scanline flicker stop. The
footer light keeps blinking, because it is content rather than decoration — a
player who cannot or would rather not watch it can read the same timings from
the endpoint it polls, or click it and listen.

## Iconography

[Lucide](https://lucide.dev) via `lucide-solid`, inlined as SVG so no icon is a
network request. Icons are always paired with a label or carry an
`aria-label`; none of them is the sole carrier of meaning.

The app mark is a pennant on a pole, echoing the wordmark's `flag` icon. Its
geometry lives once in `scripts/build-icons.mjs` as normalised coordinates, and
both the SVG writer and the rasteriser read it from there, so the favicon, the
PNG fallbacks, the apple-touch icon and the Open Graph card cannot disagree. The
rasteriser supersamples 4×4 per pixel, which is what keeps the rounded corners
and the pennant's diagonal from stepping at 16px.

---

Next: [Components](components.md) · [Foundations](foundations.md) · [Back to the index](../README.md#documentation)
