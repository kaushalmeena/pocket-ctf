import { lcg, toBits } from "../../../scripts/lib/encoding.mjs";

export const WIDTH = 640;
export const HEIGHT = 180;

/**
 * A polyline whose vertical coordinates carry the flag, one bit per point, in
 * the parity of each y value. The drawing is a real drawing -- it just also
 * happens to be a bitstream.
 */
export function build({ flag }) {
  const bits = `${toBits(flag)}00000000`;
  const noise = lcg(0x5caff01d);
  const points = bits.split("").map((bit, i) => {
    const x = Math.round((i / (bits.length - 1)) * (WIDTH - 20)) + 10;
    // Any y in range will do, so long as its parity is the bit.
    let y = 20 + (noise() % (HEIGHT - 40));
    if (y % 2 !== Number(bit)) y += 1;
    return `${x},${y}`;
  });
  return {
    path: `M ${points.join(" L ")}`,
    width: WIDTH,
    height: HEIGHT,
    pointCount: points.length,
  };
}
