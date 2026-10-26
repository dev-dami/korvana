import type Phaser from "phaser";

import { TILE } from "../config";
import { makeRng } from "../world/noise";
import { canvasTex, commit } from "./canvas";
import { C, mix, shade, withAlpha } from "./palette";
import type { GroundTile } from "../types";
import type { ItemKind } from "../data/items";

/** Walls are one tile wide but overhang upward, which is what gives the world its 2.5D read. */
export const WALL_H = TILE + 12;

export const GROUND_KINDS: GroundTile[] = [
  "deep_water",
  "water",
  "shore",
  "grass",
  "meadow",
  "forest_floor",
  "marsh",
  "dirt",
  "stone",
  "snow",
  "ash",
  "cracked_earth",
  "void",
];

export const GROUND_VARIANTS = 4;

export function groundKey(kind: GroundTile, variant: number): string {
  return `g_${kind}_${variant}`;
}

type GroundStyle = {
  base: string;
  dark: string;
  light: string;
  kind: "water" | "sand" | "grass" | "rock" | "snow" | "dirt" | "crack";
};

const GROUND_STYLE: Record<GroundTile, GroundStyle> = {
  deep_water: { base: C.deepWater, dark: shade(C.deepWater, -0.2), light: shade(C.deepWater, 0.14), kind: "water" },
  water: { base: C.water, dark: shade(C.water, -0.18), light: shade(C.water, 0.18), kind: "water" },
  shore: { base: C.sand, dark: C.sandDark, light: shade(C.sand, 0.14), kind: "sand" },
  grass: { base: C.grass, dark: C.grassDark, light: C.grassLight, kind: "grass" },
  meadow: { base: C.meadow, dark: C.meadowDark, light: C.meadowLight, kind: "grass" },
  forest_floor: { base: C.forestFloor, dark: C.forestDark, light: C.forestLight, kind: "grass" },
  marsh: { base: C.marsh, dark: C.marshDark, light: C.marshLight, kind: "grass" },
  dirt: { base: C.dirt, dark: C.dirtDark, light: shade(C.dirt, 0.14), kind: "dirt" },
  stone: { base: C.stone, dark: C.stoneDark, light: C.stoneLight, kind: "rock" },
  snow: { base: C.snow, dark: C.snowDark, light: "#ffffff", kind: "snow" },
  // Ash is powder, so it speckles like sand but with no warmth in it.
  ash: { base: C.ash, dark: C.ashDark, light: C.ashLight, kind: "sand" },
  cracked_earth: {
    base: C.crackedEarth,
    dark: C.crackedEarthDark,
    light: C.crackedEarthLight,
    kind: "crack",
  },
  void: { base: "#050507", dark: "#020203", light: "#0b0b10", kind: "dirt" },
};

function speckle(
  ctx: CanvasRenderingContext2D,
  rng: () => number,
  style: GroundStyle,
  count: number,
  size = 2,
): void {
  for (let i = 0; i < count; i++) {
    const x = Math.floor(rng() * TILE);
    const y = Math.floor(rng() * TILE);
    const light = rng() > 0.5;
    ctx.fillStyle = light ? style.light : style.dark;
    ctx.globalAlpha = 0.35 + rng() * 0.45;
    ctx.fillRect(x, y, 1 + Math.floor(rng() * size), 1 + Math.floor(rng() * size));
  }
  ctx.globalAlpha = 1;
}

