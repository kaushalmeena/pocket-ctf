# Foundations

The rules everything else follows: what the interface is for, how colour and
type are used, and how the theme is decided.

## Principles

**One accent, used sparingly.** A single accent hue (`--color-accent-*`) marks
success, progress, and the things that belong to the player: the prompt, their
row on the board, the eyebrow over a page they found. Everything else is zinc.
When the whole page is neutral, one coloured line is unmissable; if buttons and
links were coloured too, it would be noise.

**Which hue is the visitor's.** There are six palettes -- emerald, sky, violet,
rose, amber, lime -- and a first visit is dealt one at random by
`ACCENT_BOOTSTRAP` (`src/lib/accent.ts`), before first paint, then keeps it. The
swatch in the header cycles them. Each palette is only a hue and a chroma
factor (`--accent-h`, `--accent-c` on `:root[data-accent]` in `src/app.css`),
and the whole 50-950 scale is derived from those two numbers, so lightness steps
stay identical across palettes and contrast holds whichever is drawn. Adding one
means an entry in `ACCENTS` and a matching rule in `app.css`. The one place the
accent is fixed is the server-drawn trophy card, which cannot know a viewer's
palette.

**Trophy metals are the one exception.** Bronze, silver, gold, platinum and the
green of a secret trophy are defined as `.tier-*` classes in `src/app.css`, each
setting two variables that everything trophy-shaped reads. They are allowed
because a trophy's grade is information — four greys would not carry it — and
they appear nowhere except on a trophy.

**Everything that looks decorative is a suspect, and that is now the point.**
The old rule here was "nothing decorative that could be mistaken for a clue",
because on a challenge page a stray glyph reads as a puzzle element. The site is
the puzzle now, so the rule has inverted rather than relaxed: ornament is
permitted only if it is a hiding place or a decoy. A player who chases something
odd should end up with a flag or a joke, never with nothing. A purely decorative
flourish wastes someone's evening.

**Generated data gets its own treatment.** Hex blobs, bytecode and the
zero-width poem are rendered in `.blob` or `.carrier`: monospace, selectable,
`break-all` where wrapping is safe and `whitespace-pre-wrap` where byte-exactness
matters. The `.carrier` class exists specifically so the poem's invisible
characters survive copy-paste unchanged.

**The page is graph paper.** The body carries a faint dot grid. It is the only
texture on the site, and it is there because the site is something you are meant
to map yourself.

## Colour and theme

Dark mode is a `class="dark"` on `<html>`, not the `prefers-color-scheme` media
query, because the visitor can override it. Tailwind v4 is told so with
`@custom-variant dark (&:where(.dark, .dark *))`.

The class is set by a **synchronous inline script, first thing in `<head>`**
(`THEME_BOOTSTRAP` in `src/lib/theme.tsx`). It runs before `<body>` is parsed and
before first paint, so a dark-mode visitor never sees a white flash — on the
first load or on any navigation.

Absence of a stored preference means _follow the OS_, and the media query stays
live until the switch is touched. There is no third "system" button: it was more
chrome than the choice deserved.

### Why the switch is CSS-driven

The knob position and icon opacity come from `dark:` variants, not from the
`theme()` signal. The preference lives in localStorage, which the server
rendering the page cannot see, so anything driven by JS state ships in the light
position and gets corrected at hydration — which happens _after_ first paint, so the visitor watches the switch
flip itself on every load. The `dark` class is already correct before paint, so
CSS simply draws the knob in the right place and the transition only ever fires
on a real click.

`aria-checked` and `title` still come from the signal, since they are never
painted; being correct one frame after hydration is soon enough.

## Typography

System sans for prose, system monospace for anything a machine produced. That
split is load-bearing rather than aesthetic: monospace is how the reader knows
they are looking at data rather than at writing.

The shell is capped at `max-w-4xl`, and the unlisted rooms narrow to `max-w-2xl`
with `leading-7`: they are mostly prose, and a comfortable measure matters more
than filling the viewport.

---

Next: [Motion](motion.md) · [Components](components.md) · [Back to the index](../README.md#documentation)
