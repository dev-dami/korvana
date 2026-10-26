import type Phaser from "phaser";

import { TILE } from "../config";
import { makeRng } from "../world/noise";
import { canvasTex, commit } from "./canvas";
import { Painter, bayer, lerpRGB, ramp, rgb, shadeRGB, tileNoise } from "./paint";
import type { RGB } from "./paint";

/**
 * Structure art: the wall, floor, roof, door, torch and furniture textures
 * that structure templates in data/structures.ts refer to by key (`st_*`).
 * Walls are one tile wide but WALL_H tall - the extra height is the top of the
 * wall seen at an angle, which is what gives buildings their 2.5D read.
 */

export const WALL_H = TILE + 12;
/** Height of the wall's top surface; the face starts below it. */
const CAP = 10;

const R = (...hex: string[]): RGB[] => hex.map(rgb);

function at<T>(arr: readonly T[], i: number): T {
  return arr[Math.max(0, Math.min(arr.length - 1, i))] as T;
}

const STONE = R("#4a4c54", "#5b5e67", "#6c6f78", "#7e818a", "#91949c", "#a6a9b0");
const STONE_WARM = R("#4f4a45", "#605a53", "#726b62", "#857d72", "#988f83", "#aca395");
const WOOD = R("#3b2617", "#4c321e", "#5e3f26", "#71502f", "#85613a", "#9a7346");
const PLASTER = R("#a99d84", "#bcb096", "#cfc3a8", "#ddd2b8", "#e8dfc8");
const SLATE = R("#272a38", "#323646", "#3e4356", "#4b5167", "#5a6179");
const THATCH = R("#6a4f22", "#83652c", "#9c7b36", "#b49242", "#c9a853");
const IRON = R("#1d1f24", "#2a2d33", "#3a3e46", "#4f545e", "#6b717c");
const MOSS = R("#2f4a26", "#3d5f2e", "#4f7637");

// --- walls ------------------------------------------------------------------------------

/** The top of a wall seen from above: a slab with a lit front lip. */
function wallCap(p: Painter, top: RGB[], seed: number): void {
  for (let y = 0; y < CAP; y++) {
    for (let x = 0; x < TILE; x++) {
      const v = 0.55 + (tileNoise(x, y, TILE, 8, seed) - 0.5) * 0.4 - (y / CAP) * 0.15;
      p.px(x, y, ramp(top, v, x, y));
    }
  }
  // Coping joints every half tile.
  for (const x of [0, 16]) p.rect(x, 0, 1, CAP - 2, at(top, 0), 0.6);
  p.rect(0, 0, TILE, 1, at(top, top.length - 1), 0.7);
  p.rect(0, CAP - 2, TILE, 1, at(top, top.length - 1));
  p.rect(0, CAP - 1, TILE, 1, at(top, 0));
}

/** Contact shadow and grime where the wall meets the ground. */
function wallFoot(p: Painter, seed: number, moss: boolean): void {
  const rng = makeRng(seed);
  for (let y = WALL_H - 5; y < WALL_H; y++) {
    const k = (y - (WALL_H - 5)) / 5;
    for (let x = 0; x < TILE; x++) p.tone(x, y, -0.12 - k * 0.25);
  }
  if (moss) {
    for (let i = 0; i < 16; i++) {
      const x = Math.floor(rng() * TILE);
      const y = WALL_H - 1 - Math.floor(rng() * rng() * 9);
      p.px(x, y, at(MOSS, Math.floor(rng() * MOSS.length)));
    }
  }
}

