import { innerOf, MORSE } from "../../../scripts/lib/encoding.mjs";

export const UNIT = 90;

/**
 * Morse, shipped as raw on/off durations rather than dots and dashes -- the
 * bundle holds a list of integers, so you decode it by ear or by arithmetic.
 */
export function build({ flag }) {
  const timeline = [];
  const push = (on, units) => timeline.push({ on, ms: units * UNIT });

  innerOf(flag)
    .split("_")
    .forEach((word, wi) => {
      if (wi > 0) push(false, 7);
      [...word].forEach((ch, ci) => {
        const code = MORSE[ch];
        if (!code) throw new Error(`no morse for "${ch}" -- keep flags a-z, 0-9 and _`);
        if (ci > 0) push(false, 3);
        [...code].forEach((sym, si) => {
          if (si > 0) push(false, 1);
          push(true, sym === "." ? 1 : 3);
        });
      });
    });
  return { timeline, unitMs: UNIT, toneHz: 620 };
}
