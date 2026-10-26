import type { Look } from "../looks";
import { blend, hex, Pix, ramp } from "../pixel";
import type { Ramp } from "../pixel";

/**
 * Paints people (and people-shaped things) one frame at a time.
 *
 * Every frame is 32x48 with the feet on row 46. The body is assembled from
 * parts - legs, garment, arms, head, hair, hat, props - each drawn into its
 * own layer and shaded against its *own* silhouette, then stamped together.
 * Shading per part is what gives a robe its folds and a hat its cone: the
 * left edge catches the light, the right edge falls into shadow.
 *
 * Only "down", "up" and "left" are painted; "right" is the left frame
 * mirrored by the sheet builder.
 */

export const FW = 32;
export const FH = 48;

export type Facing = "down" | "up" | "left";

export interface Pose {
  facing: Facing;
  /** -1..1 stride phase: + puts the screen-left (or leading) leg forward. */
  stride: number;
  /** Vertical offset of everything above the hips (-1 = up). */
  bob: number;
  /** Idle breathing: shoulders and head rise a pixel. */
  breath: number;
  blink: boolean;
  action: "none" | "cast" | "attack";
  /** 0..1 cycle position, for things that ripple (wisps, flames). */
  t: number;
  /** Extra lift for floating characters (negative = up). */
  hover: number;
}

const CX = 16;
const OUTLINE_INK = 0x160e1e;
const EYE_DARK = 0x1c1426;
const WHITE = 0xfaf6ee;
const WAND = 0x6a4428;

interface Metrics {
  foot: number;
  hipY: number;
  shoulderY: number;
  waistY: number;
  hemY: number;
  headCy: number;
  headTop: number;
  eyeY: number;
  /** Half-widths at the shoulders and at the hem. */
  shoulderHalf: number;
  hemHalf: number;
}

function metrics(look: Look, pose: Pose): Metrics {
  const tall = look.size === "tall" ? 2 : look.size === "adult" ? 1 : 0;
  const foot = 46 + Math.round(pose.hover);
  const legLen = 6 + tall;
  const hipY = foot - 3 - legLen;
  const hunch = look.hunch ? 3 : 0;
  const shoulderY = hipY - 11 - tall + pose.bob - pose.breath + hunch;
  const headCy = shoulderY - 6 + (look.hunch ? 1 : 0);
  const outfit = look.outfit;
  const hemY =
    outfit === "gown"
      ? foot - 1
      : outfit === "coat"
        ? foot - 5
        : outfit === "rags"
          ? hipY + 3
          : outfit === "armor"
            ? hipY + 2
            : outfit === "bones"
              ? hipY + 1
              : foot - 3;
  return {
    foot,
    hipY,
    shoulderY,
    waistY: shoulderY + 6 + Math.floor(tall / 2),
    hemY,
    headCy,
    headTop: headCy - 7,
    eyeY: headCy + 1,
    shoulderHalf: look.outfit === "armor" ? 8 : look.size === "child" ? 6 : 7,
    hemHalf: outfit === "gown" ? 9 : outfit === "coat" ? 8 : outfit === "armor" ? 7 : 8,
  };
}

// --- shading helpers ---------------------------------------------------------

/** Shades a layer row by row against its own silhouette. */
function rowShade(layer: Pix, r: Ramp, hiFrac = 0.2, loFrac = 0.3, from = 0, to = layer.h - 1): void {
  for (let y = from; y <= to; y++) {
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
      if (!layer.filled(x, y)) continue;
      if (layer.get(x, y) !== r.base) continue;
      const t = (x - min) / span;
      if (t <= hiFrac && span > 2) layer.set(x, y, r.hi);
      else if (t >= 1 - loFrac) layer.set(x, y, t > 0.92 && span > 6 ? r.deep : r.lo);
    }
  }
}

/** Trapezoid helper: rows y0..y1 with left/right edges interpolated. */
function trap(
  p: Pix,
  y0: number,
  y1: number,
  l0: number,
  r0: number,
  l1: number,
  r1: number,
  c: number | ((x: number, y: number, t: number, v: number) => number | null),
): void {
  for (let y = y0; y <= y1; y++) {
    const v = y1 === y0 ? 0 : (y - y0) / (y1 - y0);
    const l = Math.round(l0 + (l1 - l0) * v);
    const r = Math.round(r0 + (r1 - r0) * v);
    for (let x = l; x <= r; x++) {
      const t = r === l ? 0.5 : (x - l) / (r - l);
      const color = typeof c === "number" ? c : c(x, y, t, v);
      if (color !== null) p.set(x, y, color);
    }
  }
}

function mirrorX(x: number): number {
  return FW - 1 - x;
}

// --- the painter ---------------------------------------------------------------

export function paintHumanoid(look: Look, pose: Pose): Pix {
  const p = new Pix(FW, FH);
  const m = metrics(look, pose);

  if (pose.facing === "down") paintDown(p, look, pose, m);
  else if (pose.facing === "up") paintUp(p, look, pose, m);
  else paintSide(p, look, pose, m);

  p.outline(OUTLINE_INK, 0.62);
  if (look.alpha !== undefined && look.alpha < 1) p.fade(look.alpha);
  return p;
}

// --- shared part painters --------------------------------------------------------

interface Tones {
  skin: Ramp;
  robe: Ramp;
  trim: Ramp;
  hair: Ramp;
  boots: Ramp;
  legs: Ramp;
  inner: Ramp;
  accent: Ramp;
  hat: Ramp;
}

function tones(look: Look): Tones {
  return {
    skin: ramp(look.skin),
    robe: ramp(look.robe),
    trim: ramp(look.trim),
    hair: ramp(look.hair),
    boots: ramp(look.boots),
    legs: ramp(look.legs ?? blend(hex(look.robe), 0x101018, 0.45)),
    inner: ramp(look.inner ?? "#e8e2d4"),
    accent: ramp(look.accent ?? look.trim),
    hat: ramp(look.hatColor ?? look.robe),
  };
}

/** Legs and boots, seen from the front or back. */
function legsFrontal(p: Pix, look: Look, pose: Pose, m: Metrics, back: boolean): void {
  if (look.lower && look.lower !== "legs") return;
  const T = tones(look);
  const bones = look.outfit === "bones";
  const lift = (s: number): number => (s > 0.3 ? -1 : 0);
  const legs: Array<{ x: number; dy: number; mirror: boolean }> = [
    { x: 12, dy: lift(pose.stride), mirror: false },
    { x: 17, dy: lift(-pose.stride), mirror: true },
  ];
  for (const leg of legs) {
    const top = m.hipY - 1;
    const bootTop = m.foot - 3 + leg.dy;
    if (bones) {
      // Two thin bones and a knob of a knee.
      p.vline(leg.x + 1, top, bootTop, T.skin.base);
      p.set(leg.x + 1, top + 3, T.skin.hi);
      p.set(leg.x + (leg.mirror ? 2 : 0), top + 3, T.skin.lo);
    } else {
      for (let y = top; y < bootTop; y++) {
        p.set(leg.x, y, leg.mirror ? T.legs.base : T.legs.hi);
        p.set(leg.x + 1, y, T.legs.base);
        p.set(leg.x + 2, y, leg.mirror ? T.legs.lo : T.legs.base);
      }
    }
    // Boots: a toe cap toward the viewer, heels from behind.
    const bx = leg.mirror ? leg.x : leg.x - 1;
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 4; x++) {
        const c = y === 0 ? T.boots.base : x === (leg.mirror ? 3 : 0) ? T.boots.lo : T.boots.base;
        p.set(bx + x, bootTop + y, c);
      }
    }
    if (!back) p.set(bx + (leg.mirror ? 2 : 1), bootTop + 1, T.boots.hi);
    else p.hline(bx, bx + 3, bootTop + 2, T.boots.lo);
  }
}

/** Something hanging off the back: a cape, a long cloak, long hair. */
function capeBack(p: Pix, look: Look, m: Metrics): void {
  if (!look.cape) return;
  const r = ramp(look.cape);
  const layer = new Pix(FW, FH);
  trap(layer, m.shoulderY, m.hemY + 1, CX - m.shoulderHalf - 1, CX + m.shoulderHalf, CX - m.hemHalf - 2, CX + m.hemHalf + 1, r.base);
  rowShade(layer, r, 0.12, 0.3);
  p.stamp(layer, 0, 0);
}

/**
 * The main garment from the front. Folds swing with the stride, the opening
 * shows the shirt and tie, and the hem is edged in the trim colour.
 */