function drawGround(ctx: CanvasRenderingContext2D, style: GroundStyle, seed: number): void {
  const rng = makeRng(seed);
  ctx.fillStyle = style.base;
  ctx.fillRect(0, 0, TILE, TILE);

  switch (style.kind) {
    case "water": {
      ctx.globalAlpha = 0.4;
      for (let i = 0; i < 5; i++) {
        const y = 3 + Math.floor(rng() * (TILE - 6));
        const x = Math.floor(rng() * (TILE - 12));
        const w = 6 + Math.floor(rng() * 8);
        ctx.fillStyle = rng() > 0.45 ? style.light : style.dark;
        ctx.fillRect(x, y, w, 1);
        if (rng() > 0.6) ctx.fillRect(x + 2, y + 1, w - 3, 1);
      }
      ctx.globalAlpha = 1;
      break;
    }
    case "sand": {
      speckle(ctx, rng, style, 26, 2);
      ctx.globalAlpha = 0.3;
      for (let i = 0; i < 4; i++) {
        const y = Math.floor(rng() * TILE);
        ctx.fillStyle = style.dark;
        ctx.fillRect(0, y, TILE, 1);
      }
      ctx.globalAlpha = 1;
      break;
    }
    case "grass": {
      const blades = 22;
      for (let i = 0; i < blades; i++) {
        const x = Math.floor(rng() * TILE);
        const y = Math.floor(rng() * (TILE - 4));
        const h = 2 + Math.floor(rng() * 3);
        ctx.fillStyle = rng() > 0.5 ? style.light : style.dark;
        ctx.globalAlpha = 0.5 + rng() * 0.4;
        ctx.fillRect(x, y, 1, h);
      }
      ctx.globalAlpha = 1;
      speckle(ctx, rng, style, 14, 2);
      break;
    }
    case "dirt": {
      speckle(ctx, rng, style, 30, 3);
      ctx.globalAlpha = 0.25;
      for (let i = 0; i < 3; i++) {
        const x = Math.floor(rng() * TILE);
        const y = Math.floor(rng() * TILE);
        ctx.fillStyle = style.dark;
        ctx.fillRect(x, y, 3 + Math.floor(rng() * 5), 2);
      }
      ctx.globalAlpha = 1;
      break;
    }
    case "rock": {
      speckle(ctx, rng, style, 20, 3);
      ctx.globalAlpha = 0.5;
      for (let i = 0; i < 4; i++) {
        const x = Math.floor(rng() * TILE);
        const y = Math.floor(rng() * TILE);
        ctx.strokeStyle = style.dark;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 4 + Math.floor(rng() * 6), y + 3 - Math.floor(rng() * 6));
        ctx.lineTo(x + 9, y + 5);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      break;
    }
    case "snow": {
      speckle(ctx, rng, style, 18, 3);
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = style.light;
      for (let i = 0; i < 10; i++) {
        ctx.fillRect(Math.floor(rng() * TILE), Math.floor(rng() * TILE), 2, 1);
      }
      ctx.globalAlpha = 1;
      break;
    }
    case "crack": {
      // Fissures radiating from two centres, so tiles tessellate without
      // reading as a repeated stamp.
      speckle(ctx, rng, style, 16, 2);
      const nodes: Array<[number, number]> = [
        [rng() * TILE, rng() * TILE],
        [rng() * TILE, rng() * TILE],
      ];
      for (const [nx, ny] of nodes) {
        const arms = 3 + Math.floor(rng() * 3);
        for (let a = 0; a < arms; a++) {
          const angle = rng() * Math.PI * 2;
          let x = nx;
          let y = ny;
          ctx.strokeStyle = style.dark;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(x, y);
          let len = 3 + rng() * 5;
          for (let seg = 0; seg < 3 && len > 1; seg++) {
            x += Math.cos(angle) * len;
            y += Math.sin(angle) * len;
            ctx.lineTo(x, y);
            len *= 0.6;
          }
          ctx.stroke();
        }
      }
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = style.light;
      for (let i = 0; i < 8; i++) {
        ctx.fillRect(Math.floor(rng() * TILE), Math.floor(rng() * TILE), 2, 2);
      }
      ctx.globalAlpha = 1;
      break;
    }
  }
}

function drawWallBlock(
  ctx: CanvasRenderingContext2D,
  seed: number,
  face: string,
  dark: string,
  light: string,
  cap: string,
): void {
  const rng = makeRng(seed);
  ctx.fillStyle = cap;
  ctx.fillRect(0, 0, TILE, 10);
  ctx.fillStyle = light;
  ctx.fillRect(0, 0, TILE, 3);
  ctx.fillStyle = dark;
  ctx.fillRect(0, 10, TILE, 2);

  ctx.fillStyle = face;
  ctx.fillRect(0, 12, TILE, WALL_H - 12);

  let row = 0;
  for (let y = 12; y < WALL_H; y += 10) {
    ctx.fillStyle = dark;
    ctx.fillRect(0, y, TILE, 1);
    const seam = row % 2 === 0 ? 16 : 8;
    ctx.fillRect(seam, y, 1, Math.min(10, WALL_H - y));
    row++;
  }

  ctx.globalAlpha = 0.22;
  for (let i = 0; i < 26; i++) {
    ctx.fillStyle = rng() > 0.5 ? light : dark;
    ctx.fillRect(Math.floor(rng() * TILE), 12 + Math.floor(rng() * (WALL_H - 12)), 1 + Math.floor(rng() * 3), 1);
  }
  ctx.globalAlpha = 1;

  ctx.fillStyle = withAlpha("#000000", 0.22);
  ctx.fillRect(0, WALL_H - 3, TILE, 3);
}

