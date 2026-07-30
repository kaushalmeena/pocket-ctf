import { lfsrKeystream } from "../../../scripts/lib/encoding.mjs";

/**
 * The polynomial is given, so only the 16-bit seed is unknown -- 65,535 of them,
 * and the flag prefix tells you immediately when you have the right one.
 */
export function solve({ payload }) {
  const ct = Buffer.from(payload.ciphertextHex, "hex");
  const taps = Number(payload.taps);
  const crib = Buffer.from("pctf{", "utf8");

  for (let state = 1; state < 1 << payload.width; state++) {
    const ks = lfsrKeystream(state, taps, payload.width, crib.length);
    let matches = true;
    for (let i = 0; i < crib.length; i++) {
      if ((ct[i] ^ ks[i]) !== crib[i]) {
        matches = false;
        break;
      }
    }
    if (!matches) continue;

    const full = lfsrKeystream(state, taps, payload.width, ct.length);
    return Buffer.from(ct.map((b, i) => b ^ full[i])).toString("utf8");
  }
  throw new Error("no seed reproduced the crib");
}
