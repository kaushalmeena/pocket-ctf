import { shuffle } from "../../../scripts/lib/encoding.mjs";

/**
 * The flag exists only as loose characters in shuffled document order, each
 * carrying the index it belongs at. No substring anywhere spells it out.
 */
export function build({ flag }) {
  const shards = [...flag].map((v, k) => ({ k, v }));
  return { shards: shuffle(shards, 0x5eed) };
}
