import { TILE } from "../config";
import { makeRng } from "../world/noise";
import type { GroundTile } from "../types";
import { Painter, bayer, lerpRGB, ramp, rgb, shadeRGB, tileNoise, wrapNoise } from "./paint";
import type { RGB } from "./paint";

/**
 * Ground art: the base tiles, and the transition pieces that let one terrain
 * spill over another so biome borders and coasts are not hard square steps.
 *
 * Every ground kind has a priority. Where two kinds meet, the higher one
 * overhangs the lower with a wobbly, dithered fringe (grass creeps over dirt,
 * sand over water). Water never overhangs anything; instead, any land that
 * meets it gets a coast piece with wet sand and a foam line.
 */

export const GROUND_VARIANTS = 8;

type Family = "grass" | "sand" | "dirt" | "rock" | "snow" | "ash" | "crack" | "water" | "void";

interface GroundDef {
  family: Family;
  /** Dark -> light. */
  ramp: RGB[];
  /** Higher overhangs lower. Negative never blends. */
  prio: number;
}

const R = (...hex: string[]): RGB[] => hex.map(rgb);

export const GROUND_DEFS: Record<GroundTile, GroundDef> = {
  deep_water: { family: "water", prio: 0, ramp: R("#0e2a45", "#123351", "#163d5e", "#1b486b") },
  water: { family: "water", prio: 0, ramp: R("#1b4d73", "#205a84", "#266693", "#2e74a2") },
  shore: { family: "sand", prio: 2, ramp: R("#b39b69", "#c4ad7a", "#d3bd88", "#dfcb97", "#e9d9a9") },
  marsh: { family: "grass", prio: 3, ramp: R("#2c4530", "#36533a", "#426344", "#4f714d", "#5f8058") },
  dirt: { family: "dirt", prio: 4, ramp: R("#5a3f27", "#6b4d31", "#7c5c3b", "#8d6b46", "#9f7c53") },
  cracked_earth: { family: "crack", prio: 5, ramp: R("#2c2724", "#36312d", "#413b36", "#4c4540", "#57504a") },
  ash: { family: "ash", prio: 6, ramp: R("#6b655f", "#79736c", "#88817a", "#979089", "#a8a19a") },
  stone: { family: "rock", prio: 7, ramp: R("#4f5553", "#5d6361", "#6b716e", "#7a807c", "#8a908b") },
  forest_floor: { family: "grass", prio: 8, ramp: R("#1c3519", "#244220", "#2d5027", "#375e2e", "#436d36") },
  grass: { family: "grass", prio: 9, ramp: R("#2e5c29", "#386d31", "#437f38", "#509141", "#5fa34b") },
  meadow: { family: "grass", prio: 10, ramp: R("#3c7531", "#4a883a", "#589a43", "#69ab4e", "#7ebc5d") },
  snow: { family: "snow", prio: 11, ramp: R("#9fb2c8", "#b9c9da", "#d0dce8", "#e3ebf3", "#f4f8fc") },
  void: { family: "void", prio: -1, ramp: R("#030305", "#060609", "#09090d", "#0c0c11") },
};

export function isWaterKind(kind: GroundTile): boolean {
  return GROUND_DEFS[kind].family === "water";
}

export function groundPriority(kind: GroundTile): number {
  return GROUND_DEFS[kind].prio;
}

function seedFor(kind: GroundTile, variant: number): number {
  let h = 2166136261;
  for (let i = 0; i < kind.length; i++) h = Math.imul(h ^ kind.charCodeAt(i), 16777619);
  return (h ^ Math.imul(variant + 1, 0x9e3779b1)) >>> 0;
}

// --- base tiles ------------------------------------------------------------

const tileCache = new Map<string, Painter>();

/** The painted base tile for a kind/variant, cached for reuse by the edge pieces. */
export function groundPainter(kind: GroundTile, variant: number): Painter {
  const key = `${kind}_${variant}`;
  let p = tileCache.get(key);
  if (!p) {
    p = paintGround(kind, variant);
    tileCache.set(key, p);
  }
  return p;
}