function drawFloor(
  ctx: CanvasRenderingContext2D,
  seed: number,
  base: string,
  dark: string,
  planks: boolean,
): void {
  const rng = makeRng(seed);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, TILE, TILE);
  ctx.fillStyle = dark;
  ctx.globalAlpha = 0.7;
  if (planks) {
    for (let y = 0; y < TILE; y += 8) {
      ctx.fillRect(0, y, TILE, 1);
      const off = (y / 8) % 2 === 0 ? 0 : 16;
      ctx.fillRect((off + 8) % TILE, y, 1, 8);
    }
  } else {
    for (let y = 0; y < TILE; y += 16) {
      ctx.fillRect(0, y, TILE, 1);
      ctx.fillRect(0, y, 1, 16);
      ctx.fillRect(TILE - 1, y, 1, 16);
    }
  }
  ctx.globalAlpha = 1;
  ctx.globalAlpha = 0.28;
  for (let i = 0; i < 22; i++) {
    ctx.fillStyle = rng() > 0.5 ? shade(base, 0.18) : dark;
    ctx.fillRect(Math.floor(rng() * TILE), Math.floor(rng() * TILE), 1 + Math.floor(rng() * 3), 1);
  }
  ctx.globalAlpha = 1;
}

function drawDoor(ctx: CanvasRenderingContext2D, seed: number): void {
  const rng = makeRng(seed);
  ctx.fillStyle = C.wallStoneDark;
  ctx.fillRect(0, 0, TILE, WALL_H);
  ctx.fillStyle = C.doorDark;
  ctx.fillRect(4, 8, TILE - 8, WALL_H - 8);
  ctx.fillStyle = C.door;
  ctx.fillRect(6, 10, TILE - 12, WALL_H - 12);

  ctx.fillStyle = C.doorDark;
  for (let y = 14; y < WALL_H - 4; y += 9) ctx.fillRect(6, y, TILE - 12, 1);

  ctx.fillStyle = C.ironLight;
  ctx.beginPath();
  ctx.arc(TILE - 11, WALL_H - 18, 2, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 0.3;
  for (let i = 0; i < 16; i++) {
    ctx.fillStyle = rng() > 0.5 ? C.doorDark : shade(C.door, 0.2);
    ctx.fillRect(6 + Math.floor(rng() * (TILE - 12)), 10 + Math.floor(rng() * (WALL_H - 12)), 1, 1 + Math.floor(rng() * 4));
  }
  ctx.globalAlpha = 1;
}

function drawTorch(ctx: CanvasRenderingContext2D, seed: number): void {
  const rng = makeRng(seed);
  ctx.fillStyle = C.trunkDark;
  ctx.fillRect(TILE / 2 - 2, WALL_H - 18, 4, 16);
  ctx.fillStyle = C.trunk;
  ctx.fillRect(TILE / 2 - 2, WALL_H - 18, 2, 16);

  const cx = TILE / 2;
  const cy = WALL_H - 22;
  for (let i = 5; i >= 0; i--) {
    const r = 2 + i * 1.1;
    ctx.fillStyle = withAlpha(i < 2 ? C.torchCore : C.torch, i < 2 ? 0.95 : 0.32 + rng() * 0.2);
    ctx.beginPath();
    ctx.ellipse(cx, cy - i * 0.8, r * 0.7, r, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawProp(
  ctx: CanvasRenderingContext2D,
  seed: number,
  kind: "crate" | "barrel" | "shelf" | "cauldron" | "desk" | "plant",
): void {
  const rng = makeRng(seed);
  const pad = 4;
  ctx.fillStyle = withAlpha("#000000", 0.25);
  ctx.beginPath();
  ctx.ellipse(TILE / 2, TILE - 3, 11, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  if (kind === "crate") {
    ctx.fillStyle = C.doorDark;
    ctx.fillRect(pad, pad + 4, TILE - pad * 2, TILE - pad * 2 - 4);
    ctx.fillStyle = C.floorWood;
    ctx.fillRect(pad + 2, pad + 6, TILE - pad * 2 - 4, TILE - pad * 2 - 8);
    ctx.fillStyle = C.door;
    ctx.fillRect(pad + 2, TILE / 2 - 1, TILE - pad * 2 - 4, 2);
    ctx.fillRect(TILE / 2 - 1, pad + 6, 2, TILE - pad * 2 - 8);
  } else if (kind === "barrel") {
    ctx.fillStyle = C.doorDark;
    ctx.beginPath();
    ctx.ellipse(TILE / 2, TILE / 2 + 2, 10, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.door;
    ctx.beginPath();
    ctx.ellipse(TILE / 2, TILE / 2 + 2, 8, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.iron;
    ctx.fillRect(TILE / 2 - 9, TILE / 2 - 2, 18, 2);
    ctx.fillRect(TILE / 2 - 9, TILE / 2 + 7, 18, 2);
  } else if (kind === "shelf") {
    ctx.fillStyle = C.doorDark;
    ctx.fillRect(pad, 0, TILE - pad * 2, TILE - 4);
    ctx.fillStyle = C.floorWood;
    ctx.fillRect(pad + 2, 2, TILE - pad * 2 - 4, TILE - 8);
    const bookCols = ["#a03b3b", "#3b6aa0", "#3ba06a", "#a08a3b", "#6a3ba0"];
    for (let s = 0; s < 3; s++) {
      const y = 4 + s * 9;
      ctx.fillStyle = C.doorDark;
      ctx.fillRect(pad + 2, y + 8, TILE - pad * 2 - 4, 1);
      for (let b = 0; b < 5; b++) {
        ctx.fillStyle = bookCols[Math.floor(rng() * bookCols.length)] ?? "#a03b3b";
        ctx.fillRect(pad + 4 + b * 4, y, 3, 8);
      }
    }
  } else if (kind === "cauldron") {
    ctx.fillStyle = C.iron;
    ctx.beginPath();
    ctx.ellipse(TILE / 2, TILE / 2 + 2, 11, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = C.ironLight;
    ctx.beginPath();
    ctx.ellipse(TILE / 2, TILE / 2 - 1, 9, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#6ce08a";
    ctx.beginPath();
    ctx.ellipse(TILE / 2, TILE / 2 - 1, 7, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = withAlpha("#c8ffd8", 0.85);
    ctx.beginPath();
    ctx.arc(TILE / 2 - 2, TILE / 2 - 3, 2, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === "desk") {
    ctx.fillStyle = C.doorDark;
    ctx.fillRect(pad, 6, TILE - pad * 2, 22);
    ctx.fillStyle = C.floorWood;
    ctx.fillRect(pad + 2, 8, TILE - pad * 2 - 4, 12);
    ctx.fillStyle = "#efe6cf";
    ctx.fillRect(pad + 5, 10, 8, 10);
    ctx.fillStyle = "#c9c1a8";
    ctx.fillRect(pad + 6, 11, 6, 1);
    ctx.fillRect(pad + 6, 13, 6, 1);
  } else {
    const potCols = [C.flowerRose, C.flowerGold, C.flowerViolet];
    ctx.fillStyle = "#8a5a3a";
    ctx.fillRect(TILE / 2 - 6, TILE - 14, 12, 11);
    ctx.fillStyle = C.leaves;
    ctx.beginPath();
    ctx.ellipse(TILE / 2, TILE - 18, 9, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = potCols[i % potCols.length] ?? C.flowerRose;
      ctx.beginPath();
      ctx.arc(TILE / 2 - 5 + i * 5, TILE - 21 + (i % 2) * 4, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawTree(
  ctx: CanvasRenderingContext2D,
  seed: number,
  w: number,
  h: number,
  kind: "oak" | "pine",
): void {
  const rng = makeRng(seed);
  const cx = w / 2;

  ctx.fillStyle = withAlpha("#000000", 0.22);
  ctx.beginPath();
  ctx.ellipse(cx, h - 4, w * 0.3, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = C.trunkDark;
  ctx.fillRect(cx - 4, h - 26, 8, 24);
  ctx.fillStyle = C.trunk;
  ctx.fillRect(cx - 4, h - 26, 4, 24);

  if (kind === "pine") {
    const layers = 4;
    for (let i = 0; i < layers; i++) {
      const t = i / (layers - 1);
      const y = h - 22 - i * ((h - 42) / layers);
      const half = w * 0.44 * (1 - t * 0.62);
      ctx.fillStyle = i % 2 === 0 ? C.pineDark : C.pine;
      ctx.beginPath();
      ctx.moveTo(cx, y - h * 0.24);
      ctx.lineTo(cx - half, y);
      ctx.lineTo(cx + half, y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = withAlpha(C.pineLight, 0.5);
      ctx.beginPath();
      ctx.moveTo(cx, y - h * 0.24);
      ctx.lineTo(cx - half * 0.45, y - h * 0.05);
      ctx.lineTo(cx + half * 0.2, y - h * 0.05);
      ctx.closePath();
      ctx.fill();
    }
  } else {
    const blobs = 7;
    for (let i = 0; i < blobs; i++) {
      const a = (i / blobs) * Math.PI * 2;
      const bx = cx + Math.cos(a) * w * 0.2;
      const by = h * 0.34 + Math.sin(a) * h * 0.13;
      const r = w * 0.24 + rng() * w * 0.07;
      ctx.fillStyle = i % 2 === 0 ? C.leavesDark : C.leaves;
      ctx.beginPath();
      ctx.arc(bx, by, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = C.leavesLight;
    ctx.beginPath();
    ctx.arc(cx - w * 0.1, h * 0.26, w * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = withAlpha(C.leavesLight, 0.75);
    ctx.beginPath();
    ctx.arc(cx + w * 0.14, h * 0.2, w * 0.13, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** A bare, split trunk with no canopy - the only thing that still stands in the ash. */
function drawDeadTree(ctx: CanvasRenderingContext2D, seed: number, w: number, h: number): void {
  const rng = makeRng(seed);
  const cx = w / 2;

  ctx.fillStyle = withAlpha("#000000", 0.22);
  ctx.beginPath();
  ctx.ellipse(cx, h - 4, w * 0.26, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  const trunkTop = h * 0.34;
  ctx.fillStyle = C.deadBarkDark;
  ctx.fillRect(cx - 5, trunkTop, 10, h - trunkTop - 4);
  ctx.fillStyle = C.deadBark;
  ctx.fillRect(cx - 5, trunkTop, 4, h - trunkTop - 4);

  // Angular limbs, thinning as they rise. Branches alternate sides so the
  // silhouette stays readable against the ash.
  const limbs = 4;
  for (let i = 0; i < limbs; i++) {
    const t = i / (limbs - 1);
    const y = trunkTop + (h - trunkTop) * 0.34 * t;
    const side = i % 2 === 0 ? -1 : 1;
    const reach = w * (0.3 + rng() * 0.18) * (1 - t * 0.3);
    const lift = h * (0.12 + rng() * 0.1);

    ctx.strokeStyle = i % 2 === 0 ? C.deadBarkDark : C.deadBark;
    ctx.lineWidth = i < 2 ? 3 : 2;
    ctx.beginPath();
    ctx.moveTo(cx, y);
    ctx.lineTo(cx + side * reach * 0.55, y - lift * 0.5);
    ctx.lineTo(cx + side * reach, y - lift);
    ctx.stroke();

    // A short fork off each limb.
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx + side * reach * 0.55, y - lift * 0.5);
    ctx.lineTo(cx + side * reach * 0.7, y - lift * 0.95);
    ctx.stroke();
  }
}

function drawBush(ctx: CanvasRenderingContext2D, seed: number, w: number, h: number): void {
  const rng = makeRng(seed);
  ctx.fillStyle = withAlpha("#000000", 0.2);
  ctx.beginPath();
  ctx.ellipse(w / 2, h - 3, w * 0.34, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  for (let i = 0; i < 4; i++) {
    const bx = w / 2 + (i - 1.5) * w * 0.16;
    ctx.fillStyle = i % 2 === 0 ? C.leavesDark : C.leaves;
    ctx.beginPath();
    ctx.arc(bx, h - 12 - rng() * 4, w * 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = C.leavesLight;
  ctx.beginPath();
  ctx.arc(w / 2, h - 19, w * 0.13, 0, Math.PI * 2);
  ctx.fill();
}

function drawRock(ctx: CanvasRenderingContext2D, seed: number, w: number, h: number): void {
  const rng = makeRng(seed);
  ctx.fillStyle = withAlpha("#000000", 0.22);
  ctx.beginPath();
  ctx.ellipse(w / 2, h - 3, w * 0.36, 4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = C.rockDark;
  ctx.beginPath();
  ctx.moveTo(w * 0.14, h - 4);
  ctx.lineTo(w * 0.26, h * 0.36);
  ctx.lineTo(w * 0.55, h * 0.2);
  ctx.lineTo(w * 0.84, h * 0.42);
  ctx.lineTo(w * 0.88, h - 4);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = C.rock;
  ctx.beginPath();
  ctx.moveTo(w * 0.22, h - 5);
  ctx.lineTo(w * 0.3, h * 0.44);
  ctx.lineTo(w * 0.54, h * 0.28);
  ctx.lineTo(w * 0.78, h * 0.48);
  ctx.lineTo(w * 0.8, h - 5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = C.rockLight;
  ctx.beginPath();
  ctx.moveTo(w * 0.32, h * 0.44);
  ctx.lineTo(w * 0.52, h * 0.3);
  ctx.lineTo(w * 0.58, h * 0.44);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 0.25;
  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = rng() > 0.5 ? C.rockLight : C.rockDark;
    ctx.fillRect(w * 0.2 + rng() * w * 0.6, h * 0.3 + rng() * h * 0.6, 2, 1);
  }
  ctx.globalAlpha = 1;
}

function drawDecal(ctx: CanvasRenderingContext2D, seed: number, petal: string, count: number): void {
  const rng = makeRng(seed);
  for (let i = 0; i < count; i++) {
    const x = 4 + Math.floor(rng() * (TILE - 8));
    const y = 4 + Math.floor(rng() * (TILE - 8));
    ctx.fillStyle = C.leavesDark;
    ctx.fillRect(x, y + 2, 1, 3);
    ctx.fillStyle = petal;
    ctx.fillRect(x - 1, y, 3, 2);
    ctx.fillStyle = shade(petal, 0.35);
    ctx.fillRect(x, y, 1, 1);
  }
}

function drawOrb(ctx: CanvasRenderingContext2D, size: number): void {
  const c = size / 2;
  for (let i = size / 2; i >= 0; i--) {
    const t = i / (size / 2);
    ctx.fillStyle = withAlpha(t > 0.55 ? C.magicCore : C.magic, (1 - t) * 0.9);
    ctx.beginPath();
    ctx.arc(c, c, i, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** Colour a pickup glows with, by item kind. */
const ITEM_TINT: Record<ItemKind, string> = {
  potion: C.flowerRose,
  wand: C.magic,
  key: C.gold,
  relic: C.magicCore,
  material: C.flowerWhite,
  book: C.flowerViolet,
  weapon: C.ironLight,
};

/**
 * A 16px icon per item kind. Keying the art off `ItemKind` rather than item id
 * means new items get a sensible icon for free.
 */
function drawItemIcon(ctx: CanvasRenderingContext2D, kind: ItemKind, size: number): void {
  const s = size;
  const mid = s / 2;
  ctx.lineWidth = 1;

  const outline = (fill: string) => {
    ctx.strokeStyle = "rgba(0,0,0,0.55)";
    ctx.stroke();
    ctx.fillStyle = fill;
    ctx.fill();
  };

  switch (kind) {
    case "potion": {
      ctx.beginPath();
      ctx.moveTo(mid - 2, s * 0.22);
      ctx.lineTo(mid - 4, s * 0.42);
      ctx.arc(mid, s * 0.64, s * 0.26, Math.PI * 1.15, Math.PI * 1.85, true);
      ctx.lineTo(mid + 2, s * 0.22);
      ctx.closePath();
      outline("#cfe3ec");
      ctx.fillStyle = C.flowerRose;
      ctx.beginPath();
      ctx.arc(mid, s * 0.66, s * 0.19, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = C.door;
      ctx.fillRect(mid - 3, s * 0.12, 6, 3);
      break;
    }
    case "wand": {
      ctx.strokeStyle = C.trunkDark;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(s * 0.26, s * 0.82);
      ctx.lineTo(s * 0.7, s * 0.28);
      ctx.stroke();
      ctx.fillStyle = C.magic;
      ctx.beginPath();
      ctx.arc(s * 0.74, s * 0.24, s * 0.16, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = C.magicCore;
      ctx.beginPath();
      ctx.arc(s * 0.74, s * 0.24, s * 0.07, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "key": {
      ctx.strokeStyle = C.gold;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(s * 0.36, s * 0.36, s * 0.16, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(s * 0.46, s * 0.46);
      ctx.lineTo(s * 0.74, s * 0.74);
      ctx.lineTo(s * 0.62, s * 0.86);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(s * 0.72, s * 0.6);
      ctx.lineTo(s * 0.84, s * 0.72);
      ctx.stroke();
      break;
    }
    case "relic": {
      ctx.beginPath();
      ctx.moveTo(mid, s * 0.12);
      ctx.lineTo(s * 0.82, mid);
      ctx.lineTo(mid, s * 0.88);
      ctx.lineTo(s * 0.18, mid);
      ctx.closePath();
      outline(C.magic);
      ctx.fillStyle = C.magicCore;
      ctx.beginPath();
      ctx.moveTo(mid, s * 0.3);
      ctx.lineTo(s * 0.68, mid);
      ctx.lineTo(mid, s * 0.7);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "material": {
      ctx.strokeStyle = C.flowerWhite;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(s * 0.28, s * 0.82);
      ctx.quadraticCurveTo(s * 0.42, s * 0.34, s * 0.82, s * 0.18);
      ctx.stroke();
      ctx.strokeStyle = C.uiDim;
      ctx.beginPath();
      ctx.moveTo(s * 0.34, s * 0.72);
      ctx.quadraticCurveTo(s * 0.5, s * 0.44, s * 0.74, s * 0.26);
      ctx.stroke();
      break;
    }
    case "book": {
      ctx.fillStyle = C.flowerViolet;
      ctx.fillRect(s * 0.18, s * 0.16, s * 0.64, s * 0.68);
      ctx.fillStyle = "#efe6cf";
      ctx.fillRect(s * 0.26, s * 0.22, s * 0.48, s * 0.56);
      ctx.strokeStyle = C.uiDim;
      ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(s * 0.32, s * 0.34 + i * 8);
        ctx.lineTo(s * 0.68, s * 0.34 + i * 8);
        ctx.stroke();
      }
      break;
    }
    default: {
      ctx.strokeStyle = C.ironLight;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(mid, s * 0.1);
      ctx.lineTo(mid, s * 0.72);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(s * 0.26, s * 0.62);
      ctx.lineTo(s * 0.74, s * 0.62);
      ctx.stroke();
      ctx.strokeStyle = C.door;
      ctx.beginPath();
      ctx.moveTo(mid, s * 0.66);
      ctx.lineTo(mid, s * 0.88);
      ctx.stroke();
      break;
    }
  }
}

export function itemIconKey(kind: ItemKind): string {
  return `item_${kind}`;
}

export function itemTint(kind: ItemKind): string {
  return ITEM_TINT[kind];
}

/** The pickup glow's tint as a Phaser colour integer. */
export function itemTintHex(kind: ItemKind): number {
  return Number.parseInt(ITEM_TINT[kind].slice(1), 16);
}

/** A crescent blade swipe, opening to the right so it can be rotated to a facing. */
function drawSlash(ctx: CanvasRenderingContext2D, size: number): void {
  const c = size / 2;
  const outer = size * 0.46;
  const inner = size * 0.29;

  ctx.beginPath();
  ctx.arc(c, c, outer, -1.0, 1.0);
  ctx.arc(c, c, inner, 1.0, -1.0, true);
  ctx.closePath();

  const grad = ctx.createLinearGradient(0, 0, size, size);
  grad.addColorStop(0, "rgba(255,255,255,0.15)");
  grad.addColorStop(0.5, "rgba(255,255,255,1)");
  grad.addColorStop(1, "rgba(255,255,255,0.15)");
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "rgba(255,255,255,0.85)";
  ctx.stroke();
}

export function buildTiles(scene: Phaser.Scene): void {
  // --- ground ---
  for (const kind of GROUND_KINDS) {
    const style = GROUND_STYLE[kind];
    for (let v = 0; v < GROUND_VARIANTS; v++) {
      const { tex, ctx } = canvasTex(scene, groundKey(kind, v), TILE, TILE);
      drawGround(ctx, style, 9001 + kind.length * 131 + v * 977);
      commit({ tex, ctx });
    }
  }

  // --- structure shells ---
  const walls: Array<[string, string, string, string, string]> = [
    ["st_wall_stone", C.wallStone, C.wallStoneDark, C.wallStoneLight, C.wallStoneLight],
    ["st_wall_wood", C.wallWood, C.wallWoodDark, shade(C.wallWood, 0.2), shade(C.wallWood, 0.1)],
    ["st_wall_plaster", C.wallPlaster, C.wallPlasterDark, "#f0e8d6", C.roofSlate],
  ];
  for (let i = 0; i < walls.length; i++) {
    const w = walls[i];
    if (!w) continue;
    const { tex, ctx } = canvasTex(scene, w[0], TILE, WALL_H);
    drawWallBlock(ctx, 4400 + i * 313, w[1], w[2], w[3], w[4]);
    commit({ tex, ctx });
  }

  const floors: Array<[string, string, string, boolean]> = [
    ["st_floor_wood", C.floorWood, C.floorWoodDark, true],
    ["st_floor_stone", C.floorStone, C.floorStoneDark, false],
    ["st_floor_carpet", C.floorCarpet, C.floorCarpetDark, false],
  ];
  for (let i = 0; i < floors.length; i++) {
    const f = floors[i];
    if (!f) continue;
    const { tex, ctx } = canvasTex(scene, f[0], TILE, TILE);
    drawFloor(ctx, 5500 + i * 617, f[1], f[2], f[3]);
    commit({ tex, ctx });
  }

  for (const key of ["st_roof_slate", "st_roof_thatch"] as const) {
    const isSlate = key === "st_roof_slate";
    const { tex, ctx } = canvasTex(scene, key, TILE, TILE);
    const rng = makeRng(isSlate ? 771 : 883);
    const base = isSlate ? C.roofSlate : C.roofThatch;
    const dark = isSlate ? C.roofSlateDark : C.roofThatchDark;
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, TILE, TILE);
    ctx.fillStyle = dark;
    for (let y = 4; y < TILE; y += 8) {
      ctx.fillRect(0, y, TILE, 2);
      const off = ((y - 4) / 8) % 2 === 0 ? 0 : 8;
      for (let x = off; x < TILE; x += 16) ctx.fillRect(x, y - 4, 1, 4);
    }
    ctx.globalAlpha = 0.25;
    for (let i = 0; i < 20; i++) {
      ctx.fillStyle = rng() > 0.5 ? shade(base, 0.2) : dark;
      ctx.fillRect(Math.floor(rng() * TILE), Math.floor(rng() * TILE), 2 + Math.floor(rng() * 4), 1);
    }
    ctx.globalAlpha = 1;
    commit({ tex, ctx });
  }

  {
    const { tex, ctx } = canvasTex(scene, "st_door", TILE, WALL_H);
    drawDoor(ctx, 3131);
    commit({ tex, ctx });
  }
  {
    const { tex, ctx } = canvasTex(scene, "st_torch", TILE, WALL_H);
    drawTorch(ctx, 4141);
    commit({ tex, ctx });
  }

  const props: Array<["crate" | "barrel" | "shelf" | "cauldron" | "desk" | "plant", string]> = [
    ["crate", "st_prop_crate"],
    ["barrel", "st_prop_barrel"],
    ["shelf", "st_prop_shelf"],
    ["cauldron", "st_prop_cauldron"],
    ["desk", "st_prop_desk"],
    ["plant", "st_prop_plant"],
  ];
  for (let i = 0; i < props.length; i++) {
    const p = props[i];
    if (!p) continue;
    const { tex, ctx } = canvasTex(scene, p[1], TILE, TILE);
    drawProp(ctx, 2200 + i * 457, p[0]);
    commit({ tex, ctx });
  }

  // --- world props (depth-sorted sprites) ---
  const treeDefs: Array<[string, number, number, "oak" | "pine", number]> = [
    ["prop_oak", 64, 84, "oak", 11],
    ["prop_oak_small", 48, 64, "oak", 12],
    ["prop_pine", 48, 96, "pine", 13],
    ["prop_pine_small", 40, 72, "pine", 14],
  ];
  for (const [key, w, h, kind, seed] of treeDefs) {
    const { tex, ctx } = canvasTex(scene, key, w, h);
    drawTree(ctx, seed * 991, w, h, kind);
    commit({ tex, ctx });
  }

  const bushDefs: Array<[string, number, number, number]> = [
    ["prop_bush", 34, 28, 21],
    ["prop_bush_small", 24, 20, 22],
  ];
  for (const [key, w, h, seed] of bushDefs) {
    const { tex, ctx } = canvasTex(scene, key, w, h);
    drawBush(ctx, seed * 331, w, h);
    commit({ tex, ctx });
  }

  const rockDefs: Array<[string, number, number, number]> = [
    ["prop_rock", 32, 28, 31],
    ["prop_rock_small", 22, 18, 32],
  ];
  for (const [key, w, h, seed] of rockDefs) {
    const { tex, ctx } = canvasTex(scene, key, w, h);
    drawRock(ctx, seed * 733, w, h);
    commit({ tex, ctx });
  }

  {
    const { tex, ctx } = canvasTex(scene, "prop_deadtree", 48, 78);
    drawDeadTree(ctx, 1717, 48, 78);
    commit({ tex, ctx });
  }

  // --- item icons, one per kind ---
  const kinds: ItemKind[] = ["potion", "wand", "key", "relic", "material", "book", "weapon"];
  for (const kind of kinds) {
    const { tex, ctx } = canvasTex(scene, itemIconKey(kind), 20, 20);
    drawItemIcon(ctx, kind, 20);
    commit({ tex, ctx });
  }

  const decals: Array<[string, string, number, number]> = [
    ["decal_flowers_rose", C.flowerRose, 41, 3],
    ["decal_flowers_gold", C.flowerGold, 42, 4],
    ["decal_flowers_violet", C.flowerViolet, 43, 3],
    ["decal_flowers_white", C.flowerWhite, 44, 4],
  ];
  for (const [key, petal, seed, count] of decals) {
    const { tex, ctx } = canvasTex(scene, key, TILE, TILE);
    drawDecal(ctx, seed * 127, petal, count);
    commit({ tex, ctx });
  }

  // --- fx ---
  {
    const { tex, ctx } = canvasTex(scene, "fx_shadow", 28, 14);
    const grad = ctx.createRadialGradient(14, 7, 1, 14, 7, 14);
    grad.addColorStop(0, "rgba(0,0,0,0.42)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 28, 14);
    commit({ tex, ctx });
  }
  {
    const { tex, ctx } = canvasTex(scene, "fx_orb", 20, 20);
    drawOrb(ctx, 20);
    commit({ tex, ctx });
  }
  {
    const { tex, ctx } = canvasTex(scene, "fx_slash", 72, 72);
    drawSlash(ctx, 72);
    commit({ tex, ctx });
  }
  {
    const { tex, ctx } = canvasTex(scene, "fx_spark", 6, 6);
    ctx.fillStyle = C.magicCore;
    ctx.fillRect(0, 0, 6, 6);
    commit({ tex, ctx });
  }
  {
    // A soft vignette-ish light used for torches and spell flashes.
    const { tex, ctx } = canvasTex(scene, "fx_glow", 128, 128);
    const grad = ctx.createRadialGradient(64, 64, 2, 64, 64, 64);
    grad.addColorStop(0, withAlpha(C.torch, 0.5));
    grad.addColorStop(0.5, withAlpha(C.torch, 0.16));
    grad.addColorStop(1, withAlpha(C.torch, 0));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    commit({ tex, ctx });
  }
  {
    const { tex, ctx } = canvasTex(scene, "fx_glow_cool", 128, 128);
    const grad = ctx.createRadialGradient(64, 64, 2, 64, 64, 64);
    grad.addColorStop(0, withAlpha(C.magic, 0.5));
    grad.addColorStop(0.5, withAlpha(C.magic, 0.16));
    grad.addColorStop(1, withAlpha(C.magic, 0));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 128, 128);
    commit({ tex, ctx });
  }
  {
    const { tex, ctx } = canvasTex(scene, "fx_pixel", 1, 1);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 1, 1);
    commit({ tex, ctx });
  }

  void mix;
}
