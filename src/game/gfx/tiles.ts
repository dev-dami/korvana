import type Phaser from "phaser";

import { TILE } from "../config";
import { canvasTex, commit } from "./canvas";
import { C } from "./palette";
import { buildStructures } from "./buildings";
import { buildFxTextures } from "./fxTextures";
import { GROUND_VARIANTS, groundPainter } from "./ground";
import { buildProps } from "./props";
import type { GroundTile } from "../types";
import type { ItemKind } from "../data/items";

export { WALL_H } from "./buildings";
export { GROUND_VARIANTS } from "./ground";

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

export function groundKey(kind: GroundTile, variant: number): string {
  return `g_${kind}_${variant}`;
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

/**
 * Builds every world texture at boot. The work is split by subject - ground,
 * props, structures, effects - and this is the one entry point BootScene calls.
 */
export function buildTiles(scene: Phaser.Scene): void {
  for (const kind of GROUND_KINDS) {
    for (let v = 0; v < GROUND_VARIANTS; v++) {
      const painter = groundPainter(kind, v);
      const { tex, ctx } = canvasTex(scene, groundKey(kind, v), TILE, TILE);
      painter.put(ctx);
      commit({ tex, ctx });
    }
  }

  buildStructures(scene);
  buildProps(scene);
  buildFxTextures(scene);

  // --- item icons, one per kind ---
  const kinds: ItemKind[] = ["potion", "wand", "key", "relic", "material", "book", "weapon"];
  for (const kind of kinds) {
    const { tex, ctx } = canvasTex(scene, itemIconKey(kind), 20, 20);
    drawItemIcon(ctx, kind, 20);
    commit({ tex, ctx });
  }
}
