import { fromBits } from "../../../scripts/lib/encoding.mjs";

export function solve({ payload }) {
  const bits = payload.path
    .replace(/^M\s*/, "")
    .split(/\s*L\s*/)
    .map((pair) => Number(pair.split(",")[1]) % 2)
    .join("");
  return fromBits(bits);
}
