import type { Look } from "../looks";
import { blend, hex, Pix, ramp } from "../pixel";
import { FH, FW } from "./humanoid";
import type { Pose } from "./humanoid";

/**
 * Things that are not people: the Choosing Lamp, Pip the owl, tomb bats and
 * spiders. Each gets its own silhouette and its own idea of what "walking"
 * means - the lamp drifts, the owl flaps, the spider skitters - but they all
 * fill the same 32x48 frame with their footing on row 46, so Actor can treat
 * them like anybody else.
 */

const CX = 16;
const INK = 0x160e1e;

export function paintCreature(look: Look, pose: Pose, walking: boolean): Pix {
  const p = new Pix(FW, FH);
  switch (look.body) {
    case "lamp":
      paintLamp(p, look, pose);
      break;
    case "owl":
      paintOwl(p, look, pose, walking);
      break;
    case "bat":
      paintBat(p, look, pose);
      break;
    case "spider":
      paintSpider(p, look, pose, walking);
      break;
    default:
      break;
  }
  return p;
}

// --- the Choosing Lamp ---------------------------------------------------------

/**
 * An ornate hanging lantern that holds itself up: brass cap and finial, a
 * hexagonal cage of amber glass, and inside it a flame with a face. The flame
 * is the character - it flickers every frame and, when it looks at you, it
 * has eyes.
 */
function paintLamp(p: Pix, look: Look, pose: Pose): void {
  const brass = ramp(look.robe);
  const glass = ramp("#f0a040");
  const top = 14 + Math.round(pose.hover);
  const cageTop = top + 7;
  const cageBot = cageTop + 12;

  // Hanging ring and finial.
  p.ellipseWith(CX, top, 2.5, 2.5, (nx, ny) => (nx * nx + ny * ny > 0.3 ? (nx < 0 ? brass.hi : brass.lo) : null));
  p.vline(CX - 1, top + 2, top + 3, brass.base);
  p.vline(CX, top + 2, top + 3, brass.lo);

  // Cap: a stepped dome with a lip.
  const cap = new Pix(FW, FH);
  cap.poly(
    [
      [CX - 3, top + 3],
      [CX + 3, top + 3],
      [CX + 7, cageTop - 1],
      [CX - 7, cageTop - 1],
    ],
    brass.base,
  );
  shadeRows(cap, brass);
  p.stamp(cap, 0, 0);
  p.hline(CX - 8, CX + 7, cageTop - 1, brass.hi);
  p.hline(CX - 8, CX + 7, cageTop, brass.lo);

  // Glass panes: lit from inside, brightest at the centre.
  for (let y = cageTop + 1; y <= cageBot - 1; y++) {
    for (let x = CX - 6; x <= CX + 5; x++) {
      const d = Math.abs(x + 0.5 - CX) / 6 + Math.abs(y - (cageTop + cageBot) / 2) / 12;
      p.set(x, y, d < 0.45 ? glass.hi : d < 0.8 ? glass.base : glass.lo);
    }
  }

  // The flame: a teardrop that leans and stretches frame to frame.
  const lean = Math.round(Math.sin(pose.t * Math.PI * 2) * 1.2);
  const stretch = Math.round(Math.cos(pose.t * Math.PI * 4) * 1);
  const fy = cageBot - 2;
  const flame = new Pix(FW, FH);
  flame.ellipse(CX, fy - 2.5, 3.6, 3.2, 0xff8a2a);
  flame.poly(
    [
      [CX - 3, fy - 3],
      [CX + 3, fy - 3],
      [CX + 0.5 + lean, fy - 9 - stretch],
    ],
    0xff8a2a,
  );
  flame.ellipse(CX, fy - 2.5, 2.4, 2.2, 0xffc94a);
  flame.poly(
    [
      [CX - 2, fy - 3],
      [CX + 2, fy - 3],
      [CX + 0.5 + lean, fy - 7 - stretch],
    ],
    0xffc94a,
  );
  flame.ellipse(CX, fy - 2, 1.4, 1.4, 0xfff4c8);
  for (let y = 0; y < FH; y++) for (let x = 0; x < FW; x++) if (flame.filled(x, y)) p.glow(x, y, flame.get(x, y));

  // A face in the fire, when it is looking your way.
  if (pose.facing !== "up") {
    const ox = pose.facing === "left" ? -1 : 0;
    const ey = fy - 4;
    if (pose.blink) {
      p.glow(CX - 2 + ox, ey + 1, 0x8a3a10);
      p.glow(CX + 1 + ox, ey + 1, 0x8a3a10);
    } else {
      p.glow(CX - 2 + ox, ey, 0x4a1a08);
      p.glow(CX - 2 + ox, ey + 1, 0x4a1a08);
      p.glow(CX + 1 + ox, ey, 0x4a1a08);
      p.glow(CX + 1 + ox, ey + 1, 0x4a1a08);
    }
    p.glow(CX - 1 + ox, ey + 3, 0xb05018);
    p.glow(CX + ox, ey + 3, 0xb05018);
  }

  // Brass cage bars over the glass.
  for (const bx of [CX - 7, CX - 3, CX + 2, CX + 6]) {
    const edge = bx === CX - 7 || bx === CX + 6;
    p.vline(bx, cageTop + 1, cageBot - 1, edge ? (bx < CX ? brass.hi : brass.lo) : brass.base);
  }
  // Filigree bands.
  p.hline(CX - 7, CX + 6, cageTop + 4, brass.lo);
  for (let x = CX - 6; x <= CX + 5; x += 2) p.set(x, cageTop + 4, brass.hi);

  // Base plate tapering to a drop finial.
  p.hline(CX - 8, CX + 7, cageBot, brass.hi);
  p.hline(CX - 7, CX + 6, cageBot + 1, brass.base);
  p.hline(CX - 5, CX + 4, cageBot + 2, brass.lo);
  p.hline(CX - 2, CX + 1, cageBot + 3, brass.base);
  p.shadedEllipse(CX, cageBot + 5, 1.6, 1.8, brass);

  p.outline(INK, 0.6);

  // Motes of light rising off the cap.
  const mote = (k: number): void => {
    const phase = (pose.t + k * 0.37) % 1;
    const mx = CX - 5 + ((k * 7) % 11);
    const my = top + 2 - Math.round(phase * 10);
    if (my > 0) p.glow(mx, my, 0xffe8a0, Math.round(200 * (1 - phase)));
  };
  mote(0);
  mote(1);
  mote(2);
}

