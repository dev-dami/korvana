import Phaser from "phaser";

import type { DuelArena } from "../data/encounters";
import { HOUSE_COLOURS } from "../gfx/looks";
import type { DuelCamera, Projection } from "./DuelCamera";
import { makeProjection } from "./DuelCamera";
import { ARENA_RADIUS } from "./DuelSim";

/**
 * Where a duel is fought, drawn in perspective.
 *
 *  - a painted panorama, wrapped round the arena, that scrolls with the
 *    camera's yaw so turning the camera turns the world;
 *  - a flagstone floor projected tile by tile every frame, fogging into the
 *    distance, with a rune ring at the duelling line;
 *  - billboards (pillars, trees, braziers) standing in a ring beyond the
 *    floor's edge, scaled and sorted by depth so they slide past at the right
 *    speed - the parallax that makes flat pixels read as a place;
 *  - motes of dust, ash or embers hanging in the volume.
 *
 * Six themes share all of this; a theme is only colours and a list of props.
 */

interface Billboard {
  tex: string;
  /** Fallback when `tex` is missing (world art not built). */
  fallback: string;
  count: number;
  radius: number;
  /** World units per texel. */
  scale: number;
  tint?: number;
  glow?: number;
  /** Height of the glow above the base, in texels. */
  glowAt?: number;
  jitter?: number;
}

interface Theme {
  floorA: number;
  floorB: number;
  grout: number;
  fog: number;
  checker: boolean;
  ring: number;
  /** Multiplied into the duellists so they sit in the light of the place. */
  ambient: number;
  mote: { color: number; rise: number; count: number; add: boolean };
  billboards: Billboard[];
  paint: (ctx: CanvasRenderingContext2D, w: number, h: number, r: () => number) => void;
}

const PANO_W = 1024;
const PANO_H = 360;
const TILE = 96;
const FLOOR_RADIUS = 1150;

