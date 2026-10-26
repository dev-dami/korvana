import type Phaser from "phaser";

import { TILE } from "../config";
import { makeRng } from "../world/noise";
import { canvasTex, commit } from "./canvas";
import { Painter, bayer, lerpRGB, ramp, rgb, shadeRGB, tileNoise } from "./paint";
import type { RGB } from "./paint";

/**
 * World props: trees, shrubs, rocks, the walk-through ground cover and the flat
 * decals baked into chunks. Everything is lit from the upper left, sits on a
 * soft contact shadow and carries a dark, hue-matched outline so it reads
 * against any ground.
 */

const R = (...hex: string[]): RGB[] => hex.map(rgb);

function at<T>(arr: readonly T[], i: number): T {
  return arr[Math.max(0, Math.min(arr.length - 1, i))] as T;
}

// --- shared builders ----------------------------------------------------------

interface Blob {
  x: number;
  y: number;
  r: number;
}

/**
 * Paints a foliage mass made of overlapping round clusters. Each cluster is
 * shaded as its own little sphere and the whole mass darkens toward its
 * underside, which is what makes a canopy look like leaves rather than a disc.
 */
function foliage(
  p: Painter,
  blobs: Blob[],
  leaves: RGB[],
  seed: number,
  top: number,
  bottom: number,
  opts: { speckle?: number; sparkle?: RGB[] } = {},
): void {
  const owner = new Int16Array(p.w * p.h).fill(-1);
  blobs.forEach((b, i) => {
    const x0 = Math.floor(b.x - b.r);
    const x1 = Math.ceil(b.x + b.r);
    const y0 = Math.floor(b.y - b.r);
    const y1 = Math.ceil(b.y + b.r);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        if (!p.inside(x, y)) continue;
        // Ragged rims: leaves stick out of the sphere a little.
        const d = Math.hypot(x + 0.5 - b.x, y + 0.5 - b.y) / b.r;
        const jag = tileNoise(x * 3, y * 3, 256, 8, seed + i) * 0.28;
        if (d <= 0.86 + jag) owner[y * p.w + x] = i;
      }
    }
  });

  const span = Math.max(1, bottom - top);
  for (let y = 0; y < p.h; y++) {
    for (let x = 0; x < p.w; x++) {
      const i = owner[y * p.w + x] ?? -1;
      if (i < 0) continue;
      const b = blobs[i]!;
      const nx = (x + 0.5 - b.x) / b.r;
      const ny = (y + 0.5 - b.y) / b.r;
      const lit = -(nx * 0.55 + ny * 0.85);
      const fall = (y - top) / span;
      const n = tileNoise(x * 2, y * 2, 256, 6, seed + 99) - 0.5;
      // A cluster tucked behind the one in front of it sits in that one's shadow.
      const above = owner[Math.max(0, y - 2) * p.w + x] ?? -1;
      const tucked = above >= 0 && above !== i && (blobs[above]?.y ?? 0) < b.y ? 0.08 : 0;
      const v = 0.52 + lit * 0.34 - fall * 0.3 + n * 0.28 - tucked;
      p.px(x, y, ramp(leaves, v, x, y));
    }
  }

  // Leaf speckle: single bright leaves on the lit side, dark gaps in shade.
  const rng = makeRng(seed ^ 0x1eaf);
  const count = opts.speckle ?? Math.floor(blobs.length * 9);
  for (let k = 0; k < count; k++) {
    const b = blobs[Math.floor(rng() * blobs.length)]!;
    const a = rng() * Math.PI * 2;
    const r = Math.sqrt(rng()) * b.r * 0.8;
    const x = Math.floor(b.x + Math.cos(a) * r);
    const y = Math.floor(b.y + Math.sin(a) * r);
    if (owner[y * p.w + x] === undefined || (owner[y * p.w + x] ?? -1) < 0) continue;
    const litSide = Math.cos(a) < 0.2 && Math.sin(a) < 0.3;
    if (litSide) {
      p.px(x, y, at(leaves, leaves.length - 1));
      if (rng() > 0.5) p.px(x + 1, y, at(leaves, leaves.length - 2));
    } else {
      p.px(x, y, at(leaves, 0));
    }
  }
  if (opts.sparkle) {
    for (let k = 0; k < blobs.length * 2; k++) {
      const b = blobs[Math.floor(rng() * blobs.length)]!;
      const x = Math.floor(b.x + (rng() - 0.5) * b.r * 1.3);
      const y = Math.floor(b.y + (rng() - 0.5) * b.r * 1.3);
      if ((owner[y * p.w + x] ?? -1) < 0) continue;
      const c = at(opts.sparkle, Math.floor(rng() * opts.sparkle.length));
      p.px(x, y, c);
      p.px(x, y + 1, shadeRGB(c, -0.35));
    }
  }
}

/** A trunk with root flare, a lit left edge and bark marks. */
function trunk(
  p: Painter,
  cx: number,
  baseY: number,
  topY: number,
  width: number,
  bark: RGB[],
  seed: number,
  marks: RGB | null = null,
): void {
  const rng = makeRng(seed);
  for (let y = Math.floor(topY); y <= baseY; y++) {
    const t = (y - topY) / Math.max(1, baseY - topY);
    const flare = t > 0.78 ? (t - 0.78) * 14 : 0;
    const half = width / 2 + flare;
    for (let x = Math.floor(cx - half); x <= Math.ceil(cx + half); x++) {
      const u = (x + 0.5 - (cx - half)) / (half * 2);
      if (u < 0 || u > 1) continue;
      const v = 0.85 - u * 0.75 + (tileNoise(x * 4, y, 256, 4, seed) - 0.5) * 0.3;
      p.px(x, y, ramp(bark, v, x, y));
    }
  }
  // Bark: vertical grain, or the dark lenticels of a birch.
  for (let k = 0; k < width * 3; k++) {
    const x = Math.floor(cx - width / 2 + 1 + rng() * (width - 2));
    const y = Math.floor(topY + rng() * (baseY - topY - 2));
    if (marks) {
      p.rect(x - 1, y, 2 + Math.floor(rng() * 2), 1, marks);
    } else {
      p.px(x, y, at(bark, 0));
      p.px(x, y + 1, at(bark, 0));
    }
  }
}

function contactShadow(p: Painter, cx: number, cy: number, rx: number, ry: number, a = 0.38): void {
  p.softEllipse(cx, cy, rx, ry, 0x05080a, a);
}

