import Phaser from "phaser";

import { DPR } from "../display";
import { FONT_DISPLAY } from "./fonts";

/**
 * The title screen's painted layers: a night sky, the moon, Korvana Academy
 * on its crag with every window lit, a lake that reflects it, pines framing
 * the edges, and fog. All smooth Canvas 2D at device resolution, baked once
 * per screen size.
 *
 * The castle is drawn twice - once as the dark silhouette with dim windows,
 * once as *only* the window light - so the lights can flicker on their own,
 * additively, without repainting the building.
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

// --- sky -----------------------------------------------------------------------

export function bakeSky(scene: Phaser.Scene, w: number, h: number): string {
  return bake(scene, "title_sky", w, h, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#04061a");
    g.addColorStop(0.35, "#0c1236");
    g.addColorStop(0.62, "#1f2152");
    g.addColorStop(0.72, "#4a3060");
    g.addColorStop(0.76, "#2a1f40");
    g.addColorStop(1, "#06070f");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    // The Milky Way: a faint diagonal river of haze.
    const r = rng(7);
    ctx.save();
    ctx.translate(w * 0.5, h * 0.3);
    ctx.rotate(-0.35);
    for (let i = 0; i < 90; i++) {
      const x = (r() - 0.5) * w * 1.4;
      const y = (r() - 0.5) * h * 0.16 + Math.sin(x / 200) * 20;
      const rad = 30 + r() * 90;
      const haze = ctx.createRadialGradient(x, y, 0, x, y, rad);
      haze.addColorStop(0, `rgba(${150 + r() * 60},${140 + r() * 40},${200 + r() * 55},0.05)`);
      haze.addColorStop(1, "rgba(120,120,200,0)");
      ctx.fillStyle = haze;
      ctx.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
    ctx.restore();
    // Fine dust of tiny stars baked straight in; the bright ones are sprites.
    for (let i = 0; i < (w * h) / 1400; i++) {
      const y = Math.pow(r(), 1.6) * h * 0.7;
      ctx.globalAlpha = 0.25 + r() * 0.5;
      ctx.fillStyle = r() > 0.85 ? "#ffe6c0" : r() > 0.7 ? "#c8d8ff" : "#ffffff";
      const s = r() > 0.92 ? 1.3 : 0.7;
      ctx.fillRect(r() * w, y, s, s);
    }
    ctx.globalAlpha = 1;
  });
}

/** A soft round point of light, for stars and motes. */
export function bakeGlowDot(scene: Phaser.Scene): string {
  const key = "title_dot";
  if (scene.textures.exists(key)) return key;
  return bake(scene, key, 32, 32, (ctx) => {
    const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.18, "rgba(255,255,255,0.85)");
    g.addColorStop(0.45, "rgba(255,255,255,0.18)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 32, 32);
  });
}

/** A four-pointed glint for the brightest stars. */
export function bakeGlint(scene: Phaser.Scene): string {
  const key = "title_glint";
  if (scene.textures.exists(key)) return key;
  return bake(scene, key, 48, 48, (ctx) => {
    ctx.translate(24, 24);
    for (const [len, wid] of [
      [22, 1.4],
      [12, 1],
    ] as const) {
      for (let i = 0; i < (len === 22 ? 2 : 2); i++) {
        ctx.save();
        ctx.rotate((i * Math.PI) / 2 + (len === 22 ? 0 : Math.PI / 4));
        const g = ctx.createLinearGradient(-len, 0, len, 0);
        g.addColorStop(0, "rgba(255,255,255,0)");
        g.addColorStop(0.5, "rgba(255,255,255,0.95)");
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g;
        ctx.fillRect(-len, -wid / 2, len * 2, wid);
        ctx.restore();
      }
    }
    const c = ctx.createRadialGradient(0, 0, 0, 0, 0, 6);
    c.addColorStop(0, "rgba(255,255,255,1)");
    c.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = c;
    ctx.fillRect(-6, -6, 12, 12);
  });
}

