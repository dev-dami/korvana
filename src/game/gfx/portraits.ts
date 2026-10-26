import type Phaser from "phaser";

import { canvasTex } from "./canvas";
import { writePix } from "./characters";
import { LOOKS } from "./looks";
import type { Look } from "./looks";
import { paintCreature } from "./paint/creatures";
import type { Pose } from "./paint/humanoid";
import { blend, hex, Pix, ramp } from "./pixel";
import type { Ramp } from "./pixel";

/**
 * Dialogue portraits: a 64x64 bust for every look.
 *
 * People get a dedicated painter - the sprite's 14-pixel face cannot carry an
 * expression, but at this size there is room for irises, a mouth that smiles
 * or does not, brows that do most of the acting. Creatures are their sprite,
 * cropped to the interesting part and doubled, which keeps them unmistakably
 * the same thing you just walked up to.
 */

export const PORTRAIT_SIZE = 64;
const S = PORTRAIT_SIZE;
const HX = 32;
const EYE_DARK = 0x1c1426;
const WHITE = 0xf8f4ec;

export function portraitKey(lookKey: string): string {
  return `portrait_${lookKey}`;
}

export function buildPortraits(scene: Phaser.Scene): void {
  for (const look of Object.values(LOOKS)) {
    const pix = look.body === "humanoid" ? paintBust(look) : creatureBust(look);
    const { tex, ctx } = canvasTex(scene, portraitKey(look.key), S, S);
    writePix(ctx, pix);
    tex.refresh();
  }
}

// --- creatures --------------------------------------------------------------------

