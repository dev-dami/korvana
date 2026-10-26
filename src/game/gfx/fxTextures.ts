import type Phaser from "phaser";

import { makeRng } from "../world/noise";
import { canvasTex, commit } from "./canvas";
import { C, withAlpha } from "./palette";
import { Painter, rgb, tileNoise, wrapNoise } from "./paint";

/**
 * Effect textures: light pools, glows, particles, water shimmer. Most are
 * white so one texture can be tinted to any colour; soft ones use canvas
 * gradients (lights should be smooth), crisp ones are drawn per pixel.
 */

function radial(scene: Phaser.Scene, key: string, size: number, stops: Array<[number, string]>): void {
  const { tex, ctx } = canvasTex(scene, key, size, size);
  const c = size / 2;
  const grad = ctx.createRadialGradient(c, c, 0, c, c, c);
  for (const [t, colour] of stops) grad.addColorStop(t, colour);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);
  commit({ tex, ctx });
}

function pixels(scene: Phaser.Scene, key: string, p: Painter): void {
  const { tex, ctx } = canvasTex(scene, key, p.w, p.h);
  p.put(ctx);
  commit({ tex, ctx });
}

/** Smooth falloff that keeps a bright core and a long soft tail, like real light. */
function lightStops(): Array<[number, string]> {
  const stops: Array<[number, string]> = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    const a = Math.pow(1 - t, 2.2) * (1 - t * 0.15);
    stops.push([t, `rgba(255,255,255,${a.toFixed(3)})`]);
  }
  return stops;
}

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

/**
 * Seamless water shimmer: short bright crests scattered on a wrapping lattice.
 * Two copies scroll across each other in WorldFx, and where their crests
 * cross the water glitters.
 */
function waveTexture(size: number, seed: number, crests: number): Painter {
  const p = new Painter(size, size);
  const rng = makeRng(seed);
  for (let i = 0; i < crests; i++) {
    const x0 = Math.floor(rng() * size);
    const y0 = Math.floor(rng() * size);
    const len = 3 + Math.floor(rng() * 7);
    const bright = rng() > 0.75;
    for (let k = 0; k < len; k++) {
      const x = (x0 + k) % size;
      const sag = Math.round(Math.sin((k / len) * Math.PI) * -1);
      const y = (y0 + sag + size) % size;
      const edge = k === 0 || k === len - 1;
      p.px(x, y, 0xffffff, edge ? 0.35 : bright ? 0.9 : 0.6);
    }
  }
  // Very faint broad swell so the surface never looks dead flat.
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = wrapNoise(x, y, size / 4, 4, seed + 5);
      if (n > 0.68 && p.alpha(x, y) === 0) p.px(x, y, 0xffffff, (n - 0.68) * 0.35);
    }
  }
  return p;
}