// --- moon ----------------------------------------------------------------------

export function bakeMoon(scene: Phaser.Scene, radius: number): string {
  const size = radius * 6;
  return bake(scene, "title_moon", size, size, (ctx) => {
    const c = size / 2;
    // Halo.
    const halo = ctx.createRadialGradient(c, c, radius * 0.9, c, c, size / 2);
    halo.addColorStop(0, "rgba(220,226,255,0.35)");
    halo.addColorStop(0.3, "rgba(170,180,240,0.12)");
    halo.addColorStop(1, "rgba(120,130,220,0)");
    ctx.fillStyle = halo;
    ctx.fillRect(0, 0, size, size);
    // Disc.
    const disc = ctx.createRadialGradient(c - radius * 0.3, c - radius * 0.35, radius * 0.1, c, c, radius);
    disc.addColorStop(0, "#fffdf2");
    disc.addColorStop(0.7, "#ece6d2");
    disc.addColorStop(1, "#c8c2b4");
    ctx.save();
    ctx.shadowColor = "rgba(255,250,230,0.9)";
    ctx.shadowBlur = radius * 0.5;
    ctx.beginPath();
    ctx.arc(c, c, radius, 0, Math.PI * 2);
    ctx.fillStyle = disc;
    ctx.fill();
    ctx.restore();
    // Maria and craters.
    ctx.save();
    ctx.beginPath();
    ctx.arc(c, c, radius, 0, Math.PI * 2);
    ctx.clip();
    const r = rng(42);
    for (let i = 0; i < 9; i++) {
      const a = r() * Math.PI * 2;
      const d = r() * radius * 0.7;
      const cr = radius * (0.12 + r() * 0.28);
      const mx = c + Math.cos(a) * d;
      const my = c + Math.sin(a) * d;
      const mare = ctx.createRadialGradient(mx, my, 0, mx, my, cr);
      mare.addColorStop(0, `rgba(150,145,140,${0.16 + r() * 0.12})`);
      mare.addColorStop(1, "rgba(150,145,140,0)");
      ctx.fillStyle = mare;
      ctx.fillRect(mx - cr, my - cr, cr * 2, cr * 2);
    }
    for (let i = 0; i < 12; i++) {
      const a = r() * Math.PI * 2;
      const d = r() * radius * 0.85;
      const cr = radius * (0.03 + r() * 0.05);
      const x = c + Math.cos(a) * d;
      const y = c + Math.sin(a) * d;
      const crater = ctx.createRadialGradient(x + cr * 0.3, y + cr * 0.3, 0, x, y, cr);
      crater.addColorStop(0, "rgba(130,125,120,0.22)");
      crater.addColorStop(1, "rgba(130,125,120,0)");
      ctx.fillStyle = crater;
      ctx.fillRect(x - cr, y - cr, cr * 2, cr * 2);
    }
    // Terminator shading on the lower right.
    const term = ctx.createLinearGradient(c - radius, c - radius, c + radius, c + radius);
    term.addColorStop(0.55, "rgba(30,30,60,0)");
    term.addColorStop(1, "rgba(30,30,60,0.35)");
    ctx.fillStyle = term;
    ctx.fillRect(c - radius, c - radius, radius * 2, radius * 2);
    ctx.restore();
  });
}

// --- the Academy ---------------------------------------------------------------

/** Reference size the castle is designed at; it is scaled to fit. */
export const CASTLE_W = 760;
export const CASTLE_H = 440;

interface Tower {
  x: number;
  w: number;
  top: number;
  roof: number;
  /** Banner colour on the spire, if any. */
  flag?: string;
}

