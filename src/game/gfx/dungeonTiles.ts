import type Phaser from "phaser";

import { TILE } from "../config";
import { makeRng } from "../world/noise";
import { canvasTex, commit } from "./canvas";
import { LIGHT_EMITTERS } from "./lights";
import type { LightSpec } from "./lights";
import { mix, shade, withAlpha } from "./palette";
import { WALL_H } from "./tiles";

/**
 * Textures for the Academy, its grounds and the tombs: every floor, wall,
 * furnishing and mechanism the levels in data/levels use. Like the rest of
 * Korvana's art these are drawn in code at boot.
 *
 * Keys are prefixed `dg_`. Multi-tile pieces (towers, the great door, the
 * fountain) are painted whole and sliced into one texture per tile column, so
 * the structure stamper can place them one tile at a time and still have them
 * line up.
 */

type Draw = (ctx: CanvasRenderingContext2D, w: number, h: number) => void;

/** House colours, from docs/DESIGN.md. */
export const HOUSE_COLOURS: Record<string, { field: string; trim: string; dark: string }> = {
  emberhart: { field: "#a3302a", trim: "#d8b04e", dark: "#6e1d19" },
  thornwick: { field: "#4c7a38", trim: "#e9e0c6", dark: "#2f4f22" },
  ravelle: { field: "#26326a", trim: "#c9cfdc", dark: "#161d42" },
  stillwater: { field: "#2c6a6f", trim: "#f1ebe0", dark: "#1a4246" },
};
const HOUSES = ["emberhart", "thornwick", "ravelle", "stillwater"] as const;

interface StoneSet {
  face: string;
  dark: string;
  light: string;
  cap: string;
  floor: string;
  floorDark: string;
  floorLight: string;
  flame: string;
}

const SETS: Record<"crypt" | "barrow" | "reliquary" | "hall", StoneSet> = {
  crypt: {
    face: "#57555f",
    dark: "#393840",
    light: "#706e7a",
    cap: "#2b2a31",
    floor: "#46454c",
    floorDark: "#34333a",
    floorLight: "#5a5962",
    flame: "#ffb35a",
  },
  barrow: {
    face: "#5e4a35",
    dark: "#3e3022",
    light: "#78624a",
    cap: "#2e241a",
    floor: "#4d3f2f",
    floorDark: "#3a2f22",
    floorLight: "#64523e",
    flame: "#ffa64a",
  },
  reliquary: {
    face: "#cfc8ba",
    dark: "#9d9586",
    light: "#ece7dc",
    cap: "#8c8577",
    floor: "#d6d1c6",
    floorDark: "#b3ad9f",
    floorLight: "#eeeae1",
    flame: "#bfe4ff",
  },
  hall: {
    face: "#9c8c70",
    dark: "#6f634e",
    light: "#b9a988",
    cap: "#4d4436",
    floor: "#8f8a80",
    floorDark: "#6f6a62",
    floorLight: "#a8a398",
    flame: "#ffbe5c",
  },
};

// --- small helpers ---------------------------------------------------------

function tex(scene: Phaser.Scene, key: string, w: number, h: number, draw: Draw): void {
  const t = canvasTex(scene, key, w, h);
  draw(t.ctx, w, h);
  commit(t);
}

/** Paints one picture `cols` tiles wide and slices it into `${prefix}${i}` column textures. */
function sliced(scene: Phaser.Scene, prefix: string, cols: number, h: number, draw: Draw): void {
  const canvas = document.createElement("canvas");
  canvas.width = cols * TILE;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.imageSmoothingEnabled = false;
  draw(ctx, cols * TILE, h);
  for (let i = 0; i < cols; i++) {
    const t = canvasTex(scene, `${prefix}${i}`, TILE, h);
    t.ctx.drawImage(canvas, i * TILE, 0, TILE, h, 0, 0, TILE, h);
    commit(t);
  }
}

function rect(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, w: number, h: number): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function ellipse(ctx: CanvasRenderingContext2D, color: string, x: number, y: number, rx: number, ry: number): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2);
  ctx.fill();
}

function noise(ctx: CanvasRenderingContext2D, seed: number, x: number, y: number, w: number, h: number, colors: string[], count: number, alpha = 0.3): void {
  const rng = makeRng(seed);
  ctx.globalAlpha = alpha;
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = colors[Math.floor(rng() * colors.length)] ?? "#000";
    ctx.fillRect(x + Math.floor(rng() * w), y + Math.floor(rng() * h), 1 + Math.floor(rng() * 2), 1);
  }
  ctx.globalAlpha = 1;
}

function shadowBlob(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, a = 0.3): void {
  ellipse(ctx, withAlpha("#000000", a), cx, cy, rx, ry);
}

