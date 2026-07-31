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
`animate-shake` on a wrong flag, retriggered by removing and re-adding the class.

**Waits get a delayed indeterminate bar.** `LoadingBar` covers the one real wait
on a challenge page — reading storage and drawing this browser's variant — and
does nothing for the first 120ms. That wait is usually a frame or two, and an
indicator that appears and vanishes inside 100ms reads as a rendering glitch
rather than as feedback. The `role="status"` region is present from the start
regardless, so assistive tech is told immediately even when nothing is drawn.
There is no percentage to report, so the bar sweeps rather than fills; under
reduced motion it holds still at partial width, which still says "working".

A router-level navigation bar was considered and rejected: every route is
prerendered and preloaded on intent, so navigations finish in a frame or two and
the bar would never legitimately appear.

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

The app mark is a pennant on a pole, echoing the wordmark's `flag` icon. Its
geometry lives once in `scripts/build-icons.mjs` as normalised coordinates, and
both the SVG writer and the rasteriser read it from there, so the favicon, the
PNG fallbacks, the apple-touch icon and the Open Graph card cannot disagree. The
rasteriser supersamples 4×4 per pixel, which is what keeps the rounded corners
and the pennant's diagonal from stepping at 16px.

---

Next: [Components](components.md) · [Foundations](foundations.md) · [Back to the index](README.md)
