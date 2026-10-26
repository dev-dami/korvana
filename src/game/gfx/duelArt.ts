import Phaser from "phaser";

import { DPR } from "../display";
import { HOUSE_COLOURS } from "./looks";

/**
 * The duelling hall behind every turn-based fight: a vaulted stone room with
 * House banners between its arches, braziers either side, and a ring of runes
 * set into the floor where the duellists stand. The ring is baked separately
 * so it can pulse in the encounter's colour.
 */

function bake(scene: Phaser.Scene, key: string, w: number, h: number, paint: (ctx: CanvasRenderingContext2D) => void): string {
  if (scene.textures.exists(key)) scene.textures.remove(key);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * DPR));
  canvas.height = Math.max(1, Math.round(h * DPR));
  const ctx = canvas.getContext("2d")!;
  ctx.scale(DPR, DPR);
  paint(ctx);
  scene.textures.addCanvas(key, canvas)?.setFilter(Phaser.Textures.FilterMode.LINEAR);
  return key;
}

function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export interface ArenaLayout {
  floorY: number;
  ringX: number;
  ringY: number;
  ringRX: number;
  ringRY: number;
  braziers: Array<{ x: number; y: number }>;
}

export function arenaLayout(w: number, h: number): ArenaLayout {
  return {
    floorY: h * 0.5,
    ringX: w / 2,
    ringY: h * 0.68,
    ringRX: Math.min(w * 0.38, 560),
    ringRY: h * 0.12,
    braziers: [
      { x: w * 0.08, y: h * 0.6 },
      { x: w * 0.92, y: h * 0.6 },
    ],
  };
}

export function bakeArena(scene: Phaser.Scene, w: number, h: number, accent: string): string {
  const L = arenaLayout(w, h);
  return bake(scene, "duel_arena", w, h, (ctx) => {
    const r = rng(77);
    // Back wall.
    const wall = ctx.createLinearGradient(0, 0, 0, L.floorY);
    wall.addColorStop(0, "#0b0c14");
    wall.addColorStop(1, "#22222e");
    ctx.fillStyle = wall;
    ctx.fillRect(0, 0, w, L.floorY);
    // Coursed stone.
    ctx.strokeStyle = "rgba(0,0,0,0.35)";
    ctx.lineWidth = 1;
    for (let y = 8, row = 0; y < L.floorY; y += 22, row++) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
      for (let x = (row % 2) * 30; x < w; x += 60) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + 22);
        ctx.stroke();
      }
    }
    for (let i = 0; i < 400; i++) {
      ctx.fillStyle = `rgba(255,255,255,${r() * 0.03})`;
      ctx.fillRect(r() * w, r() * L.floorY, 2 + r() * 20, 1 + r() * 6);
    }

    // Arches, each a deep recess with a sliver of night in a high window.
    const arches = Math.max(3, Math.round(w / 300));
    const span = w / arches;
    const houses = Object.values(HOUSE_COLOURS);
    for (let i = 0; i < arches; i++) {
      const cx = span * (i + 0.5);
      const aw = span * 0.46;
      const top = L.floorY * 0.22;
      ctx.beginPath();
      ctx.moveTo(cx - aw / 2, L.floorY);
      ctx.lineTo(cx - aw / 2, top + aw / 2);
      ctx.quadraticCurveTo(cx - aw / 2, top, cx, top - aw * 0.18);
      ctx.quadraticCurveTo(cx + aw / 2, top, cx + aw / 2, top + aw / 2);
      ctx.lineTo(cx + aw / 2, L.floorY);
      ctx.closePath();
      const recess = ctx.createLinearGradient(0, top, 0, L.floorY);
      recess.addColorStop(0, "#05060c");
      recess.addColorStop(1, "#0d0e18");
      ctx.fillStyle = recess;
      ctx.fill();
      ctx.strokeStyle = "rgba(160,150,130,0.22)";
      ctx.lineWidth = 3;
      ctx.stroke();
      // Moonlit lancet window.
      const ww = aw * 0.18;
      const wy = top + aw * 0.25;
      const glass = ctx.createLinearGradient(0, wy, 0, wy + aw * 0.6);
      glass.addColorStop(0, "rgba(140,160,230,0.55)");
      glass.addColorStop(1, "rgba(60,70,140,0.15)");
      ctx.fillStyle = glass;
      ctx.beginPath();
      ctx.moveTo(cx - ww / 2, wy + aw * 0.6);
      ctx.lineTo(cx - ww / 2, wy + ww / 2);
      ctx.arc(cx, wy + ww / 2, ww / 2, Math.PI, 0);
      ctx.lineTo(cx + ww / 2, wy + aw * 0.6);
      ctx.fill();
      // A shaft of moonlight falling from it.
      const shaft = ctx.createLinearGradient(0, wy, 0, h);
      shaft.addColorStop(0, "rgba(150,170,255,0.10)");
      shaft.addColorStop(1, "rgba(150,170,255,0)");
      ctx.fillStyle = shaft;
      ctx.beginPath();
      ctx.moveTo(cx - ww / 2, wy);
      ctx.lineTo(cx + ww / 2, wy);
      ctx.lineTo(cx + ww * 3, h);
      ctx.lineTo(cx - ww * 1, h);
      ctx.closePath();
      ctx.fill();

      // Banner on the pier between arches.
      if (i < arches - 1) {
        const bx = span * (i + 1);
        const house = houses[i % houses.length]!;
        const bw = span * 0.14;
        const by = L.floorY * 0.12;
        const bh = L.floorY * 0.62;
        ctx.fillStyle = "rgba(0,0,0,0.4)";
        ctx.fillRect(bx - bw / 2 + 4, by + 4, bw, bh);
        const cloth = ctx.createLinearGradient(bx - bw / 2, 0, bx + bw / 2, 0);
        cloth.addColorStop(0, house.primary);
        cloth.addColorStop(0.5, shadeHex(house.primary, 0.15));
        cloth.addColorStop(1, shadeHex(house.primary, -0.4));
        ctx.fillStyle = cloth;
        ctx.beginPath();
        ctx.moveTo(bx - bw / 2, by);
        ctx.lineTo(bx + bw / 2, by);
        ctx.lineTo(bx + bw / 2, by + bh);
        ctx.lineTo(bx, by + bh - bw * 0.5);
        ctx.lineTo(bx - bw / 2, by + bh);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = house.secondary;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = house.secondary;
        ctx.beginPath();
        ctx.arc(bx, by + bh * 0.35, bw * 0.22, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "#c9a24e";
        ctx.fillRect(bx - bw / 2 - 4, by - 4, bw + 8, 5);
      }
    }

    // Floor, with flagstones converging on the far wall.
    const floor = ctx.createLinearGradient(0, L.floorY, 0, h);
    floor.addColorStop(0, "#1c1b24");
    floor.addColorStop(1, "#0a0a10");
    ctx.fillStyle = floor;
    ctx.fillRect(0, L.floorY, w, h - L.floorY);
    ctx.strokeStyle = "rgba(0,0,0,0.45)";
    for (let i = -12; i <= 12; i++) {
      ctx.beginPath();
      ctx.moveTo(w / 2 + i * (w / 26), L.floorY);
      ctx.lineTo(w / 2 + i * (w / 7), h);
      ctx.stroke();
    }
    for (let k = 0; k < 9; k++) {
      const y = L.floorY + Math.pow(k / 8, 1.7) * (h - L.floorY);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
    // Skirting shadow where wall meets floor.
    const skirt = ctx.createLinearGradient(0, L.floorY - 6, 0, L.floorY + 30);
    skirt.addColorStop(0, "rgba(0,0,0,0.6)");
    skirt.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = skirt;
    ctx.fillRect(0, L.floorY - 6, w, 36);

    // Brazier light pooled on the floor and the stands themselves.
    for (const b of L.braziers) {
      const pool = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, w * 0.25);
      pool.addColorStop(0, "rgba(255,150,60,0.22)");
      pool.addColorStop(1, "rgba(255,150,60,0)");
      ctx.fillStyle = pool;
      ctx.fillRect(b.x - w * 0.25, b.y - w * 0.25, w * 0.5, w * 0.5);
      ctx.fillStyle = "#1a1612";
      ctx.fillRect(b.x - 3, b.y - 10, 6, 70);
      ctx.beginPath();
      ctx.moveTo(b.x - 22, b.y - 14);
      ctx.lineTo(b.x + 22, b.y - 14);
      ctx.lineTo(b.x + 12, b.y);
      ctx.lineTo(b.x - 12, b.y);
      ctx.closePath();
      ctx.fillStyle = "#3a2c1c";
      ctx.fill();
      ctx.strokeStyle = "#c9a24e";
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = "#1a1612";
      ctx.fillRect(b.x - 16, b.y + 56, 32, 6);
    }

    // The faint ring scribed into the floor (its glow is a separate layer).
    ctx.strokeStyle = shadeHex(accent, -0.4);
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(L.ringX, L.ringY, L.ringRX, L.ringRY, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Vignette.
    const v = ctx.createRadialGradient(w / 2, h * 0.55, Math.min(w, h) * 0.3, w / 2, h * 0.55, Math.max(w, h) * 0.75);
    v.addColorStop(0, "rgba(0,0,0,0)");
    v.addColorStop(1, "rgba(0,0,0,0.75)");
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, w, h);
  });
}