function garmentFront(p: Pix, look: Look, pose: Pose, m: Metrics, back: boolean): void {
  const T = tones(look);
  const layer = new Pix(FW, FH);
  const sway = Math.round(pose.stride * 0.6);
  const sl = CX - m.shoulderHalf;
  const sr = CX + m.shoulderHalf - 1;

  if (look.outfit === "bones") {
    paintRibcage(p, look, m, back);
    return;
  }

  // Upper body to the waist, then the skirt of the robe flaring to the hem.
  trap(layer, m.shoulderY, m.waistY, sl, sr, sl, sr, T.robe.base);
  const lower = look.lower ?? "legs";
  if (lower === "legs") {
    trap(layer, m.waistY + 1, m.hemY, sl, sr, CX - m.hemHalf + sway, CX + m.hemHalf - 1 + sway, T.robe.base);
  } else {
    paintLowerSpirit(layer, look, pose, m, T.robe);
  }
  // Round the shoulders.
  layer.clear(sl, m.shoulderY);
  layer.clear(sr, m.shoulderY);
  rowShade(layer, T.robe, 0.16, 0.28);

  // Folds: two creases from the waist down that sway with the walk.
  if (lower === "legs" && look.outfit !== "armor") {
    for (const fx of [CX - 4, CX + 3]) {
      for (let y = m.waistY + 2; y < m.hemY; y++) {
        const x = fx + Math.round(((y - m.waistY) / Math.max(1, m.hemY - m.waistY)) * (fx < CX ? -1 : 1)) + sway;
        if (layer.filled(x, y)) layer.set(x, y, T.robe.lo);
      }
    }
  }

  // Hem edging.
  if (lower === "legs" && look.outfit !== "rags") {
    for (let x = 0; x < FW; x++) if (layer.filled(x, m.hemY)) layer.set(x, m.hemY, x < CX - 3 ? T.trim.base : T.trim.lo);
  }

  if (look.outfit === "rags") {
    // Torn hem: chew holes out of the bottom rows.
    for (let x = 0; x < FW; x++) {
      const bite = (x * 7 + 3) % 5;
      for (let k = 0; k < bite % 3; k++) layer.clear(x, m.hemY - k);
    }
    layer.set(CX - 2, m.waistY + 1, T.robe.deep);
    layer.set(CX + 3, m.shoulderY + 4, T.robe.deep);
  }

  if (look.outfit === "armor") {
    paintArmorFront(layer, look, m, back);
  } else if (!back) {
    paintRobeFront(layer, look, m);
  } else {
    // Hood lining folded at the back of the neck, and a centre seam.
    layer.hline(CX - 3, CX + 2, m.shoulderY, T.trim.lo);
    layer.hline(CX - 2, CX + 1, m.shoulderY + 1, T.trim.base);
    layer.set(CX - 1, m.shoulderY + 2, T.trim.lo);
    layer.set(CX, m.shoulderY + 2, T.trim.lo);
    for (let y = m.waistY + 1; y < m.hemY; y++) if (layer.filled(CX, y)) layer.set(CX, y, T.robe.lo);
  }

  p.stamp(layer, 0, 0);

  if (look.apron && !back) {
    const a = ramp(look.apron);
    trap(p, m.shoulderY + 4, m.hemY - 2, CX - 4, CX + 3, CX - 5, CX + 4, (_x, _y, t) => (t < 0.15 ? a.hi : t > 0.8 ? a.lo : a.base));
    p.vline(CX - 4, m.shoulderY, m.shoulderY + 3, a.lo);
    p.vline(CX + 3, m.shoulderY, m.shoulderY + 3, a.lo);
    p.hline(CX - 2, CX + 1, m.waistY + 3, a.lo);
    p.hline(CX - 2, CX + 1, m.waistY + 4, a.deep);
  }
}

function paintRobeFront(layer: Pix, look: Look, m: Metrics): void {
  const T = tones(look);
  if (!look.inner) {
    // No shirt beneath (shades, husks, wraiths): just a dark crease where
    // the cloth wraps over itself.
    for (let y = m.shoulderY + 2; y < m.hemY; y++) if (layer.filled(CX - 1, y)) layer.set(CX - 1, y, T.robe.lo);
    return;
  }
  const coat = look.outfit === "coat";
  const gown = look.outfit === "gown";
  // The opening: shirt and tie above the waist, edged in trim to the hem.
  for (let y = m.shoulderY; y <= m.hemY - 1; y++) {
    const above = y <= m.waistY;
    if (gown) {
      // A gown closes high: a panel of the inner colour edged in trim.
      if (y > m.shoulderY + 1) {
        layer.set(CX - 1, y, above ? T.inner.base : T.robe.lo);
        layer.set(CX, y, above ? T.inner.lo : T.robe.lo);
      }
      layer.set(CX - 2, y, T.trim.base);
      layer.set(CX + 1, y, T.trim.lo);
      continue;
    }
    layer.set(CX - 2, y, T.trim.base);
    layer.set(CX + 1, y, T.trim.lo);
    if (above) {
      layer.set(CX - 1, y, T.inner.base);
      layer.set(CX, y, T.inner.lo);
    } else if (coat) {
      // Open coat: trousers show between the flaps.
      layer.set(CX - 1, y, T.legs.base);
      layer.set(CX, y, T.legs.lo);
    } else {
      layer.set(CX - 1, y, T.robe.lo);
      layer.set(CX, y, T.robe.deep);
    }
  }
  // Collar points.
  layer.set(CX - 3, m.shoulderY, T.inner.hi);
  layer.set(CX - 2, m.shoulderY, T.inner.base);
  layer.set(CX + 1, m.shoulderY, T.inner.lo);
  layer.set(CX + 2, m.shoulderY, T.inner.lo);
  if (look.accent && !gown) {
    // Tie.
    for (let y = m.shoulderY + 1; y <= m.shoulderY + 4; y++) {
      layer.set(CX - 1, y, T.accent.base);
      layer.set(CX, y, T.accent.lo);
    }
  }
  if (gown && look.accent) {
    // Brooch at the throat.
    layer.glow(CX - 1, m.shoulderY + 1, T.accent.hi);
    layer.set(CX, m.shoulderY + 1, T.accent.base);
  }
  if (coat) {
    // Copper buttons and a belt.
    for (const by of [m.shoulderY + 2, m.shoulderY + 4]) layer.set(CX - 3, by, T.trim.hi);
    for (let x = CX - 6; x <= CX + 5; x++) if (layer.filled(x, m.waistY)) layer.set(x, m.waistY, 0x3a2618);
    layer.set(CX - 4, m.waistY, T.trim.hi);
  }
  if (look.emblem) {
    const e = ramp(look.emblem);
    layer.set(CX - 5, m.shoulderY + 3, e.hi);
    layer.set(CX - 4, m.shoulderY + 3, e.base);
    layer.set(CX - 5, m.shoulderY + 4, e.base);
    layer.set(CX - 4, m.shoulderY + 4, e.lo);
  }
  if (look.sigil === "lantern") {
    // The Keepers' lantern, stitched in pale brass with a lit heart.
    const sy = m.shoulderY + 2;
    layer.set(CX - 5, sy, T.trim.hi);
    layer.hline(CX - 6, CX - 4, sy + 1, T.trim.base);
    layer.set(CX - 6, sy + 2, T.trim.base);
    layer.glow(CX - 5, sy + 2, 0xffc35a);
    layer.set(CX - 4, sy + 2, T.trim.lo);
    layer.hline(CX - 6, CX - 4, sy + 3, T.trim.lo);
  }
}

/** A small hand-lantern hanging under a hand at (x, y). */
function handLantern(p: Pix, x: number, y: number): void {
  const brass = ramp("#b8862e");
  p.set(x, y, brass.lo);
  p.hline(x - 1, x + 1, y + 1, brass.hi);
  p.set(x - 1, y + 2, brass.base);
  p.glow(x, y + 2, 0xfff0b0);
  p.set(x + 1, y + 2, brass.lo);
  p.set(x - 1, y + 3, brass.base);
  p.glow(x, y + 3, 0xffb040);
  p.set(x + 1, y + 3, brass.lo);
  p.hline(x - 1, x + 1, y + 4, brass.lo);
}