function flame(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, color: string, seed: number): void {
  const rng = makeRng(seed);
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, size * 2.6);
  glow.addColorStop(0, withAlpha(color, 0.45));
  glow.addColorStop(1, withAlpha(color, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(cx - size * 3, cy - size * 3, size * 6, size * 6);
  for (let i = 4; i >= 0; i--) {
    const r = size * (0.35 + i * 0.16);
    const core = i < 2;
    ctx.fillStyle = core ? withAlpha("#fff6d0", 0.95) : withAlpha(color, 0.55 + rng() * 0.3);
    ctx.beginPath();
    ctx.ellipse(cx + (rng() - 0.5) * 1.5, cy - i * size * 0.18, r * 0.7, r * 1.15, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

// --- floors ----------------------------------------------------------------

/** Irregular flagstones: offset courses of slabs with mortar between. */
function flagstones(ctx: CanvasRenderingContext2D, seed: number, base: string, dark: string, light: string): void {
  const rng = makeRng(seed);
  rect(ctx, dark, 0, 0, TILE, TILE);
  const rows = [0, 11, 21, 32];
  for (let r = 0; r < 3; r++) {
    const y0 = rows[r]!;
    const y1 = rows[r + 1]!;
    let x = -Math.floor(rng() * 10);
    while (x < TILE) {
      const w = 9 + Math.floor(rng() * 9);
      const tone = mix(base, rng() > 0.5 ? light : dark, rng() * 0.25);
      rect(ctx, tone, x + 1, y0 + 1, w - 1, y1 - y0 - 1);
      rect(ctx, withAlpha(light, 0.35), x + 1, y0 + 1, w - 1, 1);
      x += w;
    }
  }
  noise(ctx, seed + 7, 0, 0, TILE, TILE, [dark, light], 26, 0.25);
}

function floorSet(scene: Phaser.Scene): void {
  const crypt = SETS.crypt;
  tex(scene, "dg_floor_crypt", TILE, TILE, (ctx) => flagstones(ctx, 101, crypt.floor, crypt.floorDark, crypt.floorLight));
  tex(scene, "dg_floor_crypt_moss", TILE, TILE, (ctx) => {
    flagstones(ctx, 102, crypt.floor, crypt.floorDark, crypt.floorLight);
    const rng = makeRng(103);
    for (let i = 0; i < 5; i++) ellipse(ctx, withAlpha("#4f6b3a", 0.55), rng() * TILE, rng() * TILE, 3 + rng() * 4, 2 + rng() * 2);
    noise(ctx, 104, 0, 0, TILE, TILE, ["#6c8a4a", "#3d5530"], 30, 0.5);
  });

  const barrow = SETS.barrow;
  tex(scene, "dg_floor_barrow", TILE, TILE, (ctx) => {
    rect(ctx, barrow.floor, 0, 0, TILE, TILE);
    noise(ctx, 111, 0, 0, TILE, TILE, [barrow.floorDark, barrow.floorLight, "#5c4a36"], 90, 0.45);
    const rng = makeRng(112);
    for (let i = 0; i < 4; i++) ellipse(ctx, mix(barrow.floorLight, "#8a8070", 0.4), rng() * TILE, rng() * TILE, 1.5, 1);
    // a root creeping across
    ctx.strokeStyle = withAlpha("#2b1f14", 0.55);
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, 6 + rng() * 20);
    ctx.quadraticCurveTo(14, rng() * TILE, TILE, 8 + rng() * 18);
    ctx.stroke();
  });
  tex(scene, "dg_floor_barrow_stone", TILE, TILE, (ctx) => flagstones(ctx, 113, "#6a5a48", "#43372a", "#857260"));

  const rel = SETS.reliquary;
  const marble = (ctx: CanvasRenderingContext2D, seed: number): void => {
    rect(ctx, rel.floor, 0, 0, TILE, TILE);
    rect(ctx, rel.floorLight, 0, 0, 16, 16);
    rect(ctx, rel.floorLight, 16, 16, 16, 16);
    ctx.strokeStyle = withAlpha("#9e9788", 0.45);
    ctx.lineWidth = 1;
    const rng = makeRng(seed);
    for (let i = 0; i < 2; i++) {
      ctx.beginPath();
      ctx.moveTo(rng() * TILE, 0);
      ctx.bezierCurveTo(rng() * TILE, 10, rng() * TILE, 22, rng() * TILE, TILE);
      ctx.stroke();
    }
    rect(ctx, withAlpha(rel.floorDark, 0.6), 0, 0, TILE, 1);
    rect(ctx, withAlpha(rel.floorDark, 0.6), 0, 0, 1, TILE);
  };
  tex(scene, "dg_floor_marble", TILE, TILE, (ctx) => marble(ctx, 121));
  tex(scene, "dg_floor_marble_inlay", TILE, TILE, (ctx) => {
    marble(ctx, 122);
    ctx.strokeStyle = "#c9a85a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(16, 3);
    ctx.lineTo(29, 16);
    ctx.lineTo(16, 29);
    ctx.lineTo(3, 16);
    ctx.closePath();
    ctx.stroke();
    ellipse(ctx, "#d9b864", 16, 16, 2.5, 2.5);
  });

  // --- the Academy ---
  const hall = SETS.hall;
  tex(scene, "dg_floor_hall", TILE, TILE, (ctx) => {
    // Polished checker of two stones.
    rect(ctx, "#8d8a84", 0, 0, TILE, TILE);
    rect(ctx, "#6e6a66", 0, 0, 16, 16);
    rect(ctx, "#6e6a66", 16, 16, 16, 16);
    rect(ctx, withAlpha("#ffffff", 0.08), 1, 1, 14, 2);
    rect(ctx, withAlpha("#ffffff", 0.08), 17, 17, 14, 2);
    noise(ctx, 131, 0, 0, TILE, TILE, [hall.floorDark, hall.floorLight], 18, 0.2);
  });
  tex(scene, "dg_carpet", TILE, TILE, (ctx) => {
    rect(ctx, "#6d1f2a", 0, 0, TILE, TILE);
    rect(ctx, "#8a2b36", 3, 0, TILE - 6, TILE);
    rect(ctx, "#c9a24a", 3, 0, 1, TILE);
    rect(ctx, "#c9a24a", TILE - 4, 0, 1, TILE);
    for (let y = 4; y < TILE; y += 16) {
      ctx.fillStyle = "#b8923f";
      ctx.beginPath();
      ctx.moveTo(16, y);
      ctx.lineTo(20, y + 4);
      ctx.lineTo(16, y + 8);
      ctx.lineTo(12, y + 4);
      ctx.closePath();
      ctx.fill();
    }
    noise(ctx, 132, 0, 0, TILE, TILE, ["#5a1822", "#9a3442"], 30, 0.3);
  });
  tex(scene, "dg_floor_parquet", TILE, TILE, (ctx) => {
    rect(ctx, "#7a5634", 0, 0, TILE, TILE);
    for (let by = 0; by < 2; by++) {
      for (let bx = 0; bx < 2; bx++) {
        const horizontal = (bx + by) % 2 === 0;
        for (let i = 0; i < 4; i++) {
          const tone = i % 2 ? "#8e6640" : "#835c38";
          if (horizontal) rect(ctx, tone, bx * 16, by * 16 + i * 4, 16, 3);
          else rect(ctx, tone, bx * 16 + i * 4, by * 16, 3, 16);
        }
      }
    }
    noise(ctx, 133, 0, 0, TILE, TILE, ["#5e4128", "#a07650"], 24, 0.3);
  });
  tex(scene, "dg_dais", TILE, TILE, (ctx) => {
    rect(ctx, "#b9b2a4", 0, 0, TILE, TILE);
    rect(ctx, "#cfc8ba", 1, 1, 14, 14);
    rect(ctx, "#cfc8ba", 17, 17, 14, 14);
    rect(ctx, "#c4bcac", 17, 1, 14, 14);
    rect(ctx, "#c4bcac", 1, 17, 14, 14);
    noise(ctx, 134, 0, 0, TILE, TILE, ["#a39c8e", "#e2dccf"], 20, 0.3);
  });
  tex(scene, "dg_dais_step", TILE, TILE, (ctx) => {
    rect(ctx, "#a49c8d", 0, 0, TILE, TILE);
    rect(ctx, "#cfc8ba", 0, 0, TILE, 10);
    rect(ctx, "#8a8274", 0, 10, TILE, 3);
    rect(ctx, "#bdb5a6", 0, 13, TILE, 9);
    rect(ctx, "#7d7568", 0, 22, TILE, 3);
    rect(ctx, "#8f8a80", 0, 25, TILE, 7);
  });

  // --- the grounds ---
  tex(scene, "dg_cobble", TILE, TILE, (ctx) => {
    rect(ctx, "#5f5c58", 0, 0, TILE, TILE);
    const rng = makeRng(141);
    for (let y = 0; y < TILE; y += 8) {
      const off = (y / 8) % 2 ? 4 : 0;
      for (let x = -off; x < TILE; x += 8) {
        const tone = mix("#8d8880", "#a39e94", rng());
        ellipse(ctx, tone, x + 4, y + 4, 3.4, 3);
        rect(ctx, withAlpha("#ffffff", 0.15), x + 2, y + 2, 3, 1);
      }
    }
  });
  tex(scene, "dg_gravel", TILE, TILE, (ctx) => {
    rect(ctx, "#a08d6e", 0, 0, TILE, TILE);
    noise(ctx, 142, 0, 0, TILE, TILE, ["#8a7a5e", "#bba98a", "#76684f"], 140, 0.6);
  });
  tex(scene, "dg_flowerbed", TILE, TILE, (ctx) => {
    rect(ctx, "#4a3a28", 0, 0, TILE, TILE);
    noise(ctx, 143, 0, 0, TILE, TILE, ["#3a2c1e", "#5a4632"], 60, 0.5);
    const rng = makeRng(144);
    const petals = ["#e05a7a", "#f0d05a", "#b98ce0", "#f2f0e6", "#e88a3a"];
    for (let i = 0; i < 9; i++) {
      const x = 3 + rng() * 26;
      const y = 3 + rng() * 26;
      ellipse(ctx, "#3f7a35", x, y + 2, 3, 2);
      ellipse(ctx, petals[Math.floor(rng() * petals.length)] ?? "#e05a7a", x, y, 2, 2);
    }
  });
  tex(scene, "dg_steps", TILE, TILE, (ctx) => {
    for (let i = 0; i < 4; i++) {
      rect(ctx, i % 2 ? "#8a8d94" : "#a2a5ac", 0, i * 8, TILE, 8);
      rect(ctx, "#5f6168", 0, i * 8 + 7, TILE, 1);
    }
  });
  tex(scene, "dg_threshold", TILE, TILE, (ctx) => {
    rect(ctx, "#6c6458", 0, 0, TILE, TILE);
    rect(ctx, "#8a8070", 2, 4, TILE - 4, TILE - 8);
    noise(ctx, 145, 0, 0, TILE, TILE, ["#4e473e", "#9a9080"], 30, 0.4);
  });
  tex(scene, "dg_castle_roof", TILE, TILE, (ctx) => {
    rect(ctx, "#3d4256", 0, 0, TILE, TILE);
    for (let y = 0; y < TILE; y += 6) {
      const off = (y / 6) % 2 ? 4 : 0;
      for (let x = -off; x < TILE; x += 8) {
        rect(ctx, "#4b5168", x + 1, y, 7, 5);
        rect(ctx, "#2c3040", x, y + 5, 8, 1);
      }
    }
  });
  tex(scene, "dg_castle_roof_ridge", TILE, TILE, (ctx) => {
    rect(ctx, "#3d4256", 0, 0, TILE, TILE);
    rect(ctx, "#2a2e3d", 0, 12, TILE, 8);
    rect(ctx, "#6a6f84", 0, 12, TILE, 2);
    rect(ctx, "#b89a4a", 14, 6, 4, 12);
  });
  tex(scene, "dg_mound", TILE, TILE, (ctx) => {
    rect(ctx, "#3d6a32", 0, 0, TILE, TILE);
    noise(ctx, 146, 0, 0, TILE, TILE, ["#2f5428", "#4f8040", "#6a9a50"], 120, 0.55);
  });
  tex(scene, "dg_cliff", TILE, TILE, (ctx) => {
    rect(ctx, "#6a6b70", 0, 0, TILE, TILE);
    noise(ctx, 147, 0, 0, TILE, TILE, ["#505157", "#84858b"], 90, 0.5);
    rect(ctx, withAlpha("#ffffff", 0.08), 0, 0, TILE, 2);
  });

  // --- water, pits and the like ---
  tex(scene, "dg_water_shallow", TILE, TILE, (ctx) => {
    flagstones(ctx, 151, crypt.floor, crypt.floorDark, crypt.floorLight);
    rect(ctx, withAlpha("#2c6a86", 0.55), 0, 0, TILE, TILE);
    rect(ctx, withAlpha("#9fd4e6", 0.35), 4, 9, 9, 1);
    rect(ctx, withAlpha("#9fd4e6", 0.3), 18, 21, 8, 1);
  });
  for (let f = 0; f < 2; f++) {
    tex(scene, `dg_water_deep_${f}`, TILE, TILE, (ctx) => {
      rect(ctx, "#123246", 0, 0, TILE, TILE);
      const rng = makeRng(161 + f * 7);
      for (let i = 0; i < 4; i++) {
        rect(ctx, withAlpha("#4f94b4", 0.5), Math.floor(rng() * 26), Math.floor(rng() * 30), 4 + Math.floor(rng() * 5), 1);
      }
      noise(ctx, 162 + f, 0, 0, TILE, TILE, ["#0c2433", "#1d4a63"], 40, 0.5);
    });
  }
  tex(scene, "dg_water_deep", TILE, TILE, (ctx) => {
    ctx.drawImage(scene.textures.get("dg_water_deep_0").getSourceImage() as CanvasImageSource, 0, 0);
  });
  tex(scene, "dg_mud", TILE, TILE, (ctx) => {
    flagstones(ctx, 171, "#4a463c", "#33302a", "#5c5848");
    rect(ctx, withAlpha("#2a2a20", 0.35), 0, 0, TILE, TILE);
    ellipse(ctx, withAlpha("#5b7f8a", 0.35), 10, 20, 6, 2);
    ellipse(ctx, withAlpha("#5b7f8a", 0.3), 24, 8, 4, 1.5);
  });
  tex(scene, "dg_chasm", TILE, TILE, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, TILE);
    g.addColorStop(0, "#0b0a0e");
    g.addColorStop(1, "#020203");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, TILE, TILE);
    noise(ctx, 172, 0, 0, TILE, TILE, ["#1a1820", "#000000"], 20, 0.6);
  });
  tex(scene, "dg_pit", TILE, TILE, (ctx) => {
    rect(ctx, "#020203", 0, 0, TILE, TILE);
    rect(ctx, "#2a2730", 0, 0, TILE, 3);
    rect(ctx, "#16141a", 0, 3, TILE, 4);
    rect(ctx, withAlpha("#000000", 0.6), 0, TILE - 2, TILE, 2);
  });
  tex(scene, "dg_stairs_up", TILE, TILE, (ctx) => {
    for (let i = 0; i < 5; i++) {
      const t = i / 4;
      rect(ctx, mix("#2a2930", "#8a8892", 1 - t), 0, i * 6.4, TILE, 6.4);
      rect(ctx, withAlpha("#ffffff", 0.18 * (1 - t)), 0, i * 6.4, TILE, 1);
    }
    rect(ctx, "#1d1c22", 0, 0, 2, TILE);
    rect(ctx, "#1d1c22", TILE - 2, 0, 2, TILE);
  });
}