function creatureBust(look: Look): Pix {
  const pose: Pose = { facing: "down", stride: 0, bob: 0, breath: 0, blink: false, action: "none", t: 0.2, hover: -3 };
  const frame = paintCreature(look, pose, look.body === "bat");
  // Crop a 32x32 window around whatever was drawn, then double it.
  let minX = 99;
  let minY = 99;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < frame.h; y++) {
    for (let x = 0; x < frame.w; x++) {
      if (!frame.filled(x, y)) continue;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
  const cx = Math.round((minX + maxX) / 2);
  const cy = Math.round((minY + maxY) / 2);
  const ox = cx - 16;
  const oy = Math.max(0, Math.min(frame.h - 32, cy - 16));
  const out = new Pix(S, S);
  for (let y = 0; y < 32; y++) {
    for (let x = 0; x < 32; x++) {
      const sx = ox + x;
      const sy = oy + y;
      if (!frame.filled(sx, sy)) continue;
      const i = sy * frame.w + sx;
      const c = frame.rgb[i]!;
      const a = frame.alpha[i]!;
      out.set(x * 2, y * 2, c, a);
      out.set(x * 2 + 1, y * 2, c, a);
      out.set(x * 2, y * 2 + 1, c, a);
      out.set(x * 2 + 1, y * 2 + 1, c, a);
    }
  }
  return out;
}

// --- people -------------------------------------------------------------------------

interface BustTones {
  skin: Ramp;
  hair: Ramp;
  robe: Ramp;
  trim: Ramp;
  inner: Ramp;
  accent: Ramp;
  hat: Ramp;
}

function rowShade(layer: Pix, r: Ramp, hiFrac: number, loFrac: number): void {
  for (let y = 0; y < layer.h; y++) {
    let min = -1;
    let max = -1;
    for (let x = 0; x < layer.w; x++) {
      if (!layer.filled(x, y)) continue;
      if (min < 0) min = x;
      max = x;
    }
    if (min < 0) continue;
    const span = Math.max(1, max - min);
    for (let x = min; x <= max; x++) {
      if (!layer.filled(x, y) || layer.get(x, y) !== r.base) continue;
      const t = (x - min) / span;
      if (t < hiFrac) layer.set(x, y, r.hi);
      else if (t > 1 - loFrac) layer.set(x, y, t > 0.93 ? r.deep : r.lo);
    }
  }
}

function paintBust(look: Look): Pix {
  const p = new Pix(S, S);
  const T: BustTones = {
    skin: ramp(look.skin),
    hair: ramp(look.hair),
    robe: ramp(look.robe),
    trim: ramp(look.trim),
    inner: ramp(look.inner ?? "#e8e2d4"),
    accent: ramp(look.accent ?? look.trim),
    hat: ramp(look.hatColor ?? look.robe),
  };
  const headCy = look.hat === "pointed" || look.hat === "tall" || look.hat === "wide" ? 32 : 30;
  const eyeY = headCy + 1;

  // Behind everything: long hair, a hood, a standing collar.
  if (look.hairStyle === "long" && look.hat !== "helm") {
    const layer = new Pix(S, S);
    layer.poly(
      [
        [HX - 15, headCy - 4],
        [HX + 15, headCy - 4],
        [HX + 18, S],
        [HX - 18, S],
      ],
      T.hair.base,
    );
    rowShade(layer, T.hair, 0.15, 0.3);
    p.stamp(layer, 0, 0);
  }
  if (look.hairStyle === "ponytail") {
    p.ellipseWith(HX + 15, headCy + 6, 4, 12, (nx) => (nx > 0.2 ? T.hair.lo : T.hair.base));
  }
  if (look.hat === "hood") {
    p.shadedEllipse(HX, headCy - 1, 19, 19.5, T.hat, 0.1);
  }
  if (look.cape) {
    const c = ramp(look.cape);
    const collar = new Pix(S, S);
    collar.poly(
      [
        [HX - 15, headCy + 4],
        [HX + 15, headCy + 4],
        [HX + 20, headCy + 20],
        [HX - 20, headCy + 20],
      ],
      c.base,
    );
    rowShade(collar, c, 0.2, 0.3);
    p.stamp(collar, 0, 0);
  }

  paintShoulders(p, look, T, headCy);

  // Neck, with the jaw's shadow across it.
  p.rect(HX - 5, headCy + 8, 10, 9, T.skin.base);
  p.rect(HX + 2, headCy + 8, 3, 9, T.skin.lo);
  p.hline(HX - 5, HX + 4, headCy + 9, T.skin.lo);
  p.hline(HX - 5, HX + 4, headCy + 10, T.skin.lo);
  paintCollar(p, look, T, headCy);

  if (look.hat === "helm") {
    paintHelm(p, look, T, headCy);
    p.outline(0x140c1a, 0.6);
    if (look.alpha !== undefined) p.fade(Math.min(1, look.alpha + 0.15));
    return p;
  }

  // Head.
  const skull = look.outfit === "bones";
  p.ellipseWith(HX, headCy, 13, 14.5, (nx, ny, x, y) => {
    // Taper the jaw toward the chin.
    if (!skull && ny > 0.35) {
      const allowed = 1 - (ny - 0.35) * 0.55;
      if (Math.abs(nx) > allowed) return null;
    }
    if (skull && ny > 0.55 && Math.abs(nx) > 0.6) return null;
    const light = -nx * 0.5 - ny * 0.55 + 0.32;
    void x;
    void y;
    if (light > 0.78) return T.skin.hi;
    if (light < -0.5) return T.skin.deep;
    if (light < -0.12) return T.skin.lo;
    return T.skin.base;
  });
  // Ears.
  if (!["long", "bob"].includes(look.hairStyle) && look.hat !== "hood" && !skull) {
    p.ellipseWith(HX - 13.5, eyeY + 1, 2.4, 3.6, (nx) => (nx < 0 ? T.skin.base : T.skin.lo));
    p.ellipseWith(HX + 13.5, eyeY + 1, 2.4, 3.6, (nx) => (nx > 0 ? T.skin.lo : T.skin.deep));
  }

  if (skull) {
    paintSkullFace(p, look, T, headCy, eyeY);
  } else if (look.mask) {
    paintMask(p, look, eyeY, headCy);
  } else {
    paintFace(p, look, T, eyeY);
  }

  if (look.hat === "hood") {
    paintHoodRim(p, look, T, headCy, eyeY);
  } else {
    paintHair(p, look, T, headCy, eyeY);
  }
  paintBeard(p, look, eyeY);
  paintGlasses(p, look, eyeY);
  paintHat(p, look, T, headCy);
  paintScarf(p, look, headCy);

  p.outline(0x140c1a, 0.6);
  if (look.alpha !== undefined && look.alpha < 1) p.fade(Math.min(1, look.alpha + 0.12));
  return p;
}

function paintShoulders(p: Pix, look: Look, T: BustTones, headCy: number): void {
  const top = headCy + 14;
  const layer = new Pix(S, S);
  const broad = look.outfit === "armor" ? 4 : look.size === "child" ? -2 : 0;
  layer.poly(
    [
      [HX - 10, top],
      [HX + 10, top],
      [HX + 24 + broad, top + 6],
      [HX + 29 + broad, top + 13],
      [HX + 30 + broad, S],
      [HX - 30 - broad, S],
      [HX - 29 - broad, top + 13],
      [HX - 24 - broad, top + 6],
    ],
    look.outfit === "bones" ? 0x000000 : T.robe.base,
  );
  if (look.outfit === "bones") {
    // Collarbones and ribs on the dark.
    const bone = T.skin;
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (layer.filled(x, y)) layer.clear(x, y);
    p.line(HX - 3, top + 1, HX - 20, top + 4, bone.base);
    p.line(HX + 2, top + 1, HX + 19, top + 4, bone.lo);
    for (let i = 0; i < 4; i++) {
      const y = top + 6 + i * 4;
      p.line(HX - 3, y, HX - 14 + i, y + 2, bone.base);
      p.line(HX + 2, y, HX + 13 - i, y + 2, bone.lo);
    }
    p.vline(HX - 1, top, S - 1, bone.hi);
    p.vline(HX, top, S - 1, bone.base);
    const tab = ramp(look.robe);
    p.rect(HX - 26, top + 14, 10, S - top - 14, tab.base);
    p.rect(HX + 16, top + 14, 10, S - top - 14, tab.lo);
    return;
  }
  rowShade(layer, T.robe, 0.14, 0.3);
  // Folds where the arms meet the body.
  for (let y = top + 10; y < S; y++) {
    layer.set(HX - 17 + Math.floor((y - top) / 5), y, T.robe.lo);
    layer.set(HX + 16 - Math.floor((y - top) / 5), y, T.robe.deep);
  }
  if (look.outfit === "armor") {
    // Pauldrons and a brass-edged breastplate.
    layer.shadedEllipse(HX - 22, top + 9, 9, 6, T.robe);
    layer.shadedEllipse(HX + 22, top + 9, 9, 6, T.robe);
    for (const cx of [HX - 22, HX + 22]) {
      layer.ellipseWith(cx, top + 9, 9, 6, (nx, ny) => (Math.abs(ny - 0.35) < 0.18 && Math.abs(nx) < 0.95 ? T.trim.base : null));
    }
    layer.vline(HX - 1, top + 6, S - 1, T.robe.hi);
    layer.vline(HX, top + 6, S - 1, T.robe.lo);
    for (const [rx, ry] of [
      [HX - 8, top + 10],
      [HX + 7, top + 10],
      [HX - 8, top + 18],
      [HX + 7, top + 18],
    ] as const) {
      layer.set(rx, ry, T.trim.hi);
    }
  }
  if (look.outfit === "rags") {
    for (let x = 0; x < S; x += 3) layer.clear(x, top + ((x * 7) % 3));
    layer.line(HX - 14, top + 8, HX - 8, top + 20, T.robe.deep);
    layer.line(HX + 10, top + 12, HX + 16, top + 22, T.robe.deep);
  }
  p.stamp(layer, 0, 0);

  if (look.apron) {
    const a = ramp(look.apron);
    p.rect(HX - 9, top + 10, 18, S - top - 10, a.base);
    p.vline(HX - 9, top + 10, S - 1, a.hi);
    p.vline(HX + 8, top + 10, S - 1, a.lo);
    p.line(HX - 9, top + 10, HX - 12, top + 1, a.lo);
    p.line(HX + 8, top + 10, HX + 11, top + 1, a.lo);
    p.rect(HX - 4, top + 15, 8, 5, a.lo);
    p.hline(HX - 4, HX + 3, top + 15, a.deep);
  }
  if (look.satchel) {
    const s = ramp(look.satchel);
    p.line(HX - 20, top + 3, HX + 18, S - 1, s.base);
    p.line(HX - 20, top + 4, HX + 17, S - 1, s.lo);
    p.line(HX - 19, top + 2, HX + 19, S - 2, s.hi);
  }
  if (look.emblem) {
    const e = ramp(look.emblem);
    const ex = HX - 19;
    const ey = top + 12;
    p.poly(
      [
        [ex, ey],
        [ex + 7, ey],
        [ex + 7, ey + 5],
        [ex + 3.5, ey + 8.5],
        [ex, ey + 5],
      ],
      e.base,
    );
    p.vline(ex, ey, ey + 4, e.hi);
    p.set(ex + 3, ey + 3, ramp(look.accent ?? look.trim).hi);
    p.set(ex + 4, ey + 3, ramp(look.accent ?? look.trim).base);
  }
  if (look.book) {
    const b = ramp(look.book);
    p.rect(HX - 30, S - 12, 12, 12, b.base);
    p.hline(HX - 30, HX - 19, S - 12, 0xeee4cc);
    p.vline(HX - 19, S - 11, S - 1, 0xd8ccb0);
    p.vline(HX - 30, S - 12, S - 1, b.hi);
    p.hline(HX - 27, HX - 22, S - 7, ramp("#d9b44a").base);
  }
}

/** The V of the robe: shirt, tie, trim, or a gown's high collar. */
function paintCollar(p: Pix, look: Look, T: BustTones, headCy: number): void {
  const top = headCy + 14;
  if (look.outfit === "bones" || look.outfit === "armor") {
    if (look.outfit === "armor") {
      // Gorget.
      p.ellipseWith(HX, top, 11, 4, (_nx, ny) => (ny < 0 ? T.robe.hi : T.robe.lo));
      p.hline(HX - 10, HX + 9, top + 2, T.trim.base);
    }
    return;
  }
  if (look.outfit === "gown") {
    // High collar, closed, with a brooch.
    p.poly(
      [
        [HX - 10, top - 3],
        [HX + 10, top - 3],
        [HX + 7, top + 5],
        [HX - 7, top + 5],
      ],
      T.trim.base,
    );
    p.hline(HX - 10, HX + 9, top - 3, T.trim.hi);
    p.hline(HX - 7, HX + 6, top + 5, T.trim.lo);
    p.vline(HX - 1, top + 6, S - 1, T.trim.base);
    p.vline(HX, top + 6, S - 1, T.trim.lo);
    if (look.accent) {
      const a = ramp(look.accent);
      p.ellipse(HX, top + 7, 2.6, 2.6, a.base);
      p.glow(HX - 1, top + 6, a.hi);
      p.ellipseWith(HX, top + 7, 2.6, 2.6, (nx, ny) => (nx * nx + ny * ny > 0.55 ? 0xd9b44a : null));
    }
    return;
  }
  if (!look.inner) {
    // Shades, wraiths, husks: just a fold of cloth at the throat.
    p.line(HX - 8, top, HX, top + 10, T.robe.deep);
    p.line(HX + 7, top, HX, top + 10, T.robe.deep);
    return;
  }
  // Shirt in the V.
  p.poly(
    [
      [HX - 8, top - 1],
      [HX + 8, top - 1],
      [HX + 0.5, top + 14],
    ],
    T.inner.base,
  );
  p.line(HX + 1, top, HX + 7, top - 1, T.inner.lo);
  // Collar points.
  p.poly(
    [
      [HX - 8, top - 2],
      [HX - 1, top + 3],
      [HX - 6, top + 4],
    ],
    T.inner.hi,
  );
  p.poly(
    [
      [HX + 8, top - 2],
      [HX + 1, top + 3],
      [HX + 6, top + 4],
    ],
    T.inner.lo,
  );
  if (look.accent && look.outfit !== "coat") {
    // A tie, knotted.
    p.rect(HX - 2, top + 2, 4, 3, T.accent.base);
    p.poly(
      [
        [HX - 2.5, top + 5],
        [HX + 2.5, top + 5],
        [HX + 3, top + 14],
        [HX, top + 16],
        [HX - 3, top + 14],
      ],
      T.accent.base,
    );
    p.vline(HX + 1, top + 5, top + 14, T.accent.lo);
    p.set(HX - 1, top + 3, T.accent.hi);
  }
  // Trim along both edges of the opening.
  p.line(HX - 9, top - 1, HX - 1, top + 15, T.trim.base);
  p.line(HX - 10, top - 1, HX - 2, top + 16, T.trim.hi);
  p.line(HX + 8, top - 1, HX, top + 15, T.trim.lo);
  p.line(HX + 9, top - 1, HX + 1, top + 16, T.trim.base);
  p.vline(HX - 1, top + 16, S - 1, T.trim.base);
  p.vline(HX, top + 16, S - 1, T.trim.lo);
  if (look.outfit === "coat") {
    // Lapels and copper buttons.
    p.poly(
      [
        [HX - 10, top],
        [HX - 3, top + 14],
        [HX - 13, top + 10],
      ],
      T.robe.hi,
    );
    p.poly(
      [
        [HX + 10, top],
        [HX + 3, top + 14],
        [HX + 13, top + 10],
      ],
      T.robe.lo,
    );
    for (const by of [top + 18, top + 23]) {
      p.set(HX - 4, by, T.trim.hi);
      p.set(HX - 3, by, T.trim.base);
    }
    if (look.accent) {
      // A neckerchief.
      const a = ramp(look.accent);
      p.ellipseWith(HX, top + 1, 6, 3, (nx) => (nx < -0.2 ? a.hi : nx > 0.4 ? a.lo : a.base));
      p.poly(
        [
          [HX - 2, top + 3],
          [HX + 3, top + 3],
          [HX + 4, top + 9],
          [HX - 1, top + 8],
        ],
        a.base,
      );
    }
  }
}

function paintFace(p: Pix, look: Look, T: BustTones, eyeY: number): void {
  const glow = look.glowEyes ? hex(look.glowEyes) : null;
  const iris = ramp(look.eye);
  for (const side of [-1, 1] as const) {
    const x0 = side < 0 ? 22 : 37;
    const at = (dx: number): number => (side < 0 ? x0 + dx : x0 + 4 - dx);
    if (glow) {
      for (let dx = 0; dx < 5; dx++) {
        p.set(at(dx), eyeY, EYE_DARK);
        p.set(at(dx), eyeY + 1, EYE_DARK);
      }
      p.glow(at(1), eyeY, blend(glow, 0xffffff, 0.5));
      p.glow(at(2), eyeY, glow);
      p.glow(at(3), eyeY, glow);
      p.glow(at(2), eyeY + 1, blend(glow, 0x000000, 0.3));
      continue;
    }
    // Lid and lashes.
    for (let dx = 0; dx < 5; dx++) p.set(at(dx), eyeY - 1, EYE_DARK);
    p.set(at(-1), eyeY - 1, T.skin.lo);
    // White, iris, pupil, catch-light.
    p.set(at(0), eyeY, WHITE);
    p.set(at(4), eyeY, blend(WHITE, T.skin.lo, 0.4));
    p.set(at(0), eyeY + 1, blend(WHITE, T.skin.lo, 0.3));
    p.set(at(4), eyeY + 1, blend(WHITE, T.skin.lo, 0.5));
    for (const dx of [1, 2, 3]) {
      p.set(at(dx), eyeY, iris.lo);
      p.set(at(dx), eyeY + 1, iris.base);
    }
    p.set(at(2), eyeY, EYE_DARK);
    p.set(at(2), eyeY + 1, blend(EYE_DARK, iris.lo, 0.3));
    p.set(side < 0 ? at(1) : at(3), eyeY, WHITE);
    p.set(at(3), eyeY + 1, iris.hi);
    // Lower lid.
    for (const dx of [1, 2, 3]) p.set(at(dx), eyeY + 2, T.skin.lo);
  }

  // Brows.
  const brow = blend(T.hair.lo, 0x1a1020, 0.25);
  for (const side of [-1, 1] as const) {
    const at = (dx: number): number => (side < 0 ? 21 + dx : 42 - dx);
    for (let dx = 0; dx < 6; dx++) {
      let y = eyeY - 4;
      if (look.brows === "stern") y += dx >= 4 ? 1 : 0;
      else if (look.brows === "raised") y -= dx <= 2 && side > 0 ? 1 : 0;
      else y -= dx >= 1 && dx <= 3 ? 1 : 0;
      p.set(at(dx), y, brow);
      if (dx < 5) p.set(at(dx), y + 1, blend(brow, T.skin.base, 0.55));
    }
  }

  // Nose: a shadow down the right, a lit tip, nostrils.
  p.vline(HX + 1, eyeY + 1, eyeY + 4, T.skin.lo);
  p.set(HX, eyeY + 5, T.skin.hi);
  p.set(HX - 2, eyeY + 6, T.skin.lo);
  p.set(HX + 1, eyeY + 6, T.skin.deep);
  p.set(HX + 2, eyeY + 5, T.skin.lo);

  // Mouth: the brows decide whether it smiles.
  const my = eyeY + 9;
  const lip = blend(T.skin.lo, 0x9a3a3a, 0.45);
  p.hline(HX - 3, HX + 2, my, lip);
  p.hline(HX - 2, HX + 1, my + 1, blend(T.skin.base, 0xc06a6a, 0.3));
  if (look.brows === "stern") {
    p.set(HX - 4, my + 1, T.skin.lo);
    p.set(HX + 3, my + 1, T.skin.lo);
  } else if (look.brows === "raised") {
    p.set(HX + 3, my - 1, lip);
    p.set(HX - 4, my, T.skin.lo);
  } else {
    p.set(HX - 4, my - 1, lip);
    p.set(HX + 3, my - 1, lip);
  }
  p.hline(HX - 1, HX, my + 3, T.skin.lo);

  if (look.blush) {
    for (const cx of [24, 39]) {
      p.hline(cx - 1, cx + 1, eyeY + 4, blend(T.skin.base, 0xe06a6a, 0.35));
      p.set(cx, eyeY + 5, blend(T.skin.base, 0xe06a6a, 0.25));
    }
  }
  if (look.key.startsWith("hero")) {
    // Wren's freckles.
    for (const [fx, fy] of [
      [24, eyeY + 4],
      [26, eyeY + 5],
      [23, eyeY + 6],
      [38, eyeY + 4],
      [40, eyeY + 5],
      [37, eyeY + 6],
    ] as const) {
      p.set(fx, fy, blend(T.skin.base, 0x8a4a2a, 0.35));
    }
  }
}

function paintSkullFace(p: Pix, look: Look, T: BustTones, headCy: number, eyeY: number): void {
  const glow = hex(look.glowEyes ?? look.eye);
  for (const cx of [26, 37]) {
    p.ellipse(cx, eyeY + 0.5, 4, 3.6, T.skin.deep);
    p.glow(cx - 1, eyeY, glow);
    p.glow(cx, eyeY, blend(glow, 0xffffff, 0.5));
    p.glow(cx - 1, eyeY + 1, blend(glow, 0x000000, 0.3));
  }
  p.poly(
    [
      [HX - 2, eyeY + 4],
      [HX + 2, eyeY + 4],
      [HX, eyeY + 7],
    ],
    T.skin.deep,
  );
  // Teeth.
  const jaw = headCy + 11;
  p.hline(HX - 7, HX + 6, jaw, T.skin.deep);
  for (let x = HX - 6; x <= HX + 5; x += 2) {
    p.set(x, jaw + 1, T.skin.hi);
    p.set(x + 1, jaw + 1, T.skin.base);
    p.set(x, jaw - 1, T.skin.base);
  }
  p.hline(HX - 7, HX + 6, jaw + 2, T.skin.deep);
  p.hline(HX - 6, HX + 5, jaw + 3, T.skin.lo);
}

function paintMask(p: Pix, look: Look, eyeY: number, headCy: number): void {
  const m = ramp(look.mask!);
  p.ellipseWith(HX, headCy + 2, 11, 12, (nx, ny) => {
    const light = -nx * 0.5 - ny * 0.6;
    return light > 0.5 ? m.hi : light < -0.35 ? m.lo : m.base;
  });
  const glow = hex(look.glowEyes ?? look.eye);
  for (const x0 of [23, 36]) {
    p.hline(x0, x0 + 4, eyeY, EYE_DARK);
    p.hline(x0 + 1, x0 + 3, eyeY + 1, EYE_DARK);
    p.glow(x0 + 2, eyeY, glow);
  }
  p.vline(HX - 1, eyeY + 2, eyeY + 9, m.lo);
  p.vline(HX, eyeY - 6, eyeY - 2, m.hi);
  // A sigil painted on the brow.
  p.glow(HX - 1, eyeY - 5, glow);
  p.glow(HX, eyeY - 5, glow);
  p.glow(HX - 1, eyeY - 6, blend(glow, 0x000000, 0.3));
}

function paintHair(p: Pix, look: Look, T: BustTones, headCy: number, eyeY: number): void {
  const style = look.hairStyle;
  if (style === "none" || look.outfit === "bones") return;
  const H = T.hair;
  const jag = [0, 2, 3, 1, 0, 2, 4, 1, 0, 3, 1, 2, 0, 3, 2, 1];
  const hatted = look.hat === "pointed" || look.hat === "tall" || look.hat === "wide";

  const fringe = (x: number): number => {
    const d = Math.abs(x + 0.5 - HX);
    const side = d > 11;
    switch (style) {
      case "messy":
        return side ? eyeY + 3 : eyeY - 9 + (jag[x % 16] ?? 0);
      case "short":
        return side ? eyeY - 1 : eyeY - 9 + (x > HX + 3 ? 1 : 0) + (x === HX + 3 ? -2 : 0);
      case "bob":
        return d > 10 ? eyeY + 10 : eyeY - 7;
      case "slick":
        return side ? eyeY - 2 : eyeY - 11 + Math.round(d / 4);
      case "long":
        return d > 9.5 ? S : eyeY - 11 + Math.round(d * 0.6);
      case "bald":
        return d > 11 ? eyeY + 3 : -99;
      case "tonsure":
        return d > 11.5 ? eyeY + 2 : eyeY - 8;
      default:
        return side ? eyeY : eyeY - 11 + Math.round(d * 0.5);
    }
  };
  const cy = headCy - 2;
  const hair = new Pix(S, S);
  hair.ellipseWith(HX, cy, 14.6, 14.2, (nx, ny, x, y) => {
    if (y > fringe(x)) return null;
    if (style === "bald" && y < eyeY - 3) return null;
    if (style === "tonsure" && ny < -0.45 && Math.abs(nx) < 0.75) return null;
    const light = -nx * 0.5 - ny * 0.7;
    // Strands: a slanted dark line every few pixels.
    const strand = (x * 3 + y * 2) % 11 === 0 && ny > -0.4;
    if (ny < -0.45 && ny > -0.75 && nx > -0.6 && nx < 0.25 && (x + y) % 4 !== 0) return H.hi;
    if (light < -0.35) return H.lo;
    return strand ? H.lo : light > 0.55 ? H.hi : H.base;
  });
  if (style === "long" || style === "bob") {
    // Front locks fall past the jaw.
    const bottom = style === "long" ? S - 6 : eyeY + 10;
    for (let y = eyeY - 2; y <= bottom; y++) {
      for (const [x, c] of [
        [HX - 15, H.base],
        [HX - 14, H.hi],
        [HX - 13, H.base],
        [HX + 12, H.lo],
        [HX + 13, H.lo],
        [HX + 14, H.deep],
      ] as const) {
        hair.set(x, y, c);
      }
    }
  }
  if (style === "messy" && !hatted) {
    // Cowlicks.
    hair.poly(
      [
        [HX - 4, cy - 13],
        [HX - 1, cy - 18],
        [HX + 1, cy - 13],
      ],
      H.base,
    );
    hair.poly(
      [
        [HX + 4, cy - 13],
        [HX + 9, cy - 16],
        [HX + 8, cy - 11],
      ],
      H.lo,
    );
  }
  if (style === "bun" && !hatted) {
    hair.shadedEllipse(HX, cy - 15, 6, 5, H);
    hair.hline(HX - 5, HX + 4, cy - 12, H.lo);
  }
  if (style === "braid") {
    for (let i = 0; i < 10; i++) {
      const y = eyeY + 6 + i * 3;
      const x = HX + 13 + Math.floor(i / 3);
      hair.ellipseWith(x, y, 3, 2, (nx) => (nx < 0 ? H.base : H.lo));
    }
    hair.rect(HX + 14, S - 3, 4, 2, 0xd9c08a);
  }
  // Cast shadow of the fringe on the forehead.
  for (let x = 0; x < S; x++) {
    for (let y = S - 2; y >= 0; y--) {
      if (!hair.filled(x, y)) continue;
      if (!hair.filled(x, y + 1) && p.filled(x, y + 1) && Math.abs(x + 0.5 - HX) < 12) {
        p.set(x, y + 1, T.skin.lo);
      }
      break;
    }
  }
  p.stamp(hair, 0, 0);
}

function paintHoodRim(p: Pix, look: Look, T: BustTones, headCy: number, eyeY: number): void {
  const R = T.hat;
  const voidFace = !!look.glowEyes && !look.mask;
  p.ellipseWith(HX, headCy - 1, 19, 19.5, (nx, ny, x, y) => {
    const fx = (x + 0.5 - HX) / 11.5;
    const fy = (y + 0.5 - (headCy + 3)) / 13;
    if (fx * fx + fy * fy <= 1) {
      if (voidFace) return y < eyeY + 9 ? 0x07060b : 0x0d0b14;
      // Shadow under the brim of the hood.
      return y < eyeY - 5 ? blend(R.deep, 0x000000, 0.25) : null;
    }
    const light = -nx * 0.5 - ny * 0.7;
    // Draped folds.
    if ((x + Math.round(y * 0.3)) % 9 === 0 && ny > -0.3) return R.lo;
    return light > 0.5 ? R.hi : light < -0.3 ? R.lo : R.base;
  });
  if (voidFace) {
    const g = hex(look.glowEyes!);
    for (const cx of [HX - 6, HX + 5]) {
      p.glow(cx, eyeY, g);
      p.glow(cx + (cx < HX ? -1 : 1), eyeY, blend(g, 0xffffff, 0.4));
      p.glow(cx, eyeY + 1, blend(g, 0x000000, 0.4), 200);
    }
  } else if (look.hairStyle === "long") {
    // Hair spilling out of the hood.
    const H = T.hair;
    for (let y = eyeY - 6; y < S - 4; y++) {
      p.set(HX - 12, y, H.hi);
      p.set(HX - 11, y, H.base);
      p.set(HX + 10, y, H.lo);
      p.set(HX + 11, y, H.base);
    }
  }
  // The trim glows along the hood's edge.
  if (look.key === "keeper") {
    p.ellipseWith(HX, headCy + 3, 12.5, 14, (nx, ny) => (nx * nx + ny * ny > 0.86 && ny < 0.6 ? T.trim.base : null));
  }
}

function paintBeard(p: Pix, look: Look, eyeY: number): void {
  if (!look.beard) return;
  const b = ramp(look.beardColor ?? look.hair);
  const my = eyeY + 9;
  const beard = new Pix(S, S);
  if (look.beard === "long") {
    beard.poly(
      [
        [HX - 13, eyeY + 2],
        [HX + 13, eyeY + 2],
        [HX + 12, my + 6],
        [HX + 6, S],
        [HX - 6, S],
        [HX - 12, my + 6],
      ],
      b.base,
    );
  } else {
    beard.poly(
      [
        [HX - 13, eyeY + 2],
        [HX + 13, eyeY + 2],
        [HX + 10, my + 4],
        [HX, my + 7],
        [HX - 10, my + 4],
      ],
      b.base,
    );
  }
  // Clear the cheeks so it reads as beard, not mask.
  beard.ellipseWith(HX, eyeY + 2, 10, 5.5, () => null);
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      if (!beard.filled(x, y)) continue;
      const fx = (x + 0.5 - HX) / 9.5;
      const fy = (y + 0.5 - (eyeY + 3)) / 5.2;
      if (fx * fx + fy * fy < 1 && y < my - 1) beard.clear(x, y);
    }
  }
  rowShade(beard, b, 0.2, 0.3);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (beard.filled(x, y) && (x * 5 + y * 2) % 13 === 0 && beard.get(x, y) === b.base) beard.set(x, y, b.lo);
  p.stamp(beard, 0, 0);
  // Moustache over the lip, the mouth just showing beneath.
  p.poly(
    [
      [HX - 7, my - 1],
      [HX, my - 3],
      [HX + 7, my - 1],
      [HX + 5, my + 1],
      [HX, my],
      [HX - 5, my + 1],
    ],
    b.hi,
  );
  p.hline(HX - 2, HX + 1, my + 1, 0x3a2420);
}