const TOWERS: Tower[] = [
  { x: 34, w: 40, top: 236, roof: 64 },
  { x: 128, w: 34, top: 178, roof: 78, flag: "#b8372b" },
  { x: 236, w: 30, top: 214, roof: 58 },
  { x: 332, w: 58, top: 96, roof: 118, flag: "#d9a843" },
  { x: 446, w: 38, top: 150, roof: 84, flag: "#2e418c" },
  { x: 540, w: 32, top: 196, roof: 66 },
  { x: 612, w: 44, top: 168, roof: 78, flag: "#4f7d36" },
  { x: 700, w: 28, top: 246, roof: 50, flag: "#2e7478" },
];

interface WindowSpot {
  x: number;
  y: number;
  w: number;
  h: number;
  lit: boolean;
  big?: boolean;
}

function castleWindows(): WindowSpot[] {
  const r = rng(1337);
  const out: WindowSpot[] = [];
  for (const t of TOWERS) {
    const rows = Math.floor((CASTLE_H - 120 - t.top) / 30);
    for (let i = 0; i < rows; i++) {
      out.push({ x: t.x + t.w / 2 - 3, y: t.top + 18 + i * 30, w: 6, h: 11, lit: r() > 0.3 });
    }
  }
  // The great hall's tall windows, all blazing.
  for (let i = 0; i < 5; i++) out.push({ x: 160 + i * 28, y: 262, w: 12, h: 34, lit: true, big: true });
  // Keep windows in rows.
  for (let row = 0; row < 3; row++) {
    for (let i = 0; i < 5; i++) {
      out.push({ x: 396 + i * 18 + (row % 2) * 6, y: 236 + row * 30, w: 6, h: 12, lit: r() > 0.35 });
    }
  }
  for (let i = 0; i < 6; i++) out.push({ x: 560 + i * 20, y: 276, w: 6, h: 11, lit: r() > 0.4 });
  return out;
}

function archWindow(ctx: CanvasRenderingContext2D, w: WindowSpot): void {
  ctx.beginPath();
  ctx.moveTo(w.x, w.y + w.h);
  ctx.lineTo(w.x, w.y + w.w / 2);
  ctx.arc(w.x + w.w / 2, w.y + w.w / 2, w.w / 2, Math.PI, 0);
  ctx.lineTo(w.x + w.w, w.y + w.h);
  ctx.closePath();
}

function castleShape(ctx: CanvasRenderingContext2D): void {
  const H = CASTLE_H;
  ctx.beginPath();
  // The crag the Academy stands on.
  ctx.moveTo(0, H);
  ctx.bezierCurveTo(30, H - 30, 70, H - 108, 150, H - 118);
  ctx.lineTo(620, H - 124);
  ctx.bezierCurveTo(690, H - 112, 730, H - 34, CASTLE_W, H);
  ctx.closePath();

  // Curtain walls with crenellations.
  const wall = (x0: number, x1: number, top: number): void => {
    ctx.rect(x0, top, x1 - x0, H - top);
    for (let x = x0; x < x1 - 4; x += 10) ctx.rect(x, top - 6, 6, 7);
  };
  wall(20, 740, 300);
  // Great hall with a steep roof.
  ctx.rect(140, 240, 160, 100);
  ctx.moveTo(132, 242);
  ctx.lineTo(220, 176);
  ctx.lineTo(308, 242);
  ctx.closePath();
  // The keep.
  wall(380, 500, 220);
  ctx.rect(380, 220, 120, 120);
  // A bridge of arches running out to the right-hand towers.
  ctx.rect(500, 262, 150, 22);

  for (const t of TOWERS) {
    ctx.rect(t.x, t.top, t.w, H - t.top);
    // Corbelled lip, then a conical roof.
    ctx.rect(t.x - 3, t.top - 4, t.w + 6, 6);
    ctx.moveTo(t.x - 5, t.top - 3);
    ctx.quadraticCurveTo(t.x + t.w / 2 - 2, t.top - t.roof * 0.55, t.x + t.w / 2, t.top - t.roof);
    ctx.quadraticCurveTo(t.x + t.w / 2 + 2, t.top - t.roof * 0.55, t.x + t.w + 5, t.top - 3);
    ctx.closePath();
    // Finial.
    ctx.rect(t.x + t.w / 2 - 0.75, t.top - t.roof - 10, 1.5, 11);
  }
}