// --- walls -----------------------------------------------------------------

function wallFace(ctx: CanvasRenderingContext2D, s: StoneSet, seed: number, h = WALL_H): void {
  const rng = makeRng(seed);
  rect(ctx, s.cap, 0, 0, TILE, 10);
  rect(ctx, shade(s.cap, 0.12), 0, 0, TILE, 2);
  rect(ctx, s.dark, 0, 10, TILE, 2);
  rect(ctx, s.face, 0, 12, TILE, h - 12);
  let row = 0;
  for (let y = 12; y < h; y += 8) {
    rect(ctx, s.dark, 0, y, TILE, 1);
    const off = row % 2 === 0 ? 0 : 7;
    for (let x = off; x < TILE; x += 14) rect(ctx, s.dark, x, y, 1, Math.min(8, h - y));
    for (let x = off + 1; x < TILE; x += 14) rect(ctx, withAlpha(s.light, 0.35), x, y + 1, 12, 1);
    row++;
  }
  noise(ctx, seed + 1, 0, 12, TILE, h - 12, [s.light, s.dark], 26, 0.25);
  // Weathering darker towards the floor.
  const g = ctx.createLinearGradient(0, h - 14, 0, h);
  g.addColorStop(0, withAlpha("#000000", 0));
  g.addColorStop(1, withAlpha("#000000", 0.32));
  ctx.fillStyle = g;
  ctx.fillRect(0, h - 14, TILE, 14);
  void rng;
}

function wallTop(ctx: CanvasRenderingContext2D, s: StoneSet, seed: number): void {
  rect(ctx, s.cap, 0, 0, TILE, WALL_H);
  noise(ctx, seed, 0, 0, TILE, WALL_H, [shade(s.cap, 0.1), shade(s.cap, -0.2)], 30, 0.4);
  rect(ctx, shade(s.cap, 0.14), 0, 0, TILE, 1);
  rect(ctx, s.dark, 0, WALL_H - 4, TILE, 4);
  rect(ctx, withAlpha("#000000", 0.35), 0, WALL_H - 2, TILE, 2);
}

