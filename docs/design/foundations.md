# Foundations

The rules everything else follows: what the interface is for, how colour and
type are used, and how the theme is decided.

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

---

Next: [Motion](motion.md) · [Components](components.md) · [Back to the index](README.md)