export function bakeCastle(scene: Phaser.Scene): { body: string; lights: string } {
  const windows = castleWindows();

  const body = bake(scene, "title_castle", CASTLE_W, CASTLE_H, (ctx) => {
    castleShape(ctx);
    const g = ctx.createLinearGradient(0, 0, 0, CASTLE_H);
    g.addColorStop(0, "#151a36");
    g.addColorStop(0.6, "#0c0f22");
    g.addColorStop(1, "#05060e");
    ctx.fillStyle = g;
    ctx.fill("nonzero");

    // Moonlight catching the left-hand edges of roofs and towers.
    ctx.save();
    ctx.strokeStyle = "rgba(160,180,255,0.35)";
    ctx.lineWidth = 1.2;
    for (const t of TOWERS) {
      ctx.beginPath();
      ctx.moveTo(t.x - 5, t.top - 3);
      ctx.quadraticCurveTo(t.x + t.w / 2 - 2, t.top - t.roof * 0.55, t.x + t.w / 2, t.top - t.roof);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(t.x + 0.5, t.top + 2);
      ctx.lineTo(t.x + 0.5, CASTLE_H - 110);
      ctx.strokeStyle = "rgba(160,180,255,0.14)";
      ctx.stroke();
      ctx.strokeStyle = "rgba(160,180,255,0.35)";
    }
    ctx.beginPath();
    ctx.moveTo(132, 242);
    ctx.lineTo(220, 176);
    ctx.stroke();
    ctx.restore();

    // Bridge arches cut out of the span.
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      ctx.ellipse(515 + i * 28, 290, 10, 14, 0, Math.PI, 0);
      ctx.lineTo(525 + i * 28, 300);
      ctx.lineTo(505 + i * 28, 300);
      ctx.fill();
    }
    ctx.restore();

    // Banners.
    for (const t of TOWERS) {
      if (!t.flag) continue;
      const fx = t.x + t.w / 2 + 1;
      const fy = t.top - t.roof - 9;
      ctx.fillStyle = t.flag;
      ctx.beginPath();
      ctx.moveTo(fx, fy);
      ctx.quadraticCurveTo(fx + 9, fy + 1, fx + 16, fy + 3);
      ctx.lineTo(fx + 10, fy + 5);
      ctx.lineTo(fx + 15, fy + 8);
      ctx.quadraticCurveTo(fx + 8, fy + 7, fx, fy + 7);
      ctx.closePath();
      ctx.fill();
    }

    // Unlit windows read as dark glass; lit ones get a dim base.
    for (const w of windows) {
      archWindow(ctx, w);
      ctx.fillStyle = w.lit ? "#5a3a18" : "#1c2036";
      ctx.fill();
    }

    // The foundations dissolve into the lake mist rather than ending in a
    // hard edge.
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    const fade = ctx.createLinearGradient(0, CASTLE_H - 130, 0, CASTLE_H);
    fade.addColorStop(0, "rgba(0,0,0,0)");
    fade.addColorStop(1, "rgba(0,0,0,0.92)");
    ctx.fillStyle = fade;
    ctx.fillRect(0, CASTLE_H - 130, CASTLE_W, 130);
    const sides = ctx.createLinearGradient(0, 0, CASTLE_W, 0);
    sides.addColorStop(0, "rgba(0,0,0,0.9)");
    sides.addColorStop(0.06, "rgba(0,0,0,0)");
    sides.addColorStop(0.94, "rgba(0,0,0,0)");
    sides.addColorStop(1, "rgba(0,0,0,0.9)");
    ctx.fillStyle = sides;
    ctx.fillRect(0, CASTLE_H - 140, CASTLE_W, 140);
    ctx.restore();
  });

  const lights = bake(scene, "title_castle_lights", CASTLE_W, CASTLE_H, (ctx) => {
    for (const w of windows) {
      if (!w.lit) continue;
      ctx.save();
      ctx.shadowColor = "rgba(255,180,80,0.95)";
      ctx.shadowBlur = w.big ? 16 : 8;
      archWindow(ctx, w);
      const g = ctx.createLinearGradient(0, w.y, 0, w.y + w.h);
      g.addColorStop(0, "#fff2b8");
      g.addColorStop(1, "#ffa640");
      ctx.fillStyle = g;
      ctx.fill();
      ctx.restore();
      if (w.big) {
        // Mullions and tracery in the hall windows.
        ctx.strokeStyle = "rgba(60,30,10,0.75)";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(w.x + w.w / 2, w.y + 2);
        ctx.lineTo(w.x + w.w / 2, w.y + w.h);
        ctx.moveTo(w.x, w.y + w.h * 0.55);
        ctx.lineTo(w.x + w.w, w.y + w.h * 0.55);
        ctx.stroke();
      }
    }
  });

  return { body, lights };
}