function stoneWall(seed: number, palette: RGB[]): Painter {
  const p = new Painter(TILE, WALL_H);
  const rng = makeRng(seed);
  wallCap(p, palette, seed);

  // Ashlar courses, each block shaded on its own so the face has depth.
  const course = 8;
  let row = 0;
  for (let y0 = CAP; y0 < WALL_H; y0 += course) {
    const offset = row % 2 === 0 ? 0 : 8;
    for (let bx = -16 + offset; bx < TILE; bx += 16) {
      const tone = (rng() - 0.5) * 0.35;
      for (let y = y0; y < Math.min(WALL_H, y0 + course); y++) {
        for (let x = Math.max(0, bx); x < Math.min(TILE, bx + 16); x++) {
          const lx = x - bx;
          const ly = y - y0;
          let v = 0.48 + tone + (tileNoise(x, y, TILE, 4, seed + row) - 0.5) * 0.3;
          if (ly === 0 || lx === 0) v += 0.22;
          if (ly === course - 2 || lx === 14) v -= 0.18;
          p.px(x, y, ramp(palette, v, x, y));
        }
        // Vertical mortar joint at the block's right end.
        if (bx + 15 >= 0 && bx + 15 < TILE) p.px(bx + 15, y, at(palette, 0));
      }
    }
    p.rect(0, Math.min(WALL_H - 1, y0 + course - 1), TILE, 1, at(palette, 0));
    row++;
  }
  // Chips and stains.
  for (let i = 0; i < 10; i++) {
    const x = Math.floor(rng() * TILE);
    const y = CAP + Math.floor(rng() * (WALL_H - CAP));
    p.px(x, y, at(palette, rng() > 0.5 ? 0 : 5), 0.6);
  }
  wallFoot(p, seed, true);
  return p;
}

function woodWall(seed: number): Painter {
  const p = new Painter(TILE, WALL_H);
  const rng = makeRng(seed);
  wallCap(p, WOOD, seed);
  // Horizontal logs, round-shaded top to bottom, with end-grain at the joint.
  const log = 7;
  for (let y0 = CAP; y0 < WALL_H; y0 += log) {
    const tone = (rng() - 0.5) * 0.2;
    for (let y = y0; y < Math.min(WALL_H, y0 + log); y++) {
      const t = (y - y0) / log;
      for (let x = 0; x < TILE; x++) {
        const grain = (tileNoise(x * 0.5, y * 4, TILE, 8, seed + y0) - 0.5) * 0.25;
        const v = 0.75 - Math.abs(t - 0.3) * 0.9 + tone + grain;
        p.px(x, y, ramp(WOOD, v, x, y));
      }
    }
    p.rect(0, Math.min(WALL_H - 1, y0 + log - 1), TILE, 1, at(WOOD, 0));
    if (rng() > 0.5) {
      const kx = 4 + Math.floor(rng() * 24);
      p.px(kx, y0 + 3, at(WOOD, 0));
      p.px(kx + 1, y0 + 3, at(WOOD, 1));
    }
  }
  wallFoot(p, seed, false);
  return p;
}

function plasterWall(seed: number): Painter {
  const p = new Painter(TILE, WALL_H);
  wallCap(p, SLATE, seed);
  for (let y = CAP; y < WALL_H; y++) {
    for (let x = 0; x < TILE; x++) {
      const v = 0.6 + (tileNoise(x, y, TILE, 8, seed) - 0.5) * 0.35 - ((y - CAP) / (WALL_H - CAP)) * 0.2;
      p.px(x, y, ramp(PLASTER, v, x, y));
    }
  }
  // Half-timbering: posts at the joints, a rail, and a brace.
  const beam = (x0: number, y0: number, x1: number, y1: number) => {
    p.thickLine(x0, y0, x1, y1, 3, 3, at(WOOD, 2));
    p.line(x0 - 1, y0, x1 - 1, y1, at(WOOD, 4));
  };
  p.rect(0, CAP, 3, WALL_H - CAP, at(WOOD, 2));
  p.rect(0, CAP, 1, WALL_H - CAP, at(WOOD, 4));
  p.rect(2, CAP, 1, WALL_H - CAP, at(WOOD, 0));
  p.rect(0, CAP, TILE, 3, at(WOOD, 2));
  p.rect(0, CAP, TILE, 1, at(WOOD, 4));
  p.rect(0, CAP + 15, TILE, 3, at(WOOD, 2));
  p.rect(0, CAP + 15, TILE, 1, at(WOOD, 4));
  p.rect(0, CAP + 17, TILE, 1, at(WOOD, 0));
  beam(5, CAP + 15, 27, CAP + 3);
  // A small leaded window in the upper panel.
  p.rect(18, CAP + 5, 8, 7, at(WOOD, 1));
  p.rect(19, CAP + 6, 6, 5, rgb("#2b3a4f"));
  p.px(20, CAP + 7, rgb("#9fb8d0"));
  p.px(21, CAP + 7, rgb("#6f8aa8"));
  p.rect(22, CAP + 6, 1, 5, at(WOOD, 1));
  wallFoot(p, seed, false);
  return p;
}