/** Outline in a darkened version of the sprite's own colours. */
function hueOutline(p: Painter, a = 0.9): void {
  const marks: number[] = [];
  for (let y = 0; y < p.h; y++) {
    for (let x = 0; x < p.w; x++) {
      if (p.alpha(x, y) >= 0.6) continue;
      let src = -1;
      if (p.alpha(x + 1, y) >= 0.6) src = (y * p.w + x + 1);
      else if (p.alpha(x - 1, y) >= 0.6) src = (y * p.w + x - 1);
      else if (p.alpha(x, y + 1) >= 0.6) src = ((y + 1) * p.w + x);
      else if (p.alpha(x, y - 1) >= 0.6) src = ((y - 1) * p.w + x);
      if (src >= 0) marks.push(x, y, src);
    }
  }
  for (let i = 0; i < marks.length; i += 3) {
    const s = marks[i + 2] ?? 0;
    const c = p.get(s % p.w, Math.floor(s / p.w));
    p.px(marks[i] ?? 0, marks[i + 1] ?? 0, lerpRGB(shadeRGB(c, -0.72), 0x0a0c10, 0.3), a);
  }
}

/** Shadows are painted before the body, so outlining must skip them. */
function withBody(w: number, h: number, shadow: (p: Painter) => void, body: (p: Painter) => void): Painter {
  const out = new Painter(w, h);
  shadow(out);
  const b = new Painter(w, h);
  body(b);
  hueOutline(b);
  const s = b.data;
  for (let i = 0; i < s.length; i += 4) {
    const a = (s[i + 3] ?? 0) / 255;
    if (a === 0) continue;
    out.px((i / 4) % w, Math.floor(i / 4 / w), ((s[i] ?? 0) << 16) | ((s[i + 1] ?? 0) << 8) | (s[i + 2] ?? 0), a);
  }
  return out;
}

// --- palettes -------------------------------------------------------------------

const OAK_LEAVES = R("#173a1f", "#1f4c26", "#2a5f2d", "#367336", "#468741", "#5c9c4c");
const MAPLE_LEAVES = R("#5a1d14", "#7a2a17", "#9c3a1a", "#bd5420", "#d8762c", "#eaa043");
const BIRCH_LEAVES = R("#2f5a22", "#3e6f28", "#4f8530", "#659a38", "#80b046", "#a0c65a");
const WILLOW_LEAVES = R("#1d3d2c", "#264d36", "#305e40", "#3d704b", "#4f8456", "#679963");
const PINE_LEAVES = R("#0f2a1e", "#163626", "#1e4430", "#28543a", "#336546", "#447a55");
const BUSH_LEAVES = R("#1a3f1f", "#225025", "#2c622d", "#3a7637", "#4c8a43", "#62a052");
const DUNE_LEAVES = R("#5f6a34", "#727d3c", "#878f46", "#9ea352", "#b6b866");
const BARK = R("#2e2015", "#3e2c1c", "#4f3823", "#62462c", "#765637");
const BIRCH_BARK = R("#8f8a80", "#b4afa3", "#d2cdc0", "#e6e2d6", "#f4f1e8");
const DEAD_BARK = R("#2f2a26", "#3e3732", "#4f4740", "#615850", "#746a60");
const ROCK = R("#3d4046", "#4c5057", "#5c6068", "#6d727a", "#80858d", "#959aa1");
const ASH_ROCK = R("#232120", "#2e2b29", "#3a3634", "#47423f", "#55504c", "#655f5a");
const SAND_ROCK = R("#5a5048", "#6b6056", "#7d7165", "#908375", "#a49686", "#b8aa98");
const MOSS = R("#2f4f25", "#3d622c", "#4d7535", "#62893f");
const SNOW = R("#a8bbd0", "#c4d3e2", "#dde7f0", "#f2f7fb", "#ffffff");

// --- trees ------------------------------------------------------------------------

function canopyBlobs(rng: () => number, cx: number, cy: number, rx: number, ry: number, count: number, size: number): Blob[] {
  const blobs: Blob[] = [];
  // Back and low first, front and high last, so the top clusters overlap.
  for (let i = 0; i < count; i++) {
    const a = rng() * Math.PI * 2;
    const r = Math.sqrt(rng());
    blobs.push({
      x: cx + Math.cos(a) * rx * r,
      y: cy + Math.sin(a) * ry * r,
      r: size * (0.75 + rng() * 0.4),
    });
  }
  blobs.sort((a, b) => b.y - a.y);
  // A crown cluster so the silhouette always has a top.
  blobs.push({ x: cx - rx * 0.15, y: cy - ry * 0.55, r: size * 0.95 });
  return blobs;
}

function drawBroadleaf(w: number, h: number, seed: number, leaves: RGB[], bark: RGB[], kind: "oak" | "maple" | "birch"): Painter {
  const rng = makeRng(seed);
  const cx = w / 2;
  const canopyCy = h * 0.38;
  const birch = kind === "birch";
  return withBody(
    w,
    h,
    (p) => contactShadow(p, cx + 2, h - 5, w * 0.4, 6),
    (p) => {
      trunk(p, cx, h - 4, canopyCy + h * 0.1, birch ? 5 : w * 0.13, bark, seed + 1, birch ? rgb("#2a2622") : null);
      // A low branch or two showing between the trunk and the canopy.
      p.thickLine(cx, h * 0.62, cx - w * 0.18, h * 0.5, 3, 1.5, at(bark, 1));
      p.thickLine(cx, h * 0.58, cx + w * 0.16, h * 0.48, 3, 1.5, at(bark, 0));
      const blobs = canopyBlobs(rng, cx, canopyCy, w * 0.3, h * 0.17, birch ? 11 : 9, w * (birch ? 0.15 : 0.19));
      foliage(p, blobs, leaves, seed + 5, canopyCy - h * 0.3, canopyCy + h * 0.24);
    },
  );
}

function drawWillow(w: number, h: number, seed: number): Painter {
  const rng = makeRng(seed);
  const cx = w / 2;
  const cy = h * 0.36;
  return withBody(
    w,
    h,
    (p) => contactShadow(p, cx + 2, h - 5, w * 0.42, 6),
    (p) => {
      trunk(p, cx, h - 4, cy, w * 0.14, BARK, seed + 1);
      const blobs = canopyBlobs(rng, cx, cy, w * 0.3, h * 0.12, 8, w * 0.18);
      foliage(p, blobs, WILLOW_LEAVES, seed + 5, cy - h * 0.25, cy + h * 0.4);
      // Hanging curtains of leaves, the willow's whole personality.
      for (let k = 0; k < w * 0.9; k++) {
        const x = Math.floor(cx - w * 0.42 + rng() * w * 0.84);
        const startY = Math.floor(cy + rng() * h * 0.1);
        const len = h * (0.18 + rng() * 0.3) * (1 - Math.abs(x - cx) / w);
        for (let y = 0; y < len; y++) {
          const t = y / len;
          const c = ramp(WILLOW_LEAVES, 0.6 - t * 0.45 + (x < cx ? 0.1 : -0.05), x, startY + y);
          if (y % 3 !== 2 || rng() > 0.3) p.px(x + (t > 0.7 && x % 2 === 0 ? 1 : 0), startY + y, c);
        }
      }
    },
  );
}