function paintGround(kind: GroundTile, variant: number): Painter {
  const def = GROUND_DEFS[kind];
  const seed = seedFor(kind, variant);
  const rng = makeRng(seed);
  const p = new Painter(TILE, TILE);
  const S = TILE;

  // Base: two octaves of tile-wrapping noise squeezed into the middle of the
  // ramp, so the extremes are left free for the details drawn on top.
  // Every variant is normalised to the same mean and contrast, otherwise
  // neighbouring variants read as a checkerboard of lighter and darker squares.
  const spread = def.family === "snow" ? 0.7 : def.family === "void" ? 0.5 : 0.5;
  const field = new Float32Array(S * S);
  let mean = 0;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const n = tileNoise(x, y, S, 8, seed) * 0.75 + wrapNoise(x, y, 4, 8, seed + 7) * 0.25;
      field[y * S + x] = n;
      mean += n;
    }
  }
  mean /= S * S;
  let dev = 0;
  for (let i = 0; i < field.length; i++) dev += Math.abs((field[i] ?? 0) - mean);
  dev = Math.max(0.02, dev / field.length);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const z = ((field[y * S + x] ?? 0) - mean) / dev;
      const v = 0.5 + z * 0.12 * spread * 2;
      p.px(x, y, ramp(def.ramp, v, x, y));
    }
  }

  switch (def.family) {
    case "grass":
      paintGrass(p, kind, variant, rng, def.ramp);
      break;
    case "sand":
      paintSand(p, rng, def.ramp);
      break;
    case "dirt":
      paintDirt(p, rng, def.ramp);
      break;
    case "rock":
      paintRock(p, rng, def.ramp, variant);
      break;
    case "snow":
      paintSnow(p, rng, def.ramp);
      break;
    case "ash":
      paintAsh(p, rng, def.ramp, variant);
      break;
    case "crack":
      paintCracks(p, rng, def.ramp, variant);
      break;
    case "water":
      paintWaterTile(p, rng, def.ramp);
      break;
    case "void":
      break;
  }
  return p;
}

function at<T>(arr: readonly T[], i: number): T {
  return arr[Math.max(0, Math.min(arr.length - 1, i))] as T;
}

/** A single blade: dark root, mid body, bright tip; sometimes leaning. */
function blade(p: Painter, x: number, y: number, h: number, ramp: RGB[], lean: number): void {
  for (let i = 0; i < h; i++) {
    const t = i / Math.max(1, h - 1);
    const c = t < 0.34 ? at(ramp, 1) : t < 0.75 ? at(ramp, 3) : at(ramp, 4);
    const xx = x + (i === h - 1 ? lean : 0);
    p.px(((xx % TILE) + TILE) % TILE, y - i, c);
  }
}

