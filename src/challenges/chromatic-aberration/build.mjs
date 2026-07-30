import { lcg, toBits } from "../../../scripts/lib/encoding.mjs";
import { encodeRgb } from "../../../scripts/png-write.mjs";

export const SIZE = 64;

/** Flag bits in the low bit of the blue channel, row-major, NUL-terminated. */
export function build({ flag }) {
  const bits = `${toBits(flag)}00000000`;
  const noise = lcg(0xc0ffee);
  const plane = new Uint8Array(SIZE * SIZE * 3);
  for (let i = 0; i < plane.length; i++) plane[i] = noise();
  for (let i = 0; i < bits.length; i++) {
    const idx = i * 3 + 2; // blue channel of pixel i
    plane[idx] = (plane[idx] & 0xfe) | Number(bits[i]);
  }
  const png = encodeRgb(SIZE, (x, y) => {
    const i = (y * SIZE + x) * 3;
    return [plane[i], plane[i + 1], plane[i + 2]];
  });
  return {
    size: SIZE,
    dataUri: `data:image/png;base64,${png.toString("base64")}`,
    bytes: png.length,
  };
}