function drawPine(w: number, h: number, seed: number, snowy: boolean): Painter {
  const rng = makeRng(seed);
  const cx = w / 2;
  return withBody(
    w,
    h,
    (p) => contactShadow(p, cx + 2, h - 4, w * 0.38, 5),
    (p) => {
      trunk(p, cx, h - 3, h - 22, 6, BARK, seed + 1);
      const tiers = 5;
      const bottom = h - 14;
      const top = 3;
      for (let i = 0; i < tiers; i++) {
        const t = i / (tiers - 1);
        const tierBottom = bottom - (bottom - top) * t * 0.78;
        const tierTop = tierBottom - (bottom - top) * 0.36;
        const half = w * 0.47 * (1 - t * 0.68);
        for (let y = Math.floor(tierTop); y <= tierBottom; y++) {
          const k = (y - tierTop) / (tierBottom - tierTop);
          // Drooping, jagged bough tips along the bottom of each tier.
          const width = half * k;
          for (let x = Math.floor(cx - width); x <= Math.ceil(cx + width); x++) {
            const edge = Math.abs(x + 0.5 - cx) / Math.max(1, width);
            if (k > 0.82 && edge > 0.4 && ((x * 7 + i * 3) % 5 === 0 || bayer(x, y) > 0.75)) continue;
            const lit = (cx - x) / Math.max(1, half);
            const n = tileNoise(x * 3, y * 3, 256, 5, seed + i) - 0.5;
            const v = 0.5 + lit * 0.32 - k * 0.32 + n * 0.3 + (1 - t) * -0.05;
            p.px(x, y, ramp(PINE_LEAVES, v, x, y));
          }
        }
        // Snow on the upper surface of each tier.
        if (snowy) {
          for (let x = Math.floor(cx - half * 0.9); x <= Math.ceil(cx + half * 0.6); x++) {
            const edge = Math.abs(x + 0.5 - cx) / half;
            const y = Math.floor(tierTop + (tierBottom - tierTop) * edge * 0.95);
            const depth = 1 + (rng() > 0.5 ? 1 : 0) + (x < cx ? 1 : 0);
            for (let d = 0; d < depth; d++) p.px(x, y + d, at(SNOW, 4 - d - (x > cx ? 1 : 0)));
          }
        }
      }
    },
  );
}

function drawDeadTree(w: number, h: number, seed: number): Painter {
  const rng = makeRng(seed);
  const cx = w / 2;
  return withBody(
    w,
    h,
    (p) => contactShadow(p, cx + 2, h - 4, w * 0.3, 4),
    (p) => {
      const trunkTop = h * 0.3;
      trunk(p, cx, h - 3, trunkTop, w * 0.16, DEAD_BARK, seed + 1);
      const limbs = 5;
      for (let i = 0; i < limbs; i++) {
        const t = i / (limbs - 1);
        const y = trunkTop + (h - trunkTop) * 0.4 * t;
        const side = i % 2 === 0 ? -1 : 1;
        const reach = w * (0.28 + rng() * 0.18) * (1 - t * 0.25);
        const lift = h * (0.1 + rng() * 0.1);
        const mx = cx + side * reach * 0.55;
        const my = y - lift * 0.5;
        p.thickLine(cx, y, mx, my, 3.5 - t, 2, at(DEAD_BARK, side < 0 ? 3 : 1));
        p.thickLine(mx, my, cx + side * reach, y - lift, 2, 1, at(DEAD_BARK, side < 0 ? 3 : 1));
        p.line(mx, my, mx + side * reach * 0.2, my - lift * 0.6, at(DEAD_BARK, 2));
      }
      p.thickLine(cx, trunkTop + 2, cx + 2, trunkTop - h * 0.18, 3, 1, at(DEAD_BARK, 2));
    },
  );
}

// --- shrubs -------------------------------------------------------------------------

function drawBush(w: number, h: number, seed: number, leaves: RGB[], sparkle?: RGB[]): Painter {
  const rng = makeRng(seed);
  return withBody(
    w,
    h,
    (p) => contactShadow(p, w / 2 + 1, h - 4, w * 0.44, 4),
    (p) => {
      const blobs: Blob[] = [];
      const n = Math.max(4, Math.round(w / 6));
      for (let i = 0; i < n; i++) {
        blobs.push({
          x: w * 0.22 + (w * 0.56 * i) / (n - 1) + (rng() - 0.5) * 3,
          y: h - h * 0.38 - rng() * h * 0.12,
          r: w * (0.17 + rng() * 0.06),
        });
      }
      blobs.push({ x: w * 0.45, y: h * 0.4, r: w * 0.22 });
      blobs.sort((a, b) => b.y - a.y);
      foliage(p, blobs, leaves, seed, h * 0.2, h - 3, sparkle ? { sparkle } : {});
    },
  );
}

function drawDeadBush(w: number, h: number, seed: number): Painter {
  const rng = makeRng(seed);
  return withBody(
    w,
    h,
    (p) => contactShadow(p, w / 2, h - 3, w * 0.36, 3),
    (p) => {
      for (let i = 0; i < 9; i++) {
        const a = -Math.PI / 2 + (rng() - 0.5) * 2.2;
        const len = h * (0.5 + rng() * 0.4);
        const x1 = w / 2 + Math.cos(a) * len;
        const y1 = h - 3 + Math.sin(a) * len;
        p.line(w / 2, h - 3, x1, y1, at(DEAD_BARK, 1 + (i % 3)));
        p.line(x1, y1, x1 + (rng() - 0.5) * 5, y1 - 2 - rng() * 3, at(DEAD_BARK, 2));
      }
    },
  );
}

// --- rocks --------------------------------------------------------------------------

/**
 * A boulder shaded from a height field, so it reads as one lumpy volume with
 * a lit crown and a dark underside rather than three flat polygons.
 */
