import Phaser from "phaser";

import { DPR, TEXT_RES } from "../display";
import { bodyText, displayText } from "../gfx/fonts";

/**
 * The look of every panel in Korvana: ink, parchment and brass.
 *
 * Two surfaces carry the whole UI. *Ink* is the lacquered dark of the HUD and
 * menus, edged in brass with filigree corners. *Parchment* is for reading -
 * conversations, the journal, the spellbook - with ink-coloured text, a
 * rubricated border and burnt edges. Both are painted with Canvas 2D at device
 * resolution, so their gradients and curls stay smooth on a high-DPI screen,
 * and cached per size so a panel costs one image draw per frame.
 */

// --- palette ------------------------------------------------------------------

export const INK = 0x10111a;
export const INK_LIGHT = 0x22243a;
export const BRASS = 0xc9a24e;
export const BRASS_LIGHT = 0xf1d98f;
export const BRASS_DARK = 0x6e5222;
export const PARCHMENT = 0xe9dbb7;
export const GARNET = 0x9c2f3f;
export const HEALTH = 0xc0392b;
export const HEALTH_DARK = 0x4a1414;
export const MANA = 0x3f86dd;
export const MANA_DARK = 0x12284a;
export const WARD = 0xe8c86a;
/** Kept for older call sites. */
export const GOLD = BRASS;
export const PANEL = INK;
export const PANEL_EDGE = 0x3f4350;

export const COLOR_TEXT = "#e8e0cc";
export const COLOR_BRIGHT = "#fbf4e2";
export const COLOR_DIM = "#a59d88";
export const COLOR_GOLD = "#ecc964";
/** Text set on parchment. */
export const COLOR_INK = "#2b2016";
export const COLOR_INK_SOFT = "#5c4a34";
export const COLOR_RUBRIC = "#8c2a22";

/** Draw order inside the UI scene. */
export const UI_DEPTH = {
  hud: 10,
  toast: 200,
  dialogue: 260,
  modal: 300,
  cutscene: 500,
  /** Pause blocks all input, so it must never hide under anything. */
  pause: 600,
} as const;

// --- cameras ------------------------------------------------------------------

/**
 * Zooms a UI scene's camera by the device pixel ratio *from the top-left*.
 *
 * display.ts zooms around the centre, which is right for the world camera
 * (it follows the player) but pushed every HUD element off-screen on a DPR 2
 * display, since layout is in CSS pixels from (0, 0).
 */
export function uiCamera(scene: Phaser.Scene): void {
  scene.cameras.main.setZoom(DPR).setOrigin(0, 0);
}

// --- text ---------------------------------------------------------------------

export function label(
  scene: Phaser.Scene,
  text: string,
  opts: Parameters<typeof bodyText>[0] = {},
): Phaser.GameObjects.Text {
  return scene.add.text(0, 0, text, bodyText(opts)).setResolution(TEXT_RES);
}

export function heading(
  scene: Phaser.Scene,
  text: string,
  opts: Parameters<typeof displayText>[0] = {},
): Phaser.GameObjects.Text {
  return scene.add.text(0, 0, text, displayText(opts)).setResolution(TEXT_RES);
}

/** Rounds a world-pixel distance into the "paces" the HUD reports. */
export function paces(pixels: number, tile: number): number {
  return Math.max(0, Math.round(pixels / tile));
}

// --- baked panels ---------------------------------------------------------------

export type PanelStyle = "ink" | "parchment" | "plaque" | "slot" | "slotActive" | "ribbon" | "portrait";

const refs = new Map<string, number>();

/** Paints (or reuses) a panel texture of a given CSS-pixel size. */
export function panelKey(scene: Phaser.Scene, style: PanelStyle, w: number, h: number): string {
  const W = Math.max(8, Math.round(w));
  const H = Math.max(8, Math.round(h));
  const key = `ui_${style}_${W}x${H}_${DPR}`;
  if (scene.textures.exists(key)) return key;

  const canvas = document.createElement("canvas");
  canvas.width = W * DPR;
  canvas.height = H * DPR;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(DPR, DPR);
  switch (style) {
    case "parchment":
      paintParchment(ctx, W, H);
      break;
    case "plaque":
      paintInk(ctx, W, H, { radius: 6, corners: false, alpha: 0.88 });
      break;
    case "slot":
      paintInk(ctx, W, H, { radius: 7, corners: false, alpha: 0.9, inset: true });
      break;
    case "slotActive":
      paintInk(ctx, W, H, { radius: 7, corners: false, alpha: 0.96, inset: true, glow: true });
      break;
    case "ribbon":
      paintRibbon(ctx, W, H);
      break;
    case "portrait":
      paintInk(ctx, W, H, { radius: 6, corners: true, alpha: 1, portrait: true });
      break;
    default:
      paintInk(ctx, W, H, { radius: 9, corners: true, alpha: 0.94 });
  }
  const tex = scene.textures.addCanvas(key, canvas);
  tex?.setFilter(Phaser.Textures.FilterMode.LINEAR);
  return key;
}

