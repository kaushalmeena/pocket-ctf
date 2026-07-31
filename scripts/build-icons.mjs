#!/usr/bin/env node
/**
 * The app mark, drawn once and emitted in every format the browser wants.
 *
 *   public/icon.svg              primary favicon, scales to any size
 *   public/favicon-{16,32}.png   fallback for browsers that ignore SVG icons
 *   public/apple-touch-icon.png  180px, iOS home screen
 *   public/icon-{192,512}.png    web app manifest
 *   public/site.webmanifest
 *
 * The geometry lives in `MARK` below as normalised 0..1 coordinates, and both
 * the SVG writer and the rasteriser read it from there. That is the whole point
 * of doing it this way: a hand-drawn SVG plus hand-exported PNGs drift the
 * moment anyone edits one of them, whereas these cannot disagree.
 *
 * Run `pnpm icons`. The output is brand, not secret, so it is committed.
 */

import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { slugs } from "./lib/discover.mjs";
import { encodeRaw, encodeRgba } from "./png-write.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "public");

/** Matches --color-accent-500 in src/app.css, as sRGB. */
const ACCENT = [16, 185, 129];
const INK = [255, 255, 255];

/**
 * A pennant on a pole, echoing the Lucide `flag` used as the site's wordmark.
 * Normalised coordinates: 0,0 top-left, 1,1 bottom-right.
 */
const MARK = {
  /** Corner radius of the background tile. */
  radius: 0.22,
  pole: { x: 0.3, y: 0.2, w: 0.075, h: 0.6 },
  /** Pennant, as a triangle hanging off the top of the pole. */
  pennant: [
    [0.375, 0.225],
    [0.76, 0.35],
    [0.375, 0.475],
  ],
};

/* ------------------------------------------------------------------ *
 * Geometry -> coverage
 * ------------------------------------------------------------------ */

/** Inside a rounded unit square? */
function inTile(x, y) {
  const r = MARK.radius;
  const cx = Math.min(Math.max(x, r), 1 - r);
  const cy = Math.min(Math.max(y, r), 1 - r);
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}

function inRect(x, y, { x: rx, y: ry, w, h }) {
  return x >= rx && x <= rx + w && y >= ry && y <= ry + h;
}

/** Barycentric sign test, so winding order doesn't matter. */
function inTriangle(px, py, [[ax, ay], [bx, by], [cx, cy]]) {
  const d = (by - cy) * (ax - cx) + (cx - bx) * (ay - cy);
  const a = ((by - cy) * (px - cx) + (cx - bx) * (py - cy)) / d;
  const b = ((cy - ay) * (px - cx) + (ax - cx) * (py - cy)) / d;
  return a >= 0 && b >= 0 && a + b <= 1;
}

const inMark = (x, y) => inRect(x, y, MARK.pole) || inTriangle(x, y, MARK.pennant);

/* ------------------------------------------------------------------ *
 * Rasteriser
 * ------------------------------------------------------------------ */

/** Supersampling factor per axis. 4x4 = 16 samples, plenty at 16px. */
const SS = 4;

/**
 * Render to RGBA. Coverage is averaged over sub-samples, which is what keeps
 * the rounded corners and the pennant's diagonal from looking like stairs.
 */
function render(size) {
  return encodeRgba(size, (px, py) => {
    let tile = 0;
    let ink = 0;
    for (let sy = 0; sy < SS; sy++) {
      for (let sx = 0; sx < SS; sx++) {
        const x = (px + (sx + 0.5) / SS) / size;
        const y = (py + (sy + 0.5) / SS) / size;
        if (inTile(x, y)) {
          tile++;
          if (inMark(x, y)) ink++;
        }
      }
    }
    const samples = SS * SS;
    if (tile === 0) return [0, 0, 0, 0];

    // Composite ink over accent, then apply the tile's own coverage as alpha.
    const inkRatio = ink / tile;
    const rgb = [0, 1, 2].map((i) =>
      Math.round(ACCENT[i] * (1 - inkRatio) + INK[i] * inkRatio),
    );
    return [rgb[0], rgb[1], rgb[2], Math.round((tile / samples) * 255)];
  });
}