const THEMES: Record<DuelArena, Theme> = {
  hall: {
    floorA: 0xcfc6b4,
    floorB: 0x3a3440,
    grout: 0x1a171e,
    fog: 0x1c1a24,
    checker: true,
    ring: 0x8fb4ff,
    ambient: 0xf4e6d4,
    mote: { color: 0xffc88a, rise: 14, count: 36, add: true },
    billboards: [
      { tex: "duel_pillar", fallback: "duel_pillar", count: 10, radius: 840, scale: 3.4 },
      { tex: "duel_brazier", fallback: "duel_brazier", count: 4, radius: 700, scale: 3.2, glow: 0xffa040, glowAt: 26 },
    ],
    paint: paintHall,
  },
  courtyard: {
    floorA: 0x9c968a,
    floorB: 0x878175,
    grout: 0x4e4a42,
    fog: 0xa8b8c4,
    checker: false,
    ring: 0xf0d080,
    ambient: 0xffffff,
    mote: { color: 0xfff2c0, rise: 8, count: 26, add: false },
    billboards: [
      { tex: "prop_oak", fallback: "duel_pillar", count: 5, radius: 980, scale: 3.4, jitter: 0.5 },
      { tex: "prop_maple", fallback: "duel_pillar", count: 3, radius: 1040, scale: 3.4, jitter: 0.5 },
      { tex: "prop_ruin_pillar", fallback: "duel_pillar", count: 6, radius: 820, scale: 3.4 },
      { tex: "duel_brazier", fallback: "duel_brazier", count: 2, radius: 720, scale: 3.2, glow: 0xffb060, glowAt: 26 },
    ],
    paint: paintCourtyard,
  },
  crypt: {
    floorA: 0x34303a,
    floorB: 0x2a2730,
    grout: 0x0c0b0f,
    fog: 0x07070a,
    checker: false,
    ring: 0x9fd0ff,
    ambient: 0xb4aac8,
    mote: { color: 0xc8c0d8, rise: 4, count: 40, add: false },
    billboards: [
      { tex: "duel_pillar", fallback: "duel_pillar", count: 8, radius: 800, scale: 3.4, tint: 0x8a8296 },
      { tex: "st_torch", fallback: "duel_brazier", count: 6, radius: 760, scale: 3.6, glow: 0xff9a40, glowAt: 30 },
      { tex: "prop_ruin_pillar", fallback: "duel_pillar", count: 4, radius: 980, scale: 3.4, tint: 0x6a6476 },
    ],
    paint: paintCrypt,
  },
  scar: {
    floorA: 0x8f887c,
    floorB: 0x7a7468,
    grout: 0x4a453e,
    fog: 0xa8a298,
    checker: false,
    ring: 0xd0c8b8,
    ambient: 0xe0d8cc,
    mote: { color: 0xd8d0c4, rise: -10, count: 60, add: false },
    billboards: [
      { tex: "prop_deadtree", fallback: "duel_pillar", count: 8, radius: 960, scale: 3.4, jitter: 0.6 },
      { tex: "prop_rock_ash", fallback: "duel_pillar", count: 7, radius: 860, scale: 3.2, jitter: 0.6 },
      { tex: "prop_standing_stone", fallback: "duel_pillar", count: 3, radius: 780, scale: 3.4 },
    ],
    paint: paintScar,
  },
  well: {
    floorA: 0x23302c,
    floorB: 0x1a2522,
    grout: 0x070c0b,
    fog: 0x050a09,
    checker: false,
    ring: 0x6fe0a8,
    ambient: 0xb8e0cc,
    mote: { color: 0x8ff0c0, rise: 22, count: 50, add: true },
    billboards: [
      { tex: "prop_standing_stone", fallback: "duel_pillar", count: 9, radius: 820, scale: 3.4, tint: 0x6a9a88, glow: 0x5fe0a0, glowAt: 30 },
      { tex: "prop_rock", fallback: "duel_pillar", count: 6, radius: 1000, scale: 3.2, tint: 0x4a6a60, jitter: 0.5 },
    ],
    paint: paintWell,
  },
  forest: {
    floorA: 0x4d6a34,
    floorB: 0x44602e,
    grout: 0x2a3a1e,
    fog: 0x6a5a7a,
    checker: false,
    ring: 0xf0c878,
    ambient: 0xf6dcc4,
    mote: { color: 0xe8ff9a, rise: 6, count: 34, add: true },
    billboards: [
      { tex: "prop_pine", fallback: "duel_pillar", count: 10, radius: 980, scale: 3.4, jitter: 0.5 },
      { tex: "prop_oak", fallback: "duel_pillar", count: 4, radius: 1060, scale: 3.4, jitter: 0.5 },
      { tex: "prop_fern_big", fallback: "duel_brazier", count: 6, radius: 760, scale: 3.2, jitter: 0.4 },
      { tex: "prop_stump", fallback: "duel_brazier", count: 2, radius: 720, scale: 3.2 },
    ],
    paint: paintForest,
  },
};

interface Placed {
  x: number;
  z: number;
  img: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Image | null;
  glowAt: number;
  scale: number;
  texH: number;
  phase: number;
}

interface Mote {
  x: number;
  y: number;
  z: number;
  img: Phaser.GameObjects.Image;
  drift: number;
}

export class DuelArenaView {
  readonly theme: Theme;
  readonly id: DuelArena;
  private readonly pano: Phaser.GameObjects.TileSprite;
  private readonly floor: Phaser.GameObjects.Graphics;
  private readonly ringG: Phaser.GameObjects.Graphics;
  private readonly placed: Placed[] = [];
  private readonly motes: Mote[] = [];
  private readonly p: Projection = makeProjection();
  private readonly q: Projection = makeProjection();
  private readonly pts: Phaser.Math.Vector2[] = [0, 1, 2, 3].map(() => new Phaser.Math.Vector2());
  private readonly ringPts: Phaser.Math.Vector2[] = [];
  private readonly panoScale: number;
  private w: number;
  private h: number;
  private time = 0;
  /** Flares brighter for a moment on a parry or a lock. */
  ringFlash = 0;
  ringColor: number;