function paintGrass(p: Painter, kind: GroundTile, variant: number, rng: () => number, ramp: RGB[]): void {
  const S = TILE;
  const blades = kind === "meadow" ? 30 : kind === "grass" ? 32 : kind === "marsh" ? 18 : 16;

  if (kind === "forest_floor") {
    // Leaf litter and twigs: the canopy is overhead, so the floor is browner.
    const litter = R("#4d3a22", "#6b4f2a", "#7d5e2c", "#5a5a2a", "#8a6a34");
    for (let i = 0; i < 18; i++) {
      const x = Math.floor(rng() * S);
      const y = Math.floor(rng() * S);
      const c = at(litter, Math.floor(rng() * litter.length));
      p.px(x, y, c);
      p.px(x + 1, y, shadeRGB(c, -0.2));
      if (rng() > 0.5) p.px(x, y + 1, shadeRGB(c, 0.15));
    }
    if (rng() > 0.4) {
      const x = 4 + rng() * 22;
      const y = 4 + rng() * 22;
      p.line(x, y, x + 4 + rng() * 5, y + 1 - rng() * 3, rgb("#3a2a1a"));
    }
    // Moss cushions.
    for (let i = 0; i < 2; i++) {
      const cx = rng() * S;
      const cy = rng() * S;
      for (let k = 0; k < 9; k++) {
        p.px(cx + rng() * 4 - 2, cy + rng() * 3 - 1, at(ramp, 4), 0.85);
      }
    }
  }

  if (kind === "marsh") {
    // Standing water: a dark pool with a lit rim and a sheen highlight.
    if (variant % 2 === 0) {
      const cx = 8 + rng() * 16;
      const cy = 8 + rng() * 16;
      const rx = 4 + rng() * 4;
      const ry = 2 + rng() * 2;
      p.ellipse(cx, cy, rx + 1, ry + 1, at(ramp, 0));
      p.ellipse(cx, cy, rx, ry, rgb("#2a4448"));
      p.ellipse(cx + 0.5, cy + 0.5, rx - 1, Math.max(1, ry - 1), rgb("#2f4f54"));
      p.line(cx - rx * 0.5, cy - ry * 0.4, cx + rx * 0.1, cy - ry * 0.4, rgb("#7fa9a6"), 0.8);
      p.px(cx + rx * 0.3, cy + ry * 0.2, rgb("#9cc4be"), 0.6);
    }
  }

  for (let i = 0; i < blades; i++) {
    const x = Math.floor(rng() * S);
    const y = 3 + Math.floor(rng() * (S - 3));
    const h = 2 + Math.floor(rng() * (kind === "marsh" ? 4 : 3));
    blade(p, x, y, h, ramp, rng() > 0.7 ? (rng() > 0.5 ? 1 : -1) : 0);
  }

  if ((kind === "grass" || kind === "meadow") && (variant === 1 || variant === 5)) {
    // Clover: a few three-leaf clusters, slightly bluer than the grass.
    const clover = rgb(kind === "meadow" ? "#4f9c4c" : "#3f8a48");
    for (let i = 0; i < 4; i++) {
      const x = 3 + Math.floor(rng() * (S - 6));
      const y = 3 + Math.floor(rng() * (S - 6));
      p.px(x, y, clover);
      p.px(x + 1, y, clover);
      p.px(x, y + 1, clover);
      p.px(x - 1, y + 1, shadeRGB(clover, -0.25));
      p.px(x + 1, y + 1, shadeRGB(clover, -0.25));
      p.px(x, y, shadeRGB(clover, 0.25));
    }
  }

  if (kind === "meadow" && (variant === 2 || variant === 6)) {
    const petals = R("#f4f1e4", "#f2d562", "#e9a4c0");
    for (let i = 0; i < 3; i++) {
      const x = 2 + Math.floor(rng() * (S - 4));
      const y = 2 + Math.floor(rng() * (S - 4));
      p.px(x, y + 1, at(ramp, 0));
      p.px(x, y, at(petals, Math.floor(rng() * petals.length)));
    }
  }

  if (variant === 7) {
    // The odd pebble, so even lawns have something to catch the eye.
    const x = 4 + rng() * 24;
    const y = 4 + rng() * 24;
    p.px(x, y, rgb("#8c8f88"));
    p.px(x + 1, y, rgb("#6f726c"));
    p.px(x, y - 1, rgb("#b4b7ae"));
  }
}

function pebble(p: Painter, x: number, y: number, base: RGB, size: number): void {
  p.ellipse(x, y + 0.6, size * 0.7, size * 0.5, shadeRGB(base, -0.45), 0.6);
  p.ellipse(x, y, size * 0.7, size * 0.5, base);
  p.px(x - size * 0.3, y - size * 0.25, shadeRGB(base, 0.35));
}

function paintSand(p: Painter, rng: () => number, ramp: RGB[]): void {
  const S = TILE;
  // Wind ripples: a dark trough with a lit crest just above it.
  const rows = 3 + Math.floor(rng() * 2);
  for (let r = 0; r < rows; r++) {
    const y0 = 3 + r * (S / rows) + rng() * 3;
    const phase = rng() * Math.PI * 2;
    for (let x = 0; x < S; x++) {
      if (bayer(x, r) > 0.8) continue;
      const y = y0 + Math.sin((x / S) * Math.PI * 2 + phase) * 1.5;
      p.px(x, y, at(ramp, 1), 0.55);
      p.px(x, y - 1, at(ramp, 4), 0.45);
    }
  }
  for (let i = 0; i < 14; i++) {
    p.px(rng() * S, rng() * S, rng() > 0.5 ? at(ramp, 0) : at(ramp, 4), 0.7);
  }
  if (rng() > 0.55) {
    // A shell.
    const x = 4 + rng() * 24;
    const y = 4 + rng() * 24;
    p.px(x, y, rgb("#f3e6dc"));
    p.px(x + 1, y, rgb("#e8c9c0"));
    p.px(x, y + 1, rgb("#c9a89c"));
  }
  if (rng() > 0.5) pebble(p, 4 + rng() * 24, 4 + rng() * 24, rgb("#9a958a"), 2);
}