function retain(key: string): void {
  refs.set(key, (refs.get(key) ?? 0) + 1);
}

function release(scene: Phaser.Scene, key: string): void {
  const n = (refs.get(key) ?? 0) - 1;
  if (n > 0) {
    refs.set(key, n);
    return;
  }
  refs.delete(key);
  // Window resizes mint new sizes; drop the ones nobody shows any more.
  if (scene.textures.exists(key)) scene.textures.remove(key);
}

/**
 * A baked panel that can be moved and resized every frame. Re-paints only
 * when its size actually changes.
 */
export class Frame {
  readonly image: Phaser.GameObjects.Image;
  private key = "";
  private readonly scene: Phaser.Scene;
  private readonly style: PanelStyle;

  constructor(scene: Phaser.Scene, style: PanelStyle) {
    this.scene = scene;
    this.style = style;
    this.image = scene.add.image(0, 0, "__DEFAULT").setOrigin(0, 0).setVisible(false);
  }

  draw(x: number, y: number, w: number, h: number): this {
    const key = panelKey(this.scene, this.style, w, h);
    if (key !== this.key) {
      retain(key);
      if (this.key) release(this.scene, this.key);
      this.key = key;
      this.image.setTexture(key).setScale(1 / DPR);
    }
    this.image.setPosition(Math.round(x), Math.round(y)).setVisible(true);
    return this;
  }

  setVisible(visible: boolean): this {
    this.image.setVisible(visible);
    return this;
  }

  setDepth(depth: number): this {
    this.image.setDepth(depth);
    return this;
  }

  setAlpha(alpha: number): this {
    this.image.setAlpha(alpha);
    return this;
  }

  destroy(): void {
    if (this.key) release(this.scene, this.key);
    this.key = "";
    this.image.destroy();
  }
}

// --- painters ---------------------------------------------------------------------

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function brassGradient(ctx: CanvasRenderingContext2D, w: number, h: number): CanvasGradient {
  const g = ctx.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, "#7a5a26");
  g.addColorStop(0.18, "#f0d68a");
  g.addColorStop(0.4, "#a07a34");
  g.addColorStop(0.62, "#e9cc7c");
  g.addColorStop(0.85, "#8a6a2c");
  g.addColorStop(1, "#d8b866");
  return g;
}

/** Deterministic speckle so a panel looks the same every time it is baked. */
function speckle(ctx: CanvasRenderingContext2D, w: number, h: number, count: number, color: string, seed: number): void {
  let s = seed;
  const rnd = (): number => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  ctx.fillStyle = color;
  for (let i = 0; i < count; i++) {
    ctx.globalAlpha = 0.03 + rnd() * 0.07;
    ctx.fillRect(rnd() * w, rnd() * h, 0.6 + rnd() * 1.4, 0.6 + rnd() * 1.2);
  }
  ctx.globalAlpha = 1;
}

interface InkOpts {
  radius: number;
  corners: boolean;
  alpha: number;
  inset?: boolean;
  glow?: boolean;
  portrait?: boolean;
}