// --- floors -------------------------------------------------------------------------------

function woodFloor(seed: number): Painter {
  const p = new Painter(TILE, TILE);
  const rng = makeRng(seed);
  const planks = R("#6e4c2c", "#80593a", "#936843", "#a6784d", "#b88a5a");
  for (let row = 0; row < 4; row++) {
    const y0 = row * 8;
    const seam = row % 2 === 0 ? 20 : 8;
    for (const [x0, x1] of [
      [0, seam],
      [seam, TILE],
    ] as const) {
      const tone = (rng() - 0.5) * 0.3;
      for (let y = y0; y < y0 + 8; y++) {
        for (let x = x0; x < x1; x++) {
          const grain = (tileNoise(x * 0.35, y * 3, TILE, 8, seed + row * 7 + x0) - 0.5) * 0.35;
          let v = 0.55 + tone + grain;
          if (y === y0) v += 0.15;
          if (y === y0 + 6) v -= 0.12;
          p.px(x, y, ramp(planks, v, x, y));
        }
      }
      p.rect(x0, y0 + 7, x1 - x0, 1, rgb("#3e2817"));
      if (x0 > 0) p.rect(x0, y0, 1, 7, rgb("#4a301c"));
      // Nail heads at the plank ends.
      p.px(x0 + 2, y0 + 2, rgb("#3a2a1e"));
      p.px(x0 + 2, y0 + 5, rgb("#3a2a1e"));
    }
  }
  return p;
}

function stoneFloor(seed: number): Painter {
  const p = new Painter(TILE, TILE);
  const rng = makeRng(seed);
  // Four flagstones per tile, each its own tone with a bevelled edge.
  for (const [x0, y0, w, h] of [
    [0, 0, 17, 15],
    [17, 0, 15, 15],
    [0, 15, 12, 17],
    [12, 15, 20, 17],
  ] as const) {
    const tone = (rng() - 0.5) * 0.3;
    for (let y = y0; y < y0 + h; y++) {
      for (let x = x0; x < x0 + w; x++) {
        let v = 0.5 + tone + (tileNoise(x, y, TILE, 8, seed) - 0.5) * 0.3;
        if (y === y0 || x === x0) v += 0.18;
        if (y === y0 + h - 1 || x === x0 + w - 1) v -= 0.3;
        p.px(x, y, ramp(STONE_WARM, v, x, y));
      }
    }
  }
  // Wear: a few scuffs and a crack.
  for (let i = 0; i < 8; i++) p.px(rng() * TILE, rng() * TILE, at(STONE_WARM, 1), 0.7);
  let x = rng() * TILE;
  let y = rng() * TILE;
  for (let i = 0; i < 6; i++) {
    p.px(x, y, at(STONE_WARM, 0));
    x += rng() > 0.5 ? 1 : 0;
    y += 1;
  }
  return p;
}

function carpetFloor(seed: number): Painter {
  const p = new Painter(TILE, TILE);
  const reds = R("#4a1820", "#5e2029", "#722833", "#87313d", "#9c3b47");
  const gold = rgb("#c8a24a");
  // An all-over lattice that tiles seamlessly, so rooms read as one rug.
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const weave = ((x + y) & 1) * 0.06 + (tileNoise(x, y, TILE, 4, seed) - 0.5) * 0.18;
      const dx = Math.abs(((x + 8) % 16) - 8);
      const dy = Math.abs(((y + 8) % 16) - 8);
      const lattice = dx + dy;
      let v = 0.45 + weave;
      if (lattice === 8) v -= 0.3;
      if (lattice < 3) v += 0.25;
      p.px(x, y, ramp(reds, v, x, y));
      if (lattice === 0) p.px(x, y, gold);
      if (lattice === 7 && (x + y) % 4 === 0) p.px(x, y, lerpRGB(gold, at(reds, 2), 0.4));
    }
  }
  return p;
}