function crack(ctx: CanvasRenderingContext2D, seed: number, color: string): void {
  const rng = makeRng(seed);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.4;
  for (let k = 0; k < 2; k++) {
    let x = 8 + rng() * 16;
    let y = 14;
    ctx.beginPath();
    ctx.moveTo(x, y);
    while (y < WALL_H - 4) {
      x += (rng() - 0.5) * 9;
      y += 4 + rng() * 5;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

function mural(ctx: CanvasRenderingContext2D, s: StoneSet, seed: number, ink: string): void {
  wallFace(ctx, s, seed);
  rect(ctx, shade(s.face, -0.25), 3, 15, TILE - 6, WALL_H - 20);
  rect(ctx, shade(s.face, 0.1), 4, 16, TILE - 8, WALL_H - 22);
  ctx.strokeStyle = ink;
  ctx.lineWidth = 1;
  ctx.beginPath();
  // a carved figure under an arch of stars
  ctx.arc(16, 28, 8, Math.PI, 0);
  ctx.stroke();
  ellipse(ctx, ink, 16, 24, 2, 2);
  rect(ctx, ink, 15, 26, 2, 9);
  for (let i = 0; i < 5; i++) rect(ctx, ink, 7 + i * 4, 19 - (i % 2), 1, 1);
}

function wallSets(scene: Phaser.Scene): void {
  const sets = [
    ["crypt", SETS.crypt, "#a49a7a"],
    ["barrow", SETS.barrow, "#c9a86a"],
    ["reliquary", SETS.reliquary, "#b8902e"],
    ["hall", SETS.hall, "#4d3a20"],
  ] as const;
  sets.forEach(([name, s, ink], i) => {
    const seed = 300 + i * 40;
    tex(scene, `dg_wall_${name}`, TILE, WALL_H, (ctx) => {
      wallFace(ctx, s, seed);
      if (name === "barrow") {
        // roots creeping down the face
        ctx.strokeStyle = "#2a1d12";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(6, 10);
        ctx.quadraticCurveTo(10, 24, 5, 40);
        ctx.stroke();
      }
      if (name === "reliquary") rect(ctx, "#c9a85a", 0, 12, TILE, 2);
      if (name === "hall") {
        // a wainscot of dark wood below the ashlar
        rect(ctx, "#5a3c24", 0, WALL_H - 14, TILE, 14);
        rect(ctx, "#6e4b2e", 0, WALL_H - 14, TILE, 2);
        rect(ctx, "#47301c", 15, WALL_H - 12, 2, 12);
      }
    });
    tex(scene, `dg_wall_${name}_top`, TILE, WALL_H, (ctx) => wallTop(ctx, s, seed + 5));
    tex(scene, `dg_wall_${name}_cracked`, TILE, WALL_H, (ctx) => {
      wallFace(ctx, s, seed + 9);
      crack(ctx, seed + 10, shade(s.dark, -0.4));
      rect(ctx, withAlpha(s.light, 0.5), 10, 30, 3, 2);
    });
    tex(scene, `dg_wall_${name}_cracked_top`, TILE, WALL_H, (ctx) => {
      wallTop(ctx, s, seed + 11);
      crack(ctx, seed + 12, shade(s.cap, -0.5));
    });
    tex(scene, `dg_wall_${name}_torch`, TILE, WALL_H, (ctx) => {
      wallFace(ctx, s, seed + 13);
      rect(ctx, "#2c2620", 14, 24, 4, 10);
      rect(ctx, "#4a3e30", 12, 22, 8, 3);
      flame(ctx, 16, 17, 4, s.flame, seed + 14);
    });
    tex(scene, `dg_wall_${name}_mural`, TILE, WALL_H, (ctx) => mural(ctx, s, seed + 15, ink));
    for (const face of ["face", "top"] as const) {
      tex(scene, `dg_dart_${name}_${face}`, TILE, WALL_H, (ctx) => {
        if (face === "face") wallFace(ctx, s, seed + 17);
        else wallTop(ctx, s, seed + 18);
        const y = face === "face" ? 28 : WALL_H - 10;
        rect(ctx, shade(s.dark, -0.3), 11, y, 10, 6);
        rect(ctx, "#050505", 13, y + 1, 6, 4);
        rect(ctx, withAlpha(s.light, 0.4), 11, y, 10, 1);
      });
    }
    tex(scene, `dg_pillar_${name}`, TILE, 64, (ctx) => {
      shadowBlob(ctx, 16, 60, 13, 4);
      rect(ctx, s.dark, 6, 54, 20, 8);
      rect(ctx, s.light, 6, 54, 20, 2);
      const g = ctx.createLinearGradient(8, 0, 24, 0);
      g.addColorStop(0, s.dark);
      g.addColorStop(0.4, s.light);
      g.addColorStop(1, s.dark);
      ctx.fillStyle = g;
      ctx.fillRect(9, 10, 14, 44);
      for (let x = 11; x < 23; x += 4) rect(ctx, withAlpha(s.dark, 0.5), x, 10, 1, 44);
      rect(ctx, s.dark, 5, 4, 22, 7);
      rect(ctx, s.light, 5, 4, 22, 2);
      if (name === "reliquary") rect(ctx, "#c9a85a", 5, 9, 22, 2);
    });
    tex(scene, `dg_bones_${name}`, TILE, TILE, (ctx) => {
      if (name === "barrow") {
        rect(ctx, s.floor, 0, 0, TILE, TILE);
        noise(ctx, seed + 19, 0, 0, TILE, TILE, [s.floorDark, s.floorLight], 80, 0.45);
      } else if (name === "reliquary") {
        rect(ctx, s.floor, 0, 0, TILE, TILE);
        rect(ctx, withAlpha(s.floorDark, 0.4), 0, 0, TILE, 1);
      } else {
        flagstones(ctx, seed + 19, s.floor, s.floorDark, s.floorLight);
      }
      const bone = name === "reliquary" ? "#8f887a" : "#d8d0bc";
      ctx.strokeStyle = bone;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(6, 22);
      ctx.lineTo(18, 16);
      ctx.moveTo(14, 26);
      ctx.lineTo(25, 24);
      ctx.stroke();
      ellipse(ctx, bone, 22, 11, 4, 3.5);
      rect(ctx, "#2a2620", 20, 10, 1, 2);
      rect(ctx, "#2a2620", 23, 10, 1, 2);
    });
  });
}

// --- underground props -----------------------------------------------------

function undergroundProps(scene: Phaser.Scene): void {
  tex(scene, "dg_statue", TILE, 64, (ctx) => {
    shadowBlob(ctx, 16, 60, 12, 4);
    rect(ctx, "#5d5b63", 5, 50, 22, 12);
    rect(ctx, "#7a7882", 5, 50, 22, 2);
    // a robed figure, hood up
    ctx.fillStyle = "#8a8892";
    ctx.beginPath();
    ctx.moveTo(9, 50);
    ctx.lineTo(12, 22);
    ctx.lineTo(20, 22);
    ctx.lineTo(23, 50);
    ctx.closePath();
    ctx.fill();
    ellipse(ctx, "#9a98a2", 16, 18, 6, 7);
    ellipse(ctx, "#4a4850", 16, 19, 3, 4);
    rect(ctx, withAlpha("#ffffff", 0.18), 12, 24, 2, 24);
    rect(ctx, "#6a6870", 14, 30, 4, 10);
  });
  tex(scene, "dg_urn", TILE, TILE, (ctx) => {
    shadowBlob(ctx, 16, 29, 10, 3);
    ellipse(ctx, "#6b5442", 16, 19, 9, 10);
    ellipse(ctx, "#856a52", 14, 17, 6, 7);
    rect(ctx, "#5a4636", 11, 6, 10, 4);
    rect(ctx, "#c9a24a", 7, 18, 18, 2);
  });
  tex(scene, "dg_rubble", TILE, 28, (ctx) => {
    shadowBlob(ctx, 16, 25, 14, 3);
    const rng = makeRng(401);
    for (let i = 0; i < 7; i++) {
      const x = 4 + rng() * 24;
      const y = 10 + rng() * 14;
      ellipse(ctx, mix("#5d5b63", "#8a8892", rng()), x, y, 3 + rng() * 5, 2 + rng() * 4);
    }
  });
  tex(scene, "dg_sarcophagus", TILE, 40, (ctx) => {
    shadowBlob(ctx, 16, 37, 14, 3);
    rect(ctx, "#4e4c55", 3, 12, 26, 26);
    rect(ctx, "#6e6c77", 3, 8, 26, 10);
    rect(ctx, "#8a8892", 3, 8, 26, 2);
    // the carved figure on the lid
    ellipse(ctx, "#7c7a85", 16, 12, 4, 3);
    rect(ctx, "#5d5b66", 8, 22, 16, 1);
    rect(ctx, "#5d5b66", 8, 28, 16, 1);
  });
  tex(scene, "dg_roots", TILE, WALL_H, (ctx) => {
    shadowBlob(ctx, 16, WALL_H - 3, 14, 4, 0.35);
    const rng = makeRng(402);
    for (let i = 0; i < 7; i++) {
      ctx.strokeStyle = mix("#3b2a1a", "#6b4e30", rng());
      ctx.lineWidth = 3 + rng() * 3;
      ctx.lineCap = "round";
      ctx.beginPath();
      const x0 = rng() * TILE;
      ctx.moveTo(x0, WALL_H - 2);
      ctx.bezierCurveTo(rng() * TILE, 30, rng() * TILE, 14, rng() * TILE, 2 + rng() * 6);
      ctx.stroke();
    }
    ctx.lineCap = "butt";
    noise(ctx, 403, 0, 0, TILE, WALL_H, ["#2a1d12", "#8a6a44"], 40, 0.4);
  });
  tex(scene, "dg_stele", TILE, 48, (ctx) => {
    shadowBlob(ctx, 16, 45, 11, 3);
    rect(ctx, "#a8a294", 6, 40, 20, 6);
    ctx.fillStyle = "#d3cdbf";
    ctx.beginPath();
    ctx.moveTo(8, 41);
    ctx.lineTo(8, 12);
    ctx.quadraticCurveTo(16, 4, 24, 12);
    ctx.lineTo(24, 41);
    ctx.closePath();
    ctx.fill();
    for (let y = 16; y < 38; y += 4) rect(ctx, "#8f8778", 11, y, 10 - ((y / 4) % 3) * 2, 1);
    rect(ctx, "#c9a85a", 8, 12, 16, 1);
  });
}

// --- mechanisms ------------------------------------------------------------

function mechanisms(scene: Phaser.Scene): void {
  tex(scene, "dg_plate_up", TILE, TILE, (ctx) => {
    rect(ctx, "#1d1c22", 3, 3, 26, 26);
    rect(ctx, "#8a7a4a", 5, 4, 22, 22);
    rect(ctx, "#b5a060", 5, 4, 22, 2);
    rect(ctx, "#6a5c34", 5, 24, 22, 3);
    rect(ctx, withAlpha("#000000", 0.25), 9, 9, 14, 12);
    ellipse(ctx, "#cdb46c", 16, 15, 3, 3);
  });
  tex(scene, "dg_plate_down", TILE, TILE, (ctx) => {
    rect(ctx, "#1d1c22", 3, 3, 26, 26);
    rect(ctx, "#6e6240", 5, 6, 22, 22);
    rect(ctx, "#4e4428", 5, 6, 22, 2);
    ellipse(ctx, "#ffd36a", 16, 17, 3, 3);
  });
  tex(scene, "dg_plate_pale", TILE, TILE, (ctx) => {
    // A trip plate: you can see it if you look.
    rect(ctx, withAlpha("#000000", 0.3), 4, 4, 24, 24);
    rect(ctx, withAlpha("#a89a80", 0.45), 5, 5, 22, 22);
  });
  // spikes: 0 retracted, 1 warning, 2 raised
  for (let stage = 0; stage < 3; stage++) {
    tex(scene, `dg_spikes_${stage}`, TILE, TILE, (ctx) => {
      rect(ctx, "#2a292f", 1, 1, 30, 30);
      rect(ctx, "#3c3b42", 2, 2, 28, 28);
      for (let gy = 0; gy < 3; gy++) {
        for (let gx = 0; gx < 3; gx++) {
          const x = 6 + gx * 10;
          const y = 7 + gy * 9;
          rect(ctx, "#0b0b0e", x - 2, y + 1, 4, 3);
          if (stage === 1) {
            rect(ctx, "#9aa0aa", x - 1, y - 1, 2, 3);
          } else if (stage === 2) {
            ctx.fillStyle = "#c8ccd4";
            ctx.beginPath();
            ctx.moveTo(x - 3, y + 3);
            ctx.lineTo(x, y - 8);
            ctx.lineTo(x + 3, y + 3);
            ctx.closePath();
            ctx.fill();
            rect(ctx, "#7a7f88", x, y - 6, 1, 8);
          }
        }
      }
    });
  }
  for (const name of ["crypt", "barrow", "reliquary"] as const) {
    const s = SETS[name];
    tex(scene, `dg_crumble_${name}`, TILE, TILE, (ctx) => {
      if (name === "barrow") flagstones(ctx, 501, "#6a5a48", "#43372a", "#857260");
      else flagstones(ctx, 502, s.floor, s.floorDark, s.floorLight);
      crack(ctx, 503, withAlpha("#000000", 0.6));
      rect(ctx, withAlpha("#000000", 0.25), 0, TILE - 3, TILE, 3);
    });
  }
  tex(scene, "dg_rune_off", TILE, TILE, (ctx) => {
    rect(ctx, "#3a3940", 2, 2, 28, 28);
    ctx.strokeStyle = "#6a6878";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(16, 16, 9, 0, Math.PI * 2);
    ctx.moveTo(16, 6);
    ctx.lineTo(16, 26);
    ctx.moveTo(8, 12);
    ctx.lineTo(24, 20);
    ctx.stroke();
  });
  tex(scene, "dg_rune_on", TILE, TILE, (ctx) => {
    rect(ctx, "#3a3940", 2, 2, 28, 28);
    const g = ctx.createRadialGradient(16, 16, 1, 16, 16, 16);
    g.addColorStop(0, withAlpha("#9fe0ff", 0.7));
    g.addColorStop(1, withAlpha("#9fe0ff", 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, TILE, TILE);
    ctx.strokeStyle = "#cff4ff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(16, 16, 9, 0, Math.PI * 2);
    ctx.moveTo(16, 6);
    ctx.lineTo(16, 26);
    ctx.moveTo(8, 12);
    ctx.lineTo(24, 20);
    ctx.stroke();
  });
  const brazier = (ctx: CanvasRenderingContext2D, lit: number): void => {
    shadowBlob(ctx, 16, 37, 11, 3);
    rect(ctx, "#2e2a26", 13, 20, 6, 16);
    rect(ctx, "#3c3630", 9, 33, 14, 4);
    ctx.fillStyle = "#4a423a";
    ctx.beginPath();
    ctx.moveTo(4, 16);
    ctx.lineTo(28, 16);
    ctx.lineTo(23, 24);
    ctx.lineTo(9, 24);
    ctx.closePath();
    ctx.fill();
    rect(ctx, "#6a5e50", 4, 15, 24, 2);
    if (lit < 0) {
      ellipse(ctx, "#1d1a17", 16, 16, 9, 2);
      rect(ctx, "#3a3632", 11, 14, 3, 2);
      rect(ctx, "#3a3632", 18, 14, 3, 2);
    } else {
      ellipse(ctx, "#ff7a2a", 16, 16, 10, 3);
      flame(ctx, 16, 9 - lit, 6, "#ffb04a", 600 + lit * 13);
    }
  };
  tex(scene, "dg_brazier_off", TILE, 40, (ctx) => brazier(ctx, -1));
  tex(scene, "dg_brazier_on_0", TILE, 40, (ctx) => brazier(ctx, 0));
  tex(scene, "dg_brazier_on_1", TILE, 40, (ctx) => brazier(ctx, 1));
  const lever = (ctx: CanvasRenderingContext2D, on: boolean): void => {
    shadowBlob(ctx, 16, 37, 10, 3);
    rect(ctx, "#3e3d45", 7, 26, 18, 12);
    rect(ctx, "#5a5964", 7, 26, 18, 2);
    rect(ctx, "#1a1a1e", 14, 27, 4, 4);
    ctx.strokeStyle = "#8a7a5a";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(16, 29);
    ctx.lineTo(on ? 26 : 6, 10);
    ctx.stroke();
    ellipse(ctx, on ? "#e0b84a" : "#a33a2a", on ? 26 : 6, 9, 3.5, 3.5);
  };
  tex(scene, "dg_lever_off", TILE, 40, (ctx) => lever(ctx, false));
  tex(scene, "dg_lever_on", TILE, 40, (ctx) => lever(ctx, true));

  tex(scene, "dg_gate_iron", TILE, WALL_H, (ctx) => {
    rect(ctx, "#1c1b20", 0, 0, TILE, 6);
    for (let x = 3; x < TILE; x += 6) {
      rect(ctx, "#4a4c55", x, 4, 3, WALL_H - 4);
      rect(ctx, "#7a7d88", x, 4, 1, WALL_H - 4);
      ctx.fillStyle = "#6a6d78";
      ctx.beginPath();
      ctx.moveTo(x - 1, WALL_H);
      ctx.lineTo(x + 1.5, WALL_H - 5);
      ctx.lineTo(x + 4, WALL_H);
      ctx.fill();
    }
    for (const y of [14, 28]) {
      rect(ctx, "#3a3c44", 0, y, TILE, 3);
      rect(ctx, "#6a6d78", 0, y, TILE, 1);
    }
  });
  tex(scene, "dg_gate_roots", TILE, WALL_H, (ctx) => {
    const rng = makeRng(611);
    for (let i = 0; i < 9; i++) {
      ctx.strokeStyle = mix("#3a2716", "#6e5030", rng());
      ctx.lineWidth = 3 + rng() * 4;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(rng() * TILE, 0);
      ctx.bezierCurveTo(rng() * TILE, 14, rng() * TILE, 28, rng() * TILE, WALL_H);
      ctx.stroke();
    }
    ctx.lineCap = "butt";
    for (let i = 0; i < 6; i++) ellipse(ctx, "#5e7a3a", rng() * TILE, rng() * WALL_H, 2, 1.5);
  });
  tex(scene, "dg_gate_stone", TILE, WALL_H, (ctx) => {
    rect(ctx, "#77737e", 0, 0, TILE, WALL_H);
    rect(ctx, "#9a96a2", 0, 0, TILE, 3);
    rect(ctx, "#56535c", 0, WALL_H - 4, TILE, 4);
    ctx.strokeStyle = "#5c5964";
    ctx.lineWidth = 1;
    ctx.strokeRect(4.5, 8.5, TILE - 9, WALL_H - 16);
    ellipse(ctx, "#c9a85a", 16, 22, 3, 3);
    noise(ctx, 612, 0, 0, TILE, WALL_H, ["#5c5964", "#9a96a2"], 30, 0.3);
  });
  tex(scene, "dg_block", TILE, 40, (ctx) => {
    shadowBlob(ctx, 16, 37, 15, 4);
    rect(ctx, "#4a4852", 1, 14, 30, 24);
    rect(ctx, "#6a6874", 1, 6, 30, 12);
    rect(ctx, "#86848f", 1, 6, 30, 2);
    rect(ctx, "#3a3940", 1, 17, 30, 2);
    ctx.strokeStyle = "#a89a6a";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(16, 27, 6, 0, Math.PI * 2);
    ctx.moveTo(10, 27);
    ctx.lineTo(22, 27);
    ctx.stroke();
    noise(ctx, 613, 1, 6, 30, 32, ["#3a3940", "#86848f"], 30, 0.3);
  });
  tex(scene, "dg_boulder", 72, 72, (ctx) => {
    const g = ctx.createRadialGradient(28, 26, 4, 36, 36, 36);
    g.addColorStop(0, "#9a948a");
    g.addColorStop(0.7, "#5f5a52");
    g.addColorStop(1, "#3a3630");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(36, 36, 34, 0, Math.PI * 2);
    ctx.fill();
    const rng = makeRng(614);
    for (let i = 0; i < 9; i++) {
      ctx.strokeStyle = withAlpha("#2e2a25", 0.6);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      const a = rng() * Math.PI * 2;
      ctx.moveTo(36 + Math.cos(a) * 8, 36 + Math.sin(a) * 8);
      ctx.lineTo(36 + Math.cos(a + 0.4) * 30, 36 + Math.sin(a + 0.4) * 30);
      ctx.stroke();
    }
    ctx.strokeStyle = "#c9a85a";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(36, 36, 16, 0, Math.PI * 2);
    ctx.stroke();
  });
  const chest = (ctx: CanvasRenderingContext2D, open: boolean): void => {
    shadowBlob(ctx, 16, 30, 14, 3);
    rect(ctx, "#5a3a20", 3, 14, 26, 16);
    rect(ctx, "#7a5230", 4, 15, 24, 4);
    rect(ctx, "#b89040", 3, 20, 26, 2);
    rect(ctx, "#b89040", 14, 14, 4, 16);
    if (open) {
      rect(ctx, "#2a1a0e", 4, 9, 24, 7);
      rect(ctx, "#6a4628", 3, 3, 26, 7);
      rect(ctx, "#b89040", 3, 3, 26, 1);
      ellipse(ctx, withAlpha("#ffd36a", 0.6), 16, 13, 9, 3);
    } else {
      rect(ctx, "#6a4628", 3, 8, 26, 8);
      rect(ctx, "#8a6038", 3, 8, 26, 2);
      rect(ctx, "#e0c060", 14, 14, 4, 5);
    }
  };
  tex(scene, "dg_chest_closed", TILE, TILE, (ctx) => chest(ctx, false));
  tex(scene, "dg_chest_open", TILE, TILE, (ctx) => chest(ctx, true));
  tex(scene, "dg_pedestal", TILE, WALL_H, (ctx) => {
    shadowBlob(ctx, 16, WALL_H - 3, 13, 4);
    rect(ctx, "#5c5a63", 5, WALL_H - 9, 22, 8);
    rect(ctx, "#77757f", 9, 16, 14, WALL_H - 25);
    rect(ctx, "#93919b", 9, 16, 3, WALL_H - 25);
    rect(ctx, "#5c5a63", 4, 11, 24, 6);
    rect(ctx, "#a3a1ab", 4, 11, 24, 2);
    rect(ctx, "#c9a85a", 9, 28, 14, 1);
  });
  tex(scene, "dg_bell", TILE, 56, (ctx) => {
    shadowBlob(ctx, 16, 53, 13, 4);
    rect(ctx, "#4e3a26", 3, 2, 3, 52);
    rect(ctx, "#4e3a26", 26, 2, 3, 52);
    rect(ctx, "#6a5034", 1, 2, 30, 4);
    rect(ctx, "#2a2a2e", 15, 6, 2, 6);
    ctx.fillStyle = "#b08a3a";
    ctx.beginPath();
    ctx.moveTo(11, 14);
    ctx.quadraticCurveTo(16, 8, 21, 14);
    ctx.lineTo(25, 34);
    ctx.lineTo(7, 34);
    ctx.closePath();
    ctx.fill();
    rect(ctx, "#d9b864", 7, 32, 18, 3);
    rect(ctx, withAlpha("#fff2c0", 0.5), 12, 15, 2, 15);
    ellipse(ctx, "#5a4420", 16, 37, 2, 2);
  });
  tex(scene, "dg_dart", 12, 4, (ctx) => {
    rect(ctx, "#2a2620", 0, 1, 9, 2);
    rect(ctx, "#c8ccd4", 9, 0, 3, 4);
    rect(ctx, "#a33a2a", 0, 0, 2, 4);
  });
  tex(scene, "dg_dust", 6, 6, (ctx) => ellipse(ctx, "#d8d0c0", 3, 3, 3, 3));
  tex(scene, "dg_shimmer", 32, 32, (ctx) => {
    const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, withAlpha("#dfe8ff", 0.7));
    g.addColorStop(1, withAlpha("#dfe8ff", 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 32, 32);
  });

  // The three relics, as they sit on their pedestals.
  tex(scene, "dg_relic_wardens_lantern", 20, 24, (ctx) => {
    rect(ctx, "#3c3f46", 8, 0, 4, 3);
    rect(ctx, "#6a6e78", 4, 3, 12, 3);
    rect(ctx, withAlpha("#cfe4ff", 0.85), 5, 6, 10, 12);
    rect(ctx, "#ffffff", 8, 9, 4, 6);
    rect(ctx, "#6a6e78", 4, 18, 12, 3);
    rect(ctx, "#3c3f46", 3, 6, 2, 12);
    rect(ctx, "#3c3f46", 15, 6, 2, 12);
  });
  tex(scene, "dg_relic_ninefold_key", 20, 24, (ctx) => {
    ctx.strokeStyle = "#d9b864";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(10, 6, 5, 0, Math.PI * 2);
    ctx.stroke();
    rect(ctx, "#d9b864", 9, 10, 3, 13);
    for (let i = 0; i < 3; i++) rect(ctx, "#b8923f", 12, 13 + i * 3, 4, 2);
  });
  tex(scene, "dg_relic_silent_bell", 20, 24, (ctx) => {
    ctx.fillStyle = "#e8e4dc";
    ctx.beginPath();
    ctx.moveTo(7, 6);
    ctx.quadraticCurveTo(10, 1, 13, 6);
    ctx.lineTo(17, 20);
    ctx.lineTo(3, 20);
    ctx.closePath();
    ctx.fill();
    rect(ctx, "#bfe4ff", 3, 19, 14, 2);
    rect(ctx, "#a8a294", 9, 0, 2, 3);
  });
}

// --- the Academy's furnishings ----------------------------------------------

function banner(ctx: CanvasRenderingContext2D, house: string, x: number, y: number, w: number, h: number): void {
  const c = HOUSE_COLOURS[house] ?? HOUSE_COLOURS.emberhart!;
  rect(ctx, "#3a2a1a", x - 2, y - 2, w + 4, 3);
  rect(ctx, c.field, x, y, w, h);
  rect(ctx, c.trim, x, y, w, 2);
  rect(ctx, c.trim, x, y, 1, h);
  rect(ctx, c.trim, x + w - 1, y, 1, h);
  ctx.fillStyle = c.field;
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x + w / 2, y + h + 5);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
  ctx.fill();
  sigil(ctx, house, x + w / 2, y + h * 0.5, Math.min(w, h) * 0.32, c.trim);
}

/** The four House sigils, small: stag, briar wreath, raven with key, heron. */
function sigil(ctx: CanvasRenderingContext2D, house: string, cx: number, cy: number, r: number, color: string): void {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(1, r * 0.22);
  ctx.beginPath();
  if (house === "emberhart") {
    // a stag's head under a burning crown
    ctx.ellipse(cx, cy + r * 0.3, r * 0.35, r * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.2, cy);
    ctx.lineTo(cx - r * 0.8, cy - r * 0.8);
    ctx.moveTo(cx - r * 0.55, cy - r * 0.45);
    ctx.lineTo(cx - r * 0.9, cy - r * 0.3);
    ctx.moveTo(cx + r * 0.2, cy);
    ctx.lineTo(cx + r * 0.8, cy - r * 0.8);
    ctx.moveTo(cx + r * 0.55, cy - r * 0.45);
    ctx.lineTo(cx + r * 0.9, cy - r * 0.3);
    ctx.stroke();
    ellipse(ctx, "#ff8a3a", cx, cy - r * 0.95, r * 0.18, r * 0.25);
  } else if (house === "thornwick") {
    ctx.arc(cx, cy, r * 0.7, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      ellipse(ctx, color, cx + Math.cos(a) * r * 0.7, cy + Math.sin(a) * r * 0.7, r * 0.16, r * 0.16);
    }
  } else if (house === "ravelle") {
    // a raven, wings spread, holding a key
    ctx.moveTo(cx - r, cy - r * 0.2);
    ctx.quadraticCurveTo(cx - r * 0.3, cy - r * 0.6, cx, cy);
    ctx.quadraticCurveTo(cx + r * 0.3, cy - r * 0.6, cx + r, cy - r * 0.2);
    ctx.quadraticCurveTo(cx + r * 0.3, cy + r * 0.1, cx, cy + r * 0.4);
    ctx.quadraticCurveTo(cx - r * 0.3, cy + r * 0.1, cx - r, cy - r * 0.2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx, cy + r * 0.4);
    ctx.lineTo(cx, cy + r);
    ctx.stroke();
  } else {
    // a heron: long legs, curved neck
    ctx.moveTo(cx - r * 0.1, cy + r);
    ctx.lineTo(cx - r * 0.1, cy + r * 0.2);
    ctx.moveTo(cx + r * 0.2, cy + r);
    ctx.lineTo(cx + r * 0.1, cy + r * 0.2);
    ctx.stroke();
    ellipse(ctx, color, cx, cy + r * 0.1, r * 0.45, r * 0.28);
    ctx.beginPath();
    ctx.moveTo(cx + r * 0.3, cy);
    ctx.quadraticCurveTo(cx + r * 0.7, cy - r * 0.5, cx + r * 0.2, cy - r * 0.8);
    ctx.lineTo(cx - r * 0.5, cy - r * 0.75);
    ctx.stroke();
  }
}

function academy(scene: Phaser.Scene): void {
  const hall = SETS.hall;
  for (const house of HOUSES) {
    tex(scene, `dg_wall_banner_${house}`, TILE, WALL_H, (ctx) => {
      wallFace(ctx, hall, 701);
      rect(ctx, "#5a3c24", 0, WALL_H - 14, TILE, 14);
      banner(ctx, house, 6, 12, 20, 22);
    });
  }
  tex(scene, "dg_wall_hall_window", TILE, WALL_H, (ctx) => {
    wallFace(ctx, hall, 702);
    rect(ctx, "#5a3c24", 0, WALL_H - 14, TILE, 14);
    rect(ctx, "#3a3024", 7, 12, 18, 22);
    // stained glass in lead cames: four House colours under an arch
    const colors = [HOUSE_COLOURS.emberhart!.field, HOUSE_COLOURS.thornwick!.field, HOUSE_COLOURS.ravelle!.field, HOUSE_COLOURS.stillwater!.field];
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(9, 33);
    ctx.lineTo(9, 20);
    ctx.quadraticCurveTo(16, 10, 23, 20);
    ctx.lineTo(23, 33);
    ctx.closePath();
    ctx.clip();
    for (let i = 0; i < 4; i++) rect(ctx, shade(colors[i]!, 0.35), 9 + (i % 2) * 7, 13 + Math.floor(i / 2) * 10, 7, 10);
    rect(ctx, "#f0d888", 13, 14, 6, 6);
    rect(ctx, "#1a1612", 15.5, 12, 1, 22);
    rect(ctx, "#1a1612", 9, 23, 14, 1);
    ctx.restore();
    rect(ctx, withAlpha("#fff6d0", 0.25), 10, 21, 2, 10);
  });
  tex(scene, "dg_wall_hearth", TILE, WALL_H, (ctx) => {
    wallFace(ctx, hall, 703);
    rect(ctx, "#3a3028", 4, 18, 24, 22);
    rect(ctx, "#140e0a", 7, 22, 18, 18);
    rect(ctx, "#6a5a48", 2, 15, 28, 4);
    flame(ctx, 16, 34, 5, "#ff9a3a", 704);
  });
  tex(scene, "dg_door_hall", TILE, WALL_H, (ctx) => {
    wallFace(ctx, hall, 705);
    rect(ctx, "#2e1e10", 2, 10, 28, WALL_H - 10);
    rect(ctx, "#6a4426", 4, 13, 24, WALL_H - 13);
    for (let x = 4; x < 28; x += 6) rect(ctx, "#4e301a", x, 13, 1, WALL_H - 13);
    rect(ctx, "#b89040", 4, 22, 24, 2);
    rect(ctx, "#b89040", 4, 34, 24, 2);
    ellipse(ctx, "#e0c060", 24, 30, 1.6, 1.6);
  });
  tex(scene, "dg_wall_hall_torch", TILE, WALL_H, (ctx) => {
    wallFace(ctx, hall, 706);
    rect(ctx, "#5a3c24", 0, WALL_H - 14, TILE, 14);
    rect(ctx, "#2c2620", 14, 24, 4, 8);
    rect(ctx, "#b89040", 11, 22, 10, 3);
    flame(ctx, 16, 17, 4, hall.flame, 707);
  });

  // The long House tables run north-south: a top end, a middle, a bottom end.
  const table = (ctx: CanvasRenderingContext2D, part: "top" | "mid" | "bot"): void => {
    const y0 = part === "top" ? 6 : 0;
    const y1 = part === "bot" ? 26 : TILE;
    // benches either side
    rect(ctx, "#4e341e", 0, y0 + 2, 5, y1 - y0 - 4);
    rect(ctx, "#4e341e", 27, y0 + 2, 5, y1 - y0 - 4);
    rect(ctx, "#6b4a2c", 6, y0, 20, y1 - y0);
    rect(ctx, "#8a6440", 7, y0, 18, y1 - y0);
    rect(ctx, "#a07850", 8, y0, 2, y1 - y0);
    if (part === "top") rect(ctx, "#b08858", 7, y0, 18, 2);
    if (part === "bot") rect(ctx, "#4a311c", 6, y1 - 3, 20, 3);
    // the place settings
    if (part === "mid") {
      ellipse(ctx, "#e8e2d4", 12, 10, 3, 2.2);
      ellipse(ctx, "#e8e2d4", 20, 24, 3, 2.2);
      rect(ctx, "#c9a24a", 18, 6, 2, 5);
      rect(ctx, "#c9a24a", 11, 21, 2, 5);
    }
  };
  tex(scene, "dg_table_top", TILE, TILE, (ctx) => table(ctx, "top"));
  tex(scene, "dg_table_mid", TILE, TILE, (ctx) => table(ctx, "mid"));
  tex(scene, "dg_table_bot", TILE, TILE, (ctx) => table(ctx, "bot"));

  const shelf = (ctx: CanvasRenderingContext2D, chained: boolean, sealed: boolean): void => {
    shadowBlob(ctx, 16, 54, 15, 3);
    rect(ctx, "#3a2614", 1, 2, 30, 54);
    rect(ctx, "#5e4024", 3, 4, 26, 50);
    const rng = makeRng(chained ? 712 : 711);
    const books = ["#8a2b2b", "#2b4a8a", "#2b7a4a", "#8a7a2b", "#5a2b7a", "#7a5a3a", "#3a6a6a"];
    for (let s = 0; s < 4; s++) {
      const y = 6 + s * 12;
      rect(ctx, "#3a2614", 3, y + 10, 26, 2);
      let x = 4;
      while (x < 27) {
        const w = 2 + Math.floor(rng() * 3);
        const hgt = 7 + Math.floor(rng() * 3);
        rect(ctx, books[Math.floor(rng() * books.length)] ?? "#8a2b2b", x, y + 10 - hgt, w, hgt);
        rect(ctx, withAlpha("#ffffff", 0.15), x, y + 10 - hgt, 1, hgt);
        x += w + (rng() > 0.85 ? 1 : 0);
      }
    }
    if (chained) {
      ctx.strokeStyle = "#9a9ca6";
      ctx.lineWidth = 1.5;
      for (const y of [14, 38]) {
        ctx.beginPath();
        ctx.moveTo(3, y);
        ctx.quadraticCurveTo(16, y + 6, 29, y);
        ctx.stroke();
      }
    }
    if (sealed) {
      const g = ctx.createRadialGradient(16, 28, 1, 16, 28, 16);
      g.addColorStop(0, withAlpha("#a8d8ff", 0.55));
      g.addColorStop(1, withAlpha("#a8d8ff", 0));
      ctx.fillStyle = g;
      ctx.fillRect(0, 10, 32, 36);
      ctx.strokeStyle = "#cfeaff";
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(16, 28, 7, 0, Math.PI * 2);
      ctx.moveTo(16, 19);
      ctx.lineTo(16, 37);
      ctx.moveTo(9, 28);
      ctx.lineTo(23, 28);
      ctx.stroke();
    }
  };
  tex(scene, "dg_bookshelf", TILE, 56, (ctx) => shelf(ctx, false, false));
  tex(scene, "dg_bookshelf_chained", TILE, 56, (ctx) => shelf(ctx, true, false));
  tex(scene, "dg_shelf_sealed", TILE, 56, (ctx) => shelf(ctx, true, true));

  tex(scene, "dg_candelabra", TILE, 48, (ctx) => {
    shadowBlob(ctx, 16, 45, 9, 3);
    rect(ctx, "#8a7030", 10, 41, 12, 4);
    rect(ctx, "#b8963e", 15, 16, 2, 26);
    rect(ctx, "#b8963e", 6, 18, 20, 2);
    for (const x of [7, 16, 25]) {
      rect(ctx, "#efe6cf", x - 1, 10, 3, 8);
      flame(ctx, x, 7, 2.5, "#ffc060", 720 + x);
    }
  });
  tex(scene, "dg_desk", TILE, TILE, (ctx) => {
    shadowBlob(ctx, 16, 30, 15, 3);
    rect(ctx, "#4e341e", 1, 8, 30, 22);
    rect(ctx, "#7a5432", 1, 6, 30, 10);
    rect(ctx, "#94683e", 1, 6, 30, 2);
    rect(ctx, "#efe6cf", 5, 8, 9, 6);
    rect(ctx, "#2a2a3a", 20, 8, 2, 5);
    rect(ctx, "#a33a2a", 24, 9, 4, 4);
  });
  tex(scene, "dg_lectern", TILE, 40, (ctx) => {
    shadowBlob(ctx, 16, 37, 9, 3);
    rect(ctx, "#4e341e", 13, 18, 6, 18);
    rect(ctx, "#6a4628", 9, 34, 14, 4);
    ctx.fillStyle = "#7a5432";
    ctx.beginPath();
    ctx.moveTo(4, 12);
    ctx.lineTo(28, 12);
    ctx.lineTo(25, 20);
    ctx.lineTo(7, 20);
    ctx.closePath();
    ctx.fill();
    rect(ctx, "#efe6cf", 8, 10, 7, 5);
    rect(ctx, "#e6dcc4", 17, 10, 7, 5);
  });
  tex(scene, "dg_globe", TILE, 40, (ctx) => {
    shadowBlob(ctx, 16, 37, 9, 3);
    rect(ctx, "#6a4628", 10, 34, 12, 4);
    rect(ctx, "#8a6438", 15, 24, 2, 11);
    ellipse(ctx, "#2f6a8a", 16, 16, 9, 9);
    ellipse(ctx, "#5a9a4a", 13, 13, 4, 3);
    ellipse(ctx, "#5a9a4a", 19, 19, 3, 2);
    ctx.strokeStyle = "#c9a24a";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(16, 16, 11, Math.PI * 0.8, Math.PI * 2.2);
    ctx.stroke();
  });
  tex(scene, "dg_pillar_hall", TILE, 64, (ctx) => {
    shadowBlob(ctx, 16, 60, 13, 4);
    rect(ctx, "#7d705a", 5, 54, 22, 8);
    const g = ctx.createLinearGradient(8, 0, 24, 0);
    g.addColorStop(0, "#857862");
    g.addColorStop(0.45, "#c4b496");
    g.addColorStop(1, "#7d705a");
    ctx.fillStyle = g;
    ctx.fillRect(9, 10, 14, 44);
    rect(ctx, "#7d705a", 5, 4, 22, 7);
    rect(ctx, "#b89040", 5, 9, 22, 2);
  });
  tex(scene, "dg_bench", TILE, TILE, (ctx) => {
    shadowBlob(ctx, 16, 28, 14, 3);
    rect(ctx, "#5e4024", 2, 14, 28, 6);
    rect(ctx, "#7a5432", 2, 13, 28, 2);
    rect(ctx, "#4e341e", 4, 20, 3, 8);
    rect(ctx, "#4e341e", 25, 20, 3, 8);
  });
}

// --- the castle exterior ----------------------------------------------------

const CASTLE_H = 112;
const TOWER_H = 176;

function castleStone(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, seed: number): void {
  rect(ctx, "#8e8a82", x, y, w, h);
  const rng = makeRng(seed);
  for (let yy = y; yy < y + h; yy += 7) {
    rect(ctx, "#6f6b64", x, yy, w, 1);
    const off = Math.floor(rng() * 9);
    for (let xx = x + off; xx < x + w; xx += 11) rect(ctx, "#6f6b64", xx, yy, 1, 7);
  }
  noise(ctx, seed + 1, x, y, w, h, ["#a7a39a", "#6a665f"], Math.floor((w * h) / 30), 0.3);
}

function crenels(ctx: CanvasRenderingContext2D, x: number, y: number, w: number): void {
  for (let xx = x; xx < x + w; xx += 8) {
    rect(ctx, "#9a968e", xx, y, 5, 7);
    rect(ctx, "#b5b1a8", xx, y, 5, 1);
  }
  rect(ctx, "#77736b", x, y + 7, w, 3);
}

function archWindow(ctx: CanvasRenderingContext2D, cx: number, top: number, w: number, h: number, lit: boolean): void {
  ctx.fillStyle = "#3a352e";
  ctx.beginPath();
  ctx.moveTo(cx - w / 2 - 2, top + h + 2);
  ctx.lineTo(cx - w / 2 - 2, top + w / 2);
  ctx.arc(cx, top + w / 2, w / 2 + 2, Math.PI, 0);
  ctx.lineTo(cx + w / 2 + 2, top + h + 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = lit ? "#f6c25a" : "#1c2230";
  ctx.beginPath();
  ctx.moveTo(cx - w / 2, top + h);
  ctx.lineTo(cx - w / 2, top + w / 2);
  ctx.arc(cx, top + w / 2, w / 2, Math.PI, 0);
  ctx.lineTo(cx + w / 2, top + h);
  ctx.closePath();
  ctx.fill();
  if (lit) {
    rect(ctx, "#fff0b8", cx - 2, top + w / 2, 4, h - w / 2 - 2);
    const g = ctx.createRadialGradient(cx, top + h / 2, 1, cx, top + h / 2, w * 1.6);
    g.addColorStop(0, withAlpha("#ffd27a", 0.35));
    g.addColorStop(1, withAlpha("#ffd27a", 0));
    ctx.fillStyle = g;
    ctx.fillRect(cx - w * 2, top - w, w * 4, h + w * 2);
  }
  rect(ctx, "#3a352e", cx - 0.5, top + 2, 1, h - 2);
  rect(ctx, "#3a352e", cx - w / 2, top + h * 0.55, w, 1);
}

function castle(scene: Phaser.Scene): void {
  const facade = (ctx: CanvasRenderingContext2D, seed: number): void => {
    castleStone(ctx, 0, 10, TILE, CASTLE_H - 10, seed);
    crenels(ctx, 0, 0, TILE);
    rect(ctx, "#6a665f", 0, CASTLE_H - 18, TILE, 2);
    rect(ctx, "#77736b", 0, CASTLE_H - 16, TILE, 16);
    const g = ctx.createLinearGradient(0, CASTLE_H - 16, 0, CASTLE_H);
    g.addColorStop(0, withAlpha("#000000", 0));
    g.addColorStop(1, withAlpha("#000000", 0.3));
    ctx.fillStyle = g;
    ctx.fillRect(0, CASTLE_H - 16, TILE, 16);
  };
  tex(scene, "dg_castle_wall", TILE, CASTLE_H, (ctx) => {
    facade(ctx, 801);
    rect(ctx, "#77736b", 13, 18, 6, CASTLE_H - 36);
    rect(ctx, "#a7a39a", 13, 18, 1, CASTLE_H - 36);
  });
  tex(scene, "dg_castle_window", TILE, CASTLE_H, (ctx) => {
    facade(ctx, 802);
    archWindow(ctx, 16, 22, 12, 30, true);
    archWindow(ctx, 16, 62, 10, 22, true);
  });
  for (const house of HOUSES) {
    tex(scene, `dg_castle_banner_${house}`, TILE, CASTLE_H, (ctx) => {
      facade(ctx, 803);
      banner(ctx, house, 5, 16, 22, 60);
    });
  }
  sliced(scene, "dg_castle_door_", 3, CASTLE_H, (ctx, w) => {
    castleStone(ctx, 0, 10, w, CASTLE_H - 10, 805);
    crenels(ctx, 0, 0, w);
    // A grand arch with a portcullis drawn up and the great oak doors open.
    const cx = w / 2;
    ctx.fillStyle = "#5e5a53";
    ctx.beginPath();
    ctx.moveTo(cx - 40, CASTLE_H);
    ctx.lineTo(cx - 40, 46);
    ctx.arc(cx, 46, 40, Math.PI, 0);
    ctx.lineTo(cx + 40, CASTLE_H);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#16120e";
    ctx.beginPath();
    ctx.moveTo(cx - 32, CASTLE_H);
    ctx.lineTo(cx - 32, 50);
    ctx.arc(cx, 50, 32, Math.PI, 0);
    ctx.lineTo(cx + 32, CASTLE_H);
    ctx.closePath();
    ctx.fill();
    // warm light spilling from the hall
    const g = ctx.createLinearGradient(0, 40, 0, CASTLE_H);
    g.addColorStop(0, withAlpha("#f6b04a", 0.15));
    g.addColorStop(1, withAlpha("#f6b04a", 0.55));
    ctx.fillStyle = g;
    ctx.fillRect(cx - 24, 54, 48, CASTLE_H - 54);
    // open doors folded back
    for (const side of [-1, 1]) {
      const x = side < 0 ? cx - 32 : cx + 22;
      rect(ctx, "#5a3a1e", x, 56, 10, CASTLE_H - 56);
      rect(ctx, "#7a5230", x + 2, 58, 6, CASTLE_H - 60);
      for (let y = 64; y < CASTLE_H; y += 12) rect(ctx, "#2e2a26", x, y, 10, 2);
    }
    // portcullis teeth showing at the top of the arch
    for (let x = cx - 26; x < cx + 26; x += 6) rect(ctx, "#3c3f46", x, 30, 2, 14);
    rect(ctx, "#3c3f46", cx - 28, 40, 56, 2);
    // keystone with the Academy's lamp
    rect(ctx, "#b5b1a8", cx - 6, 2, 12, 12);
    ellipse(ctx, "#f6c25a", cx, 8, 3, 4);
  });
  sliced(scene, "dg_tower_", 3, TOWER_H, (ctx, w) => {
    const cx = w / 2;
    const bodyTop = 64;
    castleStone(ctx, 6, bodyTop, w - 12, TOWER_H - bodyTop, 806);
    const shadeG = ctx.createLinearGradient(6, 0, w - 6, 0);
    shadeG.addColorStop(0, withAlpha("#000000", 0.25));
    shadeG.addColorStop(0.4, withAlpha("#ffffff", 0.05));
    shadeG.addColorStop(1, withAlpha("#000000", 0.35));
    ctx.fillStyle = shadeG;
    ctx.fillRect(6, bodyTop, w - 12, TOWER_H - bodyTop);
    crenels(ctx, 2, bodyTop - 8, w - 4);
    // conical slate roof with a gold finial
    ctx.fillStyle = "#3d4256";
    ctx.beginPath();
    ctx.moveTo(cx, 4);
    ctx.lineTo(w - 4, bodyTop - 6);
    ctx.lineTo(4, bodyTop - 6);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#2c3040";
    ctx.lineWidth = 1;
    for (let i = 1; i < 6; i++) {
      const y = 4 + ((bodyTop - 10) * i) / 6;
      const half = ((w - 8) / 2) * (i / 6);
      ctx.beginPath();
      ctx.moveTo(cx - half, y);
      ctx.lineTo(cx + half, y);
      ctx.stroke();
    }
    rect(ctx, "#d9b44a", cx - 1, 0, 2, 8);
    archWindow(ctx, cx, bodyTop + 20, 10, 24, true);
    archWindow(ctx, cx, bodyTop + 66, 8, 16, false);
    rect(ctx, "#77736b", 6, TOWER_H - 14, w - 12, 14);
  });
  tex(scene, "dg_battlement", TILE, 56, (ctx) => {
    castleStone(ctx, 0, 10, TILE, 46, 807);
    crenels(ctx, 0, 0, TILE);
    rect(ctx, withAlpha("#000000", 0.25), 0, 52, TILE, 4);
  });
  sliced(scene, "dg_turret_", 2, 96, (ctx, w) => {
    castleStone(ctx, 2, 24, w - 4, 72, 808);
    crenels(ctx, 0, 14, w);
    ctx.fillStyle = "#3d4256";
    ctx.beginPath();
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w - 2, 14);
    ctx.lineTo(2, 14);
    ctx.closePath();
    ctx.fill();
    archWindow(ctx, w / 2, 40, 8, 18, true);
  });
  tex(scene, "dg_lamp_post", TILE, 64, (ctx) => {
    shadowBlob(ctx, 16, 61, 8, 3);
    rect(ctx, "#2e2f36", 14, 18, 4, 44);
    rect(ctx, "#3c3f46", 11, 58, 10, 4);
    rect(ctx, "#3c3f46", 9, 6, 14, 3);
    rect(ctx, withAlpha("#ffe0a0", 0.9), 10, 9, 12, 10);
    rect(ctx, "#3c3f46", 9, 19, 14, 2);
    flame(ctx, 16, 14, 3, "#ffc060", 809);
  });
  tex(scene, "dg_brazier_post", TILE, 56, (ctx) => {
    shadowBlob(ctx, 16, 53, 9, 3);
    rect(ctx, "#5c5a63", 12, 22, 8, 32);
    rect(ctx, "#77757f", 9, 50, 14, 5);
    ctx.fillStyle = "#3c3630";
    ctx.beginPath();
    ctx.moveTo(5, 18);
    ctx.lineTo(27, 18);
    ctx.lineTo(22, 26);
    ctx.lineTo(10, 26);
    ctx.closePath();
    ctx.fill();
    ellipse(ctx, "#ff7a2a", 16, 18, 10, 3);
    flame(ctx, 16, 10, 6, "#ffb04a", 810);
  });
  tex(scene, "dg_hedge", TILE, 36, (ctx) => {
    shadowBlob(ctx, 16, 33, 13, 3);
    ellipse(ctx, "#24532a", 16, 20, 12, 14);
    ellipse(ctx, "#2f6b34", 14, 17, 10, 11);
    ellipse(ctx, "#3f8443", 12, 13, 5, 5);
    noise(ctx, 811, 4, 6, 24, 26, ["#1b452b", "#4f9a50"], 40, 0.5);
  });
  for (const house of HOUSES) {
    tex(scene, `dg_banner_pole_${house}`, TILE, 72, (ctx) => {
      shadowBlob(ctx, 16, 69, 7, 3);
      rect(ctx, "#4a3a28", 15, 6, 2, 64);
      ellipse(ctx, "#d9b44a", 16, 5, 2.5, 2.5);
      rect(ctx, "#4a3a28", 6, 9, 20, 2);
      banner(ctx, house, 7, 11, 18, 30);
    });
  }
  sliced(scene, "dg_fountain_", 2, 48, (ctx, w) => {
    shadowBlob(ctx, w / 2, 44, 30, 5);
    ellipse(ctx, "#77736b", w / 2, 34, 30, 11);
    ellipse(ctx, "#2f6a8a", w / 2, 33, 26, 8);
    ellipse(ctx, withAlpha("#9fd4e6", 0.4), w / 2 - 8, 31, 8, 2);
    rect(ctx, "#8e8a82", w / 2 - 3, 12, 6, 22);
    ellipse(ctx, "#8e8a82", w / 2, 13, 10, 4);
    ctx.strokeStyle = withAlpha("#bfe6f2", 0.8);
    ctx.lineWidth = 1.5;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(w / 2, 6);
      ctx.quadraticCurveTo(w / 2 + side * 12, 2, w / 2 + side * 16, 28);
      ctx.stroke();
    }
  });

  // --- the tomb mouths ---
  tex(scene, "dg_mound_face", TILE, WALL_H, (ctx) => {
    rect(ctx, "#3d6a32", 0, 0, TILE, 14);
    noise(ctx, 812, 0, 0, TILE, 14, ["#2f5428", "#4f8040"], 30, 0.5);
    castleStone(ctx, 0, 14, TILE, WALL_H - 14, 813);
    rect(ctx, withAlpha("#3a2a1a", 0.45), 0, 14, TILE, WALL_H - 14);
    ctx.strokeStyle = "#2a1d12";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(4, 12);
    ctx.quadraticCurveTo(10, 28, 6, WALL_H);
    ctx.moveTo(26, 12);
    ctx.quadraticCurveTo(20, 30, 28, WALL_H);
    ctx.stroke();
  });
  tex(scene, "dg_barrow_door", TILE, WALL_H + 16, (ctx, w, h) => {
    rect(ctx, "#3d6a32", 0, 0, w, 16);
    rect(ctx, "#6a665f", 0, 14, w, h - 14);
    rect(ctx, "#8e8a82", 0, 14, w, 6);
    rect(ctx, "#0c0a08", 5, 22, w - 10, h - 22);
    ctx.strokeStyle = "#3a2a1a";
    ctx.lineWidth = 3;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(6 + i * 6, 20);
      ctx.quadraticCurveTo(16, 34 + i * 3, 26 - i * 5, h);
      ctx.stroke();
    }
    ellipse(ctx, "#6a6e78", 16, 36, 4, 4);
    rect(ctx, "#3c3f46", 15, 34, 2, 5);
  });
  tex(scene, "dg_cliff_face", TILE, WALL_H + 20, (ctx, w, h) => {
    rect(ctx, "#5d5e64", 0, 0, w, h);
    const rng = makeRng(814);
    for (let i = 0; i < 6; i++) rect(ctx, "#4a4b51", Math.floor(rng() * w), Math.floor(rng() * h), 1, 6 + Math.floor(rng() * 12));
    noise(ctx, 815, 0, 0, w, h, ["#4a4b51", "#7a7b81"], 70, 0.45);
    rect(ctx, withAlpha("#000000", 0.3), 0, h - 6, w, 6);
  });
  tex(scene, "dg_reliquary_door", TILE, WALL_H + 20, (ctx, w, h) => {
    rect(ctx, "#5d5e64", 0, 0, w, h);
    rect(ctx, "#b5ae9f", 2, 8, w - 4, h - 8);
    rect(ctx, "#ddd6c7", 4, 10, w - 8, h - 10);
    rect(ctx, "#c9a85a", 4, 10, w - 8, 2);
    ctx.strokeStyle = "#a89a7a";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(16, 18);
    ctx.quadraticCurveTo(10, 24, 11, 34);
    ctx.lineTo(21, 34);
    ctx.quadraticCurveTo(22, 24, 16, 18);
    ctx.stroke();
    rect(ctx, withAlpha("#bfe4ff", 0.35), 6, 40, w - 12, 10);
  });
  tex(scene, "dg_standing_stone", TILE, 56, (ctx) => {
    shadowBlob(ctx, 16, 53, 11, 3);
    ctx.fillStyle = "#6a6b70";
    ctx.beginPath();
    ctx.moveTo(7, 54);
    ctx.lineTo(9, 10);
    ctx.quadraticCurveTo(16, 2, 23, 10);
    ctx.lineTo(25, 54);
    ctx.closePath();
    ctx.fill();
    rect(ctx, withAlpha("#ffffff", 0.12), 10, 12, 3, 40);
    ellipse(ctx, "#4f7a3a", 12, 46, 5, 3);
    ctx.strokeStyle = "#a8d8ff";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(16, 26, 4, 0, Math.PI * 2);
    ctx.stroke();
  });
}

/** Static light given off by the glowing props above. Merged into LIGHT_EMITTERS. */
export const DUNGEON_EMITTERS: Record<string, LightSpec> = {
  dg_wall_crypt_torch: { radius: 170, color: 0xffa04a, intensity: 0.9, flicker: 0.35, offsetY: -30 },
  dg_wall_barrow_torch: { radius: 160, color: 0xff9440, intensity: 0.85, flicker: 0.4, offsetY: -30 },
  dg_wall_reliquary_torch: { radius: 180, color: 0xbfe4ff, intensity: 0.85, flicker: 0.2, offsetY: -30 },
  dg_wall_hall_torch: { radius: 170, color: 0xffb04a, intensity: 0.85, flicker: 0.3, offsetY: -30 },
  dg_wall_hall_window: { radius: 120, color: 0xd8c8ff, intensity: 0.5, flicker: 0, offsetY: -24 },
  dg_wall_hearth: { radius: 200, color: 0xff8a3a, intensity: 0.95, flicker: 0.45, offsetY: -8 },
  dg_candelabra: { radius: 150, color: 0xffc060, intensity: 0.8, flicker: 0.25, offsetY: -40 },
  dg_castle_window: { radius: 110, color: 0xffc66a, intensity: 0.6, flicker: 0.1, offsetY: -70 },
  dg_lamp_post: { radius: 170, color: 0xffc060, intensity: 0.85, flicker: 0.2, offsetY: -50 },
  dg_brazier_post: { radius: 190, color: 0xffa04a, intensity: 0.95, flicker: 0.4, offsetY: -44 },
  dg_shelf_sealed: { radius: 90, color: 0xa8d8ff, intensity: 0.5, flicker: 0.1, offsetY: -28 },
};

// Registered as soon as the module loads, so any renderer that reads the table
// at chunk-build time already sees the Academy's torches.
Object.assign(LIGHT_EMITTERS, DUNGEON_EMITTERS);

/** Builds every `dg_` texture. Called once from BootScene. */
export function buildDungeonTiles(scene: Phaser.Scene): void {
  floorSet(scene);
  wallSets(scene);
  undergroundProps(scene);
  mechanisms(scene);
  academy(scene);
  castle(scene);
}