function paintInk(ctx: CanvasRenderingContext2D, w: number, h: number, o: InkOpts): void {
  const r = o.radius;
  // Drop shadow.
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 2;
  roundRect(ctx, 2, 2, w - 4, h - 4, r);
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  if (o.portrait) {
    bg.addColorStop(0, "#2a2b40");
    bg.addColorStop(1, "#121320");
  } else {
    bg.addColorStop(0, `rgba(31,32,48,${o.alpha})`);
    bg.addColorStop(1, `rgba(12,13,20,${o.alpha})`);
  }
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundRect(ctx, 2, 2, w - 4, h - 4, r);
  ctx.clip();
  speckle(ctx, w, h, Math.round((w * h) / 40), "#ffffff", w * 31 + h);
  if (o.inset) {
    const ig = ctx.createRadialGradient(w / 2, h * 0.35, 2, w / 2, h / 2, Math.max(w, h) * 0.7);
    ig.addColorStop(0, o.glow ? "rgba(240,200,110,0.22)" : "rgba(255,255,255,0.05)");
    ig.addColorStop(1, "rgba(0,0,0,0.25)");
    ctx.fillStyle = ig;
    ctx.fillRect(0, 0, w, h);
  }
  // A faint sheen along the top edge, like lacquer.
  const sheen = ctx.createLinearGradient(0, 0, 0, Math.min(24, h / 2));
  sheen.addColorStop(0, "rgba(255,236,190,0.08)");
  sheen.addColorStop(1, "rgba(255,236,190,0)");
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, w, Math.min(24, h / 2));
  ctx.restore();

  // Border: a dark bevel, then brass, then a fine inner brass line.
  roundRect(ctx, 1.5, 1.5, w - 3, h - 3, r + 0.5);
  ctx.strokeStyle = "rgba(4,4,8,0.9)";
  ctx.lineWidth = 2;
  ctx.stroke();
  roundRect(ctx, 2.5, 2.5, w - 5, h - 5, r);
  ctx.strokeStyle = brassGradient(ctx, w, h);
  ctx.lineWidth = o.glow ? 2 : 1.4;
  ctx.stroke();
  if (o.glow) {
    ctx.save();
    ctx.shadowColor = "rgba(255,210,120,0.9)";
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.restore();
  }
  if (w > 40 && h > 30) {
    roundRect(ctx, 6, 6, w - 12, h - 12, Math.max(2, r - 4));
    ctx.strokeStyle = "rgba(201,162,78,0.28)";
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  if (o.corners && w > 80 && h > 60) {
    for (const [cx, cy, sx, sy] of [
      [6, 6, 1, 1],
      [w - 6, 6, -1, 1],
      [6, h - 6, 1, -1],
      [w - 6, h - 6, -1, -1],
    ] as const) {
      filigree(ctx, cx, cy, sx, sy, w, h);
    }
    if (w > 260) {
      edgeJewel(ctx, w / 2, 2.5, w, h);
      edgeJewel(ctx, w / 2, h - 2.5, w, h);
    }
  }
}

/** A brass corner: an L of fine line, a curl, and a small garnet. */
function filigree(ctx: CanvasRenderingContext2D, x: number, y: number, sx: number, sy: number, w: number, h: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(sx, sy);
  ctx.strokeStyle = brassGradient(ctx, w, h);
  ctx.lineWidth = 1.3;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(2, 16);
  ctx.lineTo(2, 4);
  ctx.quadraticCurveTo(2, 2, 4, 2);
  ctx.lineTo(16, 2);
  ctx.stroke();
  // Curl.
  ctx.beginPath();
  ctx.arc(9, 9, 4, Math.PI * 1.05, Math.PI * 2.6);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(16, 2);
  ctx.quadraticCurveTo(22, 2, 24, 6);
  ctx.moveTo(2, 16);
  ctx.quadraticCurveTo(2, 22, 6, 24);
  ctx.stroke();
  // Gem.
  ctx.beginPath();
  ctx.moveTo(4, 1);
  ctx.lineTo(7, 4);
  ctx.lineTo(4, 7);
  ctx.lineTo(1, 4);
  ctx.closePath();
  const gem = ctx.createLinearGradient(1, 1, 7, 7);
  gem.addColorStop(0, "#ff8a8a");
  gem.addColorStop(1, "#6a1420");
  ctx.fillStyle = gem;
  ctx.fill();
  ctx.lineWidth = 0.8;
  ctx.strokeStyle = "#f0d68a";
  ctx.stroke();
  ctx.restore();
}

