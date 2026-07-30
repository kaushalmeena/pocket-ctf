export const MOD = 127;

const isPrime = (n) => {
  if (n < 2) return false;
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
  return true;
};

/**
 * A squarefree composite whose prime factors are `127k + c` for each character
 * `c`, with `k` strictly increasing so ascending numeric order reproduces the
 * original character order.
 *
 * The modulus has to be odd: `128k + c` is even for every even `c`, so half the
 * alphabet -- 'p' among them -- would have no primes at all. 127 is prime and
 * larger than any character code used here, which makes `p mod 127` unambiguous
 * and, by Dirichlet, always solvable.
 */
export function build({ flag }) {
  let k = 0;
  let product = 1n;
  const factors = [];
  for (const ch of flag) {
    const c = ch.charCodeAt(0);
    if (c === 0 || c >= MOD) throw new Error(`"${ch}" (${c}) is outside 1..${MOD - 1}`);
    let p = 0;
    for (let candidate = k + 1; candidate < 100_000; candidate++) {
      if (isPrime(MOD * candidate + c)) {
        k = candidate;
        p = MOD * candidate + c;
        break;
      }
    }
    if (!p) throw new Error(`no prime found for "${ch}"`);
    factors.push(p);
    product *= BigInt(p);
  }
  return {
    n: product.toString(),
    factorCount: factors.length,
    modulus: MOD,
    largestFactor: factors[factors.length - 1],
  };
}
