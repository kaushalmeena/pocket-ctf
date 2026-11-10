import { deflateSync } from "node:zlib";

import type { Tier } from "~/challenges/types";

import { CHALLENGES, MAX_SCORE } from "./catalogue";
import { db } from "./db";

/**
 * A player's public face: a profile anyone can open, and the picture a link
 * to it unfurls as.
 *
 * Both say how much a player has found and nothing about what. Slots appear in
 * trophy-case order and by metal only, which is exactly what the case itself
 * shows a stranger.
 */

export type Profile = {
  handle: string;
  found: number;
  total: number;
  score: number;
  maxScore: number;
  rank: number;
  /** One entry per slot in the case: its metal, and whether it is held. */
  slots: { tier: Tier; held: boolean }[];
  platinum: boolean;
};

export async function profileOf(handle: string): Promise<Profile | null> {
  const client = await db();
  const who = await client.execute({
    sql: "SELECT id, handle FROM players WHERE handle = ?",
    args: [handle],
  });
  const row = who.rows[0];
  if (!row) return null;

  const solves = await client.execute({
    sql: "SELECT slug, points FROM solves WHERE player_id = ?",
    args: [String(row.id)],
  });
  const held = new Map(solves.rows.map((s) => [String(s.slug), Number(s.points)]));
  const slots = CHALLENGES.map((c) => ({ tier: c.tier, held: held.has(c.slug) }));
  const found = slots.filter((s) => s.held).length;
  const score = CHALLENGES.reduce((sum, c) => sum + (held.get(c.slug) ?? 0), 0);

  const ahead = await client.execute({
    sql: `SELECT COUNT(*) AS n FROM (
            SELECT SUM(points) AS score FROM solves GROUP BY player_id HAVING score > ?
          )`,
    args: [score],
  });

  return {
    handle: String(row.handle),
    found,
    total: CHALLENGES.length,
    score,
    maxScore: MAX_SCORE,
    rank: Number(ahead.rows[0]?.n ?? 0) + 1,
    slots,
    platinum: found === CHALLENGES.length,
  };
}

/* ------------------------------------------------------------------ *
 * Drawing
 * ------------------------------------------------------------------ */

/*
 * The card is drawn by hand: a pixel buffer, a five-by-seven bitmap font and a
 * PNG encoder small enough to read. A text-shaping library and a font file
 * would do it more prettily, and would be the only native dependency in the
 * project. Chunky pixels suit a site whose avatars are 64 pixels of noise.
 */

const WIDTH = 1200;
const HEIGHT = 630;

type Rgb = readonly [number, number, number];

const INK: Rgb = [250, 250, 250];
const MUTED: Rgb = [113, 113, 122];
const PAPER: Rgb = [9, 9, 11];
const RULE: Rgb = [39, 39, 42];
const ACCENT: Rgb = [52, 211, 153];
const METAL: Record<Tier | "platinum", Rgb> = {
  bronze: [205, 133, 80],
  silver: [196, 202, 214],
  gold: [240, 196, 60],
  platinum: [150, 214, 235],
};

const GLYPHS: Record<string, string> = {
  A: ".###.#...##...#######...##...##...#",
  B: "####.#...##...#####.#...##...#####.",
  C: ".###.#...##....#....#....#...#.###.",
  D: "####.#...##...##...##...##...#####.",
  E: "######....#....####.#....#....#####",
  F: "######....#....####.#....#....#....",
  G: ".###.#...##....#.####...##...#.###.",
  H: "#...##...##...#######...##...##...#",
  I: ".###...#....#....#....#....#...###.",
  J: "..###...#....#....#....#.#..#..##..",
  K: "#...##..#.#.#..##...#.#..#..#.#...#",
  L: "#....#....#....#....#....#....#####",
  M: "#...###.###.#.##.#.##...##...##...#",
  N: "#...###..##.#.##..###...##...##...#",
  O: ".###.#...##...##...##...##...#.###.",
  P: "####.#...##...#####.#....#....#....",
  Q: ".###.#...##...##...##.#.##..#..##.#",
  R: "####.#...##...#####.#.#..#..#.#...#",
  S: ".#####....#.....###.....#....#####.",
  T: "#####..#....#....#....#....#....#..",
  U: "#...##...##...##...##...##...#.###.",
  V: "#...##...##...##...#.#.#..#.#...#..",
  W: "#...##...##...##.#.##.#.###.###...#",
  X: "#...##...#.#.#...#...#.#.#...##...#",
  Y: "#...##...#.#.#...#....#....#....#..",
  Z: "#####....#...#...#...#...#....#####",
  "0": ".###.#...##..###.#.###..##...#.###.",
  "1": "..#...##....#....#....#....#...###.",
  "2": ".###.#...#....#...#...#...#...#####",
  "3": "####.....#....#.###.....#....#####.",
  "4": "...#...##..#.#.#..#.#####...#....#.",
  "5": "######....####.....#....##...#.###.",
  "6": ".###.#....#....####.#...##...#.###.",
  "7": "#####....#...#...#...#....#....#...",
  "8": ".###.#...##...#.###.#...##...#.###.",
  "9": ".###.#...##...#.####....#....#.###.",
  "-": "...............#####...............",
  _: "..............................#####",
  "/": "....#....#...#...#...#...#....#....",
  "#": ".#.#..#.#.#####.#.#.#####.#.#..#.#.",
  ".": ".........................##...##...",
  ":": "......##...##........##...##.......",
};

class Canvas {
  readonly pixels = new Uint8Array(WIDTH * HEIGHT * 3);

