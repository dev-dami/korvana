import Phaser from "phaser";

import { DPR } from "../display";
import type { SpellKind } from "../data/spells";
import { HOUSE_COLOURS } from "../gfx/looks";

/**
 * Vector emblems for the UI, painted once at device resolution: spell glyphs,
 * the four House crests and the compass dial. Unlike the pixel-art sprites
 * these are smooth, so they get linear filtering and are drawn at 1/DPR scale
 * to land exactly on device pixels.
 */

function bake(scene: Phaser.Scene, key: string, w: number, h: number, paint: (ctx: CanvasRenderingContext2D) => void): string {
  if (scene.textures.exists(key)) return key;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(w * DPR);
  canvas.height = Math.round(h * DPR);
  const ctx = canvas.getContext("2d")!;
  ctx.scale(DPR, DPR);
  paint(ctx);
  scene.textures.addCanvas(key, canvas)?.setFilter(Phaser.Textures.FilterMode.LINEAR);
  return key;
}

/** Display scale for an emblem baked at `size` and shown at `display` CSS pixels. */
export function emblemScale(size: number, display: number): number {
  return display / size / DPR;
}

// --- spell glyphs ---------------------------------------------------------------

export const GLYPH = 48;

/** White glyphs, tinted with the spell's colour where they are shown. */
export function spellGlyphKey(scene: Phaser.Scene, kind: SpellKind): string {
  return bake(scene, `glyph_${kind}`, GLYPH, GLYPH, (ctx) => {
    const c = GLYPH / 2;
    ctx.translate(c, c);
    ctx.strokeStyle = "#ffffff";
    ctx.fillStyle = "#ffffff";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowColor = "rgba(255,255,255,0.8)";
    ctx.shadowBlur = 4;
    switch (kind) {
      case "projectile": {
        // A comet: a four-point star with a streaming tail.
        ctx.globalAlpha = 0.5;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-16, 14);
        ctx.quadraticCurveTo(-6, 6, 2, -2);
        ctx.stroke();
        ctx.globalAlpha = 0.8;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-14, 6);
        ctx.quadraticCurveTo(-6, 2, 0, -4);
        ctx.moveTo(-8, 16);
        ctx.quadraticCurveTo(-2, 8, 4, 0);
        ctx.stroke();
        ctx.globalAlpha = 1;
        star(ctx, 6, -6, 11, 3);
        break;
      }
      case "nova": {
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.stroke();
        for (let i = 0; i < 12; i++) {
          const a = (i / 12) * Math.PI * 2;
          const r0 = 11;
          const r1 = i % 2 ? 17 : 20;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
          ctx.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(0, 0, 3.5, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case "ward": {
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(0, -18);
        ctx.quadraticCurveTo(10, -14, 15, -13);
        ctx.quadraticCurveTo(15, 6, 0, 18);
        ctx.quadraticCurveTo(-15, 6, -15, -13);
        ctx.quadraticCurveTo(-10, -14, 0, -18);
        ctx.stroke();
        // A rune inside.
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, -9);
        ctx.lineTo(0, 9);
        ctx.moveTo(-6, -4);
        ctx.lineTo(0, 2);
        ctx.lineTo(6, -4);
        ctx.stroke();
        break;
      }
      case "blink": {
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        for (let t = 0; t < 1; t += 0.02) {
          const a = t * Math.PI * 3.2;
          const r = 3 + t * 15;
          const x = Math.cos(a) * r;
          const y = Math.sin(a) * r;
          if (t === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
        star(ctx, 12, -12, 5, 1.5);
        star(ctx, -14, 10, 3.5, 1);
        break;
      }
    }
  });
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, inner: number): void {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 ? inner : r;
    const px = x + Math.cos(a) * rr;
    const py = y + Math.sin(a) * rr;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

// --- House crests ------------------------------------------------------------------

export const CREST_W = 56;
export const CREST_H = 66;

/**
 * A heater shield in the House colours, with its sigil (docs/DESIGN.md):
 * Emberhart's crowned stag, Thornwick's briar wreath, Ravelle's raven and
 * key, Stillwater's heron.
 */
export function crestKey(scene: Phaser.Scene, house: string): string {
  const colours = HOUSE_COLOURS[house] ?? { primary: "#555566", secondary: "#ccccdd", name: "" };
  return bake(scene, `crest_${house}`, CREST_W, CREST_H, (ctx) => {
    const w = CREST_W;
    const h = CREST_H;
    const shield = (inset: number): void => {
      ctx.beginPath();
      ctx.moveTo(inset + 2, inset + 4);
      ctx.lineTo(w - inset - 2, inset + 4);
      ctx.lineTo(w - inset - 2, h * 0.45);
      ctx.quadraticCurveTo(w - inset - 4, h * 0.82, w / 2, h - inset - 2);
      ctx.quadraticCurveTo(inset + 4, h * 0.82, inset + 2, h * 0.45);
      ctx.closePath();
    };
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 1.5;
    shield(1);
    ctx.fillStyle = "#c9a24e";
    ctx.fill();
    ctx.restore();
    shield(3.5);
    const field = ctx.createLinearGradient(0, 0, w, h);
    field.addColorStop(0, lighten(colours.primary, 0.25));
    field.addColorStop(0.6, colours.primary);
    field.addColorStop(1, darken(colours.primary, 0.35));
    ctx.fillStyle = field;
    ctx.fill();
    // A chief band in the secondary colour.
    ctx.save();
    shield(3.5);
    ctx.clip();
    ctx.fillStyle = colours.secondary;
    ctx.globalAlpha = 0.9;
    ctx.fillRect(0, 7, w, 6);
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.ellipse(w * 0.3, h * 0.25, w * 0.35, h * 0.2, -0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = colours.secondary;
    ctx.strokeStyle = colours.secondary;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    const cx = w / 2;
    const cy = h * 0.52;
    switch (house) {
      case "emberhart": {
        // Stag's head with branching antlers and a flame crown.
        ctx.beginPath();
        ctx.moveTo(cx, cy + 12);
        ctx.quadraticCurveTo(cx - 6, cy + 4, cx - 5, cy - 2);
        ctx.lineTo(cx + 5, cy - 2);
        ctx.quadraticCurveTo(cx + 6, cy + 4, cx, cy + 12);
        ctx.fill();
        ctx.lineWidth = 1.8;
        for (const s of [-1, 1]) {
          ctx.beginPath();
          ctx.moveTo(cx + s * 3, cy - 2);
          ctx.quadraticCurveTo(cx + s * 12, cy - 6, cx + s * 13, cy - 16);
          ctx.moveTo(cx + s * 8, cy - 5);
          ctx.lineTo(cx + s * 7, cy - 12);
          ctx.moveTo(cx + s * 11, cy - 9);
          ctx.lineTo(cx + s * 16, cy - 12);
          ctx.stroke();
        }
        ctx.fillStyle = "#ffcf6a";
        ctx.beginPath();
        ctx.moveTo(cx - 5, cy - 4);
        ctx.lineTo(cx - 4, cy - 10);
        ctx.lineTo(cx - 1.5, cy - 6);
        ctx.lineTo(cx, cy - 13);
        ctx.lineTo(cx + 1.5, cy - 6);
        ctx.lineTo(cx + 4, cy - 10);
        ctx.lineTo(cx + 5, cy - 4);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case "thornwick": {
        // A briar wreath: a ring of leaves with thorns.
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(cx, cy, 11, 0, Math.PI * 2);
        ctx.stroke();
        for (let i = 0; i < 10; i++) {
          const a = (i / 10) * Math.PI * 2;
          const x = cx + Math.cos(a) * 11;
          const y = cy + Math.sin(a) * 11;
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(a + Math.PI / 2);
          ctx.beginPath();
          ctx.ellipse(0, -3, 2, 4, 0.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(1, 2);
          ctx.lineTo(4, 4);
          ctx.stroke();
          ctx.restore();
        }
        ctx.fillStyle = "#e05a7a";
        ctx.beginPath();
        ctx.arc(cx, cy - 11, 2.5, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case "ravelle": {
        // A raven in profile holding a key.
        ctx.beginPath();
        ctx.moveTo(cx - 12, cy + 2);
        ctx.quadraticCurveTo(cx - 4, cy - 12, cx + 6, cy - 10);
        ctx.lineTo(cx + 13, cy - 8);
        ctx.lineTo(cx + 7, cy - 6);
        ctx.quadraticCurveTo(cx + 8, cy + 4, cx + 2, cy + 8);
        ctx.lineTo(cx - 4, cy + 14);
        ctx.lineTo(cx - 5, cy + 7);
        ctx.quadraticCurveTo(cx - 10, cy + 6, cx - 12, cy + 2);
        ctx.fill();
        ctx.fillStyle = darken(colours.primary, 0.3);
        ctx.beginPath();
        ctx.arc(cx + 5, cy - 8, 1.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#e8d48a";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(cx + 11, cy - 1, 2.6, 0, Math.PI * 2);
        ctx.moveTo(cx + 11, cy + 1.6);
        ctx.lineTo(cx + 11, cy + 12);
        ctx.moveTo(cx + 11, cy + 9);
        ctx.lineTo(cx + 14, cy + 9);
        ctx.moveTo(cx + 11, cy + 12);
        ctx.lineTo(cx + 14, cy + 12);
        ctx.stroke();
        break;
      }
      default: {
        // A heron standing in water, neck in its S.
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx - 2, cy + 14);
        ctx.lineTo(cx - 1, cy + 4);
        ctx.moveTo(cx + 2, cy + 14);
        ctx.lineTo(cx + 1, cy + 4);
        ctx.stroke();
        ctx.beginPath();
        ctx.ellipse(cx, cy + 1, 6, 4, -0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(cx + 4, cy - 1);
        ctx.quadraticCurveTo(cx + 9, cy - 6, cx + 3, cy - 9);
        ctx.quadraticCurveTo(cx - 2, cy - 12, cx + 2, cy - 15);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(cx + 2, cy - 16);
        ctx.lineTo(cx - 8, cy - 14);
        ctx.lineTo(cx + 2, cy - 13.5);
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.7;
        ctx.beginPath();
        ctx.moveTo(cx - 10, cy + 14);
        ctx.quadraticCurveTo(cx - 5, cy + 12, cx, cy + 14);
        ctx.quadraticCurveTo(cx + 5, cy + 16, cx + 10, cy + 14);
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
    shield(3.5);
    ctx.strokeStyle = "rgba(255,240,200,0.5)";
    ctx.lineWidth = 0.8;
    ctx.stroke();
  });
}

// --- compass ---------------------------------------------------------------------

export const DIAL = 64;

export function compassDialKey(scene: Phaser.Scene): string {
  return bake(scene, "ui_compass_dial", DIAL, DIAL, (ctx) => {
    const c = DIAL / 2;
    ctx.translate(c, c);
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(0, 0, 29, 0, Math.PI * 2);
    const face = ctx.createRadialGradient(-6, -8, 2, 0, 0, 29);
    face.addColorStop(0, "#2a2c42");
    face.addColorStop(1, "#0e0f18");
    ctx.fillStyle = face;
    ctx.fill();
    ctx.restore();
    const ring = ctx.createLinearGradient(-30, -30, 30, 30);
    ring.addColorStop(0, "#f0d68a");
    ring.addColorStop(0.5, "#8a6a2c");
    ring.addColorStop(1, "#e9cc7c");
    ctx.strokeStyle = ring;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(0, 0, 28.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 0.8;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    ctx.arc(0, 0, 24, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    // Ticks and a faint rose.
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * Math.PI * 2;
      const major = i % 8 === 0;
      const r0 = major ? 19 : i % 4 === 0 ? 21 : 22.5;
      ctx.strokeStyle = major ? "#f0d68a" : "rgba(240,214,138,0.5)";
      ctx.lineWidth = major ? 1.6 : 0.8;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r0, Math.sin(a) * r0);
      ctx.lineTo(Math.cos(a) * 24, Math.sin(a) * 24);
      ctx.stroke();
    }
    ctx.fillStyle = "rgba(240,214,138,0.12)";
    for (let i = 0; i < 4; i++) {
      ctx.save();
      ctx.rotate((i * Math.PI) / 2 + Math.PI / 4);
      ctx.beginPath();
      ctx.moveTo(0, -14);
      ctx.lineTo(3, 0);
      ctx.lineTo(-3, 0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.fillStyle = "#f0d68a";
    ctx.font = "bold 8px 'EB Garamond', Georgia, serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("N", 0, -14);
  });
}

/** A brass ring for round portraits (the HUD medallion). */
export function medallionKey(scene: Phaser.Scene, size: number): string {
  return bake(scene, `ui_medallion_${size}`, size, size, (ctx) => {
    const c = size / 2;
    const r = c - 3;
    ctx.translate(c, c);
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.7)";
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.lineWidth = 4;
    ctx.strokeStyle = "#1a1208";
    ctx.stroke();
    ctx.restore();
    const ring = ctx.createLinearGradient(-c, -c, c, c);
    ring.addColorStop(0, "#f6e2a0");
    ring.addColorStop(0.35, "#a07a34");
    ring.addColorStop(0.65, "#e9cc7c");
    ring.addColorStop(1, "#6e5222");
    ctx.strokeStyle = ring;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 0.8;
    ctx.strokeStyle = "rgba(255,240,200,0.6)";
    ctx.beginPath();
    ctx.arc(0, 0, r - 2.6, 0, Math.PI * 2);
    ctx.stroke();
    // Four studs.
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      ctx.fillStyle = "#f0d68a";
      ctx.beginPath();
      ctx.arc(Math.cos(a) * r, Math.sin(a) * r, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  });
}

function lighten(hex: string, t: number): string {
  return mixHex(hex, "#ffffff", t);
}

function darken(hex: string, t: number): string {
  return mixHex(hex, "#000000", t);
}

function mixHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (shift: number): number => Math.round(((pa >> shift) & 255) * (1 - t) + ((pb >> shift) & 255) * t);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}