function paintGlasses(p: Pix, look: Look, eyeY: number): void {
  if (!look.glasses) return;
  const rim = 0xd8c890;
  const rimLo = 0x8a7a50;
  for (const cx of [24.5, 39.5]) {
    p.ellipseWith(cx, eyeY + 0.5, 5, 4.5, (nx, ny) => {
      const d = nx * nx + ny * ny;
      if (d < 0.62) return null;
      return ny > 0.2 ? rimLo : rim;
    });
    p.glow(Math.floor(cx) - 2, eyeY - 2, 0xffffff, 170);
  }
  p.hline(HX - 2, HX + 1, eyeY - 1, rim);
  p.hline(HX - 18, HX - 13, eyeY - 1, rimLo);
  p.hline(HX + 12, HX + 17, eyeY - 1, rimLo);
}

function paintHat(p: Pix, look: Look, T: BustTones, headCy: number): void {
  const R = T.hat;
  const band = ramp(look.hatBand ?? look.trim);
  const b = headCy - 10;
  if (look.hat === "pointed" || look.hat === "tall") {
    const cone = new Pix(S, S);
    const pts: Array<[number, number]> =
      look.hat === "pointed"
        ? [
            [HX - 14, b],
            [HX + 14, b],
            [HX + 10, b - 10],
            [HX + 22, b - 24],
            [HX + 3, b - 18],
            [HX - 6, b - 12],
          ]
        : [
            [HX - 12, b],
            [HX + 12, b],
            [HX + 8, b - 16],
            [HX + 9, b - 30],
            [HX - 1, b - 22],
            [HX - 6, b - 14],
          ];
    cone.poly(pts, R.base);
    rowShade(cone, R, 0.22, 0.35);
    p.stamp(cone, 0, 0);
    // Band.
    for (let x = 0; x < S; x++) {
      for (let k = 1; k <= 3; k++) {
        if (cone.filled(x, b - k)) p.set(x, b - k, k === 2 ? band.base : k === 1 ? band.lo : band.hi);
      }
    }
    if (look.key === "professor") {
      // Embroidered stars and a crescent.
      for (const [sx, sy] of [
        [HX - 3, b - 8],
        [HX + 5, b - 13],
        [HX + 12, b - 19],
      ] as const) {
        p.glow(sx, sy, band.hi);
        p.glow(sx - 1, sy, band.base, 180);
        p.glow(sx + 1, sy, band.base, 180);
        p.glow(sx, sy - 1, band.base, 180);
        p.glow(sx, sy + 1, band.base, 180);
      }
    }
    p.ellipseWith(HX, b + 1, 27, 4.6, (_nx, ny) => (ny < -0.25 ? R.hi : ny > 0.4 ? R.deep : R.base));
    return;
  }
  if (look.hat === "wide") {
    const crown = new Pix(S, S);
    crown.poly(
      [
        [HX - 12, b + 1],
        [HX + 12, b + 1],
        [HX + 10, b - 9],
        [HX + 6, b - 12],
        [HX - 6, b - 12],
        [HX - 10, b - 9],
      ],
      R.base,
    );
    rowShade(crown, R, 0.22, 0.3);
    p.stamp(crown, 0, 0);
    p.rect(HX - 12, b - 3, 24, 3, band.base);
    p.hline(HX - 12, HX + 11, b - 3, band.hi);
    // Straw weave.
    for (let x = HX - 10; x < HX + 10; x += 3) p.set(x, b - 7, R.lo);
    p.ellipseWith(HX, b + 1, 31, 5.5, (_nx, ny) => (ny < -0.2 ? R.hi : ny > 0.4 ? R.deep : R.base));
    if (look.hatFlower) {
      const f = ramp(look.hatFlower);
      for (const [dx, dy] of [
        [0, -2],
        [2, 0],
        [0, 2],
        [-2, 0],
      ] as const) {
        p.ellipse(HX - 9 + dx, b - 3 + dy, 1.6, 1.6, f.base);
      }
      p.set(HX - 10, b - 4, f.hi);
      p.set(HX - 9, b - 3, 0xf0d05a);
      p.line(HX - 6, b - 1, HX - 2, b - 2, 0x4a8a3c);
      p.set(HX - 3, b - 3, 0x6aa84f);
    }
    return;
  }
  if (look.hat === "circlet") {
    p.hline(HX - 13, HX + 12, headCy - 7, band.base);
    p.glow(HX - 1, headCy - 7, band.hi);
    p.glow(HX, headCy - 7, band.hi);
  }
}

