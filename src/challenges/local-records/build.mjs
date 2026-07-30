import { shuffle } from "../../../scripts/lib/encoding.mjs";

export const DB_NAME = "pctf-archive";
export const STORE = "records";

/**
 * The flag, cut into byte-aligned pieces and shuffled.
 *
 * Three characters per chunk keeps each base64 group self-contained, so the
 * pieces can be decoded independently and only the ordering is in question.
 */
export function build({ flag }) {
  const chunks = [];
  for (let i = 0; i < flag.length; i += 3) {
    chunks.push({
      seq: chunks.length,
      data: Buffer.from(flag.slice(i, i + 3), "utf8").toString("base64"),
    });
  }
  return { records: shuffle(chunks, 0xd0cca), dbName: DB_NAME, store: STORE };
}
