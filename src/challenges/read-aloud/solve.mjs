import { SPOKEN } from "./build.mjs";

const HEARD = Object.fromEntries(Object.entries(SPOKEN).map(([ch, word]) => [word, ch]));

export function solve({ payload }) {
  return payload.spoken
    .split(/,\s*/)
    .map((word) => HEARD[word])
    .join("");
}