function roof(seed: number, slate: boolean): Painter {
  const p = new Painter(TILE, TILE);
  const rng = makeRng(seed);
  const pal = slate ? SLATE : THATCH;
  for (let row = 0; row < 4; row++) {
    const y0 = row * 8;
    const off = row % 2 === 0 ? 0 : 4;
    for (let y = y0; y < y0 + 8; y++) {
      for (let x = 0; x < TILE; x++) {
        const t = (y - y0) / 8;
        let v = 0.65 - t * 0.45 + (tileNoise(x, y, TILE, slate ? 8 : 2, seed + row) - 0.5) * (slate ? 0.25 : 0.5);
        if (slate && (x + off) % 8 === 0) v -= 0.3;
        if (!slate && bayer(x, y) > 0.7) v += 0.12;
        p.px(x, y, ramp(pal, v, x, y));
      }
    }
    p.rect(0, y0 + 7, TILE, 1, at(pal, 0));
  }
  for (let i = 0; i < 10; i++) p.px(rng() * TILE, rng() * TILE, at(pal, pal.length - 1), 0.6);
  return p;
}

// --- door and torch ---------------------------------------------------------------------------

function door(seed: number): Painter {
  const p = new Painter(TILE, WALL_H);
  // Stone surround with an arched head.
  const frame = STONE;
  for (let y = 0; y < WALL_H; y++) {
    for (let x = 0; x < TILE; x++) {
      const v = 0.5 + (tileNoise(x, y, TILE, 4, seed) - 0.5) * 0.3 - (x / TILE) * 0.15;
      p.px(x, y, ramp(frame, v, x, y));
    }
  }
  const cx = TILE / 2;
  const archY = 12;
  const half = 10;
  // Opening, dark at the top where the arch casts its shadow.
  for (let y = archY - half + 2; y < WALL_H - 2; y++) {
    for (let x = cx - half; x < cx + half; x++) {
      const inArch = y >= archY || Math.hypot(x + 0.5 - cx, y + 0.5 - archY) <= half;
      if (!inArch) continue;
      const u = (x - (cx - half)) / (half * 2);
      const plank = Math.floor((x - (cx - half)) / 5);
      const grain = (tileNoise(x * 0.3, y * 2, TILE, 4, seed + plank) - 0.5) * 0.3;
      let v = 0.6 - u * 0.25 + grain - (y < archY + 4 ? 0.15 : 0);
      if ((x - (cx - half)) % 5 === 0) v -= 0.3;
      p.px(x, y, ramp(WOOD, v, x, y));
    }
  }
  // Arch voussoirs.
  for (let a = Math.PI; a <= Math.PI * 2; a += 0.05) {
    for (let r = half; r < half + 3; r++) {
      const x = cx + Math.cos(a) * r;
      const y = archY + Math.sin(a) * r;
      const k = Math.floor((a - Math.PI) / (Math.PI / 5));
      p.px(x, y, at(frame, r === half ? 0 : k % 2 === 0 ? 4 : 3));
    }
  }
  // Iron straps and a ring pull.
  for (const y of [archY + 2, WALL_H - 10]) {
    p.rect(cx - half, y, half * 2, 2, at(IRON, 2));
    p.rect(cx - half, y, half * 2, 1, at(IRON, 4));
    for (let x = cx - half + 2; x < cx + half; x += 5) p.px(x, y + 1, at(IRON, 4));
  }
  p.disc(cx + 5, WALL_H - 19, 2.2, at(IRON, 3));
  p.disc(cx + 5, WALL_H - 19, 1.2, at(WOOD, 2));
  p.px(cx + 4, WALL_H - 21, at(IRON, 4));
  // Worn threshold step.
  p.rect(cx - half - 1, WALL_H - 2, half * 2 + 2, 2, at(frame, 4));
  p.rect(cx - half - 1, WALL_H - 1, half * 2 + 2, 1, at(frame, 1));
  return p;
}

/**
 * A free-standing iron torch stand. The flame here is the cold, static part;
 * WorldFx lays an animated flicker and the light pool on top of it.
 */