function paintArmorFront(layer: Pix, look: Look, m: Metrics, back: boolean): void {
  const T = tones(look);
  // Breastplate ridge, a brass belt and segmented tassets.
  if (!back) {
    for (let y = m.shoulderY + 1; y <= m.waistY; y++) {
      layer.set(CX - 1, y, T.robe.hi);
      layer.set(CX, y, T.robe.lo);
    }
    layer.hline(CX - 4, CX + 3, m.shoulderY + 4, T.robe.lo);
  }
  for (let x = 0; x < FW; x++) {
    if (layer.filled(x, m.waistY + 1)) layer.set(x, m.waistY + 1, x === CX - 1 ? T.trim.hi : T.trim.base);
  }
  for (let y = m.waistY + 2; y <= m.hemY; y++) {
    for (let x = 0; x < FW; x++) {
      if (!layer.filled(x, y)) continue;
      if ((x - CX + 8) % 4 === 0) layer.set(x, y, T.robe.deep);
    }
  }
  if (look.accent && !back) {
    // A faded surcoat panel hanging from the belt.
    const a = ramp(look.accent);
    trap(layer, m.waistY + 2, m.hemY + 2, CX - 2, CX + 1, CX - 2, CX + 1, (_x, _y, t) => (t < 0.4 ? a.base : a.lo));
  }
}

function paintRibcage(p: Pix, look: Look, m: Metrics, back: boolean): void {
  const T = tones(look);
  // Spine.
  for (let y = m.shoulderY; y <= m.hipY; y++) p.set(CX - 1 + (y % 2), y, T.skin.base);
  // Collarbones and ribs.
  p.hline(CX - 6, CX + 5, m.shoulderY, T.skin.hi);
  for (let i = 0; i < 4; i++) {
    const y = m.shoulderY + 2 + i * 2;
    const half = 5 - Math.floor(i / 2);
    p.hline(CX - half, CX - 2, y, back ? T.skin.lo : T.skin.base);
    p.hline(CX + 1, CX + half - 1, y, T.skin.lo);
  }
  // Pelvis.
  p.hline(CX - 4, CX + 3, m.hipY - 1, T.skin.base);
  p.set(CX - 4, m.hipY, T.skin.lo);
  p.set(CX + 3, m.hipY, T.skin.lo);
  // A rag of a tabard, so it reads as a warden and not a lab model.
  const tab = ramp(look.robe);
  trap(p, m.waistY + 1, m.hipY + 5, CX - 3, CX + 2, CX - 3, CX + 2, (x, y, t) => {
    if (y === m.hipY + 5 && x % 2 === 0) return null;
    return t < 0.3 ? tab.hi : t > 0.7 ? tab.lo : tab.base;
  });
  p.hline(CX - 3, CX + 2, m.waistY + 1, ramp(look.trim).base);
}

/** Wisp, tatter or smoke in place of legs. */
function paintLowerSpirit(layer: Pix, look: Look, pose: Pose, m: Metrics, r: Ramp): void {
  const lower = look.lower ?? "legs";
  const bottom = m.foot - 1;
  const top = m.waistY + 1;
  const phase = pose.t * Math.PI * 2;
  for (let y = top; y <= bottom; y++) {
    const v = (y - top) / Math.max(1, bottom - top);
    let half: number;
    let shift = 0;
    if (lower === "wisp") {
      // Tapers to a curling tail that sways.
      half = Math.max(1, Math.round((m.hemHalf - 1) * (1 - v * v) + 0.5));
      shift = Math.round(Math.sin(phase + v * 3) * v * 3);
    } else if (lower === "tatter") {
      half = m.hemHalf + Math.round(v * 1.5);
      shift = Math.round(Math.sin(phase + v * 2) * v * 1.2);
    } else {
      half = Math.max(1, Math.round(m.hemHalf * (1 - v * 0.6)));
      shift = Math.round(Math.sin(phase * 2 + y) * v * 1.5);
    }
    for (let x = CX - half + shift; x <= CX + half - 1 + shift; x++) {
      if (lower === "tatter" && v > 0.55) {
        // Ragged strips of uneven length that flutter.
        const strip = Math.floor((x + 40) / 2);
        const len = 0.55 + (((strip * 37) % 10) / 10) * 0.45 + Math.sin(phase + strip) * 0.05;
        if (v > len) continue;
      }
      if (lower === "smoke" && v > 0.35) {
        // Dissolving: a dither that thins out toward the ground.
        const n = ((x * 13 + y * 7 + Math.floor(pose.t * 8)) % 7) / 7;
        if (n < v - 0.3) continue;
      }
      layer.set(x, y, r.base);
    }
  }
}

/** Arms and hands, from the front or back. */
function armsFrontal(p: Pix, look: Look, pose: Pose, m: Metrics, back: boolean): void {
  const T = tones(look);
  const sleeve = look.outfit === "bones" ? T.skin : look.outfit === "armor" ? T.robe : T.robe;
  for (const side of [-1, 1] as const) {
    const swing = side < 0 ? pose.stride : -pose.stride;
    const dy = Math.round(-swing);
    const outer = side < 0 ? CX - m.shoulderHalf - 2 : mirrorX(CX - m.shoulderHalf - 2);
    const casting = pose.action !== "none" && side > 0 && !back;
    const castingBack = pose.action !== "none" && side > 0 && back;
    const top = m.shoulderY + 1;
    const end = m.shoulderY + 8 + dy + (look.hunch ? 3 : 0);

    if (casting || castingBack) {
      // The wand arm comes up and forward.
      const hx = side > 0 ? CX + 6 : CX - 7;
      const hy = m.shoulderY + (castingBack ? -3 : 2);
      p.line(CX + 5, top, hx, hy + 2, sleeve.base);
      p.line(CX + 6, top, hx + 1, hy + 2, sleeve.lo);
      p.line(CX + 4, top + 1, hx - 1, hy + 2, sleeve.base);
      p.set(hx, hy + 2, T.trim.base);
      p.set(hx + 1, hy + 2, T.trim.lo);
      p.set(hx, hy + 1, T.skin.base);
      p.set(hx + 1, hy + 1, T.skin.lo);
      wand(p, hx + 1, hy, hx + 3, hy - 4, pose.action === "cast", look);
      continue;
    }

    if (look.outfit === "bones") {
      const x = side < 0 ? outer + 1 : outer - 1;
      p.vline(x, top, end, T.skin.base);
      p.set(x, top + 3, T.skin.hi);
      p.rect(side < 0 ? x - 1 : x, end + 1, 2, 2, T.skin.lo);
      continue;
    }

    for (let y = top; y <= end; y++) {
      const cuff = y >= end - 1;
      const widen = cuff && look.outfit !== "armor" && look.outfit !== "coat" ? 1 : 0;
      for (let k = 0; k < 3 + widen; k++) {
        const x = side < 0 ? outer - widen + k : outer - 2 + k;
        let c = sleeve.base;
        if (side < 0 && k === 0) c = sleeve.hi;
        if (side > 0 && k === 2 + widen) c = sleeve.lo;
        if ((side < 0 && k === 2 + widen) || (side > 0 && k === 0)) c = sleeve.lo;
        if (cuff && y === end && look.outfit !== "rags") c = side < 0 ? T.trim.base : T.trim.lo;
        p.set(x, y, c);
      }
    }
    if (look.outfit === "armor") {
      // Pauldron.
      const px = side < 0 ? outer - 1 : outer - 3;
      p.hline(px, px + 4, top - 1, T.robe.hi);
      p.hline(px, px + 4, top, T.trim.base);
    }
    // Hand.
    const hx = side < 0 ? outer : outer - 1;
    const handC = look.outfit === "armor" ? T.robe : T.skin;
    p.set(hx, end + 1, side < 0 ? handC.base : handC.lo);
    p.set(hx + 1, end + 1, side < 0 ? handC.base : handC.lo);
    p.set(hx + (side < 0 ? 0 : 1), end + 2, handC.lo);
    if (look.hunch) p.set(hx + (side < 0 ? 0 : 1), end + 3, handC.lo);
    if (look.lantern && side < 0) handLantern(p, hx, end + 3);

    if (look.book && side < 0 && !back) {
      const b = ramp(look.book);
      p.rect(hx - 1, end - 4, 3, 5, b.base);
      p.vline(hx - 1, end - 4, end, b.hi);
      p.hline(hx - 1, hx + 1, end - 4, 0xeee4cc);
      p.set(hx + 1, end, b.lo);
    }
  }
}

function wand(p: Pix, x0: number, y0: number, x1: number, y1: number, glowing: boolean, look: Look): void {
  p.line(x0, y0, x1, y1, WAND);
  if (!glowing) return;
  const g = hex(look.trim);
  const spark = blend(g, 0xffffff, 0.6);
  p.glow(x1, y1, 0xffffff);
  p.glow(x1 + 1, y1, spark, 200);
  p.glow(x1 - 1, y1, spark, 200);
  p.glow(x1, y1 - 1, spark, 200);
  p.glow(x1, y1 + 1, spark, 160);
}

