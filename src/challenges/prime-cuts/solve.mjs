export function solve({ payload }) {
  let n = BigInt(payload.n);
  const primes = [];
  for (let p = 2n; p * p <= n; p++) {
    while (n % p === 0n) {
      primes.push(p);
      n /= p;
    }
  }
  if (n > 1n) primes.push(n);
  primes.sort((a, b) => (a < b ? -1 : 1));
  const mod = BigInt(payload.modulus);
  return primes.map((p) => String.fromCharCode(Number(p % mod))).join("");
}