function paintHelm(p: Pix, look: Look, T: BustTones, headCy: number): void {
  const R = T.hat;
  const band = ramp(look.hatBand ?? look.trim);
  p.shadedEllipse(HX, headCy - 1, 15, 16, R, 0.1);
  // Brass brow band and cheek plates.
  p.ellipseWith(HX, headCy - 1, 15, 16, (nx, ny) => (Math.abs(ny + 0.15) < 0.08 && Math.abs(nx) < 0.99 ? band.base : null));
  const ey = headCy + 1;
  p.rect(HX - 12, ey - 1, 24, 4, 0x0b0a10);
  const glow = hex(look.glowEyes ?? look.eye);
  for (const cx of [HX - 7, HX + 6]) {
    p.glow(cx - 1, ey, glow);
    p.glow(cx, ey, blend(glow, 0xffffff, 0.6));
    p.glow(cx + 1, ey, glow);
    p.glow(cx, ey + 1, blend(glow, 0x000000, 0.3));
  }
  // Nasal guard and breathing slots.
  p.rect(HX - 1, ey - 6, 2, 13, R.hi);
  p.vline(HX, ey - 6, ey + 6, R.lo);
  for (let i = 0; i < 3; i++) {
    p.hline(HX - 8, HX - 4, ey + 6 + i * 2, R.deep);
    p.hline(HX + 3, HX + 7, ey + 6 + i * 2, R.deep);
  }
  // Rivets.
  for (const [rx, ry] of [
    [HX - 13, ey - 5],
    [HX + 12, ey - 5],
    [HX - 12, ey + 6],
    [HX + 11, ey + 6],
  ] as const) {
    p.set(rx, ry, band.hi);
  }
  // Crest.
  const crest = ramp(look.accent ?? "#6a2a2a");
  p.poly(
    [
      [HX - 2, headCy - 16],
      [HX + 2, headCy - 16],
      [HX + 14, headCy - 24],
      [HX + 4, headCy - 26],
      [HX - 2, headCy - 21],
    ],
    crest.base,
  );
  p.line(HX, headCy - 17, HX + 10, headCy - 23, crest.hi);
}

function paintScarf(p: Pix, look: Look, headCy: number): void {
  if (!look.scarf) return;
  const a = ramp(look.trim);
  const b = ramp(look.accent ?? look.trim);
  const top = headCy + 11;
  // Wrapped twice round the neck, striped.
  for (let y = top; y < top + 7; y++) {
    for (let x = HX - 12; x <= HX + 11; x++) {
      const nx = (x + 0.5 - HX) / 12;
      if (Math.abs(nx) > 1 - (y - top) * 0.02) continue;
      const stripe = Math.floor((x + y * 0.4) / 3) % 2 === 0 ? a : b;
      p.set(x, y, nx < -0.5 ? stripe.hi : nx > 0.5 ? stripe.lo : stripe.base);
    }
  }
  p.hline(HX - 11, HX + 10, top + 3, blend(a.deep, b.deep, 0.5));
  // A tail falling over the chest.
  for (let y = top + 6; y < S; y++) {
    const stripe = Math.floor((y - top) / 3) % 2 === 0 ? a : b;
    for (let x = HX + 5; x <= HX + 10; x++) p.set(x, y, x === HX + 5 ? stripe.hi : x === HX + 10 ? stripe.lo : stripe.base);
  }
}