export function buildFxTextures(scene: Phaser.Scene): void {
  // Contact shadow under actors: soft core, no hard rim.
  radial(scene, "fx_shadow_soft", 32, [
    [0, "rgba(0,0,0,0.55)"],
    [0.55, "rgba(0,0,0,0.32)"],
    [1, "rgba(0,0,0,0)"],
  ]);
  {
    const { tex, ctx } = canvasTex(scene, "fx_shadow", 28, 14);
    ctx.save();
    ctx.scale(1, 0.5);
    const grad = ctx.createRadialGradient(14, 14, 0, 14, 14, 14);
    grad.addColorStop(0, "rgba(0,0,0,0.5)");
    grad.addColorStop(0.6, "rgba(0,0,0,0.3)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 28, 28);
    ctx.restore();
    commit({ tex, ctx });
  }

  {
    // A spell orb: white-hot core inside a coloured halo.
    const { tex, ctx } = canvasTex(scene, "fx_orb", 20, 20);
    const grad = ctx.createRadialGradient(10, 10, 0, 10, 10, 10);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.3, "rgba(235,248,255,0.95)");
    grad.addColorStop(0.55, withAlpha(C.magic, 0.6));
    grad.addColorStop(1, withAlpha(C.magic, 0));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 20, 20);
    commit({ tex, ctx });
  }
  {
    const { tex, ctx } = canvasTex(scene, "fx_slash", 72, 72);
    drawSlash(ctx, 72);
    commit({ tex, ctx });
  }
  {
    const p = new Painter(6, 6);
    p.rect(2, 0, 2, 6, 0xffffff, 0.8);
    p.rect(0, 2, 6, 2, 0xffffff, 0.8);
    p.rect(2, 2, 2, 2, 0xffffff);
    pixels(scene, "fx_spark", p);
  }
  radial(scene, "fx_glow", 128, [
    [0, withAlpha(C.torch, 0.5)],
    [0.5, withAlpha(C.torch, 0.16)],
    [1, withAlpha(C.torch, 0)],
  ]);
  radial(scene, "fx_glow_cool", 128, [
    [0, withAlpha(C.magic, 0.5)],
    [0.5, withAlpha(C.magic, 0.16)],
    [1, withAlpha(C.magic, 0)],
  ]);
  {
    const { tex, ctx } = canvasTex(scene, "fx_pixel", 1, 1);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 1, 1);
    commit({ tex, ctx });
  }

  // --- lighting ---
  radial(scene, "fx_light", 128, lightStops());
  radial(scene, "fx_soft", 32, [
    [0, "rgba(255,255,255,1)"],
    [0.25, "rgba(255,255,255,0.7)"],
    [0.6, "rgba(255,255,255,0.18)"],
    [1, "rgba(255,255,255,0)"],
  ]);
  radial(scene, "fx_halo", 64, [
    [0, "rgba(255,255,255,0.9)"],
    [0.18, "rgba(255,255,255,0.45)"],
    [0.5, "rgba(255,255,255,0.12)"],
    [1, "rgba(255,255,255,0)"],
  ]);

  // --- particles ---
  {
    const p = new Painter(2, 2);
    p.fill(0xffffff);
    pixels(scene, "fx_dot", p);
  }
  {
    const p = new Painter(3, 3);
    p.rect(1, 0, 1, 3, 0xffffff, 0.7);
    p.rect(0, 1, 3, 1, 0xffffff, 0.7);
    p.px(1, 1, 0xffffff);
    pixels(scene, "fx_flake", p);
  }
  for (const [key, light, dark] of [
    ["fx_leaf_0", "#c9822e", "#8a4f1c"],
    ["fx_leaf_1", "#7aa041", "#4a6e28"],
    ["fx_leaf_2", "#d8a43a", "#9a6a20"],
  ] as const) {
    const p = new Painter(5, 4);
    p.rect(1, 0, 3, 1, rgb(light));
    p.rect(0, 1, 4, 1, rgb(light));
    p.rect(1, 2, 4, 1, rgb(dark));
    p.px(4, 3, rgb(dark));
    pixels(scene, key, p);
  }
  {
    // Mist: a lumpy, very soft white bank.
    const w = 160;
    const h = 72;
    const p = new Painter(w, h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dx = (x - w / 2) / (w / 2);
        const dy = (y - h / 2) / (h / 2);
        const d = dx * dx + dy * dy;
        if (d >= 1) continue;
        const n = tileNoise(x, y, 512, 24, 77);
        const a = Math.pow(1 - d, 1.6) * (0.45 + n * 0.75);
        p.px(x, y, 0xffffff, Math.min(1, a));
      }
    }
    pixels(scene, "fx_mist", p);
  }
  {
    // A cloud's shadow: big, soft and irregular.
    const w = 256;
    const h = 150;
    const p = new Painter(w, h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dx = (x - w / 2) / (w / 2);
        const dy = (y - h / 2) / (h / 2);
        const d = dx * dx + dy * dy;
        if (d >= 1) continue;
        const n = tileNoise(x, y, 1024, 40, 91);
        const a = Math.max(0, Math.pow(1 - d, 1.2) * (0.3 + n * 1.1) - 0.15);
        p.px(x, y, 0x000000, Math.min(1, a));
      }
    }
    pixels(scene, "fx_cloud", p);
  }
  for (let frame = 0; frame < 2; frame++) {
    const p = new Painter(11, 5);
    const up = frame === 0;
    p.rect(5, 2, 1, 2, 0x000000);
    for (let k = 1; k <= 5; k++) {
      const y = up ? 2 - Math.floor(k / 2) : 2 + Math.floor(k / 3);
      p.px(5 - k, y, 0x000000);
      p.px(5 + k, y, 0x000000);
    }
    pixels(scene, `fx_bird_${frame}`, p);
  }
  {
    const p = new Painter(7, 7);
    p.rect(3, 0, 1, 7, 0xffffff, 0.55);
    p.rect(0, 3, 7, 1, 0xffffff, 0.55);
    p.rect(3, 2, 1, 3, 0xffffff);
    p.rect(2, 3, 3, 1, 0xffffff);
    pixels(scene, "fx_glint", p);
  }
  {
    const { tex, ctx } = canvasTex(scene, "fx_ring", 64, 64);
    const grad = ctx.createRadialGradient(32, 32, 20, 32, 32, 31);
    grad.addColorStop(0, "rgba(255,255,255,0)");
    grad.addColorStop(0.55, "rgba(255,255,255,0.9)");
    grad.addColorStop(0.75, "rgba(255,255,255,0.35)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
    commit({ tex, ctx });
  }
  {
    // A flame tongue, white so it can be tinted; drawn additively over torches.
    const { tex, ctx } = canvasTex(scene, "fx_flame", 16, 24);
    const grad = ctx.createRadialGradient(8, 17, 0, 8, 15, 10);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.35, "rgba(255,255,255,0.7)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.quadraticCurveTo(15, 14, 13, 19);
    ctx.quadraticCurveTo(8, 25, 3, 19);
    ctx.quadraticCurveTo(1, 14, 8, 0);
    ctx.fill();
    commit({ tex, ctx });
  }
  {
    // A comet streak for spell bolts: bright head, tapering tail to the left.
    const { tex, ctx } = canvasTex(scene, "fx_bolt", 48, 16);
    const grad = ctx.createLinearGradient(0, 0, 48, 0);
    grad.addColorStop(0, "rgba(255,255,255,0)");
    grad.addColorStop(0.7, "rgba(255,255,255,0.55)");
    grad.addColorStop(1, "rgba(255,255,255,1)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, 8);
    ctx.quadraticCurveTo(30, 2, 40, 3);
    ctx.arc(40, 8, 5, -Math.PI / 2, Math.PI / 2);
    ctx.quadraticCurveTo(30, 14, 0, 8);
    ctx.fill();
    commit({ tex, ctx });
  }
  {
    const p = new Painter(15, 15);
    for (let i = 0; i < 15; i++) {
      const d = Math.abs(i - 7);
      const a = d === 0 ? 1 : Math.max(0, 0.9 - d * 0.12);
      p.px(7, i, 0xffffff, a);
      p.px(i, 7, 0xffffff, a);
    }
    p.rect(6, 6, 3, 3, 0xffffff);
    pixels(scene, "fx_star", p);
  }

  {
    // A sun shaft: a soft vertical band, brightest in the middle, feathered
    // at both ends so it never shows where it starts or stops.
    const { tex, ctx } = canvasTex(scene, "fx_shaft", 48, 220);
    const across = ctx.createLinearGradient(0, 0, 48, 0);
    across.addColorStop(0, "rgba(255,255,255,0)");
    across.addColorStop(0.5, "rgba(255,255,255,0.9)");
    across.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = across;
    ctx.fillRect(0, 0, 48, 220);
    ctx.globalCompositeOperation = "destination-in";
    const along = ctx.createLinearGradient(0, 0, 0, 220);
    along.addColorStop(0, "rgba(0,0,0,0)");
    along.addColorStop(0.3, "rgba(0,0,0,1)");
    along.addColorStop(0.7, "rgba(0,0,0,1)");
    along.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = along;
    ctx.fillRect(0, 0, 48, 220);
    commit({ tex, ctx });
  }

  pixels(scene, "fx_wave_0", waveTexture(128, 1301, 70));
  pixels(scene, "fx_wave_1", waveTexture(96, 1302, 42));
}
