import { innerOf } from "../../../scripts/lib/encoding.mjs";

/**
 * Long enough that every key column still holds enough English to be
 * recognisable. Per-column frequency analysis needs roughly thirty samples
 * before the letter distribution separates from noise, so this is sized against
 * the longest key a suffixed flag can produce -- and asserted below.
 */
const PLAINTEXT = `Every cipher that repeats eventually confesses. A key that is shorter than the message it protects does not hide one secret; it hides the same small secret over and over, and repetition is the loudest sound a ciphertext can make. Line the bytes up in columns the width of the key and each column becomes a single shift applied to ordinary English, which is not ordinary at all once you count the letters. The letter e will out itself. The space will out itself faster. Patience is the only tool required, and patience is cheap. Consider what a column actually is: every twenty-something byte of a long and perfectly normal paragraph, lifted out and stacked. Nothing about the underlying text has changed. The spaces still fall where spaces fall, the vowels still outnumber the consonants they sit between, and the whole apparatus of ordinary written language is still present, merely thinned. A single byte of key stands between that column and plain reading, and a single byte has only two hundred and fifty six possible values. You do not need to be clever about which one it is. You need only to try them all and notice which result stops looking like an accident.`;

export function build({ flag }) {
  const key = Buffer.from(innerOf(flag), "utf8");
  const pt = Buffer.from(PLAINTEXT, "utf8");
  const perColumn = Math.floor(pt.length / key.length);
  if (perColumn < 30) {
    throw new Error(
      `key of ${key.length} bytes leaves only ${perColumn} samples per column -- ` +
        "lengthen PLAINTEXT or frequency analysis becomes unreliable",
    );
  }
  const ct = Buffer.alloc(pt.length);
  for (let i = 0; i < pt.length; i++) ct[i] = pt[i] ^ key[i % key.length];
  return {
    ciphertextHex: ct.toString("hex"),
    keyLength: key.length,
    bytes: ct.length,
    perColumn,
  };
}