/** Satchel strap across the chest and the bag on the hip. */
function satchelFront(p: Pix, look: Look, m: Metrics, back: boolean): void {
  if (!look.satchel) return;
  const s = ramp(look.satchel);
  const flip = back ? -1 : 1;
  const sx = flip > 0 ? CX - 5 : CX + 4;
  const ex = flip > 0 ? CX + 4 : CX - 5;
  p.line(sx, m.shoulderY, ex, m.waistY + 1, s.lo);
  // Bag on the far hip.
  const bx = flip > 0 ? CX + 5 : CX - 9;
  p.rect(bx, m.waistY, 4, 4, s.base);
  p.hline(bx, bx + 3, m.waistY, s.hi);
  p.vline(flip > 0 ? bx + 3 : bx, m.waistY + 1, m.waistY + 3, s.lo);
  p.set(bx + 1, m.waistY + 1, 0xc9a04a);
}

function scarfFront(p: Pix, look: Look, pose: Pose, m: Metrics, back: boolean): void {
  if (!look.scarf) return;
  const a = ramp(look.trim);
  const b = ramp(look.accent ?? look.trim);
  // Wrapped around the neck in stripes.
  for (let x = CX - 5; x <= CX + 4; x++) {
    const stripe = Math.floor((x + 1) / 2) % 2 === 0 ? a : b;
    p.set(x, m.shoulderY - 1, x < CX - 2 ? stripe.hi : stripe.base);
    p.set(x, m.shoulderY, stripe.lo);
  }
  if (back) return;
  // A tail hanging down the chest that swings a little with the walk.
  const tx = CX + 2 + Math.round(pose.stride * 0.5);
  for (let i = 0; i < 6; i++) {
    const stripe = Math.floor(i / 2) % 2 === 0 ? a : b;
    p.set(tx, m.shoulderY + 1 + i, stripe.base);
    p.set(tx + 1, m.shoulderY + 1 + i, stripe.lo);
  }
  p.set(tx, m.shoulderY + 7, b.lo);
  p.set(tx + 1, m.shoulderY + 7, a.lo);
}

function holsterFront(p: Pix, look: Look, m: Metrics, back: boolean): void {
  if (!look.holster || back) return;
  const x = CX - 7;
  p.rect(x, m.waistY + 1, 2, 4, 0x4a2e1a);
  p.set(x, m.waistY + 1, 0x6a4428);
  p.set(x + 1, m.waistY, 0xd9c08a);
}

// --- heads -----------------------------------------------------------------------

function headFront(p: Pix, look: Look, pose: Pose, m: Metrics): void {
  const T = tones(look);
  const { headCy, eyeY } = m;
  const helm = look.hat === "helm";

  // Neck.
  p.hline(CX - 2, CX + 1, m.shoulderY - 1, T.skin.lo);

  if (!helm) {
    if (look.outfit === "bones") {
      paintSkullFront(p, look, m);
      return;
    }
    p.shadedEllipse(CX, headCy, 7, 6.5, T.skin, 0.38);
    // Ears peek out unless the hair covers them.
    if (!["long", "bob"].includes(look.hairStyle) && look.hat !== "hood") {
      p.set(8, eyeY, T.skin.base);
      p.set(8, eyeY + 1, T.skin.lo);
      p.set(23, eyeY, T.skin.lo);
      p.set(23, eyeY + 1, T.skin.lo);
    }
  }

  if (look.mask) {
    const mk = ramp(look.mask);
    p.shadedEllipse(CX, headCy + 1, 5.5, 5, mk);
    p.hline(CX - 4, CX - 2, eyeY, EYE_DARK);
    p.hline(CX + 1, CX + 3, eyeY, EYE_DARK);
    p.vline(CX - 1, eyeY + 2, eyeY + 4, mk.lo);
  }

  if (helm) return;
  eyesFront(p, look, pose, m);
}

function eyesFront(p: Pix, look: Look, pose: Pose, m: Metrics): void {
  const T = tones(look);
  const { eyeY } = m;
  const lx = 12;
  const rx = 18;

  if (look.glowEyes) {
    const g = hex(look.glowEyes);
    for (const x of [lx, rx]) {
      p.glow(x, eyeY, g);
      p.glow(x + 1, eyeY, blend(g, 0xffffff, 0.5));
      if (!pose.blink) p.glow(x + (x === lx ? 0 : 1), eyeY + 1, blend(g, 0x000000, 0.25), 220);
    }
    return;
  }

  if (pose.blink) {
    p.hline(lx, lx + 1, eyeY + 1, T.skin.deep);
    p.hline(rx, rx + 1, eyeY + 1, T.skin.deep);
  } else {
    const iris = hex(look.eye);
    for (const x of [lx, rx]) {
      p.set(x, eyeY, EYE_DARK);
      p.set(x + 1, eyeY, EYE_DARK);
      p.set(x, eyeY + 1, x === lx ? WHITE : iris);
      p.set(x + 1, eyeY + 1, x === lx ? iris : WHITE);
    }
  }

  // Brows say most of the character.
  const brow = T.hair.lo;
  const stern = look.brows === "stern";
  const raised = look.brows === "raised";
  p.set(lx, eyeY - 2 - (raised ? 1 : 0), brow);
  p.set(lx + 1, eyeY - 2 + (stern ? 1 : 0), brow);
  p.set(rx, eyeY - 2 + (stern ? 1 : 0), brow);
  p.set(rx + 1, eyeY - 2, brow);

  // Nose shadow and mouth.
  p.set(CX - 1, eyeY + 2, T.skin.lo);
  p.hline(CX - 1, CX, eyeY + 4, look.beard ? T.skin.deep : blend(T.skin.lo, 0x8a3a3a, 0.35));
  if (look.blush) {
    p.set(10, eyeY + 2, blend(T.skin.base, 0xe06a6a, 0.45));
    p.set(21, eyeY + 2, blend(T.skin.base, 0xe06a6a, 0.45));
  }

  if (look.glasses) {
    const g = 0xd8d0b8;
    for (const x of [lx, rx]) {
      p.hline(x - 1, x + 2, eyeY - 1, g);
      p.set(x - 1, eyeY, g);
      p.set(x + 2, eyeY, g);
      p.hline(x - 1, x + 2, eyeY + 2, blend(g, 0x000000, 0.35));
      p.set(x - 1, eyeY + 1, g);
      p.set(x + 2, eyeY + 1, g);
    }
    p.hline(CX - 1, CX, eyeY, g);
  }

  if (look.beard) {
    const b = ramp(look.beardColor ?? look.hair);
    // Moustache then beard, long or close-cropped.
    p.hline(CX - 3, CX + 2, eyeY + 3, b.base);
    p.set(CX - 3, eyeY + 4, b.lo);
    p.set(CX + 2, eyeY + 4, b.lo);
    if (look.beard === "long") {
      trap(p, eyeY + 4, m.shoulderY + 6, CX - 5, CX + 4, CX - 2, CX + 1, (x, _y, t) =>
        x === CX - 1 || x === CX ? (t < 0.5 ? b.base : b.lo) : t < 0.25 ? b.hi : t > 0.7 ? b.lo : b.base,
      );
      p.hline(CX - 1, CX, eyeY + 4, T.skin.deep);
    } else {
      trap(p, eyeY + 4, m.headCy + 6, CX - 6, CX + 5, CX - 3, CX + 2, (_x, _y, t) => (t < 0.25 ? b.hi : t > 0.7 ? b.lo : b.base));
      p.hline(CX - 1, CX, eyeY + 4, T.skin.deep);
    }
  }
}

function paintSkullFront(p: Pix, look: Look, m: Metrics): void {
  const T = tones(look);
  p.shadedEllipse(CX, m.headCy - 0.5, 6.5, 6, T.skin, 0.1);
  // Jaw.
  p.rect(CX - 4, m.headCy + 4, 8, 2, T.skin.base);
  p.hline(CX - 4, CX + 3, m.headCy + 5, T.skin.lo);
  for (let x = CX - 3; x <= CX + 2; x += 2) p.set(x, m.headCy + 4, T.skin.lo);
  // Sockets with ember eyes, nasal hole.
  for (const x of [CX - 5, CX + 1]) {
    p.rect(x, m.eyeY - 1, 4, 3, T.skin.deep);
    p.glow(x + (x < CX ? 2 : 1), m.eyeY, hex(look.glowEyes ?? look.eye));
  }
  p.set(CX - 1, m.eyeY + 2, T.skin.deep);
  p.set(CX, m.eyeY + 2, T.skin.deep);
}