function torch(seed: number): Painter {
  const p = new Painter(TILE, WALL_H);
  const rng = makeRng(seed);
  const cx = TILE / 2;
  p.softEllipse(cx + 1, WALL_H - 3, 9, 3, 0x05060a, 0.45);
  // Tripod feet and shaft.
  p.line(cx, WALL_H - 10, cx - 6, WALL_H - 2, at(IRON, 1));
  p.line(cx, WALL_H - 10, cx + 6, WALL_H - 2, at(IRON, 0));
  p.line(cx, WALL_H - 10, cx, WALL_H - 2, at(IRON, 2));
  p.rect(cx - 1, WALL_H - 28, 2, 19, at(IRON, 2));
  p.rect(cx - 1, WALL_H - 28, 1, 19, at(IRON, 4));
  // Bowl.
  p.ellipse(cx, WALL_H - 28, 6, 2.5, at(IRON, 1));
  p.ellipse(cx, WALL_H - 29, 5, 1.6, rgb("#3a1a0c"));
  p.rect(cx - 5, WALL_H - 28, 10, 2, at(IRON, 2));
  p.rect(cx - 5, WALL_H - 28, 10, 1, at(IRON, 4));
  // Flame: layered tongues, white-hot core.
  const flame = R("#a8321a", "#e0611f", "#f59a2e", "#ffd25a", "#fff4c0");
  const base = WALL_H - 30;
  for (let y = 0; y < 14; y++) {
    const t = y / 14;
    const half = (1 - t) * 4.5 * (0.8 + Math.sin(t * 9 + seed) * 0.2);
    for (let x = Math.floor(cx - half); x <= Math.ceil(cx + half); x++) {
      const u = Math.abs(x + 0.5 - cx) / Math.max(0.5, half);
      if (u > 1) continue;
      const v = 1 - u * 0.7 - t * 0.55 + (rng() - 0.5) * 0.15;
      p.px(x, base - y, ramp(flame, v, x, y));
    }
  }
  return p;
}

// --- furniture -----------------------------------------------------------------------------------

function propShadow(p: Painter): void {
  p.softEllipse(TILE / 2 + 1, TILE - 4, 12, 4, 0x05060a, 0.42);
}

function crate(seed: number): Painter {
  const p = new Painter(TILE, TILE);
  propShadow(p);
  const planks = R("#5a3b22", "#6e4a2b", "#835a35", "#986b40", "#ad7d4c");
  // Lid.
  for (let y = 5; y < 11; y++) for (let x = 5; x < 27; x++) p.px(x, y, ramp(planks, 0.75 + (tileNoise(x, y, TILE, 4, seed) - 0.5) * 0.3, x, y));
  // Face.
  for (let y = 11; y < 28; y++) for (let x = 5; x < 27; x++) p.px(x, y, ramp(planks, 0.45 + (tileNoise(x * 0.4, y * 2, TILE, 4, seed) - 0.5) * 0.3, x, y));
  for (let y = 11; y < 28; y += 6) p.rect(5, y, 22, 1, at(planks, 0));
  // Frame and cross brace.
  p.rect(5, 11, 22, 2, at(planks, 3));
  p.rect(5, 26, 22, 2, at(planks, 1));
  p.rect(5, 11, 2, 17, at(planks, 3));
  p.rect(25, 11, 2, 17, at(planks, 1));
  p.thickLine(7, 25, 25, 13, 2, 2, at(planks, 2));
  p.rect(5, 10, 22, 1, at(planks, 4));
  hueRim(p);
  return p;
}

function barrel(seed: number): Painter {
  const p = new Painter(TILE, TILE);
  propShadow(p);
  const staves = R("#4a3018", "#5e3e20", "#734d29", "#885d33", "#9c6e3d");
  const cx = TILE / 2;
  for (let y = 6; y < 28; y++) {
    const t = (y - 6) / 22;
    const half = 8 + Math.sin(t * Math.PI) * 2;
    for (let x = Math.floor(cx - half); x < Math.ceil(cx + half); x++) {
      const u = (x + 0.5 - (cx - half)) / (half * 2);
      let v = 0.8 - u * 0.65 + (tileNoise(x * 0.5, y * 2, TILE, 4, seed) - 0.5) * 0.2;
      if (Math.floor(u * 6) !== Math.floor(((x + 1.5 - (cx - half)) / (half * 2)) * 6)) v -= 0.25;
      p.px(x, y, ramp(staves, v, x, y));
    }
  }
  for (const y of [9, 24]) {
    const half = 8 + Math.sin(((y - 6) / 22) * Math.PI) * 2;
    p.rect(cx - half, y, half * 2, 2, at(IRON, 2));
    p.rect(cx - half, y, half * 2, 1, at(IRON, 4));
  }
  p.ellipse(cx, 6, 8, 2.5, at(staves, 4));
  p.ellipse(cx, 6.4, 6.5, 1.6, at(staves, 2));
  hueRim(p);
  return p;
}

