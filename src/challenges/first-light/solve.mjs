export function solve({ payload }) {
  return [...payload.shards]
    .sort((a, b) => a.k - b.k)
    .map((s) => s.v)
    .join("");
}