  constructor(scene: Phaser.Scene, id: DuelArena, w: number, h: number, horizonY: number) {
    this.id = id;
    this.theme = THEMES[id];
    this.ringColor = this.theme.ring;
    this.w = w;
    this.h = h;
    bakeProps(scene);

    const key = bakePanorama(scene, id, this.theme);
    const panoH = horizonY + 140 * (h / 720);
    this.panoScale = panoH / PANO_H;
    this.pano = scene.add
      .tileSprite(0, 0, w / this.panoScale + 2, PANO_H, key)
      .setOrigin(0, 0)
      .setScale(this.panoScale)
      .setDepth(-100000);

    this.floor = scene.add.graphics().setDepth(-90000);
    this.ringG = scene.add.graphics().setDepth(-89000).setBlendMode(Phaser.BlendModes.ADD);
    for (let i = 0; i < 72; i++) this.ringPts.push(new Phaser.Math.Vector2());

    const r = seeded(id.length * 977 + 13);
    for (const b of this.theme.billboards) {
      const tex = scene.textures.exists(b.tex) ? b.tex : b.fallback;
      const src = scene.textures.get(tex).getSourceImage() as { height: number };
      for (let i = 0; i < b.count; i++) {
        const a = ((i + r() * (b.jitter ?? 0.15)) / b.count) * Math.PI * 2 + b.radius * 0.001;
        const rad = b.radius * (1 + (r() - 0.5) * (b.jitter ?? 0) * 0.3);
        const img = scene.add.image(0, 0, tex).setOrigin(0.5, 1);
        if (b.tint) img.setTint(b.tint);
        const glow = b.glow
          ? scene.add.image(0, 0, "fx_glow").setBlendMode(Phaser.BlendModes.ADD).setTint(b.glow).setAlpha(0.8)
          : null;
        this.placed.push({
          x: Math.cos(a) * rad,
          z: Math.sin(a) * rad,
          img,
          glow,
          glowAt: b.glowAt ?? 0,
          scale: b.scale,
          texH: src.height || 64,
          phase: r() * 10,
        });
      }
    }

    const m = this.theme.mote;
    for (let i = 0; i < m.count; i++) {
      const a = r() * Math.PI * 2;
      const rad = Math.sqrt(r()) * 900;
      const img = scene.add.image(0, 0, "fx_dot").setTint(m.color);
      if (m.add) img.setBlendMode(Phaser.BlendModes.ADD);
      this.motes.push({ x: Math.cos(a) * rad, y: 20 + r() * 380, z: Math.sin(a) * rad, img, drift: r() * 10 });
    }
  }

  update(cam: DuelCamera, dt: number): void {
    this.time += dt;
    this.ringFlash = Math.max(0, this.ringFlash - dt * 1.8);
    this.pano.tilePositionX = cam.panoramaOffset(PANO_W);
    this.pano.y = cam.shakeY;
    this.drawFloor(cam);
    this.drawRing(cam);
    this.drawBillboards(cam);
    this.drawMotes(cam, dt);
  }

