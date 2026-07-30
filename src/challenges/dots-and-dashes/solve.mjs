import { MORSE_REVERSE } from "../../../scripts/lib/encoding.mjs";

export function solve({ payload }) {
  let symbols = "";
  for (const step of payload.timeline) {
    const units = Math.round(step.ms / payload.unitMs);
    if (step.on) symbols += units === 1 ? "." : "-";
    else if (units === 3) symbols += " ";
    else if (units === 7) symbols += " / ";
  }
  const inner = symbols
    .split(" / ")
    .map((word) =>
      word
        .split(" ")
        .map((c) => MORSE_REVERSE[c])
        .join(""),
    )
    .join("_");
  return `pctf{${inner}}`;
}