/** Hair shapes, front view. Draws the cap over the brow and any long locks. */
function hairFront(p: Pix, look: Look, m: Metrics): void {
  const style = look.hairStyle;
  if (style === "none" || look.hat === "helm" || look.outfit === "bones") return;
  const H = tones(look).hair;
  const { headCy, eyeY } = m;

  const jag = [0, 1, 0, 2, 1, 0, 1, 2, 0, 1, 0, 2, 1, 0, 1, 0];
  const fringe = (x: number): number => {
    const d = Math.abs(x + 0.5 - CX);
    switch (style) {
      case "messy":
        return d > 5 ? eyeY + 1 : eyeY - 3 + (jag[x % 16] ?? 0);
      case "short":
        return d > 5.5 ? eyeY : eyeY - 3 + (x === CX + 2 ? 1 : 0);
      case "bob":
        return d > 4.5 ? eyeY + 4 : eyeY - 2;
      case "slick":
        return d > 5.5 ? eyeY - 1 : eyeY - 4;
      case "long":
        return d > 4.5 ? eyeY + 6 : x < CX ? eyeY - 3 : eyeY - 4;
      case "bald":
      case "tonsure":
        return d > 5.5 ? eyeY + 1 : -99;
      default:
        // bun, ponytail, braid: hair pulled back with a centre parting
        return d > 5.5 ? eyeY : eyeY - 3 - (d < 1 ? 1 : 0);
    }
  };
  const bald = style === "bald" || style === "tonsure";
  p.ellipseWith(CX, headCy - 0.5, 7.6, 7.2, (nx, ny, x, y) => {
    if (y > fringe(x)) return null;
    if (bald && y < eyeY - 2) return null;
    const light = -nx * 0.55 - ny * 0.75;
    // A sheen band across the crown is what makes hair read as hair.
    if (ny < -0.4 && ny > -0.62 && nx > -0.55 && nx < 0.05 && (x + y) % 3 !== 0) return H.hi;
    return light < -0.35 ? H.lo : light > 0.55 ? H.hi : H.base;
  });
  if (style === "long" || style === "bob") {
    // Side locks fall to the shoulders.
    const bottom = style === "long" ? m.shoulderY + 3 : eyeY + 4;
    for (let y = eyeY; y <= bottom; y++) {
      p.set(8, y, H.base);
      p.set(9, y, y > eyeY + 4 ? H.base : H.lo);
      p.set(22, y, y > eyeY + 4 ? H.lo : H.lo);
      p.set(23, y, H.lo);
    }
  }
  if (style === "messy") {
    // Cowlicks sticking up.
    p.set(CX - 2, m.headTop - 1, H.base);
    p.set(CX + 3, m.headTop, H.base);
    p.set(CX + 4, m.headTop - 1, H.lo);
  }
  if (style === "bun" && look.hat !== "wide" && look.hat !== "tall" && look.hat !== "pointed") {
    p.shadedEllipse(CX, m.headTop - 1, 3, 2.5, H);
  }
  if (style === "braid") {
    // The braid comes forward over the left shoulder (viewer's right).
    for (let i = 0; i < 9; i++) {
      const y = eyeY + 3 + i;
      const x = CX + 6 - (i > 5 ? 1 : 0);
      p.set(x, y, i % 2 === 0 ? H.base : H.lo);
      p.set(x + 1, y, i % 2 === 0 ? H.lo : H.base);
    }
    p.set(CX + 5, eyeY + 12, 0xd9c08a);
    p.set(CX + 6, eyeY + 12, 0xd9c08a);
    p.set(CX + 5, eyeY + 13, H.lo);
  }
}

/** Long hair and ponytails hang *behind* the body when seen from the front. */
function hairBehind(p: Pix, look: Look, m: Metrics): void {
  const H = tones(look).hair;
  if (look.hat === "helm") return;
  if (look.hairStyle === "long") {
    trap(p, m.headCy, m.shoulderY + 5, CX - 8, CX + 7, CX - 8, CX + 7, (_x, _y, t) => (t < 0.2 ? H.base : H.lo));
  }
  if (look.hairStyle === "ponytail") {
    p.rect(CX + 6, m.headCy - 3, 2, 8, H.lo);
    p.set(CX + 7, m.headCy + 5, H.lo);
  }
}

function hatFront(p: Pix, look: Look, m: Metrics, back: boolean): void {
  const style = look.hat;
  if (style === "none") return;
  const R = tones(look).hat;
  const band = ramp(look.hatBand ?? look.trim);
  const b = m.headTop + 4;

  if (style === "pointed" || style === "tall") {
    const cone = new Pix(FW, FH);
    const pts: Array<[number, number]> =
      style === "pointed"
        ? [
            [9.5, b],
            [22.5, b],
            [19.5, b - 6],
            [23.5, b - 12],
            [17, b - 9],
            [12.5, b - 6],
          ]
        : [
            [10.5, b],
            [21.5, b],
            [19, b - 9],
            [19.5, b - 14],
            [15.5, b - 11],
            [13, b - 8],
          ];
    cone.poly(pts, R.base);
    rowShade(cone, R, 0.2, 0.35);
    p.stamp(cone, 0, 0);
    // Brim: lit on top, shadowed underneath.
    p.ellipseWith(CX, b + 0.5, style === "tall" ? 10 : 11, 2.4, (_nx, ny) => (ny < -0.2 ? R.hi : ny > 0.45 ? R.lo : R.base));
    // Band.
    for (let x = 0; x < FW; x++) {
      if (cone.filled(x, b - 1)) p.set(x, b - 1, x < CX - 2 ? band.hi : x > CX + 3 ? band.lo : band.base);
      if (cone.filled(x, b - 2)) p.set(x, b - 2, band.lo);
    }
    if (!back && look.key === "professor") {
      // Little embroidered stars.
      p.glow(CX - 2, b - 5, band.hi);
      p.glow(CX + 2, b - 8, band.hi);
    }
    return;
  }

  if (style === "wide") {
    const crown = new Pix(FW, FH);
    trap(crown, b - 5, b, CX - 5, CX + 4, CX - 6, CX + 5, R.base);
    crown.clear(CX - 5, b - 5);
    crown.clear(CX + 4, b - 5);
    rowShade(crown, R, 0.2, 0.3);
    p.stamp(crown, 0, 0);
    p.ellipseWith(CX, b + 0.5, 12.5, 2.8, (_nx, ny) => (ny < -0.2 ? R.hi : ny > 0.4 ? R.lo : R.base));
    p.hline(CX - 6, CX + 5, b - 1, band.base);
    p.hline(CX - 6, CX + 5, b - 2, band.lo);
    if (look.hatFlower && !back) {
      const f = ramp(look.hatFlower);
      p.set(CX - 6, b - 3, f.hi);
      p.set(CX - 5, b - 3, f.base);
      p.set(CX - 6, b - 2, f.base);
      p.set(CX - 5, b - 2, 0xf0d05a);
      p.set(CX - 4, b - 2, 0x4a8a3c);
    }
    return;
  }

  if (style === "circlet") {
    p.hline(CX - 6, CX + 5, m.eyeY - 3, band.base);
    p.glow(CX - 1, m.eyeY - 3, band.hi);
    return;
  }

  if (style === "helm") {
    paintHelm(p, look, m, back ? "up" : "down");
  }
}

function paintHelm(p: Pix, look: Look, m: Metrics, facing: Facing): void {
  const R = tones(look).hat;
  const band = ramp(look.hatBand ?? look.trim);
  const side = facing === "left";
  p.shadedEllipse(side ? CX - 0.5 : CX, m.headCy, 7.5, 7, R, 0.1);
  // Brass rim round the crown.
  p.ellipseWith(side ? CX - 0.5 : CX, m.headCy, 7.5, 7, (_nx, ny) => (Math.abs(ny + 0.1) < 0.1 ? band.base : null));
  if (facing !== "up") {
    const glow = hex(look.glowEyes ?? look.eye);
    if (side) {
      p.hline(9, 14, m.eyeY, 0x0e0c14);
      p.glow(10, m.eyeY, glow);
      p.glow(11, m.eyeY, blend(glow, 0xffffff, 0.4));
    } else {
      p.hline(CX - 6, CX + 5, m.eyeY, 0x0e0c14);
      p.vline(CX - 1, m.eyeY - 2, m.eyeY + 3, R.lo);
      p.vline(CX, m.eyeY - 2, m.eyeY + 3, R.deep);
      p.glow(CX - 4, m.eyeY, glow);
      p.glow(CX - 3, m.eyeY, blend(glow, 0xffffff, 0.4));
      p.glow(CX + 2, m.eyeY, blend(glow, 0xffffff, 0.4));
      p.glow(CX + 3, m.eyeY, glow);
      // Breathing holes.
      p.set(CX - 3, m.eyeY + 3, R.deep);
      p.set(CX + 2, m.eyeY + 3, R.deep);
    }
  }
  // A crest of horsehair.
  const crest = ramp(look.accent ?? "#6a2a2a");
  for (let i = 0; i < 6; i++) {
    const x = side ? CX + i - 2 : CX - 1;
    p.set(x, m.headTop - 1 + (side ? Math.floor(i / 2) : 0), crest.base);
    if (!side) {
      p.vline(CX - 1, m.headTop - 2, m.headTop + 1, crest.base);
      p.vline(CX, m.headTop - 2, m.headTop + 1, crest.lo);
    }
  }
}

