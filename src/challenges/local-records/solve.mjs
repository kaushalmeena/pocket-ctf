export function solve({ payload }) {
  return [...payload.records]
    .sort((a, b) => a.seq - b.seq)
    .map((r) => Buffer.from(r.data, "base64").toString("utf8"))
    .join("");
}
