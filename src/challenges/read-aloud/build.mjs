/**
 * The flag, spelled out the way a radio operator would read it, as the
 * accessible description of the front page's "decorative" chart.
 *
 * Nothing about it is visible, and nothing in it looks like a flag to grep:
 * a screen reader reads it aloud, and the accessibility tree shows it to
 * anyone who opens that panel.
 */

export const SPOKEN = {
  a: "alfa",
  b: "bravo",
  c: "charlie",
  d: "delta",
  e: "echo",
  f: "foxtrot",
  g: "golf",
  h: "hotel",
  i: "india",
  j: "juliett",
  k: "kilo",
  l: "lima",
  m: "mike",
  n: "november",
  o: "oscar",
  p: "papa",
  q: "quebec",
  r: "romeo",
  s: "sierra",
  t: "tango",
  u: "uniform",
  v: "victor",
  w: "whiskey",
  x: "x-ray",
  y: "yankee",
  z: "zulu",
  0: "zero",
  1: "one",
  2: "two",
  3: "three",
  4: "four",
  5: "five",
  6: "six",
  7: "seven",
  8: "eight",
  9: "niner",
  _: "underscore",
  "{": "open brace",
  "}": "close brace",
};

export function build({ flag }) {
  return { spoken: [...flag].map((ch) => SPOKEN[ch]).join(", ") };
}
