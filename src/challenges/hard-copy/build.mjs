import { shuffle } from "../../../scripts/lib/encoding.mjs";

/** The class a character's rule is written against. Distinct for i < 97. */
export const classFor = (i) => `hc-${(i * 37 + 11) % 97}`;

/**
 * A print stylesheet whose rules carry the flag one character at a time.
 *
 * Each character becomes a CSS escape in a `content` property, and its position
 * an `order` declaration on a flex item. The rules are shuffled, so reading
 * them top to bottom gives nothing -- but every page carries an empty row of
 * matching elements, so printing it (or print preview) lets the browser do the
 * sorting, and the flag simply appears on paper.
 */
export function build({ flag }) {
  const rules = [...flag].map((ch, i) => {
    const codePoint = `\\${ch.codePointAt(0).toString(16).padStart(4, "0")}`;
    return `.${classFor(i)}::after {\n  content: "${codePoint}";\n  order: ${i};\n}`;
  });
  // The empty elements each page carries for these rules to fill, in class
  // order -- which says nothing the stylesheet's own `order` does not.
  const slots = [...flag].map((_, i) => classFor(i)).sort();
  return { stylesheet: shuffle(rules, 0xcabba9e).join("\n\n"), slots };
}