// --- landscape layers ------------------------------------------------------------

/** Far hills: a soft blue-violet ridge. */
export function bakeHills(scene: Phaser.Scene, w: number, h: number): string {
  return bake(scene, "title_hills", w, h, (ctx) => {
    const r = rng(99);
    const ridge = (base: number, amp: number, color: string, seed: number): void => {
      ctx.beginPath();
      ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 8) {
        const y = base + Math.sin((x + seed) / 140) * amp + Math.sin((x + seed * 3) / 53) * amp * 0.35 + r() * 2;
        ctx.lineTo(x, y);
      }
      ctx.lineTo(w, h);
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
    };
    ridge(h * 0.35, h * 0.12, "#1a1d40", 10);
    ridge(h * 0.55, h * 0.1, "#12142e", 200);
  });
}

/** Pines in silhouette, for framing the corners. */
export function bakePines(scene: Phaser.Scene, w: number, h: number, seed: number, flip = false): string {
  return bake(scene, `title_pines_${seed}`, w, h, (ctx) => {
    if (flip) {
      ctx.translate(w, 0);
      ctx.scale(-1, 1);
    }
    const r = rng(seed);
    const tree = (x: number, base: number, height: number, color: string): void => {
      const width = height * 0.32;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(x, base - height);
      const tiers = 6;
      for (let i = 1; i <= tiers; i++) {
        const t = i / tiers;
        ctx.lineTo(x + width * t * 0.6, base - height + height * t * 0.85 - height * 0.03);
        ctx.lineTo(x + width * t * 0.36, base - height + height * t * 0.85);
      }
      ctx.lineTo(x + width * 0.08, base);
      ctx.lineTo(x - width * 0.08, base);
      for (let i = tiers; i >= 1; i--) {
        const t = i / tiers;
        ctx.lineTo(x - width * t * 0.36, base - height + height * t * 0.85);
        ctx.lineTo(x - width * t * 0.6, base - height + height * t * 0.85 - height * 0.03);
      }
      ctx.closePath();
      ctx.fill();
    };
    // Back row lighter, front row near-black; denser toward the outer edge.
    for (let i = 0; i < 14; i++) {
      const x = Math.pow(r(), 1.4) * w * 0.9;
      tree(x, h - r() * 20, h * (0.35 + r() * 0.35) * (1 - x / w / 2), "#0f1228");
    }
    for (let i = 0; i < 12; i++) {
      const x = Math.pow(r(), 1.8) * w * 0.8;
      tree(x, h + 4, h * (0.5 + r() * 0.5) * (1 - x / w / 1.6), "#04050c");
    }
  });
}

