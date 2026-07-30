import { toBits } from "../../../scripts/lib/encoding.mjs";

const POEM = `The kettle hums a flat and patient note.
Outside, a bus lets someone off too soon.
I keep the window open for the draught
and read the same page nineteen times by noon.
Nothing is hidden here, the morning says,
holding its hands out, empty, palms turned up.
The radio agrees. The neighbours' dog
agrees. The rain has nothing to add either.
And still I count the pauses, not the words,
the way you'd count the gaps between two trains
and know from that alone which one is yours.`;

export const ZERO = "​";
export const ONE = "‌";

/** Zero-width steganography: U+200B is 0, U+200C is 1, both invisible. */
export function build({ flag }) {
  const bits = toBits(flag);
  const chars = [...POEM];
  if (chars.length < bits.length) throw new Error("poem too short to carry the flag");

  const stride = Math.floor(chars.length / bits.length);
  let out = "";
  let bit = 0;
  for (let i = 0; i < chars.length; i++) {
    out += chars[i];
    if (bit < bits.length && i % stride === 0 && chars[i] !== "\n") {
      out += bits[bit] === "1" ? ONE : ZERO;
      bit++;
    }
  }
  if (bit !== bits.length) throw new Error(`only embedded ${bit}/${bits.length} bits`);
  return { poem: out, carrierLength: chars.length };
}
