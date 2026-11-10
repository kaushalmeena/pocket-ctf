import { fromHex, SEALED, unseal } from "../lib/kdf.js";

/**
 * The builder and solver for challenges whose flag is not derived into a
 * puzzle at all: the server hands it over once a request earns it.
 *
 * It still ships sealed rather than readable, so the generated data holds no
 * plaintext flag for any challenge -- the server opens it on demand. Such a
 * challenge's `build.mjs` and `solve.mjs` re-export these.
 */
export async function build({ flag, seal, slug, variant }) {
  return { sealed: await seal(SEALED.vault(slug, variant), flag) };
}

/** What the server does when the request is right. */
export function solve({ payload, slug, variant }) {
  const { salt, iv, ct } = payload.sealed;
  return unseal(SEALED.vault(slug, variant), fromHex(salt), ct, fromHex(iv));
}
