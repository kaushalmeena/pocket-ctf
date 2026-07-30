export function solve({ payload }) {
  const rules = [
    ...payload.stylesheet.matchAll(/content:\s*"\\([0-9a-f]{4})";\s*order:\s*(\d+);/g),
  ];
  return rules
    .map((m) => ({ order: Number(m[2]), ch: String.fromCodePoint(Number.parseInt(m[1], 16)) }))
    .sort((a, b) => a.order - b.order)
    .map((r) => r.ch)
    .join("");
}
