import { reverse, rot13, unb64, unbase32 } from "../../../scripts/lib/encoding.mjs";

export function solve({ payload }) {
  return reverse(unb64(rot13(unbase32(unb64(payload.blob)).toString("utf8"))));
}
