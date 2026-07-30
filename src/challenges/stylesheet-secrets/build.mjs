import { shuffle } from "../../../scripts/lib/encoding.mjs";

/**
 * A stylesheet whose rules carry the flag one character at a time.
 *
 * Each character becomes a CSS escape sequence in a `content` property, and its
 * position becomes an `order` declaration. The rules are shuffled, so reading
 * them top to bottom gives nothing: the flag exists only once you sort by the
 * property that CSS itself would have used to lay them out.
 */
export function build({ flag }) {
  const rules = [...flag].map((ch, i) => {
    const codePoint = `\\${ch.codePointAt(0).toString(16).padStart(4, "0")}`;
    return `.g-${(i * 37 + 11) % 97}::before {\n  content: "${codePoint}";\n  order: ${i};\n}`;
  });
  return { stylesheet: shuffle(rules, 0xcabba9e).join("\n\n"), ruleCount: rules.length };
}