function paintDirt(p: Painter, rng: () => number, ramp: RGB[]): void {
  const S = TILE;
  // Ruts: a dark groove with a lighter lip.
  if (rng() > 0.35) {
    const y0 = 6 + rng() * 20;
    const slope = (rng() - 0.5) * 0.3;
    for (let x = 0; x < S; x++) {
      const y = y0 + x * slope;
      p.px(x, y, at(ramp, 0), 0.7);
      p.px(x, y + 1, at(ramp, 4), 0.5);
    }
  }
  for (let i = 0; i < 4; i++) {
    pebble(p, 3 + rng() * 26, 3 + rng() * 26, lerpRGB(rgb("#857a6c"), rgb("#a59a88"), rng()), 1.5 + rng() * 1.5);
  }
  for (let i = 0; i < 18; i++) {
    p.px(rng() * S, rng() * S, rng() > 0.5 ? at(ramp, 0) : at(ramp, 4), 0.6);
  }
  if (rng() > 0.6) {
    // A root or a twig.
    const x = rng() * 20;
    const y = rng() * 28;
    p.line(x, y, x + 6 + rng() * 6, y + 2 - rng() * 4, rgb("#4a3420"));
  }
}

function crackWalk(p: Painter, rng: () => number, x: number, y: number, len: number, dark: RGB, lit: RGB, glow: RGB | null): void {
  let angle = rng() * Math.PI * 2;
  for (let i = 0; i < len; i++) {
    p.px(x, y, dark);
    p.px(x, y + 1, lit, 0.5);
    if (glow && i > 1 && i < len - 2 && rng() > 0.45) p.px(x, y, glow, 0.85);
    angle += (rng() - 0.5) * 1.1;
    x += Math.cos(angle);
    y += Math.sin(angle);
    x = ((x % TILE) + TILE) % TILE;
    y = ((y % TILE) + TILE) % TILE;
  }
}

function paintRock(p: Painter, rng: () => number, ramp: RGB[], variant: number): void {
  const S = TILE;
  // Bedrock plates: a few long cracks, lit along their lower edge.
  for (let i = 0; i < 2 + (variant % 2); i++) {
    crackWalk(p, rng, rng() * S, rng() * S, 8 + rng() * 10, at(ramp, 0), at(ramp, 4), null);
  }
  // Lichen and moss.
  const moss = R("#4c6638", "#5a7642", "#6c8a4c");
  for (let m = 0; m < 2; m++) {
    const cx = rng() * S;
    const cy = rng() * S;
    for (let k = 0; k < 10; k++) {
      p.px(cx + rng() * 5 - 2.5, cy + rng() * 4 - 2, at(moss, Math.floor(rng() * moss.length)), 0.85);
    }
  }
  if (variant % 3 === 0) {
    for (let k = 0; k < 5; k++) {
      const x = rng() * S;
      const y = 4 + rng() * (S - 4);
      p.px(x, y, rgb("#5f7f43"));
      p.px(x, y - 1, rgb("#7a9a52"));
    }
  }
  for (let i = 0; i < 2; i++) pebble(p, 3 + rng() * 26, 3 + rng() * 26, at(ramp, 3), 1.5 + rng());
}

function paintSnow(p: Painter, rng: () => number, ramp: RGB[]): void {
  const S = TILE;
  // Drifts: a soft blue shadow under a bright crest.
  const y0 = 6 + rng() * 20;
  const phase = rng() * Math.PI * 2;
  for (let x = 0; x < S; x++) {
    const y = y0 + Math.sin((x / S) * Math.PI * 2 + phase) * 2.5;
    p.px(x, y, at(ramp, 4));
    p.px(x, y + 1, at(ramp, 1), 0.55);
    if (bayer(x, 1) < 0.5) p.px(x, y + 2, at(ramp, 1), 0.3);
  }
  for (let i = 0; i < 6; i++) p.px(rng() * S, rng() * S, 0xffffff);
  if (rng() > 0.7) {
    const x = 4 + rng() * 24;
    const y = 4 + rng() * 24;
    pebble(p, x, y, rgb("#6b6f74"), 2);
    p.px(x - 1, y - 1, 0xffffff);
  }
}

