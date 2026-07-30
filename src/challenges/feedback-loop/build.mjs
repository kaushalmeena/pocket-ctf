import { lfsrKeystream } from "../../../scripts/lib/encoding.mjs";

/** A 16-bit Galois LFSR. The polynomial is published; the state is not. */
export const WIDTH = 16;
export const TAPS = 0xb400; // x^16 + x^14 + x^13 + x^11 + 1
const STATE = 0xace1;

export function build({ flag }) {
  const pt = Buffer.from(flag, "utf8");
  const keystream = lfsrKeystream(STATE, TAPS, WIDTH, pt.length);
  const ct = Buffer.alloc(pt.length);
  for (let i = 0; i < pt.length; i++) ct[i] = pt[i] ^ keystream[i];
  return {
    ciphertextHex: ct.toString("hex"),
    width: WIDTH,
    taps: `0x${TAPS.toString(16)}`,
    bytes: ct.length,
  };
}