function drawBoulder(
  w: number,
  h: number,
  seed: number,
  palette: RGB[],
  cap: "moss" | "snow" | null,
): Painter {
  const rng = makeRng(seed);
  const cx = w / 2;
  const cy = h * 0.58;
  const rx = w * 0.42;
  const ry = h * 0.42;
  const lobes = Array.from({ length: 7 }, () => 0.82 + rng() * 0.22);
  return withBody(
    w,
    h,
    (p) => contactShadow(p, cx + 2, h - 4, rx * 1.1, 4.5, 0.45),
    (p) => {
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const dx = (x + 0.5 - cx) / rx;
          const dy = (y + 0.5 - cy) / ry;
          const ang = (Math.atan2(dy, dx) / (Math.PI * 2) + 1) * lobes.length;
          const i0 = Math.floor(ang) % lobes.length;
          const f = ang - Math.floor(ang);
          const lobe = (lobes[i0] ?? 1) * (1 - f) + (lobes[(i0 + 1) % lobes.length] ?? 1) * f;
          const d = Math.hypot(dx, dy) / lobe;
          // Flat bottom where it sits in the ground.
          if (d > 1 || y > h - 4) continue;
          const z = Math.sqrt(Math.max(0, 1 - d * d));
          const nx = dx / lobe;
          const ny = dy / lobe;
          const facet = tileNoise(x * 2, y * 2, 256, 7, seed) - 0.5;
          const lit = -nx * 0.5 - ny * 0.7 + z * 0.45;
          const v = 0.3 + lit * 0.45 + facet * 0.35;
          p.px(x, y, ramp(palette, v, x, y));
          if (cap === "moss" && ny < -0.25 && facet > -0.12) p.px(x, y, ramp(MOSS, 0.4 + lit * 0.4, x, y));
          if (cap === "snow" && ny < -0.15 + facet * 0.4) p.px(x, y, ramp(SNOW, 0.55 + lit * 0.5, x, y));
        }
      }
      // A crack or two.
      for (let k = 0; k < 2; k++) {
        let x = cx + (rng() - 0.5) * rx;
        let y = cy - ry * 0.3 + rng() * ry * 0.6;
        for (let s = 0; s < 6; s++) {
          if (p.alpha(x, y) > 0) {
            p.px(x, y, at(palette, 0));
            p.px(x + 1, y, at(palette, palette.length - 2), 0.5);
          }
          x += rng() - 0.3;
          y += 1;
        }
      }
    },
  );
}

function drawStandingStone(seed: number): Painter {
  const w = 26;
  const h = 52;
  const rng = makeRng(seed);
  return withBody(
    w,
    h,
    (p) => contactShadow(p, w / 2 + 2, h - 4, 11, 4, 0.45),
    (p) => {
      for (let y = 2; y < h - 3; y++) {
        const t = (y - 2) / (h - 5);
        const half = 6 + t * 4 + Math.sin(y * 0.4) * 0.6;
        const lean = (1 - t) * 1.5;
        for (let x = Math.floor(w / 2 - half + lean); x <= Math.ceil(w / 2 + half + lean); x++) {
          const u = (x - (w / 2 - half + lean)) / (half * 2);
          const facet = tileNoise(x * 2, y * 2, 256, 6, seed) - 0.5;
          const top = y < 6 ? 0.25 : 0;
          p.px(x, y, ramp(ROCK, 0.75 - u * 0.6 + facet * 0.3 + top, x, y));
        }
      }
      // A worn spiral carved into the face, older than the Academy.
      const gx = w / 2;
      const gy = h * 0.45;
      for (let a = 0; a < Math.PI * 4; a += 0.25) {
        const r = 0.5 + a * 0.55;
        p.px(gx + Math.cos(a) * r, gy + Math.sin(a) * r, at(ROCK, 0), 0.7);
      }
      for (let k = 0; k < 14; k++) p.px(w / 2 - 6 + rng() * 8, h - 18 + rng() * 14, at(MOSS, 1 + (k % 3)));
    },
  );
}

function drawRuinPillar(seed: number): Painter {
  const w = 28;
  const h = 56;
  const rng = makeRng(seed);
  const stone = R("#5b5850", "#6d6a61", "#807c72", "#938f84", "#a7a397", "#bab6aa");
  return withBody(
    w,
    h,
    (p) => contactShadow(p, w / 2 + 2, h - 4, 13, 4, 0.45),
    (p) => {
      // Plinth.
      p.rect(3, h - 10, w - 6, 7, at(stone, 2));
      p.rect(3, h - 10, w - 6, 2, at(stone, 4));
      p.rect(3, h - 4, w - 6, 1, at(stone, 0));
      // Fluted shaft with a broken, jagged top.
      const left = 7;
      const right = w - 7;
      for (let x = left; x < right; x++) {
        const u = (x - left) / (right - left);
        const broken = 10 + Math.floor(Math.abs(Math.sin(x * 1.7 + seed)) * 7);
        for (let y = broken; y < h - 10; y++) {
          const flute = (x - left) % 4 === 0 ? -0.18 : 0;
          p.px(x, y, ramp(stone, 0.78 - u * 0.62 + flute + (tileNoise(x, y, 256, 5, seed) - 0.5) * 0.2, x, y));
        }
        p.px(x, broken, at(stone, 5));
      }
      // Ivy climbing the shadowed side.
      let x = right - 3;
      for (let y = h - 11; y > 18; y--) {
        x += rng() > 0.6 ? (rng() > 0.5 ? 1 : -1) : 0;
        p.px(x, y, at(MOSS, 1));
        if (rng() > 0.5) p.px(x + (rng() > 0.5 ? 1 : -1), y, at(MOSS, 3));
      }
    },
  );
}

function drawStump(seed: number): Painter {
  const w = 28;
  const h = 26;
  const rng = makeRng(seed);
  return withBody(
    w,
    h,
    (p) => contactShadow(p, w / 2 + 1, h - 4, 12, 4, 0.42),
    (p) => {
      trunk(p, w / 2, h - 4, 9, 14, BARK, seed);
      // Cut face with growth rings.
      p.ellipse(w / 2, 9, 8, 4, rgb("#a2805a"));
      p.ellipse(w / 2, 9, 5.5, 2.6, rgb("#8c6b47"), 0.9);
      p.ellipse(w / 2, 9, 3, 1.4, rgb("#b08d64"));
      p.px(w / 2, 9, rgb("#6e5236"));
      // Shelf fungus.
      if (rng() > 0.3) {
        p.ellipse(w / 2 + 6, h - 11, 3, 1.5, rgb("#d9b77a"));
        p.px(w / 2 + 5, h - 12, rgb("#f0d9a6"));
      }
    },
  );
}