function paintAsh(p: Painter, rng: () => number, ramp: RGB[], variant: number): void {
  const S = TILE;
  // Ash settles in wind ripples like sand, but grey and soft-edged.
  for (let r = 0; r < 2; r++) {
    const y0 = 5 + r * 14 + rng() * 6;
    const phase = rng() * Math.PI * 2;
    for (let x = 0; x < S; x++) {
      if (bayer(x, r * 2) > 0.7) continue;
      const y = y0 + Math.sin((x / S) * Math.PI * 2 + phase) * 1.2;
      p.px(x, y, at(ramp, 4), 0.55);
      p.px(x, y + 1, at(ramp, 0), 0.35);
    }
  }
  // Charcoal flecks.
  for (let i = 0; i < 16; i++) {
    const x = rng() * S;
    const y = rng() * S;
    p.px(x, y, rgb("#3a3532"), 0.8);
    if (rng() > 0.6) p.px(x + 1, y, rgb("#4a4440"), 0.7);
  }
  if (variant === 3 || variant === 6) {
    // A splinter of something burnt.
    const x = 4 + rng() * 22;
    const y = 4 + rng() * 22;
    p.line(x, y, x + 5, y + 1, rgb("#2b2725"));
    p.px(x + 2, y, rgb("#6a5f58"));
  }
}

function paintCracks(p: Painter, rng: () => number, ramp: RGB[], variant: number): void {
  const S = TILE;
  // The ground split as it cooled. Some fissures still hold a little heat.
  const glow = variant === 1 || variant === 4 ? rgb("#a8401c") : null;
  for (let i = 0; i < 3; i++) {
    crackWalk(p, rng, rng() * S, rng() * S, 10 + rng() * 12, rgb("#171311"), at(ramp, 4), i === 0 ? glow : null);
  }
  for (let i = 0; i < 10; i++) p.px(rng() * S, rng() * S, at(ramp, 4), 0.6);
}

function paintWaterTile(p: Painter, rng: () => number, ramp: RGB[]): void {
  const S = TILE;
  for (let i = 0; i < 5; i++) {
    const y = 3 + Math.floor(rng() * (S - 6));
    const x = Math.floor(rng() * (S - 12));
    const w = 5 + Math.floor(rng() * 7);
    p.rect(x, y, w, 1, at(ramp, 3), 0.7);
    p.rect(x + 1, y + 1, w - 2, 1, at(ramp, 0), 0.5);
  }
}

// --- transitions -------------------------------------------------------------

export type EdgeDir = "n" | "s" | "e" | "w" | "ne" | "nw" | "se" | "sw";
export const EDGE_VARIANTS = 3;

/** Grid offset of the neighbour that each direction refers to. */
export const EDGE_OFFSETS: Record<EdgeDir, [number, number]> = {
  n: [0, -1],
  s: [0, 1],
  e: [1, 0],
  w: [-1, 0],
  ne: [1, -1],
  nw: [-1, -1],
  se: [1, 1],
  sw: [-1, 1],
};

/** Base depth, in pixels, that a neighbour's fringe reaches into a tile. */
const EDGE_DEPTH = 8;

function edgeWobble(t: number, variant: number): number {
  // Pinned to EDGE_DEPTH at both ends so neighbouring pieces always meet.
  const n = wrapNoise(t * 4, variant * 17, 6, 1000, 4242 + variant * 97) - 0.5;
  const m = wrapNoise(t * 4, variant * 5, 2, 1000, 99 + variant * 31) - 0.5;
  return EDGE_DEPTH + Math.sin(Math.PI * t) * (n * 9 + m * 3);
}

/**
 * Signed distance from the fringe line for pixel (x, y) when the overhanging
 * terrain lies in direction `dir`. Negative means inside the overhang.
 */
function edgeDistance(dir: EdgeDir, x: number, y: number, variant: number): number {
  const S = TILE;
  const cx = x + 0.5;
  const cy = y + 0.5;
  switch (dir) {
    case "n":
      return cy - edgeWobble(cx / S, variant);
    case "s":
      return S - cy - edgeWobble(cx / S, variant + 11);
    case "w":
      return cx - edgeWobble(cy / S, variant + 23);
    case "e":
      return S - cx - edgeWobble(cy / S, variant + 37);
    default: {
      const ox = dir.includes("e") ? S : 0;
      const oy = dir.includes("s") ? S : 0;
      const dx = Math.abs(cx - ox);
      const dy = Math.abs(cy - oy);
      const r = Math.hypot(dx, dy);
      const theta = Math.atan2(dy, dx) / (Math.PI / 2);
      return r - edgeWobble(theta, variant + 53);
    }
  }
}

