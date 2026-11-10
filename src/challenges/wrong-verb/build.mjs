import { SEALED } from "../../lib/kdf.js";

/**
 * Nothing to derive: the server hands this flag over once a request earns it.
 *
 * It still ships sealed rather than readable, so the generated data holds no
 * plaintext flag for any challenge -- the server opens it on demand.
 */
export async function build({ flag, seal, slug, variant }) {
  return { sealed: await seal(SEALED.vault(slug, variant), flag) };
}