function drawLog(seed: number): Painter {
  const w = 40;
  const h = 22;
  const rng = makeRng(seed);
  return withBody(
    w,
    h,
    (p) => contactShadow(p, w / 2 + 1, h - 4, 18, 4, 0.42),
    (p) => {
      for (let x = 5; x < w - 6; x++) {
        for (let y = 6; y < h - 4; y++) {
          const v = 0.85 - ((y - 6) / (h - 10)) * 0.8 + (tileNoise(x, y * 3, 256, 6, seed) - 0.5) * 0.3;
          p.px(x, y, ramp(BARK, v, x, y));
        }
      }
      for (let k = 0; k < 10; k++) p.rect(6 + Math.floor(rng() * (w - 14)), 8 + Math.floor(rng() * 6), 3, 1, at(BARK, 0));
      // Sawn end.
      p.ellipse(w - 6, h / 2 + 1, 4, 6, rgb("#9d7b55"));
      p.ellipse(w - 6, h / 2 + 1, 2.4, 3.6, rgb("#86663f"));
      p.px(w - 6, h / 2 + 1, rgb("#b8956a"));
      // Moss along the top and a tiny mushroom.
      for (let x = 7; x < w - 10; x++) if (rng() > 0.45) p.px(x, 6 + (rng() > 0.7 ? 1 : 0), at(MOSS, 2 + (x % 2)));
      p.rect(12, 3, 1, 3, rgb("#e8dfcc"));
      p.ellipse(12.5, 3, 2.5, 1.5, rgb("#c0452e"));
      p.px(11, 2, rgb("#f4e7d0"));
    },
  );
}

// --- ground cover (walk-through sprites) --------------------------------------------

function drawTuft(w: number, h: number, seed: number, blades: RGB[], count: number, flowers?: RGB[]): Painter {
  const rng = makeRng(seed);
  return withBody(
    w,
    h,
    (p) => contactShadow(p, w / 2, h - 2, w * 0.38, 2.2, 0.3),
    (p) => {
      for (let i = 0; i < count; i++) {
        const bx = w / 2 + (rng() - 0.5) * w * 0.55;
        const len = h * (0.45 + rng() * 0.5);
        const bend = (rng() - 0.5) * w * 0.5;
        const steps = Math.ceil(len);
        for (let s = 0; s < steps; s++) {
          const t = s / steps;
          const x = bx + bend * t * t;
          const y = h - 2 - s;
          const v = 0.15 + t * 0.75 + (bx < w / 2 ? 0.1 : -0.05);
          p.px(x, y, ramp(blades, v, Math.floor(x), y));
        }
        if (flowers && i % 3 === 0) {
          const x = bx + bend;
          const y = h - 2 - steps;
          const c = at(flowers, Math.floor(rng() * flowers.length));
          p.px(x, y, c);
          p.px(x - 1, y, shadeRGB(c, -0.2));
          p.px(x, y - 1, shadeRGB(c, 0.3));
        }
      }
    },
  );
}

function drawFern(w: number, h: number, seed: number): Painter {
  const rng = makeRng(seed);
  const greens = R("#1c3b1c", "#25502a", "#326835", "#428041", "#56974e");
  return withBody(
    w,
    h,
    (p) => contactShadow(p, w / 2, h - 2, w * 0.42, 2.5, 0.32),
    (p) => {
      const fronds = 6;
      for (let f = 0; f < fronds; f++) {
        const a = Math.PI + (f / (fronds - 1)) * Math.PI + (rng() - 0.5) * 0.3;
        const len = h * (0.75 + rng() * 0.35);
        let x = w / 2;
        let y = h - 3;
        for (let s = 0; s < len; s++) {
          const t = s / len;
          const ang = a + t * (a < Math.PI * 1.5 ? -0.6 : 0.6) * 0.5;
          x += Math.cos(ang) * 0.9;
          y += Math.sin(ang) * 0.75 + t * 0.55;
          const lit = Math.cos(ang) < 0 ? 0.15 : -0.05;
          p.px(x, y, ramp(greens, 0.35 + t * 0.3 + lit, Math.floor(x), Math.floor(y)));
          if (s % 2 === 0 && t < 0.9) {
            // Leaflets either side of the rachis.
            const nx = -Math.sin(ang);
            const ny = Math.cos(ang);
            const leaf = 2.4 * (1 - t);
            for (let k = 1; k <= leaf; k++) {
              p.px(x + nx * k, y + ny * k, ramp(greens, 0.55 + lit - k * 0.06, s, k));
              p.px(x - nx * k, y - ny * k, ramp(greens, 0.7 + lit - k * 0.06, s, k + 1));
            }
          }
        }
      }
    },
  );
}

function drawMushrooms(seed: number): Painter {
  const w = 16;
  const h = 14;
  const rng = makeRng(seed);
  return withBody(
    w,
    h,
    (p) => contactShadow(p, w / 2, h - 2, 6, 2, 0.3),
    (p) => {
      const caps = [
        [5, 9, 3.5],
        [10, 8, 2.8],
        [8, 11, 2.2],
      ] as const;
      for (const [x, y, r] of caps) {
        p.rect(x - 0.5, y, 2, h - 2 - y, rgb("#e6dccb"));
        p.px(x + 0.5, y + 1, rgb("#c4b8a3"));
        p.ellipse(x + 0.5, y, r, r * 0.65, rgb("#b23a26"));
        p.ellipse(x - 0.3, y - 0.6, r * 0.6, r * 0.3, rgb("#d9573a"));
        p.px(x - 1, y - 1, rgb("#f4ead8"));
        if (rng() > 0.3) p.px(x + 1.5, y, rgb("#f4ead8"));
      }
    },
  );
}

function drawReeds(w: number, h: number, seed: number, cattails: boolean): Painter {
  const rng = makeRng(seed);
  const stalks = R("#3a4f2a", "#4d6532", "#62793b", "#7b8f48", "#98a85a");
  return withBody(
    w,
    h,
    (p) => contactShadow(p, w / 2, h - 2, w * 0.4, 2.4, 0.32),
    (p) => {
      for (let i = 0; i < 9; i++) {
        const bx = w / 2 + (rng() - 0.5) * w * 0.7;
        const len = h * (0.55 + rng() * 0.42);
        const bend = (rng() - 0.5) * 4;
        for (let s = 0; s < len; s++) {
          const t = s / len;
          p.px(bx + bend * t * t, h - 2 - s, ramp(stalks, 0.2 + t * 0.7 + (bx < w / 2 ? 0.1 : 0), s, i));
        }
        if (cattails && i % 3 === 0) {
          const x = bx + bend;
          const y = h - 2 - len;
          p.rect(x - 0.5, y + 1, 2, 5, rgb("#5a3a22"));
          p.px(x - 0.5, y + 1, rgb("#7a5232"));
          p.px(x, y, stalks[2] ?? 0);
        }
      }
    },
  );
}