function shadeRows(layer: Pix, r: ReturnType<typeof ramp>): void {
  for (let y = 0; y < layer.h; y++) {
    let min = -1;
    let max = -1;
    for (let x = 0; x < layer.w; x++) {
      if (!layer.filled(x, y)) continue;
      if (min < 0) min = x;
      max = x;
    }
    if (min < 0) continue;
    for (let x = min; x <= max; x++) {
      const t = (x - min) / Math.max(1, max - min);
      layer.set(x, y, t < 0.25 ? r.hi : t > 0.7 ? r.lo : r.base);
    }
  }
}

// --- Pip the owl -------------------------------------------------------------------

function paintOwl(p: Pix, look: Look, pose: Pose, walking: boolean): void {
  const body = ramp(look.robe);
  const belly = ramp(look.trim);
  const face = ramp(look.skin);
  const eye = hex(look.eye);
  // Walking means flying: up off the ground with the wings working.
  const flap = walking ? Math.sin(pose.t * Math.PI * 2) : 0;
  const lift = walking ? -9 + Math.round(Math.cos(pose.t * Math.PI * 2) * 1.5) : pose.bob;
  const by = 40 + lift;
  const side = pose.facing === "left";

  // Wings first, so the body sits over their roots.
  const wingY = by - 3;
  const drawWing = (dir: -1 | 1): void => {
    if (walking) {
      const tipY = wingY - Math.round(flap * 6);
      const root = CX + dir * 3;
      const tip = CX + dir * 11;
      p.poly(
        [
          [root, wingY - 2],
          [tip, tipY],
          [tip - dir * 2, tipY + 3],
          [root, wingY + 3],
        ],
        dir < 0 ? body.base : body.lo,
      );
      p.line(root, wingY, tip - dir, tipY + 1, body.lo);
    } else {
      p.ellipseWith(CX + dir * 4.5, wingY + 1, 2.5, 5, (nx) => (nx * dir > 0.3 ? body.lo : body.base));
    }
  };
  if (!side) {
    drawWing(-1);
    drawWing(1);
  } else if (walking) {
    drawWing(1);
  }

  // Body.
  p.shadedEllipse(side ? CX + 1 : CX, by - 3, side ? 4.5 : 5, 5.5, body);
  if (pose.facing !== "up") {
    p.ellipseWith(side ? CX - 1 : CX, by - 2, side ? 2.5 : 3.2, 4, (_nx, ny, x, y) =>
      (x + y) % 3 === 0 && ny > -0.5 ? belly.lo : belly.base,
    );
  } else {
    // Feather scallops down the back.
    for (let y = by - 6; y <= by; y += 2) p.hline(CX - 2, CX + 1, y, body.lo);
  }

  // Head: a broad disc with tufts.
  const hy = by - 10;
  p.shadedEllipse(side ? CX : CX, hy, side ? 4.5 : 5.5, 4.5, body);
  p.set(side ? CX + 2 : CX - 4, hy - 4, body.base);
  p.set(side ? CX + 3 : CX + 3, hy - 4, body.lo);
  if (!side) {
    p.set(CX - 5, hy - 4, body.base);
    p.set(CX + 4, hy - 4, body.lo);
  }

  if (pose.facing === "down") {
    // Facial disc, two great eyes, a hooked beak.
    p.ellipse(CX - 2, hy + 0.5, 2.2, 2.2, face.base);
    p.ellipse(CX + 2, hy + 0.5, 2.2, 2.2, face.lo);
    for (const ex of [CX - 3, CX + 1]) {
      if (pose.blink) {
        p.hline(ex, ex + 1, hy, body.lo);
      } else {
        p.set(ex, hy, eye);
        p.set(ex + 1, hy, 0x1a1208);
        p.set(ex, hy - 1, 0xfff6c0);
        p.set(ex + 1, hy - 1, eye);
      }
    }
    p.set(CX - 1, hy + 2, 0xd9a441);
    p.set(CX, hy + 2, 0xa87a2a);
  } else if (side) {
    p.ellipse(CX - 2, hy + 0.5, 2, 2.2, face.base);
    if (!pose.blink) {
      p.set(CX - 3, hy, eye);
      p.set(CX - 3, hy - 1, 0xfff6c0);
      p.set(CX - 2, hy, 0x1a1208);
    } else {
      p.hline(CX - 3, CX - 2, hy, body.lo);
    }
    p.set(CX - 5, hy + 1, 0xd9a441);
    p.set(CX - 5, hy + 2, 0xa87a2a);
    // Tail.
    p.poly(
      [
        [CX + 4, by - 1],
        [CX + 8, by + 1],
        [CX + 4, by + 2],
      ],
      body.lo,
    );
  }

  // Talons when perched.
  if (!walking) {
    const t = ramp(look.boots);
    p.hline(CX - 3, CX - 1, by + 3, t.base);
    p.hline(CX, CX + 2, by + 3, t.lo);
  }
  p.outline(INK, 0.6);
}

