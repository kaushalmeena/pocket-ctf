/** Characters carried by each redirect. Small enough that no hop is a flag. */
export const PIECE = 3;

/**
 * The flag, cut into pieces, one per redirect in a chain.
 *
 * A browser follows redirects without showing them, so the pieces pass through
 * in plain sight of nobody. The chain has to stay under the twenty hops a
 * browser will follow before giving up, which is asserted here.
 */
export function build({ flag }) {
  const hops = [];
  for (let i = 0; i < flag.length; i += PIECE) hops.push(flag.slice(i, i + PIECE));
  if (hops.length > 18)
    throw new Error(`${hops.length} hops is more than a browser will follow`);
  return { hops };
}