function drawHeather(seed: number): Painter {
  const rng = makeRng(seed);
  const w = 20;
  const h = 14;
  const greens = R("#2e3f2a", "#3d5233", "#4d643b");
  const blooms = R("#6b3d73", "#8a4f91", "#a96bae", "#c993c7");
  return withBody(
    w,
    h,
    (p) => contactShadow(p, w / 2, h - 2, 8, 2.4, 0.3),
    (p) => {
      p.ellipse(w / 2, h - 5, 8, 4, at(greens, 1));
      p.ellipse(w / 2 - 1, h - 6, 6, 3, at(greens, 2));
      for (let k = 0; k < 26; k++) {
        const x = w / 2 + (rng() - 0.5) * 15;
        const y = h - 4 - rng() * 7;
        p.px(x, y, at(blooms, Math.floor(rng() * blooms.length) + (x < w / 2 ? 1 : 0)));
      }
    },
  );
}

// --- flat decals (baked into the chunk) ------------------------------------------------

function flowerHead(p: Painter, x: number, y: number, petal: RGB, centre: RGB): void {
  p.px(x, y + 2, rgb("#2b5a26"), 0.8);
  p.px(x + 1, y + 3, rgb("#2b5a26"), 0.6);
  p.px(x - 1, y, petal);
  p.px(x + 1, y, petal);
  p.px(x, y - 1, shadeRGB(petal, 0.25));
  p.px(x, y + 1, shadeRGB(petal, -0.25));
  p.px(x, y, centre);
}

function decalFlowers(seed: number, petals: RGB[], count: number): Painter {
  const p = new Painter(TILE, TILE);
  const rng = makeRng(seed);
  // Flowers grow in loose clumps, not evenly sprinkled.
  const cx = 8 + rng() * 16;
  const cy = 8 + rng() * 16;
  for (let i = 0; i < count; i++) {
    const x = Math.round(cx + (rng() - 0.5) * 18);
    const y = Math.round(cy + (rng() - 0.5) * 16);
    if (x < 2 || y < 2 || x > TILE - 3 || y > TILE - 4) continue;
    p.softEllipse(x + 0.5, y + 2, 2, 1, 0x0a1a08, 0.25);
    const petal = at(petals, Math.floor(rng() * petals.length));
    flowerHead(p, x, y, petal, petal === rgb("#f2d562") ? rgb("#b8862a") : rgb("#f2d562"));
  }
  return p;
}

function decalScatter(seed: number, paint: (p: Painter, rng: () => number) => void): Painter {
  const p = new Painter(TILE, TILE);
  paint(p, makeRng(seed));
  return p;
}