/** Wispy fog that tiles horizontally. */
export function bakeFog(scene: Phaser.Scene, seed: number): string {
  const w = 1024;
  const h = 220;
  return bake(scene, `title_fog_${seed}`, w, h, (ctx) => {
    const r = rng(seed);
    for (let i = 0; i < 70; i++) {
      const x = r() * w;
      const y = h * 0.3 + r() * h * 0.5;
      const rx = 60 + r() * 160;
      const ry = 16 + r() * 34;
      for (const dx of [-w, 0, w]) {
        const g = ctx.createRadialGradient(x + dx, y, 0, x + dx, y, rx);
        g.addColorStop(0, "rgba(190,200,240,0.12)");
        g.addColorStop(1, "rgba(190,200,240,0)");
        ctx.fillStyle = g;
        ctx.save();
        ctx.translate(x + dx, y);
        ctx.scale(1, ry / rx);
        ctx.translate(-(x + dx), -y);
        ctx.fillRect(x + dx - rx, y - rx, rx * 2, rx * 2);
        ctx.restore();
      }
    }
  });
}

/** Horizontal glints for the lake. */
export function bakeRipples(scene: Phaser.Scene): string {
  const w = 512;
  const h = 128;
  return bake(scene, "title_ripples", w, h, (ctx) => {
    const r = rng(5);
    for (let i = 0; i < 140; i++) {
      const y = r() * h;
      const x = r() * w;
      const len = 6 + r() * 40;
      ctx.fillStyle = `rgba(200,210,255,${0.05 + r() * 0.12})`;
      ctx.fillRect(x, y, len, 1);
      if (x + len > w) ctx.fillRect(x - w, y, len, 1);
    }
  });
}

// --- the logo --------------------------------------------------------------------

/** "Korvana" in gilded display type with a warm outer glow. */
export function bakeLogo(scene: Phaser.Scene, size: number): string {
  const font = `700 ${size}px ${FONT_DISPLAY}`;
  const probe = document.createElement("canvas").getContext("2d")!;
  probe.font = font;
  const textW = probe.measureText("Korvana").width;
  const w = Math.ceil(textW + size * 0.9);
  const h = Math.ceil(size * 1.7);
  return bake(scene, "title_logo", w, h, (ctx) => {
    ctx.font = font;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const cx = w / 2;
    const cy = h / 2 + size * 0.04;
    // Glow.
    ctx.save();
    ctx.shadowColor = "rgba(255,170,70,0.55)";
    ctx.shadowBlur = size * 0.35;
    ctx.fillStyle = "rgba(255,190,100,0.35)";
    ctx.fillText("Korvana", cx, cy);
    ctx.restore();
    // Deep shadow beneath.
    ctx.fillStyle = "rgba(10,6,2,0.85)";
    ctx.fillText("Korvana", cx, cy + size * 0.045);
    // Dark edge.
    ctx.lineWidth = Math.max(2, size * 0.035);
    ctx.strokeStyle = "#2a1806";
    ctx.lineJoin = "round";
    ctx.strokeText("Korvana", cx, cy);
    // Gilt.
    const gold = ctx.createLinearGradient(0, cy - size * 0.5, 0, cy + size * 0.45);
    gold.addColorStop(0, "#fffbe6");
    gold.addColorStop(0.32, "#f6d987");
    gold.addColorStop(0.52, "#c08a30");
    gold.addColorStop(0.66, "#e8c068");
    gold.addColorStop(1, "#8a5a1c");
    ctx.fillStyle = gold;
    ctx.fillText("Korvana", cx, cy);
    // A fine bright rim along the top of the letters.
    ctx.save();
    ctx.globalCompositeOperation = "source-atop";
    const rim = ctx.createLinearGradient(0, cy - size * 0.5, 0, cy - size * 0.2);
    rim.addColorStop(0, "rgba(255,255,255,0.55)");
    rim.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = rim;
    ctx.fillRect(0, 0, w, cy);
    ctx.restore();
  });
}
