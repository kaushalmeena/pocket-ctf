/** Column-wise frequency attack. Uses no knowledge of the key. */
export function solve({ payload }) {
  const ct = Buffer.from(payload.ciphertextHex, "hex");
  const { keyLength } = payload;

  const score = (b) => {
    const c = String.fromCharCode(b).toLowerCase();
    if (c === " ") return 6;
    if ("etaoinshrdlu".includes(c)) return 3;
    if (/[a-z]/.test(c)) return 1;
    if (".,;'-".includes(c)) return 0;
    return -8; // control characters and punctuation soup
  };

  let recovered = "";
  for (let col = 0; col < keyLength; col++) {
    let best = 0;
    let bestScore = -Infinity;
    for (let guess = 32; guess < 127; guess++) {
      let total = 0;
      for (let i = col; i < ct.length; i += keyLength) total += score(ct[i] ^ guess);
      if (total > bestScore) {
        bestScore = total;
        best = guess;
      }
    }
    recovered += String.fromCharCode(best);
  }
  return `pctf{${recovered}}`;
}