const DECAL_PAINTERS: Record<string, () => Painter> = {
  decal_flowers_rose: () => decalFlowers(41, R("#e05a7a", "#f07c96"), 6),
  decal_flowers_gold: () => decalFlowers(42, R("#f2d562", "#f7e48a"), 7),
  decal_flowers_violet: () => decalFlowers(43, R("#b98ce0", "#9d6fd0"), 6),
  decal_flowers_white: () => decalFlowers(44, R("#f4f1e4", "#e8e4d4"), 7),
  decal_flowers_mixed: () => decalFlowers(45, R("#f4f1e4", "#f2d562", "#e05a7a", "#7fb2f0"), 8),
  decal_clover: () =>
    decalScatter(46, (p, rng) => {
      for (let i = 0; i < 9; i++) {
        const x = 6 + rng() * 20;
        const y = 6 + rng() * 20;
        const c = rgb("#3f9150");
        p.px(x, y, c);
        p.px(x + 1, y, shadeRGB(c, 0.2));
        p.px(x, y + 1, shadeRGB(c, -0.15));
        p.px(x + 1, y + 1, shadeRGB(c, -0.3));
        if (i === 4) p.px(x, y - 1, rgb("#f4f1e4"));
      }
    }),
  decal_pebbles: () =>
    decalScatter(47, (p, rng) => {
      for (let i = 0; i < 6; i++) {
        const x = 4 + rng() * 24;
        const y = 4 + rng() * 24;
        const c = lerpRGB(rgb("#7d7f78"), rgb("#a9aaa2"), rng());
        p.softEllipse(x + 0.5, y + 1, 2.5, 1.4, 0x101408, 0.35);
        p.ellipse(x, y, 1.6 + rng(), 1.1 + rng() * 0.6, c);
        p.px(x - 0.5, y - 0.6, shadeRGB(c, 0.35));
      }
    }),
  decal_stones: () =>
    decalScatter(48, (p, rng) => {
      for (let i = 0; i < 4; i++) {
        const x = 5 + rng() * 22;
        const y = 5 + rng() * 22;
        const c = lerpRGB(rgb("#61666a"), rgb("#8b9094"), rng());
        p.softEllipse(x + 1, y + 1.5, 4, 2, 0x0a0c0e, 0.35);
        p.ellipse(x, y, 3 + rng() * 1.5, 2 + rng(), c);
        p.px(x - 1, y - 1, shadeRGB(c, 0.3));
        p.px(x + 1, y + 1, shadeRGB(c, -0.3));
      }
    }),
  decal_twigs: () =>
    decalScatter(49, (p, rng) => {
      for (let i = 0; i < 4; i++) {
        const x = 4 + rng() * 20;
        const y = 4 + rng() * 24;
        const a = rng() * Math.PI;
        const len = 5 + rng() * 6;
        p.line(x, y, x + Math.cos(a) * len, y + Math.sin(a) * len, rgb("#3e2b1a"));
        p.line(x + 1, y, x + 1 + Math.cos(a) * len * 0.6, y + Math.sin(a) * len * 0.6, rgb("#5e4428"), 0.7);
      }
    }),
  decal_leaves: () =>
    decalScatter(50, (p, rng) => {
      const cols = R("#8a5a24", "#a8692a", "#7a6a2a", "#b5832f", "#6b3f1d", "#9b3d1f");
      for (let i = 0; i < 12; i++) {
        const x = 2 + rng() * 28;
        const y = 2 + rng() * 28;
        const c = at(cols, Math.floor(rng() * cols.length));
        p.px(x, y, c);
        p.px(x + 1, y, shadeRGB(c, 0.15));
        p.px(x, y + 1, shadeRGB(c, -0.25));
        if (rng() > 0.5) p.px(x + 1, y - 1, shadeRGB(c, 0.25));
      }
    }),
  decal_moss: () =>
    decalScatter(51, (p, rng) => {
      const cx = 10 + rng() * 12;
      const cy = 10 + rng() * 12;
      for (let i = 0; i < 40; i++) {
        const a = rng() * Math.PI * 2;
        const r = Math.sqrt(rng()) * 8;
        p.px(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.7, at(MOSS, 1 + Math.floor(rng() * 3)), 0.85);
      }
    }),
  decal_mushroom_ring: () =>
    decalScatter(52, (p) => {
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        const x = 16 + Math.cos(a) * 9;
        const y = 16 + Math.sin(a) * 6;
        p.px(x, y + 1, rgb("#e6dccb"));
        p.px(x, y, rgb("#d9c7a2"));
        p.px(x + 1, y, rgb("#b89a6c"));
        p.px(x, y - 1, rgb("#f1e6cf"));
      }
    }),
  decal_puddle: () =>
    decalScatter(53, (p, rng) => {
      const cx = 10 + rng() * 12;
      const cy = 12 + rng() * 8;
      p.ellipse(cx, cy, 9, 5, rgb("#2a3d35"));
      p.ellipse(cx, cy + 0.5, 8, 4, rgb("#33505a"));
      p.ellipse(cx + 1, cy + 1, 6, 3, rgb("#2e4a52"));
      p.line(cx - 5, cy - 2, cx + 1, cy - 2, rgb("#8fb8bf"), 0.85);
      p.px(cx + 3, cy - 1, rgb("#b8d8dc"), 0.7);
    }),
  decal_lilies: () =>
    decalScatter(54, (p, rng) => {
      p.ellipse(16, 16, 11, 6, rgb("#2a3d35"));
      p.ellipse(16, 16.5, 10, 5, rgb("#33505a"));
      for (let i = 0; i < 3; i++) {
        const x = 10 + rng() * 12;
        const y = 13 + rng() * 6;
        p.ellipse(x, y, 2.5, 1.6, rgb("#4f8a3c"));
        p.px(x + 1, y, rgb("#2a3d35"));
        p.px(x - 1, y - 1, rgb("#6faa50"));
      }
      p.px(18, 14, rgb("#f4e6f0"));
      p.px(19, 14, rgb("#e6a8c8"));
      p.px(18, 13, rgb("#ffffff"));
    }),
  decal_shells: () =>
    decalScatter(55, (p, rng) => {
      for (let i = 0; i < 4; i++) {
        const x = 4 + rng() * 24;
        const y = 4 + rng() * 24;
        p.px(x, y, rgb("#f6ece2"));
        p.px(x + 1, y, rgb("#ecc6b8"));
        p.px(x, y + 1, rgb("#d29f90"));
        p.px(x + 1, y + 1, rgb("#b98476"));
      }
    }),
  decal_driftwood: () =>
    decalScatter(56, (p) => {
      p.softEllipse(16, 18, 11, 2.5, 0x101008, 0.3);
      p.thickLine(6, 17, 26, 14, 3, 2, rgb("#a39784"));
      p.line(7, 16, 25, 13, rgb("#c9bfad"));
      p.line(20, 15, 24, 19, rgb("#8f8371"));
    }),
  decal_snowdrift: () =>
    decalScatter(57, (p, rng) => {
      const cx = 10 + rng() * 12;
      const cy = 12 + rng() * 8;
      p.ellipse(cx, cy + 1, 10, 4, rgb("#b9c9da"), 0.7);
      p.ellipse(cx - 1, cy, 9, 3.4, rgb("#f4f8fc"));
      p.line(cx - 6, cy - 2, cx + 2, cy - 2, 0xffffff);
      p.px(cx + 4, cy - 1, 0xffffff);
    }),
  decal_bones: () =>
    decalScatter(58, (p) => {
      const bone = rgb("#c9c2b2");
      const dark = rgb("#8c8576");
      // A long bone half sunk in the ash, and a skull turned on its side.
      p.softEllipse(14, 19, 9, 2, 0x101010, 0.3);
      p.line(8, 18, 19, 16, bone);
      p.line(8, 19, 19, 17, dark);
      p.disc(7.5, 18, 1.4, bone);
      p.disc(19.5, 16, 1.4, bone);
      p.softEllipse(24, 22, 4, 1.5, 0x101010, 0.3);
      p.ellipse(24, 20, 3, 2.5, bone);
      p.px(23, 20, rgb("#2b2725"));
      p.px(25, 21, dark);
    }),
  decal_charred: () =>
    decalScatter(59, (p, rng) => {
      for (let i = 0; i < 60; i++) {
        const a = rng() * Math.PI * 2;
        const r = Math.sqrt(rng()) * 11;
        p.px(16 + Math.cos(a) * r, 16 + Math.sin(a) * r * 0.7, rgb("#26221f"), 0.45);
      }
      for (let i = 0; i < 3; i++) {
        const x = 9 + rng() * 12;
        const y = 12 + rng() * 8;
        p.line(x, y, x + 6, y + (rng() - 0.5) * 4, rgb("#1a1715"));
      }
    }),
  decal_embers: () =>
    decalScatter(60, (p, rng) => {
      for (let i = 0; i < 40; i++) {
        const a = rng() * Math.PI * 2;
        const r = Math.sqrt(rng()) * 9;
        p.px(16 + Math.cos(a) * r, 16 + Math.sin(a) * r * 0.7, rgb("#1f1b19"), 0.6);
      }
      for (let i = 0; i < 6; i++) {
        const x = 11 + rng() * 10;
        const y = 12 + rng() * 8;
        p.px(x, y, rgb("#d4561e"));
        if (rng() > 0.5) p.px(x + 1, y, rgb("#8a2f14"));
        if (i === 0) p.px(x, y - 1, rgb("#ffb347"));
      }
    }),
};

// --- registration ------------------------------------------------------------------------

function register(scene: Phaser.Scene, key: string, painter: Painter): void {
  const { tex, ctx } = canvasTex(scene, key, painter.w, painter.h);
  painter.put(ctx);
  commit({ tex, ctx });
}