  private drawFloor(cam: DuelCamera): void {
    const g = this.floor;
    const t = this.theme;
    g.clear();

    // Grout first, as one disc, so the tiles' gaps read as mortar.
    const disc = this.ringPolygon(cam, FLOOR_RADIUS, 48);
    if (disc.length > 2) {
      g.fillStyle(t.grout, 1);
      g.fillPoints(disc, true);
    }

    const n = Math.ceil(FLOOR_RADIUS / TILE);
    const inset = 0.045;
    for (let j = -n; j < n; j++) {
      for (let i = -n; i < n; i++) {
        const cx = (i + 0.5) * TILE;
        const cz = (j + 0.5) * TILE;
        const r = Math.hypot(cx, cz);
        if (r > FLOOR_RADIUS - TILE * 0.5) continue;
        const x0 = (i + inset) * TILE;
        const x1 = (i + 1 - inset) * TILE;
        const z0 = (j + inset) * TILE;
        const z1 = (j + 1 - inset) * TILE;
        const corners: Array<[number, number]> = [
          [x0, z0],
          [x1, z0],
          [x1, z1],
          [x0, z1],
        ];
        let ok = true;
        let depth = 0;
        for (let k = 0; k < 4; k++) {
          const c = corners[k]!;
          cam.project(c[0], 0, c[1], this.p);
          if (!this.p.visible) {
            ok = false;
            break;
          }
          this.pts[k]!.set(this.p.x, this.p.y);
          depth += this.p.depth;
        }
        if (!ok) continue;
        depth /= 4;

        const h = hash(i, j);
        const base = t.checker ? ((i + j) & 1 ? t.floorA : t.floorB) : h > 0.5 ? t.floorA : t.floorB;
        let color = shade(base, (h - 0.5) * 0.16);
        // Pooled light at the centre, fog at the rim.
        color = shade(color, Math.max(0, 1 - r / 700) * 0.12);
        const fog = Math.min(0.85, Math.max(0, (depth - 700) / 2400) + Math.max(0, (r - 750) / 500) * 0.5);
        color = mixColor(color, t.fog, fog);
        g.fillStyle(color, 1);
        g.fillPoints(this.pts, true);
      }
    }
  }

  private drawRing(cam: DuelCamera): void {
    const g = this.ringG;
    g.clear();
    const flash = this.ringFlash;
    const pulse = 0.55 + Math.sin(this.time * 2.2) * 0.15 + flash * 0.5;
    for (const [radius, width, alpha] of [
      [ARENA_RADIUS + 30, 7, 0.18],
      [ARENA_RADIUS + 30, 2.2, 0.85],
      [ARENA_RADIUS - 6, 1.4, 0.5],
    ] as const) {
      const ring = this.ringPolygon(cam, radius, this.ringPts.length);
      if (ring.length < 3) continue;
      g.lineStyle(width, this.ringColor, alpha * pulse);
      g.strokePoints(ring, true);
    }
    // Twelve rune ticks between the two circles.
    g.lineStyle(2, this.ringColor, 0.65 * pulse);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + this.time * 0.05;
      cam.project(Math.cos(a) * (ARENA_RADIUS - 6), 0, Math.sin(a) * (ARENA_RADIUS - 6), this.p);
      cam.project(Math.cos(a) * (ARENA_RADIUS + 30), 0, Math.sin(a) * (ARENA_RADIUS + 30), this.q);
      if (this.p.visible && this.q.visible) g.lineBetween(this.p.x, this.p.y, this.q.x, this.q.y);
    }
  }

  private ringPolygon(cam: DuelCamera, radius: number, count: number): Phaser.Math.Vector2[] {
    const out: Phaser.Math.Vector2[] = [];
    const pool = count === this.ringPts.length ? this.ringPts : null;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      cam.project(Math.cos(a) * radius, 0, Math.sin(a) * radius, this.p);
      if (!this.p.visible) continue;
      const v = pool ? pool[i]! : new Phaser.Math.Vector2();
      v.set(this.p.x, this.p.y);
      out.push(v);
    }
    return out;
  }

  private drawBillboards(cam: DuelCamera): void {
    for (const b of this.placed) {
      cam.project(b.x, 0, b.z, this.p);
      if (!this.p.visible || this.p.x < -400 || this.p.x > this.w + 400) {
        b.img.setVisible(false);
        b.glow?.setVisible(false);
        continue;
      }
      const s = this.p.s * b.scale;
      const fog = Math.min(0.75, Math.max(0, (this.p.depth - 900) / 2600));
      b.img
        .setVisible(true)
        .setPosition(this.p.x, this.p.y)
        .setScale(s)
        .setDepth(-this.p.depth)
        .setAlpha(1 - fog * 0.5);
      if (b.glow) {
        const flicker = 0.85 + Math.sin(this.time * 9 + b.phase) * 0.08 + Math.sin(this.time * 23 + b.phase) * 0.05;
        b.glow
          .setVisible(true)
          .setPosition(this.p.x, this.p.y - b.glowAt * s)
          .setScale(this.p.s * 1.6 * flicker)
          .setDepth(-this.p.depth + 1);
      }
    }
  }

  private drawMotes(cam: DuelCamera, dt: number): void {
    const m = this.theme.mote;
    for (const mote of this.motes) {
      mote.y += m.rise * dt;
      mote.x += Math.sin(this.time * 0.6 + mote.drift) * 8 * dt;
      if (mote.y > 420) mote.y = 10;
      if (mote.y < 0) mote.y = 410;
      cam.project(mote.x, mote.y, mote.z, this.p);
      if (!this.p.visible) {
        mote.img.setVisible(false);
        continue;
      }
      mote.img
        .setVisible(true)
        .setPosition(this.p.x, this.p.y)
        .setScale(Math.max(0.35, this.p.s * 1.4))
        .setDepth(-this.p.depth + 2)
        .setAlpha(0.35 + 0.4 * Math.abs(Math.sin(this.time + mote.drift)));
    }
  }

  resize(w: number, h: number): void {
    this.w = w;
    this.h = h;
  }

  get height(): number {
    return this.h;
  }
}