function edgeJewel(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number): void {
  ctx.save();
  ctx.strokeStyle = brassGradient(ctx, w, h);
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(x - 26, y);
  ctx.quadraticCurveTo(x - 12, y + (y < h / 2 ? 4 : -4), x - 6, y);
  ctx.moveTo(x + 26, y);
  ctx.quadraticCurveTo(x + 12, y + (y < h / 2 ? 4 : -4), x + 6, y);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y - 5);
  ctx.lineTo(x + 5, y);
  ctx.lineTo(x, y + 5);
  ctx.lineTo(x - 5, y);
  ctx.closePath();
  ctx.fillStyle = brassGradient(ctx, w, h);
  ctx.fill();
  ctx.fillStyle = "#3a6fa8";
  ctx.beginPath();
  ctx.arc(x, y, 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function paintParchment(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const r = 6;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.6)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 3;
  roundRect(ctx, 3, 3, w - 6, h - 6, r);
  ctx.fillStyle = "#2a1d12";
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundRect(ctx, 5, 5, w - 10, h - 10, r - 2);
  ctx.clip();
  const g = ctx.createRadialGradient(w * 0.45, h * 0.4, 10, w / 2, h / 2, Math.max(w, h) * 0.75);
  g.addColorStop(0, "#f4ead0");
  g.addColorStop(0.6, "#e6d5ae");
  g.addColorStop(1, "#c9b083");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // Fibres and foxing.
  let s = (w * 7919 + h * 104729) >>> 0;
  const rnd = (): number => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
  ctx.strokeStyle = "#6b4f2c";
  for (let i = 0; i < (w * h) / 90; i++) {
    ctx.globalAlpha = 0.03 + rnd() * 0.06;
    const x = rnd() * w;
    const y = rnd() * h;
    const len = 2 + rnd() * 7;
    const a = rnd() * Math.PI;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * len, y + Math.sin(a) * len);
    ctx.stroke();
  }
  // Foxing: a few soft age-spots that fade out at their edges.
  for (let i = 0; i < 5; i++) {
    const fx = rnd() * w;
    const fy = rnd() * h;
    const fr = 14 + rnd() * 36;
    const spot = ctx.createRadialGradient(fx, fy, 0, fx, fy, fr);
    spot.addColorStop(0, "rgba(150,100,50,0.07)");
    spot.addColorStop(1, "rgba(150,100,50,0)");
    ctx.fillStyle = spot;
    ctx.fillRect(fx - fr, fy - fr, fr * 2, fr * 2);
  }
  ctx.globalAlpha = 1;

  // Burnt, darkened edges.
  const edge = ctx.createLinearGradient(0, 0, 0, h);
  edge.addColorStop(0, "rgba(90,58,26,0.22)");
  edge.addColorStop(0.08, "rgba(90,58,26,0)");
  edge.addColorStop(0.92, "rgba(90,58,26,0)");
  edge.addColorStop(1, "rgba(90,58,26,0.25)");
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, w, h);
  const edgeX = ctx.createLinearGradient(0, 0, w, 0);
  edgeX.addColorStop(0, "rgba(90,58,26,0.2)");
  edgeX.addColorStop(Math.min(0.2, 30 / w), "rgba(90,58,26,0)");
  edgeX.addColorStop(Math.max(0.8, 1 - 30 / w), "rgba(90,58,26,0)");
  edgeX.addColorStop(1, "rgba(90,58,26,0.2)");
  ctx.fillStyle = edgeX;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  // Brass rim.
  roundRect(ctx, 4.5, 4.5, w - 9, h - 9, r - 1);
  ctx.strokeStyle = brassGradient(ctx, w, h);
  ctx.lineWidth = 1.6;
  ctx.stroke();
  // Ruled border in ink, like a scribe's margin.
  ctx.strokeStyle = "rgba(92,58,30,0.55)";
  ctx.lineWidth = 0.8;
  ctx.strokeRect(11.5, 11.5, w - 23, h - 23);
  ctx.strokeStyle = "rgba(140,42,34,0.35)";
  ctx.strokeRect(13.5, 13.5, w - 27, h - 27);

  // Illuminated corners: a rubric leaf and a blue dot.
  if (w > 80 && h > 60) {
    for (const [cx, cy, sx, sy] of [
      [12, 12, 1, 1],
      [w - 12, 12, -1, 1],
      [12, h - 12, 1, -1],
      [w - 12, h - 12, -1, -1],
    ] as const) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.scale(sx, sy);
      ctx.fillStyle = "#8c2a22";
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(10, 1, 13, 7);
      ctx.quadraticCurveTo(7, 6, 0, 0);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(1, 10, 7, 13);
      ctx.quadraticCurveTo(6, 7, 0, 0);
      ctx.fill();
      ctx.fillStyle = "#2c4f8a";
      ctx.beginPath();
      ctx.arc(5, 5, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#d9b44a";
      ctx.beginPath();
      ctx.arc(5, 5, 0.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}

/** A name plate: a dark ribbon with swallow-tail ends and brass edging. */
function paintRibbon(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const notch = Math.min(12, h / 2);
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.55)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetY = 2;
  ctx.beginPath();
  ctx.moveTo(2, 3);
  ctx.lineTo(w - 2, 3);
  ctx.lineTo(w - 2 - notch, h / 2);
  ctx.lineTo(w - 2, h - 3);
  ctx.lineTo(2, h - 3);
  ctx.lineTo(2 + notch, h / 2);
  ctx.closePath();
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#3a1e2a");
  g.addColorStop(0.5, "#24131c");
  g.addColorStop(1, "#160b10");
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = brassGradient(ctx, w, h);
  ctx.lineWidth = 1.4;
  ctx.stroke();
  ctx.strokeStyle = "rgba(240,214,138,0.3)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(8 + notch, 6.5);
  ctx.lineTo(w - 8 - notch, 6.5);
  ctx.moveTo(8 + notch, h - 6.5);
  ctx.lineTo(w - 8 - notch, h - 6.5);
  ctx.stroke();
}

// --- vector ornaments, drawn live -------------------------------------------------

/** A scrolling divider: two hairlines with a diamond between. */
export function divider(g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, color = BRASS, alpha = 0.85): void {
  const cx = x + w / 2;
  g.lineStyle(1, color, alpha * 0.8);
  g.lineBetween(x, y, cx - 9, y);
  g.lineBetween(cx + 9, y, x + w, y);
  g.fillStyle(color, alpha);
  g.fillTriangle(cx - 6, y, cx, y - 4, cx + 6, y);
  g.fillTriangle(cx - 6, y, cx, y + 4, cx + 6, y);
  g.fillCircle(x, y, 1.5);
  g.fillCircle(x + w, y, 1.5);
}

/**
 * A capsule bar: trough, gradient fill, a glassy highlight and a fine brass
 * rim. `ghost` is a trailing fraction shown in pale colour, so damage reads
 * as a chunk falling away rather than a number changing.
 */
export function capsuleBar(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  fraction: number,
  color: number,
  trough: number,
  ghost = 0,
): void {
  const r = h / 2;
  const f = Phaser.Math.Clamp(fraction, 0, 1);
  g.fillStyle(0x050508, 0.85);
  g.fillRoundedRect(x - 1, y - 1, w + 2, h + 2, r + 1);
  g.fillStyle(trough, 1);
  g.fillRoundedRect(x, y, w, h, r);

  if (ghost > f) {
    const gw = Math.max(h, Math.round(w * Math.min(1, ghost)));
    g.fillStyle(0xf4e4c0, 0.55);
    g.fillRoundedRect(x, y, gw, h, r);
  }

  const fw = Math.round(w * f);
  if (fw > 0) {
    const width = Math.max(Math.min(fw, w), Math.min(h, w));
    const light = Phaser.Display.Color.ValueToColor(color).lighten(18).color;
    const dark = Phaser.Display.Color.ValueToColor(color).darken(22).color;
    g.fillGradientStyle(light, light, dark, dark, 1);
    g.fillRoundedRect(x, y, width, h, Math.min(r, width / 2));
    // Glass highlight across the top third.
    g.fillStyle(0xffffff, 0.22);
    g.fillRoundedRect(x + 2, y + 1, Math.max(0, width - 4), Math.max(1, h * 0.32), Math.min(r, h * 0.16));
  }
  g.lineStyle(1, BRASS, 0.75);
  g.strokeRoundedRect(x - 1, y - 1, w + 2, h + 2, r + 1);
}

/** A round key badge: brass coin with a dark glyph, e.g. a choice number. */
export function keyBadge(g: Phaser.GameObjects.Graphics, x: number, y: number, radius: number, active = true): void {
  g.fillStyle(0x000000, 0.4);
  g.fillCircle(x, y + 1, radius + 1);
  g.fillStyle(active ? BRASS : 0x6a6458, 1);
  g.fillCircle(x, y, radius);
  g.fillStyle(active ? BRASS_LIGHT : 0x8a8476, 0.7);
  g.fillCircle(x - radius * 0.25, y - radius * 0.3, radius * 0.45);
  g.lineStyle(1, active ? BRASS_DARK : 0x3a3630, 1);
  g.strokeCircle(x, y, radius);
}

/** A dimming veil with a soft vignette, for anything modal. */
export function veil(g: Phaser.GameObjects.Graphics, w: number, h: number, alpha: number): void {
  g.fillStyle(0x05060a, alpha);
  g.fillRect(0, 0, w, h);
  const band = Math.min(w, h) * 0.18;
  g.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, alpha * 0.6, alpha * 0.6, 0, 0);
  g.fillRect(0, 0, w, band);
  g.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, alpha * 0.6, alpha * 0.6);
  g.fillRect(0, h - band, w, band);
}