/** Textures whose foliage sways in the wind, and how far (radians). */
export const SWAY: Record<string, number> = {
  cover_tallgrass_0: 0.12,
  cover_tallgrass_1: 0.12,
  cover_tallgrass_2: 0.1,
  cover_wildflowers: 0.1,
  cover_fern_0: 0.06,
  cover_fern_1: 0.06,
  cover_reeds_0: 0.09,
  cover_reeds_1: 0.09,
  cover_dunegrass: 0.1,
  cover_deadgrass: 0.06,
  cover_snowgrass: 0.06,
  cover_heather: 0.04,
  prop_fern_big: 0.05,
  prop_reeds_big: 0.07,
};

export function buildProps(scene: Phaser.Scene): void {
  const trees: Array<[string, () => Painter]> = [
    ["prop_oak", () => drawBroadleaf(64, 84, 11 * 991, OAK_LEAVES, BARK, "oak")],
    ["prop_oak_small", () => drawBroadleaf(48, 64, 12 * 991, OAK_LEAVES, BARK, "oak")],
    ["prop_maple", () => drawBroadleaf(64, 84, 15 * 991, MAPLE_LEAVES, BARK, "maple")],
    ["prop_maple_small", () => drawBroadleaf(48, 64, 16 * 991, MAPLE_LEAVES, BARK, "maple")],
    ["prop_birch", () => drawBroadleaf(52, 84, 17 * 991, BIRCH_LEAVES, BIRCH_BARK, "birch")],
    ["prop_birch_small", () => drawBroadleaf(40, 64, 18 * 991, BIRCH_LEAVES, BIRCH_BARK, "birch")],
    ["prop_willow", () => drawWillow(68, 80, 19 * 991)],
    ["prop_willow_small", () => drawWillow(52, 62, 20 * 991)],
    ["prop_pine", () => drawPine(48, 96, 13 * 991, false)],
    ["prop_pine_small", () => drawPine(40, 72, 14 * 991, false)],
    ["prop_pine_snow", () => drawPine(48, 96, 21 * 991, true)],
    ["prop_pine_snow_small", () => drawPine(40, 72, 22 * 991, true)],
    ["prop_deadtree", () => drawDeadTree(48, 78, 1717)],
    ["prop_deadtree_small", () => drawDeadTree(36, 56, 1719)],
  ];
  const shrubs: Array<[string, () => Painter]> = [
    ["prop_bush", () => drawBush(34, 28, 21 * 331, BUSH_LEAVES)],
    ["prop_bush_small", () => drawBush(24, 20, 22 * 331, BUSH_LEAVES)],
    ["prop_bush_berry", () => drawBush(34, 28, 23 * 331, BUSH_LEAVES, R("#c22a3a", "#e04a5a", "#8a1a2a"))],
    ["prop_bush_berry_small", () => drawBush(24, 20, 24 * 331, BUSH_LEAVES, R("#c22a3a", "#4a3aa0"))],
    ["prop_bush_flower", () => drawBush(34, 28, 25 * 331, BUSH_LEAVES, R("#f4f1e4", "#f0a8c8", "#f7e48a"))],
    ["prop_bush_flower_small", () => drawBush(24, 20, 26 * 331, BUSH_LEAVES, R("#f0a8c8", "#f4f1e4"))],
    ["prop_bush_dune", () => drawTuft(26, 22, 27 * 331, DUNE_LEAVES, 22)],
    ["prop_bush_dead", () => drawDeadBush(24, 22, 28 * 331)],
    ["prop_fern_big", () => drawFern(34, 24, 29 * 331)],
    ["prop_reeds_big", () => drawReeds(24, 34, 30 * 331, true)],
  ];
  const rocks: Array<[string, () => Painter]> = [
    ["prop_rock", () => drawBoulder(32, 28, 31 * 733, ROCK, null)],
    ["prop_rock_small", () => drawBoulder(22, 18, 32 * 733, ROCK, null)],
    ["prop_rock_mossy", () => drawBoulder(32, 28, 33 * 733, ROCK, "moss")],
    ["prop_rock_small_mossy", () => drawBoulder(22, 18, 34 * 733, ROCK, "moss")],
    ["prop_rock_snow", () => drawBoulder(32, 28, 35 * 733, ROCK, "snow")],
    ["prop_rock_small_snow", () => drawBoulder(22, 18, 36 * 733, ROCK, "snow")],
    ["prop_rock_ash", () => drawBoulder(32, 28, 37 * 733, ASH_ROCK, null)],
    ["prop_rock_small_ash", () => drawBoulder(22, 18, 38 * 733, ASH_ROCK, null)],
    ["prop_rock_sand", () => drawBoulder(32, 28, 39 * 733, SAND_ROCK, null)],
    ["prop_standing_stone", () => drawStandingStone(4001)],
    ["prop_ruin_pillar", () => drawRuinPillar(4002)],
    ["prop_stump", () => drawStump(4003)],
    ["prop_log", () => drawLog(4004)],
  ];
  const grass = R("#24481f", "#30602a", "#3f7a35", "#559444", "#73ad57");
  const meadowGrass = R("#2f5c26", "#3e7631", "#4f8c3c", "#68a44b", "#88bd61");
  const cover: Array<[string, () => Painter]> = [
    ["cover_tallgrass_0", () => drawTuft(16, 18, 501, meadowGrass, 12)],
    ["cover_tallgrass_1", () => drawTuft(18, 16, 502, grass, 14)],
    ["cover_tallgrass_2", () => drawTuft(14, 20, 503, grass, 10)],
    ["cover_wildflowers", () => drawTuft(18, 16, 504, meadowGrass, 12, R("#f4f1e4", "#f2d562", "#e9a4c0", "#b98ce0"))],
    ["cover_fern_0", () => drawFern(24, 16, 505)],
    ["cover_fern_1", () => drawFern(20, 14, 506)],
    ["cover_mushrooms", () => drawMushrooms(507)],
    ["cover_reeds_0", () => drawReeds(16, 26, 508, true)],
    ["cover_reeds_1", () => drawReeds(14, 22, 509, false)],
    ["cover_heather", () => drawHeather(510)],
    ["cover_dunegrass", () => drawTuft(16, 16, 511, DUNE_LEAVES, 10)],
    ["cover_deadgrass", () => drawTuft(14, 12, 512, R("#4a423a", "#5f554b", "#776b5e", "#8f8273"), 9)],
    ["cover_snowgrass", () => drawTuft(14, 12, 513, R("#5a6a58", "#7a8a76", "#a8b8b0", "#dde7f0"), 8)],
  ];

  for (const [key, paint] of [...trees, ...shrubs, ...rocks, ...cover]) register(scene, key, paint());
  for (const [key, paint] of Object.entries(DECAL_PAINTERS)) register(scene, key, paint());
}