/** A hood round the head: drawn behind, then its rim over the face. */
function hoodFront(p: Pix, look: Look, m: Metrics, phase: "behind" | "front", back: boolean): void {
  if (look.hat !== "hood") return;
  const R = tones(look).hat;
  const { headCy } = m;
  if (phase === "behind") {
    p.shadedEllipse(CX, headCy - 0.5, 8.5, 8, R);
    // Cowl on the shoulders.
    trap(p, m.shoulderY - 1, m.shoulderY + 2, CX - 7, CX + 6, CX - 8, CX + 7, (_x, _y, t) => (t < 0.2 ? R.hi : t > 0.75 ? R.lo : R.base));
    return;
  }
  if (back) {
    p.shadedEllipse(CX, headCy - 0.5, 8.5, 8, R);
    p.vline(CX, headCy - 4, headCy + 6, R.lo);
    return;
  }
  // Rim: everything of the hood outside the face opening.
  const voidFace = !!look.glowEyes && !look.mask;
  p.ellipseWith(CX, headCy - 0.5, 8.5, 8, (nx, ny, x, y) => {
    const fx = (x + 0.5 - CX) / 5.6;
    const fy = (y + 0.5 - (headCy + 1.5)) / 5.8;
    const inFace = fx * fx + fy * fy <= 1;
    if (inFace) {
      if (voidFace) return y < m.eyeY - 1 ? 0x07060b : 0x0d0b14;
      // Shadow under the hood's lip.
      return y <= m.eyeY - 3 ? blend(R.deep, 0x000000, 0.2) : null;
    }
    const light = -nx * 0.55 - ny * 0.75;
    return light > 0.5 ? R.hi : light < -0.3 ? R.lo : R.base;
  });
}

// --- views -------------------------------------------------------------------------

function paintDown(p: Pix, look: Look, pose: Pose, m: Metrics): void {
  capeBack(p, look, m);
  hairBehind(p, look, m);
  hoodFront(p, look, m, "behind", false);
  legsFrontal(p, look, pose, m, false);
  garmentFront(p, look, pose, m, false);
  satchelFront(p, look, m, false);
  holsterFront(p, look, m, false);
  armsFrontal(p, look, pose, m, false);
  headFront(p, look, pose, m);
  if (look.glowEyes && look.hat === "hood" && !look.mask) {
    // Hooded monsters: no face, just the eyes in the dark.
    hoodFront(p, look, m, "front", false);
    const g = hex(look.glowEyes);
    for (const x of [CX - 3, CX + 2]) {
      p.glow(x, m.eyeY, g);
      p.glow(x + (x < CX ? -1 : 1), m.eyeY, blend(g, 0x000000, 0.4), 200);
    }
  } else {
    hairFront(p, look, m);
    hoodFront(p, look, m, "front", false);
  }
  scarfFront(p, look, pose, m, false);
  hatFront(p, look, m, false);
}

function paintUp(p: Pix, look: Look, pose: Pose, m: Metrics): void {
  const T = tones(look);
  hoodFront(p, look, m, "behind", true);
  legsFrontal(p, look, pose, m, true);
  armsFrontal(p, look, pose, m, true);
  garmentFront(p, look, pose, m, true);
  satchelFront(p, look, m, true);
  // The back of the head.
  p.hline(CX - 2, CX + 1, m.shoulderY - 1, T.skin.lo);
  if (look.outfit === "bones") {
    p.shadedEllipse(CX, m.headCy - 0.5, 6.5, 6, T.skin, 0.1);
  } else if (look.hat === "helm") {
    paintHelm(p, look, m, "up");
  } else {
    p.shadedEllipse(CX, m.headCy, 7, 6.5, T.skin, 0.1);
    const style = look.hairStyle;
    if (style !== "none") {
      const bald = style === "bald" || style === "tonsure";
      p.ellipseWith(CX, m.headCy - 0.5, 7.6, 7.2, (nx, ny, _x, y) => {
        if (y > m.headCy + 4 && style !== "long") return null;
        if (bald) {
          if (style === "tonsure" ? ny < -0.1 && Math.abs(nx) < 0.75 : ny < 0.2) return null;
        }
        if (ny < -0.35 && ny > -0.6 && nx > -0.5 && nx < 0.1 && (_x + y) % 3 !== 0) return T.hair.hi;
        const light = -nx * 0.55 - ny * 0.75;
        return light < -0.3 ? T.hair.lo : T.hair.base;
      });
      if (style === "long" && look.hat !== "hood") {
        trap(p, m.headCy, m.shoulderY + 6, CX - 7, CX + 6, CX - 6, CX + 5, (_x, y, t) =>
          y === m.shoulderY + 6 && t > 0.3 && t < 0.7 ? null : t < 0.25 ? T.hair.base : t > 0.7 ? T.hair.lo : T.hair.base,
        );
      }
      if (style === "ponytail" || style === "braid") {
        const len = style === "braid" ? 10 : 7;
        for (let i = 0; i < len; i++) {
          const y = m.headCy + i;
          const shade = style === "braid" && i % 2 ? T.hair.lo : T.hair.base;
          p.set(CX - 1, y, shade);
          p.set(CX, y, T.hair.lo);
        }
        p.hline(CX - 1, CX, m.headCy, 0xd9c08a);
      }
      if (style === "bun") p.shadedEllipse(CX, m.headTop + 1, 3, 2.5, T.hair);
    }
  }
  hoodFront(p, look, m, "front", true);
  scarfFront(p, look, pose, m, true);
  if (look.cape) {
    const r = ramp(look.cape);
    const layer = new Pix(FW, FH);
    trap(layer, m.shoulderY, m.hemY + 1, CX - m.shoulderHalf, CX + m.shoulderHalf - 1, CX - m.hemHalf - 1, CX + m.hemHalf, r.base);
    rowShade(layer, r, 0.15, 0.3);
    for (const fx of [CX - 3, CX + 2]) for (let y = m.waistY; y < m.hemY; y++) if (layer.filled(fx, y)) layer.set(fx, y, r.lo);
    p.stamp(layer, 0, 0);
  }
  hatFront(p, look, m, true);
}