function bookshelf(seed: number): Painter {
  const p = new Painter(TILE, TILE);
  const rng = makeRng(seed);
  propShadow(p);
  const wood = WOOD;
  p.rect(3, 0, 26, 30, at(wood, 1));
  p.rect(3, 0, 26, 2, at(wood, 4));
  p.rect(3, 0, 2, 30, at(wood, 3));
  p.rect(27, 0, 2, 30, at(wood, 0));
  const spines = R("#7a2a2a", "#2a4a7a", "#2f6a43", "#8a6a2a", "#5a2a6a", "#6a5040", "#9a8a6a");
  for (let s = 0; s < 3; s++) {
    const y = 3 + s * 9;
    p.rect(5, y, 22, 8, rgb("#1e140c"));
    let x = 5;
    while (x < 26) {
      const w = 2 + Math.floor(rng() * 2);
      const h = 5 + Math.floor(rng() * 3);
      const c = at(spines, Math.floor(rng() * spines.length));
      if (rng() > 0.12) {
        p.rect(x, y + 8 - h, w, h, c);
        p.rect(x, y + 8 - h, 1, h, shadeRGB(c, 0.25));
        p.px(x, y + 8 - h + 2, rgb("#d9b44a"), 0.8);
      }
      x += w;
    }
    p.rect(5, y + 8, 22, 1, at(wood, 4));
  }
  hueRim(p);
  return p;
}

function cauldron(): Painter {
  const p = new Painter(TILE, TILE);
  propShadow(p);
  const cx = TILE / 2;
  // Legs.
  p.rect(cx - 9, 24, 2, 4, at(IRON, 1));
  p.rect(cx + 7, 24, 2, 4, at(IRON, 0));
  // Belly, shaded as a sphere.
  for (let y = 10; y < 27; y++) {
    for (let x = cx - 12; x < cx + 12; x++) {
      const dx = (x + 0.5 - cx) / 11.5;
      const dy = (y + 0.5 - 17) / 9.5;
      const d = dx * dx + dy * dy;
      if (d > 1) continue;
      const lit = -dx * 0.6 - dy * 0.6 + Math.sqrt(1 - d) * 0.3;
      p.px(x, y, ramp(IRON, 0.35 + lit * 0.5, x, y));
    }
  }
  // Rim and brew.
  p.ellipse(cx, 10, 11, 3.5, at(IRON, 4));
  p.ellipse(cx, 10.4, 9.5, 2.6, rgb("#2f8a4a"));
  p.ellipse(cx - 1, 10, 7, 1.6, rgb("#5fd07a"));
  p.disc(cx - 4, 9, 1.4, rgb("#b8ffcf"));
  p.disc(cx + 3, 10, 1, rgb("#9ff0b8"));
  p.px(cx + 1, 8, rgb("#e8fff0"));
  hueRim(p);
  return p;
}

function desk(seed: number): Painter {
  const p = new Painter(TILE, TILE);
  propShadow(p);
  const wood = WOOD;
  // Top.
  for (let y = 7; y < 18; y++) for (let x = 2; x < 30; x++) p.px(x, y, ramp(wood, 0.68 + (tileNoise(x * 0.4, y * 2, TILE, 4, seed) - 0.5) * 0.25, x, y));
  p.rect(2, 7, 28, 1, at(wood, 5));
  // Front panel and legs.
  p.rect(2, 18, 28, 6, at(wood, 2));
  p.rect(2, 18, 28, 1, at(wood, 0));
  p.rect(13, 20, 6, 1, at(IRON, 4));
  p.rect(3, 24, 3, 5, at(wood, 1));
  p.rect(26, 24, 3, 5, at(wood, 0));
  // Papers, an inkwell and a candle stub.
  p.rect(6, 9, 9, 7, rgb("#e9dfc6"));
  p.rect(7, 10, 9, 7, rgb("#f3ead4"));
  for (let y = 12; y < 16; y += 2) p.rect(8, y, 6, 1, rgb("#a89c80"));
  p.rect(20, 10, 3, 3, rgb("#1c2030"));
  p.px(20, 10, rgb("#5a6a8a"));
  p.line(22, 9, 26, 5, rgb("#e8e2d0"));
  p.rect(25, 10, 2, 4, rgb("#efe6cf"));
  p.px(25, 9, rgb("#ffcf5a"));
  p.px(25, 8, rgb("#fff4c0"));
  hueRim(p);
  return p;
}