// --- tomb bat ------------------------------------------------------------------

function paintBat(p: Pix, look: Look, pose: Pose): void {
  const skin = ramp(look.skin);
  const wing = ramp(look.robe);
  const flap = Math.sin(pose.t * Math.PI * 2);
  const by = 30 + Math.round(-Math.cos(pose.t * Math.PI * 2) * 2) + Math.round(pose.hover);
  const tipY = by - Math.round(flap * 8);
  const side = pose.facing === "left";

  for (const dir of [-1, 1] as const) {
    if (side && dir < 0 && Math.abs(flap) < 0.5) continue;
    const span = side ? 9 : 13;
    const tip = CX + dir * span;
    const elbow = CX + dir * Math.round(span * 0.55);
    const elbowY = Math.round((by + tipY) / 2) - 2;
    const pts: Array<[number, number]> = [
      [CX + dir * 1.5, by - 2],
      [elbow, elbowY],
      [tip, tipY],
      [tip - dir * 1, tipY + 4],
      [elbow + dir * 1, elbowY + 5],
      [elbow - dir * 2, by + 3],
      [CX + dir * 1.5, by + 2],
    ];
    p.poly(pts, dir < 0 ? wing.base : wing.lo);
    // Finger bones through the membrane.
    p.line(CX + dir * 2, by - 1, elbow, elbowY, skin.lo);
    p.line(elbow, elbowY, tip, tipY, skin.lo);
    p.line(elbow, elbowY, tip - dir * 1, tipY + 4, skin.lo);
    p.line(elbow, elbowY, elbow + dir * 1, elbowY + 5, skin.lo);
  }

  p.shadedEllipse(CX, by, 2.6, 3.4, skin);
  p.shadedEllipse(CX, by - 4, 2.4, 2.2, skin);
  // Ears.
  p.set(CX - 2, by - 7, skin.base);
  p.set(CX - 2, by - 6, skin.base);
  p.set(CX + 1, by - 7, skin.lo);
  p.set(CX + 1, by - 6, skin.lo);
  if (pose.facing !== "up") {
    const g = hex(look.glowEyes ?? look.eye);
    const ox = side ? -1 : 0;
    p.glow(CX - 2 + ox, by - 4, g);
    if (!side) p.glow(CX + 1, by - 4, g);
    p.set(CX - 1 + ox, by - 2, 0xf0e8e0);
  }
  p.outline(INK, 0.6);
}

