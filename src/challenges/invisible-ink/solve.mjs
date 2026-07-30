import { fromBits } from "../../../scripts/lib/encoding.mjs";
import { ONE, ZERO } from "./build.mjs";

export function solve({ payload }) {
  const bits = [...payload.poem]
    .filter((c) => c === ZERO || c === ONE)
    .map((c) => (c === ONE ? "1" : "0"))
    .join("");
  return fromBits(bits);
}