  constructor(fill: Rgb) {
    for (let i = 0; i < this.pixels.length; i += 3) this.pixels.set(fill, i);
  }

  /** Blend one pixel. `alpha` lets edges be soft without a second pass. */
  dot(x: number, y: number, [r, g, b]: Rgb, alpha = 1) {
    if (x < 0 || y < 0 || x >= WIDTH || y >= HEIGHT) return;
    const i = (y * WIDTH + x) * 3;
    this.pixels[i] = this.pixels[i]! * (1 - alpha) + r * alpha;
    this.pixels[i + 1] = this.pixels[i + 1]! * (1 - alpha) + g * alpha;
    this.pixels[i + 2] = this.pixels[i + 2]! * (1 - alpha) + b * alpha;
  }

  rect(x: number, y: number, w: number, h: number, color: Rgb) {
    for (let py = y; py < y + h; py++)
      for (let px = x; px < x + w; px++) this.dot(px, py, color);
  }

  /** A disc, or a ring when `inner` is given. Edges fade over one pixel. */
  disc(cx: number, cy: number, radius: number, color: Rgb, inner = 0) {
    for (let y = Math.floor(cy - radius - 1); y <= cy + radius + 1; y++) {
      for (let x = Math.floor(cx - radius - 1); x <= cx + radius + 1; x++) {
        const distance = Math.hypot(x - cx, y - cy);
        const outside = Math.min(1, Math.max(0, radius - distance + 0.5));
        const inside = inner > 0 ? Math.min(1, Math.max(0, distance - inner + 0.5)) : 1;
        if (outside * inside > 0) this.dot(x, y, color, outside * inside);
      }
    }
  }

  /** Bitmap text. Each font pixel becomes a `scale`-sized square. */
  text(x: number, y: number, value: string, scale: number, color: Rgb) {
    let cursor = x;
    for (const char of value.toUpperCase()) {
      const glyph = GLYPHS[char];
      if (glyph) {
        for (let i = 0; i < glyph.length; i++) {
          if (glyph[i] !== "#") continue;
          this.rect(
            cursor + (i % 5) * scale,
            y + Math.floor(i / 5) * scale,
            scale,
            scale,
            color,
          );
        }
      }
      cursor += 6 * scale;
    }
    return cursor;
  }
}

/** How wide a string is at a given scale, without the trailing gap. */
const widthOf = (value: string, scale: number) => (value.length * 6 - 1) * scale;

/* ------------------------------------------------------------------ *
 * PNG
 * ------------------------------------------------------------------ */

const CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(bytes: Buffer) {
  let c = 0xffffffff;
  for (const byte of bytes) c = CRC[(c ^ byte) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer) {
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const out = Buffer.alloc(body.length + 8);
  out.writeUInt32BE(data.length, 0);
  body.copy(out, 4);
  out.writeUInt32BE(crc32(body), body.length + 4);
  return out;
}

/** 8-bit RGB, no interlace, filter type 0 on every scanline. */
function encode(canvas: Canvas) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(WIDTH, 0);
  header.writeUInt32BE(HEIGHT, 4);
  header.set([8, 2, 0, 0, 0], 8);

  const stride = WIDTH * 3;
  const raw = Buffer.alloc((stride + 1) * HEIGHT);
  for (let y = 0; y < HEIGHT; y++) {
    raw.set(canvas.pixels.subarray(y * stride, (y + 1) * stride), y * (stride + 1) + 1);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* ------------------------------------------------------------------ *
 * The card
 * ------------------------------------------------------------------ */

const MARGIN = 80;

export function drawCard(profile: Profile): Buffer {
  const canvas = new Canvas(PAPER);

  // The same dot grid the site sits on.
  for (let y = 22; y < HEIGHT; y += 22) {
    for (let x = 22; x < WIDTH; x += 22) canvas.dot(x, y, RULE);
  }

  canvas.text(MARGIN, 64, "pocket/ctf", 4, ACCENT);
  const stamp = profile.platinum ? "platinum" : `rank #${profile.rank}`;
  canvas.text(
    WIDTH - MARGIN - widthOf(stamp, 4),
    64,
    stamp,
    4,
    profile.platinum ? METAL.platinum : MUTED,
  );

  // As large as the handle allows: twenty characters still have to fit.
  const scale = Math.min(
    11,
    Math.floor((WIDTH - MARGIN * 2) / (profile.handle.length * 6 - 1)),
  );
  canvas.text(MARGIN, 150, profile.handle, scale, INK);

  const after = canvas.text(MARGIN, 300, `${profile.found}/${profile.total}`, 8, INK);
  canvas.text(after + 16, 328, "flags", 4, MUTED);
  const score = String(profile.score);
  canvas.text(WIDTH - MARGIN - widthOf(score, 8), 300, score, 8, INK);
  canvas.text(
    WIDTH - MARGIN - widthOf(score, 8) - widthOf("points", 4) - 32,
    328,
    "points",
    4,
    MUTED,
  );

  // The case: one disc per slot, lit in its metal if held.
  const gap = (WIDTH - MARGIN * 2) / profile.slots.length;
  const radius = Math.min(26, gap / 2 - 6);
  profile.slots.forEach((slot, i) => {
    const cx = MARGIN + gap * i + gap / 2;
    if (slot.held) canvas.disc(cx, 450, radius, METAL[slot.tier]);
    else canvas.disc(cx, 450, radius, RULE, radius - 3);
  });

  canvas.rect(MARGIN, 530, WIDTH - MARGIN * 2, 2, RULE);
  canvas.text(MARGIN, 556, "the flags are hidden. so is everything else.", 3, MUTED);

  return encode(canvas);
}