// --- baked art -------------------------------------------------------------------

function canvasKey(scene: Phaser.Scene, key: string, w: number, h: number, paint: (ctx: CanvasRenderingContext2D) => void): string {
  if (scene.textures.exists(key)) return key;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  paint(ctx);
  scene.textures.addCanvas(key, c);
  return key;
}

/** A stone column and a brazier, in the same pixel scale as the world props. */
function bakeProps(scene: Phaser.Scene): void {
  canvasKey(scene, "duel_pillar", 24, 112, (ctx) => {
    const r = seeded(5);
    ctx.fillStyle = "#4c4652";
    ctx.fillRect(0, 100, 24, 12);
    ctx.fillRect(1, 0, 22, 8);
    ctx.fillStyle = "#6d6674";
    ctx.fillRect(3, 8, 18, 92);
    ctx.fillStyle = "#8a8392";
    ctx.fillRect(5, 8, 4, 92);
    ctx.fillStyle = "#3e3944";
    ctx.fillRect(17, 8, 4, 92);
    ctx.fillStyle = "#a39cab";
    ctx.fillRect(1, 0, 22, 2);
    ctx.fillRect(0, 100, 24, 2);
    for (let i = 0; i < 16; i++) {
      ctx.fillStyle = r() > 0.5 ? "#5a5460" : "#7a7382";
      ctx.fillRect(4 + Math.floor(r() * 16), 10 + Math.floor(r() * 88), 1, 2);
    }
  });
  canvasKey(scene, "duel_brazier", 20, 30, (ctx) => {
    ctx.fillStyle = "#2b2420";
    ctx.fillRect(8, 12, 4, 18);
    ctx.fillRect(4, 27, 12, 3);
    ctx.fillStyle = "#6e5222";
    ctx.fillRect(2, 8, 16, 5);
    ctx.fillStyle = "#c9a24e";
    ctx.fillRect(2, 8, 16, 1);
    ctx.fillStyle = "#ff7a2a";
    ctx.fillRect(5, 3, 10, 5);
    ctx.fillStyle = "#ffd070";
    ctx.fillRect(7, 1, 6, 5);
    ctx.fillStyle = "#fff4c0";
    ctx.fillRect(9, 2, 2, 3);
  });
}

function bakePanorama(scene: Phaser.Scene, id: DuelArena, theme: Theme): string {
  return canvasKey(scene, `duel_pano_${id}`, PANO_W, PANO_H, (ctx) => {
    theme.paint(ctx, PANO_W, PANO_H, seeded(id.charCodeAt(0) * 131 + id.length));
  });
}