// --- tomb spider -----------------------------------------------------------------

function paintSpider(p: Pix, look: Look, pose: Pose, walking: boolean): void {
  const body = ramp(look.robe);
  const leg = ramp(look.skin);
  const mark = ramp(look.trim);
  const g = hex(look.glowEyes ?? look.eye);
  const ground = 45;
  const bob = walking && Math.abs(pose.stride) < 0.6 ? -1 : 0;
  const by = 37 + bob + pose.bob;

  if (pose.facing === "left") {
    // Profile: head left, abdomen right, legs as arches below.
    for (let i = 0; i < 4; i++) {
      const phase = walking ? Math.sin(pose.t * Math.PI * 2 + i * 1.6) : 0;
      const kx = CX - 6 + i * 4 + Math.round(phase * 1.5);
      const knee: [number, number] = [kx, by - 6 - (i % 2)];
      const foot: [number, number] = [kx - 3 + Math.round(phase * 2), ground - (phase > 0.4 ? 1 : 0)];
      p.line(CX - 2 + i * 2, by - 1, knee[0], knee[1], leg.lo);
      p.line(knee[0], knee[1], foot[0], foot[1], leg.base);
    }
    p.shadedEllipse(CX + 5, by - 3, 6, 5, body);
    p.shadedEllipse(CX - 4, by - 1, 3.6, 3, body);
    p.hline(CX + 3, CX + 7, by - 5, mark.base);
    p.vline(CX + 5, by - 6, by - 3, mark.lo);
    p.glow(CX - 7, by - 2, g);
    p.glow(CX - 6, by - 3, g);
    p.set(CX - 8, by, leg.hi);
    p.outline(INK, 0.6);
    return;
  }

  const up = pose.facing === "up";
  const headY = up ? by - 6 : by + 1;
  const abdY = up ? by + 1 : by - 5;

  // Eight legs, four a side, each with a knee that lifts as it steps.
  for (const dir of [-1, 1] as const) {
    for (let i = 0; i < 4; i++) {
      const phase = walking ? Math.sin(pose.t * Math.PI * 2 + i * 1.6 + (dir > 0 ? Math.PI : 0)) : 0;
      const rootY = by - 3 + i * 1.5;
      const spread = 6 + i * 1.6;
      const knee: [number, number] = [CX + dir * (spread + 1), rootY - 6 + Math.round(phase * 1.5) + (i > 1 ? 2 : 0)];
      const foot: [number, number] = [CX + dir * (spread + 5 - (i === 3 ? 1 : 0)), Math.min(ground, rootY + 6 + i * 1.5 - Math.round(Math.max(0, phase) * 2))];
      p.line(CX + dir * 2, rootY, knee[0], knee[1], dir < 0 ? leg.base : leg.lo);
      p.line(knee[0], knee[1], foot[0], foot[1], dir < 0 ? leg.base : leg.lo);
      p.set(knee[0], knee[1], leg.hi);
    }
  }

  // Abdomen with a warning mark, then the head with its cluster of eyes.
  p.shadedEllipse(CX, abdY, 6.5, 5.5, body);
  p.set(CX - 1, abdY - 2, mark.hi);
  p.set(CX, abdY - 2, mark.base);
  p.hline(CX - 2, CX + 1, abdY - 1, mark.base);
  p.set(CX - 1, abdY, mark.lo);
  p.set(CX, abdY, mark.lo);
  p.hline(CX - 2, CX + 1, abdY + 1, mark.lo);
  p.shadedEllipse(CX, headY, 4, 3.2, body);
  if (!up) {
    p.glow(CX - 2, headY, g);
    p.glow(CX + 1, headY, g);
    p.glow(CX - 1, headY - 1, blend(g, 0xffffff, 0.3));
    p.glow(CX, headY - 1, blend(g, 0xffffff, 0.3));
    // Fangs.
    p.set(CX - 1, headY + 3, 0xe8e0d0);
    p.set(CX, headY + 3, 0xe8e0d0);
  }
  p.outline(INK, 0.6);
}