/** The glowing rune circle, drawn in white for tinting and additive blending. */
export function bakeRuneRing(scene: Phaser.Scene, rx: number, ry: number): string {
  const w = rx * 2 + 40;
  const h = ry * 2 + 40;
  return bake(scene, "duel_ring", w, h, (ctx) => {
    const cx = w / 2;
    const cy = h / 2;
    ctx.strokeStyle = "#ffffff";
    ctx.shadowColor = "#ffffff";
    ctx.shadowBlur = 10;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx * 0.9, ry * 0.86, 0, 0, Math.PI * 2);
    ctx.stroke();
    // Runes around the band: little strokes that read as script.
    const r = rng(3);
    const count = 36;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const x = cx + Math.cos(a) * rx * 0.95;
      const y = cy + Math.sin(a) * ry * 0.93;
      const s = 3 + (Math.sin(a) + 1) * 1.6;
      ctx.globalAlpha = 0.5 + r() * 0.5;
      ctx.beginPath();
      ctx.moveTo(x - s, y - s * 0.4);
      ctx.lineTo(x, y + s * 0.4);
      ctx.lineTo(x + s * (r() > 0.5 ? 1 : -0.3), y - s * 0.4);
      if (r() > 0.5) {
        ctx.moveTo(x, y - s * 0.6);
        ctx.lineTo(x, y + s * 0.5);
      }
      ctx.stroke();
    }
  });
}

function shadeHex(hex: string, t: number): string {
  const n = parseInt(hex.slice(1), 16);
  const to = t > 0 ? 255 : 0;
  const k = Math.abs(t);
  const ch = (shift: number): number => Math.round(((n >> shift) & 255) * (1 - k) + to * k);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}