function pottedPlant(seed: number): Painter {
  const p = new Painter(TILE, TILE);
  const rng = makeRng(seed);
  propShadow(p);
  const cx = TILE / 2;
  const clay = R("#5e2e1a", "#7a3e22", "#94502c", "#ad6538", "#c27a48");
  for (let y = 19; y < 29; y++) {
    const half = 6 - (y - 19) * 0.2;
    for (let x = Math.floor(cx - half); x < Math.ceil(cx + half); x++) {
      p.px(x, y, ramp(clay, 0.75 - ((x - (cx - half)) / (half * 2)) * 0.6, x, y));
    }
  }
  p.rect(cx - 7, 18, 14, 2, at(clay, 4));
  const leaves = R("#1e4a24", "#2a6230", "#3a7a3c", "#52944c", "#6fae60");
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI / 2 + (i / 8 - 0.5) * 2.4;
    const len = 8 + rng() * 5;
    for (let s = 0; s < len; s++) {
      const t = s / len;
      const x = cx + Math.cos(a) * s;
      const y = 18 + Math.sin(a) * s + t * t * 4;
      p.px(x, y, ramp(leaves, 0.4 + t * 0.4 + (Math.cos(a) < 0 ? 0.15 : -0.1), Math.floor(x), Math.floor(y)));
      if (t > 0.3 && t < 0.8) p.px(x + 1, y, ramp(leaves, 0.5 + t * 0.3, Math.floor(x) + 1, Math.floor(y)));
    }
  }
  for (const [x, y, c] of [
    [cx - 4, 8, "#e05a7a"],
    [cx + 3, 7, "#f2d562"],
    [cx, 5, "#b98ce0"],
  ] as const) {
    p.px(x, y, rgb(c));
    p.px(x + 1, y, shadeRGB(rgb(c), -0.2));
    p.px(x, y - 1, shadeRGB(rgb(c), 0.3));
  }
  hueRim(p);
  return p;
}

/** Dark rim around furniture so it separates from a busy floor. */
function hueRim(p: Painter): void {
  const marks: number[] = [];
  for (let y = 0; y < p.h; y++) {
    for (let x = 0; x < p.w; x++) {
      if (p.alpha(x, y) >= 0.6) continue;
      const n = p.alpha(x + 1, y) >= 0.6 || p.alpha(x - 1, y) >= 0.6 || p.alpha(x, y - 1) >= 0.6 || p.alpha(x, y + 1) >= 0.6;
      if (n && p.alpha(x, y) < 0.3) marks.push(x, y);
    }
  }
  for (let i = 0; i < marks.length; i += 2) p.px(marks[i] ?? 0, marks[i + 1] ?? 0, 0x120c08, 0.75);
}

function register(scene: Phaser.Scene, key: string, painter: Painter): void {
  const { tex, ctx } = canvasTex(scene, key, painter.w, painter.h);
  painter.put(ctx);
  commit({ tex, ctx });
}

export function buildStructures(scene: Phaser.Scene): void {
  register(scene, "st_wall_stone", stoneWall(4400, STONE));
  register(scene, "st_wall_wood", woodWall(4713));
  register(scene, "st_wall_plaster", plasterWall(5026));
  register(scene, "st_floor_wood", woodFloor(5500));
  register(scene, "st_floor_stone", stoneFloor(6117));
  register(scene, "st_floor_carpet", carpetFloor(6734));
  register(scene, "st_roof_slate", roof(771, true));
  register(scene, "st_roof_thatch", roof(883, false));
  register(scene, "st_door", door(3131));
  register(scene, "st_torch", torch(4141));
  register(scene, "st_prop_crate", crate(2200));
  register(scene, "st_prop_barrel", barrel(2657));
  register(scene, "st_prop_shelf", bookshelf(3114));
  register(scene, "st_prop_cauldron", cauldron());
  register(scene, "st_prop_desk", desk(4028));
  register(scene, "st_prop_plant", pottedPlant(4485));
}