/* ------------------------------------------------------------------ *
 * SVG
 * ------------------------------------------------------------------ */

const hex = ([r, g, b]) => `#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`;

function svg() {
  const s = 100;
  const p = MARK.pole;
  const points = MARK.pennant.map(([x, y]) => `${x * s},${y * s}`).join(" ");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${s} ${s}" role="img" aria-label="Pocket CTF">
  <title>Pocket CTF</title>
  <rect width="${s}" height="${s}" rx="${MARK.radius * s}" fill="${hex(ACCENT)}"/>
  <rect x="${p.x * s}" y="${p.y * s}" width="${p.w * s}" height="${p.h * s}" rx="${(p.w * s) / 2}" fill="${hex(INK)}"/>
  <polygon points="${points}" fill="${hex(INK)}"/>
</svg>
`;
}

/* ------------------------------------------------------------------ *
 * Emit
 * ------------------------------------------------------------------ */

/**
 * The social card. 1200x630 is what Open Graph consumers crop to.
 *
 * Deliberately just the mark on the dark page background: rasterising text
 * would need a font engine, and a wrong-looking wordmark is worse than none.
 * The card's job is to be recognisable in a link preview, which a large logo on
 * brand-coloured ground does.
 */
function renderOgCard() {
  const W = 1200;
  const H = 630;
  const BG = [9, 9, 11]; // zinc-950, matching the dark theme
  const SIZE = 320; // mark's edge length, centred
  const ox = (W - SIZE) / 2;
  const oy = (H - SIZE) / 2;

  const raw = Buffer.alloc(H * (W * 4 + 1));
  let o = 0;
  for (let y = 0; y < H; y++) {
    raw[o++] = 0; // filter: none
    for (let x = 0; x < W; x++) {
      let tile = 0;
      let ink = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const u = (x + (sx + 0.5) / SS - ox) / SIZE;
          const v = (y + (sy + 0.5) / SS - oy) / SIZE;
          if (u < 0 || u > 1 || v < 0 || v > 1) continue;
          if (!inTile(u, v)) continue;
          tile++;
          if (inMark(u, v)) ink++;
        }
      }
      const samples = SS * SS;
      if (tile === 0) {
        raw[o++] = BG[0];
        raw[o++] = BG[1];
        raw[o++] = BG[2];
        raw[o++] = 255;
        continue;
      }
      const inkRatio = ink / tile;
      const cover = tile / samples;
      for (let i = 0; i < 3; i++) {
        const mark = ACCENT[i] * (1 - inkRatio) + INK[i] * inkRatio;
        raw[o++] = Math.round(mark * cover + BG[i] * (1 - cover));
      }
      raw[o++] = 255;
    }
  }
  return { width: W, height: H, raw };
}

const PNGS = [
  ["favicon-16.png", 16],
  ["favicon-32.png", 32],
  ["apple-touch-icon.png", 180],
  ["icon-192.png", 192],
  ["icon-512.png", 512],
];

writeFileSync(join(OUT, "icon.svg"), svg());
for (const [name, size] of PNGS) writeFileSync(join(OUT, name), render(size));

const og = renderOgCard();
writeFileSync(join(OUT, "og.png"), encodeRaw(og.width, og.height, 6, og.raw));

writeFileSync(
  join(OUT, "site.webmanifest"),
  `${JSON.stringify(
    {
      name: "Pocket CTF",
      short_name: "Pocket CTF",
      description: `${slugs().length} offline capture-the-flag puzzles that run in your browser.`,
      start_url: "/",
      display: "standalone",
      background_color: "#09090b",
      theme_color: hex(ACCENT),
      icons: [
        { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
        { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
        { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      ],
    },
    null,
    2,
  )}\n`,
);

console.log(`✔ icon.svg, og.png, site.webmanifest and ${PNGS.length} icon PNGs -> public/`);