/** Facing left. The right-facing frame is this one mirrored. */
function paintSide(p: Pix, look: Look, pose: Pose, m: Metrics): void {
  const T = tones(look);
  const stride = Math.round(pose.stride * 3);
  const spirit = look.lower && look.lower !== "legs";

  // Cape and back hair.
  if (look.cape) {
    const r = ramp(look.cape);
    trap(p, m.shoulderY, m.hemY + 1, CX + 1, CX + 5, CX + 2, CX + 8 + Math.abs(stride) / 2, (_x, _y, t) => (t < 0.3 ? r.lo : r.base));
  }
  if (look.hat === "hood") {
    p.shadedEllipse(CX + 1, m.headCy - 0.5, 8, 8, T.hat);
  }
  if (look.hairStyle === "long" && look.hat !== "helm") {
    trap(p, m.headCy - 2, m.shoulderY + 5, CX + 1, CX + 7, CX + 2, CX + 7, (_x, _y, t) => (t < 0.3 ? T.hair.base : T.hair.lo));
  }
  if ((look.hairStyle === "ponytail" || look.hairStyle === "braid") && look.hat !== "helm") {
    const len = look.hairStyle === "braid" ? 9 : 6;
    for (let i = 0; i < len; i++) {
      const sway = Math.round(Math.sin(pose.t * Math.PI * 2 + i * 0.5) * (i / len));
      p.set(CX + 6 + sway, m.headCy - 2 + i, i % 2 ? T.hair.lo : T.hair.base);
      p.set(CX + 7 + sway, m.headCy - 2 + i, T.hair.lo);
    }
  }

  // Back leg and back arm, in shadow.
  if (!spirit) {
    sideLeg(p, look, m, -stride, true, pose.stride < -0.3 ? -1 : 0);
  }
  if (look.outfit !== "bones") sideArm(p, look, m, Math.round(pose.stride * 2), true, pose);

  // Body.
  const layer = new Pix(FW, FH);
  if (look.outfit === "bones") {
    for (let y = m.shoulderY; y <= m.hipY; y++) p.set(CX + 1, y, T.skin.base);
    for (let i = 0; i < 4; i++) p.hline(CX - 3, CX + 1, m.shoulderY + 2 + i * 2, i % 2 ? T.skin.lo : T.skin.base);
    p.hline(CX - 2, CX + 2, m.hipY - 1, T.skin.base);
    const tab = ramp(look.robe);
    trap(p, m.waistY + 1, m.hipY + 5, CX - 3, CX - 1, CX - 4, CX - 2, tab.base);
  } else {
    const sway = Math.round(-pose.stride * 0.8);
    trap(layer, m.shoulderY, m.waistY, CX - 4, CX + 4, CX - 4, CX + 4, T.robe.base);
    if (spirit) {
      paintLowerSpirit(layer, look, pose, m, T.robe);
    } else {
      trap(layer, m.waistY + 1, m.hemY, CX - 4, CX + 4, CX - 6 + sway, CX + 5 + Math.abs(sway), T.robe.base);
    }
    layer.clear(CX - 4, m.shoulderY);
    layer.clear(CX + 4, m.shoulderY);
    rowShade(layer, T.robe, 0.22, 0.3);
    // Front edge in trim, hem in trim.
    for (let y = m.shoulderY + 1; y <= m.hemY; y++) {
      for (let x = 0; x < FW; x++) {
        if (!layer.filled(x, y)) continue;
        if (!spirit && look.outfit !== "armor" && look.outfit !== "rags") layer.set(x, y, y === m.hemY ? T.trim.lo : T.trim.base);
        break;
      }
    }
    if (!spirit && look.outfit !== "rags") {
      for (let x = 0; x < FW; x++) if (layer.filled(x, m.hemY)) layer.set(x, m.hemY, T.trim.lo);
    }
    if (look.outfit === "rags") {
      for (let x = 0; x < FW; x++) if ((x * 5) % 3 === 0) layer.clear(x, m.hemY);
    }
    if (look.outfit === "armor") {
      for (let x = 0; x < FW; x++) if (layer.filled(x, m.waistY + 1)) layer.set(x, m.waistY + 1, T.trim.base);
      layer.hline(CX - 3, CX + 3, m.shoulderY + 1, T.robe.hi);
    } else if (look.outfit !== "rags") {
      // Collar and shirt front at the throat.
      if (look.inner) {
        layer.set(CX - 4, m.shoulderY + 1, T.inner.base);
        layer.set(CX - 3, m.shoulderY + 1, T.inner.lo);
      }
      if (look.outfit === "coat") {
        for (let y = m.waistY + 1; y < m.hemY; y++) layer.set(CX - 4, y, T.legs.base);
        for (let x = 0; x < FW; x++) if (layer.filled(x, m.waistY)) layer.set(x, m.waistY, 0x3a2618);
      }
    }
    if (look.apron) {
      const a = ramp(look.apron);
      trap(layer, m.shoulderY + 4, m.hemY - 2, CX - 5, CX - 4, CX - 7, CX - 5, (_x, _y, t) => (t < 0.5 ? a.base : a.lo));
    }
    p.stamp(layer, 0, 0);
  }

  if (!spirit) {
    sideLeg(p, look, m, stride, false, pose.stride > 0.3 ? -1 : 0);
    // Re-draw the hem over the front leg's thigh so the robe stays in front.
    if (look.outfit === "robe" || look.outfit === "gown") {
      p.stamp(layer, 0, 0);
    }
  }

  // Satchel on the near hip, strap over the shoulder.
  if (look.satchel) {
    const s = ramp(look.satchel);
    p.line(CX - 2, m.shoulderY, CX + 3, m.waistY, s.lo);
    p.rect(CX + 2, m.waistY, 4, 4, s.base);
    p.hline(CX + 2, CX + 5, m.waistY, s.hi);
    p.set(CX + 3, m.waistY + 1, 0xc9a04a);
  }
  if (look.holster) {
    p.rect(CX - 1, m.waistY + 1, 2, 4, 0x4a2e1a);
    p.set(CX, m.waistY, 0xd9c08a);
  }

  // Head.
  p.hline(CX - 1, CX + 1, m.shoulderY - 1, T.skin.lo);
  if (look.outfit === "bones") {
    p.shadedEllipse(CX, m.headCy - 0.5, 6, 6, T.skin, 0.1);
    p.rect(CX - 5, m.headCy + 3, 6, 2, T.skin.base);
    p.hline(CX - 5, CX, m.headCy + 4, T.skin.lo);
    p.rect(CX - 4, m.eyeY - 1, 3, 3, T.skin.deep);
    p.glow(CX - 3, m.eyeY, hex(look.glowEyes ?? look.eye));
    p.set(CX - 6, m.eyeY + 2, T.skin.deep);
  } else if (look.hat === "helm") {
    paintHelm(p, look, m, "left");
  } else {
    p.shadedEllipse(CX, m.headCy, 6.5, 6.5, T.skin, 0.38);
    // Nose and chin push forward.
    p.set(9, m.eyeY + 1, T.skin.base);
    p.set(9, m.eyeY + 2, T.skin.lo);
    sideFace(p, look, pose, m);
    sideHair(p, look, m);
  }

  if (look.hat === "hood") {
    const voidFace = !!look.glowEyes && !look.mask;
    p.ellipseWith(CX + 1, m.headCy - 0.5, 8, 8, (nx, ny, x, y) => {
      if (x < CX - 3 && y > m.eyeY - 3) {
        if (!voidFace) return null;
        return x < CX - 6 ? null : 0x0a0910;
      }
      const light = -nx * 0.55 - ny * 0.75;
      return light > 0.5 ? T.hat.hi : light < -0.3 ? T.hat.lo : T.hat.base;
    });
    if (voidFace) {
      p.glow(CX - 5, m.eyeY, hex(look.glowEyes!));
      p.glow(CX - 4, m.eyeY, blend(hex(look.glowEyes!), 0x000000, 0.4), 200);
    }
  }
  if (look.mask) {
    const mk = ramp(look.mask);
    p.rect(CX - 6, m.eyeY - 2, 4, 7, mk.base);
    p.vline(CX - 6, m.eyeY - 2, m.eyeY + 4, mk.hi);
    p.hline(CX - 6, CX - 4, m.eyeY, EYE_DARK);
    p.glow(CX - 5, m.eyeY, hex(look.glowEyes ?? look.eye));
  }

  // Scarf: the tail streams out behind.
  if (look.scarf) {
    const a = ramp(look.trim);
    const b = ramp(look.accent ?? look.trim);
    p.hline(CX - 3, CX + 3, m.shoulderY - 1, a.base);
    p.hline(CX - 3, CX + 3, m.shoulderY, b.lo);
    const lift = Math.abs(pose.stride) > 0.3 ? -1 : 0;
    for (let i = 0; i < 5; i++) {
      p.set(CX + 3 + i, m.shoulderY + Math.floor(i / 2) + lift * (i > 2 ? 1 : 0), i % 2 ? b.base : a.base);
    }
  }

  // Front arm, last, so it swings over the body.
  if (look.outfit === "bones") {
    const swing = Math.round(-pose.stride * 2);
    p.line(CX, m.shoulderY + 1, CX + swing, m.shoulderY + 8, T.skin.base);
    p.rect(CX + swing - 1, m.shoulderY + 9, 2, 2, T.skin.lo);
  } else {
    sideArm(p, look, m, Math.round(-pose.stride * 2.5), false, pose);
  }

  sideHat(p, look, m);
}

function sideLeg(p: Pix, look: Look, m: Metrics, offset: number, back: boolean, lift: number): void {
  const T = tones(look);
  const x = CX - 2 + offset;
  const top = m.hipY - 1;
  const bootTop = m.foot - 3 + lift;
  const legC = look.outfit === "bones" ? T.skin : T.legs;
  for (let y = top; y < bootTop; y++) {
    if (look.outfit === "bones") {
      p.set(x + 1, y, back ? legC.lo : legC.base);
    } else {
      p.set(x, y, back ? legC.lo : legC.hi);
      p.set(x + 1, y, back ? legC.deep : legC.base);
      p.set(x + 2, y, back ? legC.deep : legC.lo);
    }
  }
  const B = T.boots;
  for (let y = 0; y < 3; y++) {
    for (let k = -1; k < 3; k++) {
      if (y === 0 && k === -1) continue;
      p.set(x + k, bootTop + y, back ? B.lo : k === -1 ? B.hi : y === 2 ? B.lo : B.base);
    }
  }
  if (look.key === "raider" && !back) {
    // Knee-high boots with a turned-down cuff.
    p.hline(x, x + 2, bootTop - 2, B.base);
    p.hline(x, x + 2, bootTop - 3, B.hi);
    p.hline(x, x + 2, bootTop - 1, B.base);
  }
}

