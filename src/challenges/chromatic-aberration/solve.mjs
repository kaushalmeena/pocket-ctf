import { inflateSync } from "node:zlib";
import { fromBits } from "../../../scripts/lib/encoding.mjs";

/** Re-inflate the IDAT and walk the scanlines (filter type 0 throughout). */
export function solve({ payload }) {
  const png = Buffer.from(payload.dataUri.split(",")[1], "base64");
  const idat = [];
  let off = 8;
  while (off < png.length) {
    const len = png.readUInt32BE(off);
    if (png.toString("ascii", off + 4, off + 8) === "IDAT") {
      idat.push(png.subarray(off + 8, off + 8 + len));
    }
    off += 12 + len;
  }
  const size = payload.size;
  const raw = inflateSync(Buffer.concat(idat));
  let bits = "";
  for (let y = 0; y < size; y++) {
    const row = 1 + y * (size * 3 + 1);
    for (let x = 0; x < size; x++) bits += raw[row + x * 3 + 2] & 1;
  }
  return fromBits(bits);
}
