import { b64, base32, reverse, rot13 } from "../../../scripts/lib/encoding.mjs";

/** Five encodings, stacked. Peel outside-in. */
export function build({ flag }) {
  return { blob: b64(base32(Buffer.from(rot13(b64(reverse(flag))), "utf8"))), layers: 5 };
}