function sideArm(p: Pix, look: Look, m: Metrics, swing: number, back: boolean, pose: Pose): void {
  const T = tones(look);
  const sleeve = T.robe;
  const sx = CX;
  const sy = m.shoulderY + 1;
  if (!back && pose.action !== "none") {
    // Arm thrust forward with the wand.
    const hx = CX - 8;
    const hy = m.shoulderY + 4;
    for (let k = 0; k < 3; k++) p.line(sx - k + 1, sy + k, hx + 1, hy + k - 1, k === 0 ? sleeve.hi : k === 2 ? sleeve.lo : sleeve.base);
    p.vline(hx + 1, hy - 1, hy + 1, T.trim.base);
    p.set(hx, hy, T.skin.base);
    p.set(hx, hy + 1, T.skin.lo);
    wand(p, hx - 1, hy, hx - 5, hy - 2, pose.action === "cast", look);
    return;
  }
  const hx = sx + swing;
  const hy = m.shoulderY + 8 + (look.hunch ? 3 : 0);
  const c = back ? sleeve.lo : sleeve.base;
  for (let k = 0; k < 3; k++) {
    p.line(sx - 1 + k, sy, hx - 1 + k, hy, back ? sleeve.lo : k === 0 ? sleeve.hi : k === 2 ? sleeve.lo : c);
  }
  if (!back && look.outfit !== "armor") {
    p.hline(hx - 1, hx + 1, hy, T.trim.base);
  }
  const hand = look.outfit === "armor" ? T.robe : T.skin;
  p.set(hx, hy + 1, back ? hand.lo : hand.base);
  p.set(hx, hy + 2, hand.lo);
  if (look.lantern && !back) handLantern(p, hx, hy + 3);
  if (look.book && !back) {
    const b = ramp(look.book);
    p.rect(hx - 1, hy - 3, 4, 3, b.base);
    p.hline(hx - 1, hx + 2, hy - 3, 0xeee4cc);
    p.vline(hx + 2, hy - 2, hy - 1, b.lo);
  }
}

function sideFace(p: Pix, look: Look, pose: Pose, m: Metrics): void {
  const T = tones(look);
  const ey = m.eyeY;
  if (look.glowEyes) {
    p.glow(11, ey, hex(look.glowEyes));
    p.glow(12, ey, blend(hex(look.glowEyes), 0x000000, 0.4), 200);
  } else if (pose.blink) {
    p.set(11, ey + 1, T.skin.deep);
    p.set(12, ey + 1, T.skin.deep);
  } else {
    p.set(11, ey, EYE_DARK);
    p.set(12, ey, EYE_DARK);
    p.set(11, ey + 1, hex(look.eye));
    p.set(12, ey + 1, WHITE);
  }
  const brow = T.hair.lo;
  p.set(11, ey - 2 - (look.brows === "raised" ? 1 : 0), brow);
  p.set(12, ey - 2 + (look.brows === "stern" ? 1 : 0), brow);
  p.set(10, ey + 4, blend(T.skin.lo, 0x8a3a3a, 0.35));
  if (look.blush) p.set(12, ey + 2, blend(T.skin.base, 0xe06a6a, 0.45));
  // Ear.
  p.set(17, ey, T.skin.lo);
  p.set(17, ey + 1, T.skin.deep);
  if (look.glasses) {
    const g = 0xd8d0b8;
    p.hline(10, 13, ey - 1, g);
    p.set(10, ey, g);
    p.set(13, ey, g);
    p.hline(10, 13, ey + 2, blend(g, 0x000000, 0.35));
    p.hline(14, 16, ey, blend(g, 0x000000, 0.25));
  }
  if (look.beard) {
    const b = ramp(look.beardColor ?? look.hair);
    p.hline(9, 12, ey + 3, b.base);
    const bottom = look.beard === "long" ? m.shoulderY + 6 : m.headCy + 6;
    trap(p, ey + 4, bottom, 9, 15, 10, 13, (_x, _y, t) => (t < 0.3 ? b.hi : t > 0.7 ? b.lo : b.base));
  }
}

function sideHair(p: Pix, look: Look, m: Metrics): void {
  const style = look.hairStyle;
  if (style === "none") return;
  const H = tones(look).hair;
  const ey = m.eyeY;
  const bald = style === "bald" || style === "tonsure";
  p.ellipseWith(CX + 0.3, m.headCy - 0.5, 7, 7.2, (nx, ny, x, y) => {
    // Hairline: high over the brow, down behind the ear.
    const front = x <= 13;
    if (bald) {
      if (!(x >= 15 && y >= ey - 2 && y <= ey + 3) && !(style === "tonsure" && x >= 13 && y >= ey - 3 && y <= ey + 2)) return null;
      if (x === 17 && (y === ey || y === ey + 1)) return null;
    } else {
      if (front && y > ey - 3 + (style === "messy" && x % 2 ? 1 : 0)) return null;
      if (!front && x < 17 && y > ey - 2) return null;
      if (x >= 17 && x <= 18 && y >= ey - 1 && y <= ey + 1) return null; // the ear shows
      if (y > m.headCy + 5 && style !== "long" && style !== "bob") return null;
    }
    if (ny < -0.35 && ny > -0.6 && nx > -0.3 && nx < 0.3 && (x + y) % 3 !== 0) return H.hi;
    const light = -nx * 0.55 - ny * 0.75;
    return light < -0.3 ? H.lo : H.base;
  });
  if (style === "messy") {
    p.set(10, m.headTop + 1, H.base);
    p.set(14, m.headTop - 1, H.base);
    p.set(19, m.headTop, H.lo);
  }
  if (style === "bun" && !["wide", "tall", "pointed"].includes(look.hat)) {
    p.shadedEllipse(CX + 5, m.headTop + 1, 2.5, 2.5, H);
  }
}

function sideHat(p: Pix, look: Look, m: Metrics): void {
  const style = look.hat;
  if (style === "none" || style === "hood" || style === "helm") return;
  const R = tones(look).hat;
  const band = ramp(look.hatBand ?? look.trim);
  const b = m.headTop + 4;
  if (style === "pointed" || style === "tall") {
    const cone = new Pix(FW, FH);
    const pts: Array<[number, number]> =
      style === "pointed"
        ? [
            [9.5, b],
            [22.5, b],
            [21, b - 5],
            [26, b - 10],
            [18.5, b - 8],
            [12.5, b - 5],
          ]
        : [
            [10.5, b],
            [21.5, b],
            [20.5, b - 8],
            [22.5, b - 14],
            [16.5, b - 10],
            [13, b - 7],
          ];
    cone.poly(pts, R.base);
    rowShade(cone, R, 0.25, 0.3);
    p.stamp(cone, 0, 0);
    p.ellipseWith(CX, b + 0.5, 11, 1.8, (_nx, ny) => (ny < 0 ? R.hi : R.lo));
    for (let x = 0; x < FW; x++) {
      if (cone.filled(x, b - 1)) p.set(x, b - 1, band.base);
      if (cone.filled(x, b - 2)) p.set(x, b - 2, band.lo);
    }
  } else if (style === "wide") {
    const crown = new Pix(FW, FH);
    trap(crown, b - 5, b, CX - 4, CX + 5, CX - 5, CX + 6, R.base);
    crown.clear(CX - 4, b - 5);
    crown.clear(CX + 5, b - 5);
    rowShade(crown, R, 0.25, 0.3);
    p.stamp(crown, 0, 0);
    p.ellipseWith(CX, b + 0.5, 13, 2, (_nx, ny) => (ny < 0 ? R.hi : R.lo));
    p.hline(CX - 5, CX + 6, b - 1, band.base);
    if (look.hatFlower) {
      p.set(CX - 5, b - 2, ramp(look.hatFlower).hi);
      p.set(CX - 4, b - 2, ramp(look.hatFlower).base);
    }
  } else if (style === "circlet") {
    p.hline(9, 18, m.eyeY - 3, band.base);
    p.glow(10, m.eyeY - 3, band.hi);
  }
}