const edgeCache = new Map<string, HTMLCanvasElement>();

/**
 * The piece of `kind` that overhangs a lower neighbour from direction `dir`.
 * `coast` pieces are for water tiles: the land gets a darker wet rim.
 */
export function edgePiece(kind: GroundTile, dir: EdgeDir, variant: number, coast: boolean): HTMLCanvasElement {
  const key = `${kind}|${dir}|${variant}|${coast ? 1 : 0}`;
  const cached = edgeCache.get(key);
  if (cached) return cached;

  const def = GROUND_DEFS[kind];
  const src = groundPainter(kind, variant % GROUND_VARIANTS);
  const out = new Painter(TILE, TILE);
  const rng = makeRng(seedFor(kind, variant) ^ 0x5eed);
  const grassy = def.family === "grass";

  // Grass tufts poke a little past the fringe line.
  const tufts = new Set<number>();
  if (grassy) for (let i = 0; i < 7; i++) tufts.add(Math.floor(rng() * TILE));

  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const d = edgeDistance(dir, x, y, variant);
      let alpha = 0;
      if (d < -0.5) alpha = 1;
      else if (d < 0.75) alpha = bayer(x, y) < 0.5 ? 1 : 0;
      else if (grassy && d < 3 && (tufts.has(x) || tufts.has(y)) && bayer(x, y) < 0.6) alpha = 1;
      if (alpha === 0) continue;

      let c = src.get(x, y);
      if (coast && d > -3) c = shadeRGB(c, def.family === "sand" ? -0.22 : -0.14);
      else if (!coast && d > -2.5) c = shadeRGB(c, -0.06);
      out.px(x, y, c, alpha);
    }
  }

  const canvas = out.toCanvas();
  edgeCache.set(key, canvas);
  return canvas;
}

const foamCache = new Map<string, HTMLCanvasElement>();

/**
 * The water side of a coast: a bright foam line hugging the shore, a broken
 * second line further out, and a band of lighter shallows.
 */
export function foamPiece(dir: EdgeDir, variant: number): HTMLCanvasElement {
  const key = `${dir}|${variant}`;
  const cached = foamCache.get(key);
  if (cached) return cached;

  const out = new Painter(TILE, TILE);
  const foam = rgb("#e9f7fb");
  const spray = rgb("#bfe7f2");
  const shallow = rgb("#5ec0d6");

  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const d = edgeDistance(dir, x, y, variant);
      if (d < -1 || d > 13) continue;
      if (d < 2.2) {
        out.px(x, y, foam, d < 1.2 ? 0.95 : 0.7);
        continue;
      }
      if (d < 12) out.px(x, y, shallow, 0.3 * (1 - (d - 2.2) / 10));
      if (d >= 3 && d < 4.2) out.px(x, y, spray, 0.32);
      if (d >= 5.2 && d < 6.6) {
        const along = dir === "n" || dir === "s" ? x : dir === "e" || dir === "w" ? y : x + y;
        if (wrapNoise(along, variant, 3, 1000, 777) > 0.45) out.px(x, y, foam, 0.55);
      }
    }
  }

  const canvas = out.toCanvas();
  foamCache.set(key, canvas);
  return canvas;
}

/** Water colour by elevation: pale over sandbars, inky in the open sea. */
const WATER_STOPS: Array<[number, RGB]> = [
  [0.0, rgb("#0b2238")],
  [0.14, rgb("#0f2d4b")],
  [0.22, rgb("#15406a")],
  [0.28, rgb("#1c5683")],
  [0.32, rgb("#246c98")],
  [0.35, rgb("#2f84aa")],
  [0.38, rgb("#3c98b6")],
];

export function waterColor(elevation: number): RGB {
  const first = WATER_STOPS[0]!;
  if (elevation <= first[0]) return first[1];
  for (let i = 1; i < WATER_STOPS.length; i++) {
    const [e1, c1] = WATER_STOPS[i]!;
    const [e0, c0] = WATER_STOPS[i - 1]!;
    if (elevation <= e1) return lerpRGB(c0, c1, (elevation - e0) / (e1 - e0));
  }
  return WATER_STOPS[WATER_STOPS.length - 1]![1];
}
