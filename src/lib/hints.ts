import registry from "./generated/registry.json";
import { unsealPublic } from "./progress";

/**
 * Hint text, decrypted on demand.
 *
 * Hints have to be readable before the challenge is solved, so their key cannot
 * depend on the flag -- it is derived from the slug and the index, both of which
 * are public. That makes this obfuscation rather than secrecy, and it is worth
 * saying so plainly: anyone willing to run the same derivation can read them.
 *
 * What it does buy is real, though. The text is no longer in the repository, so a
 * public clone stops being a spoiler sheet, and it is no longer sitting in the
 * bundle as readable JSON -- so taking a hint means clicking the button that
 * charges you points for it.
 *
 * Must match `hintSecret` in scripts/generate.mjs.
 */
const hintSecret = (slug: string, index: number) => `pocket-ctf/hint/${slug}/${index}`;

type Sealed = { salt: string; iv: string; ct: string };

function sealedHints(slug: string): Sealed[] {
  const entry = (registry.challenges as Record<string, { hints?: Sealed[] }>)[slug];
  return entry?.hints ?? [];
}

/** Decrypt one hint, or null if this deployment ships none at that index. */
export async function revealHintText(slug: string, index: number) {
  const sealed = sealedHints(slug)[index];
  if (!sealed) return null;
  return unsealPublic(hintSecret(slug, index), sealed);
}