function gradient(ctx: CanvasRenderingContext2D, h: number, stops: Array<[number, string]>): void {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  for (const [at, c] of stops) g.addColorStop(at, c);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, PANO_W, h);
}

/** Draws `fn` at x and again one panorama-width over, so the strip tiles seamlessly. */
function wrap(w: number, x: number, fn: (x: number) => void): void {
  fn(x);
  if (x < 64) fn(x + w);
  if (x > w - 64) fn(x - w);
}

function paintHall(ctx: CanvasRenderingContext2D, w: number, h: number, r: () => number): void {
  gradient(ctx, h, [
    [0, "#0d0c12"],
    [0.5, "#1e1b26"],
    [1, "#2a2630"],
  ]);
  const houses = Object.values(HOUSE_COLOURS);
  const bay = 128;
  for (let i = 0; i < w / bay; i++) {
    const x = i * bay;
    // Arch and window.
    ctx.fillStyle = "#15131b";
    ctx.fillRect(x + 30, 70, 68, 220);
    ctx.beginPath();
    ctx.arc(x + 64, 70, 34, Math.PI, 0);
    ctx.fill();
    const glass = ctx.createLinearGradient(0, 60, 0, 280);
    glass.addColorStop(0, "#7fa0d8");
    glass.addColorStop(1, "#2a3a5e");
    ctx.fillStyle = glass;
    ctx.fillRect(x + 42, 84, 44, 180);
    ctx.beginPath();
    ctx.arc(x + 64, 84, 22, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = "#15131b";
    ctx.fillRect(x + 63, 62, 2, 202);
    for (let k = 0; k < 6; k++) ctx.fillRect(x + 42, 100 + k * 28, 44, 2);
    // Moonlight pooled on the sill.
    ctx.fillStyle = "rgba(160,190,240,0.18)";
    ctx.fillRect(x + 36, 262, 56, 10);
    // Column between bays.
    ctx.fillStyle = "#3a3542";
    ctx.fillRect(x - 8, 0, 16, h);
    ctx.fillStyle = "#4a4452";
    ctx.fillRect(x - 8, 0, 4, h);
    // A House banner on every other column.
    if (i % 2 === 0) {
      const house = houses[(i / 2) % houses.length]!;
      ctx.fillStyle = house.primary;
      ctx.fillRect(x - 14, 40, 28, 120);
      ctx.beginPath();
      ctx.moveTo(x - 14, 160);
      ctx.lineTo(x, 176);
      ctx.lineTo(x + 14, 160);
      ctx.fill();
      ctx.fillStyle = house.secondary;
      ctx.fillRect(x - 14, 40, 28, 4);
      ctx.fillRect(x - 5, 80, 10, 10);
    }
  }
  // Floor line where the wall meets the hall floor.
  ctx.fillStyle = "#121016";
  ctx.fillRect(0, h - 70, w, 70);
  ctx.fillStyle = "#1c1a24";
  ctx.fillRect(0, h - 70, w, 3);
  void r;
}

function paintCourtyard(ctx: CanvasRenderingContext2D, w: number, h: number, r: () => number): void {
  gradient(ctx, h, [
    [0, "#5f97d0"],
    [0.55, "#bcd6ea"],
    [1, "#dce8ee"],
  ]);
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  for (let i = 0; i < 9; i++) {
    const cx = r() * w;
    const cy = 30 + r() * 70;
    for (let k = 0; k < 5; k++) wrap(w, cx + k * 14, (x) => ctx.fillRect(x, cy - (k % 2) * 6, 26, 10));
  }
  // The Academy's long facade, towers at intervals.
  const wallTop = 170;
  ctx.fillStyle = "#8c8678";
  ctx.fillRect(0, wallTop, w, h - wallTop);
  for (let x = 0; x < w; x += 16) {
    ctx.fillRect(x, wallTop - 8, 9, 8);
  }
  for (let i = 0; i < 4; i++) {
    const tx = i * (w / 4) + 60;
    ctx.fillStyle = "#7d776a";
    ctx.fillRect(tx, 70, 56, wallTop - 70 + 10);
    ctx.fillStyle = "#4e5a74";
    ctx.beginPath();
    ctx.moveTo(tx - 6, 72);
    ctx.lineTo(tx + 28, 18);
    ctx.lineTo(tx + 62, 72);
    ctx.fill();
    ctx.fillStyle = "#e8c36a";
    ctx.fillRect(tx + 22, 100, 12, 18);
    ctx.fillRect(tx + 22, 140, 12, 18);
  }
  ctx.fillStyle = "#e8c36a";
  for (let x = 30; x < w; x += 46) ctx.fillRect(x, 200, 10, 16);
  ctx.fillStyle = "#6d675c";
  for (let y = wallTop + 4; y < h - 60; y += 12) ctx.fillRect(0, y, w, 1);
  // Hedges and the lawn along the foot of the wall.
  ctx.fillStyle = "#3f5c2c";
  for (let x = 0; x < w; x += 22) {
    ctx.beginPath();
    ctx.arc(x + 11, h - 70, 16, Math.PI, 0);
    ctx.fill();
  }
  ctx.fillStyle = "#6d8a4a";
  ctx.fillRect(0, h - 70, w, 70);
}

function paintCrypt(ctx: CanvasRenderingContext2D, w: number, h: number, r: () => number): void {
  gradient(ctx, h, [
    [0, "#040406"],
    [0.6, "#0d0c11"],
    [1, "#141219"],
  ]);
  ctx.fillStyle = "#1c1a22";
  for (let y = 40; y < h - 60; y += 22) {
    const off = (y / 22) % 2 ? 0 : 20;
    for (let x = -off; x < w; x += 40) ctx.fillRect(x + 1, y + 1, 38, 20);
  }
  for (let i = 0; i < 10; i++) {
    const x = i * (w / 10) + 20;
    ctx.fillStyle = "#08080b";
    ctx.fillRect(x, 120, 50, 70);
    ctx.beginPath();
    ctx.arc(x + 25, 120, 25, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = "#a8a090";
    ctx.fillRect(x + 18, 160, 14, 12);
    ctx.fillStyle = "#08080b";
    ctx.fillRect(x + 20, 164, 3, 3);
    ctx.fillRect(x + 27, 164, 3, 3);
    if (i % 3 === 0) {
      const glow = ctx.createRadialGradient(x + 25, 90, 2, x + 25, 90, 60);
      glow.addColorStop(0, "rgba(255,150,60,0.45)");
      glow.addColorStop(1, "rgba(255,150,60,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(x - 40, 30, 130, 130);
    }
  }
  ctx.strokeStyle = "#2a2418";
  ctx.lineWidth = 2;
  for (let i = 0; i < 14; i++) {
    ctx.beginPath();
    let x = r() * w;
    ctx.moveTo(x, 0);
    for (let y = 0; y < 120; y += 10) {
      x += (r() - 0.5) * 12;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.fillStyle = "#060608";
  ctx.fillRect(0, h - 70, w, 70);
}

function paintScar(ctx: CanvasRenderingContext2D, w: number, h: number, r: () => number): void {
  gradient(ctx, h, [
    [0, "#8d887f"],
    [0.6, "#bab4a8"],
    [1, "#a39c90"],
  ]);
  // A sun with no warmth in it.
  ctx.fillStyle = "rgba(240,236,226,0.8)";
  ctx.beginPath();
  ctx.arc(w * 0.3, 90, 26, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#6a645c";
  for (let i = 0; i < 7; i++) {
    const x = r() * w;
    const top = 120 + r() * 60;
    wrap(w, x, (sx) => {
      ctx.beginPath();
      ctx.moveTo(sx - 18, h - 60);
      ctx.lineTo(sx - 6, top);
      ctx.lineTo(sx + 2, top + 14);
      ctx.lineTo(sx + 8, top - 10);
      ctx.lineTo(sx + 20, h - 60);
      ctx.fill();
    });
  }
  ctx.fillStyle = "#9a9387";
  for (let x = 0; x < w; x += 4) {
    const y = h - 90 + Math.sin(x * 0.02) * 10 + Math.sin(x * 0.057) * 6;
    ctx.fillRect(x, y, 4, h - y);
  }
}

function paintWell(ctx: CanvasRenderingContext2D, w: number, h: number, r: () => number): void {
  gradient(ctx, h, [
    [0, "#020504"],
    [0.6, "#08140f"],
    [1, "#0d1f19"],
  ]);
  // The well's light, a pale column rising out of the dark.
  for (const cx of [w * 0.25, w * 0.75]) {
    const g = ctx.createLinearGradient(cx - 60, 0, cx + 60, 0);
    g.addColorStop(0, "rgba(120,240,190,0)");
    g.addColorStop(0.5, "rgba(140,250,200,0.32)");
    g.addColorStop(1, "rgba(120,240,190,0)");
    ctx.fillStyle = g;
    ctx.fillRect(cx - 60, 0, 120, h);
  }
  ctx.fillStyle = "#050b09";
  for (let x = 0; x < w; x += 18) {
    const len = 20 + r() * 60;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x + 9, len);
    ctx.lineTo(x + 18, 0);
    ctx.fill();
  }
  ctx.strokeStyle = "#5fe0a0";
  ctx.lineWidth = 2;
  for (let i = 0; i < 18; i++) {
    ctx.globalAlpha = 0.3 + r() * 0.5;
    ctx.beginPath();
    let x = r() * w;
    let y = 80 + r() * 160;
    ctx.moveTo(x, y);
    for (let k = 0; k < 5; k++) {
      x += (r() - 0.5) * 30;
      y += r() * 18;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#040907";
  ctx.fillRect(0, h - 70, w, 70);
}

function paintForest(ctx: CanvasRenderingContext2D, w: number, h: number, r: () => number): void {
  gradient(ctx, h, [
    [0, "#4a3f6e"],
    [0.45, "#c87a5c"],
    [0.75, "#e8a868"],
    [1, "#6a5a7a"],
  ]);
  const layers: Array<[string, number, number]> = [
    ["#3d3a52", 150, 0.5],
    ["#2a2c3a", 190, 0.75],
    ["#171c20", 230, 1],
  ];
  for (const [color, base, size] of layers) {
    ctx.fillStyle = color;
    for (let x = -20; x < w + 20; x += 14 + r() * 10) {
      const tall = (60 + r() * 70) * size;
      wrap(w, x, (sx) => {
        ctx.beginPath();
        ctx.moveTo(sx - 14 * size, base + 20);
        ctx.lineTo(sx, base - tall);
        ctx.lineTo(sx + 14 * size, base + 20);
        ctx.fill();
      });
    }
    ctx.fillRect(0, base + 18, w, h - base);
  }
}

// --- helpers --------------------------------------------------------------------------

function seeded(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function hash(i: number, j: number): number {
  let h = (i * 374761393 + j * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function shade(color: number, amount: number): number {
  const f = (c: number) => Math.max(0, Math.min(255, Math.round(c + (amount > 0 ? (255 - c) * amount : c * amount))));
  return (f((color >> 16) & 0xff) << 16) | (f((color >> 8) & 0xff) << 8) | f(color & 0xff);
}

export function mixColor(a: number, b: number, t: number): number {
  const m = (x: number, y: number) => Math.round(x + (y - x) * t);
  return (m((a >> 16) & 0xff, (b >> 16) & 0xff) << 16) | (m((a >> 8) & 0xff, (b >> 8) & 0xff) << 8) | m(a & 0xff, b & 0xff);
}
