import { fromHex, SEALED, unseal } from "../../lib/kdf.js";

/** What the server does when the request is right. */
export function solve({ payload, slug, variant }) {
  const { salt, iv, ct } = payload.sealed;
  return unseal(SEALED.vault(slug, variant), fromHex(salt), ct, fromHex(iv));
}
