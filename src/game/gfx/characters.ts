import type Phaser from "phaser";

import { canvasTex } from "./canvas";
import { LOOKS } from "./looks";
import type { Look } from "./looks";
import { paintCreature } from "./paint/creatures";
import { FH, FW, paintHumanoid } from "./paint/humanoid";
import type { Facing, Pose } from "./paint/humanoid";
import { Pix } from "./pixel";
import type { Direction } from "../types";

export { LOOKS } from "./looks";
export type { Look } from "./looks";

/**
 * Character sprite sheets, painted at boot from the costume sheets in looks.ts.
 *
 * Frames are 32x48 at native resolution (one art pixel per world pixel, like
 * the tiles), feet on the bottom row but one. Each sheet is twelve columns by
 * four rows:
 *
 *   columns 0-5   walk cycle (two full strides)
 *   columns 6-9   idle: breathe in, breathe out, rest, blink
 *   column  10    cast  (wand raised, tip lit)
 *   column  11    attack (lunge)
 *
 *   rows: down, left, right, up
 */
export const FRAME_W = FW;
export const FRAME_H = FH;

const WALK_FRAMES = 6;
const IDLE_FRAMES = 4;
const COLS = WALK_FRAMES + IDLE_FRAMES + 2;
const CAST_COL = WALK_FRAMES + IDLE_FRAMES;
const ATTACK_COL = CAST_COL + 1;
const DIRS: Direction[] = ["down", "left", "right", "up"];

export function sheetKey(lookKey: string): string {
  return `char_${lookKey}`;
}

export function animKey(lookKey: string, dir: Direction): string {
  return `${lookKey}-walk-${dir}`;
}

export function idleKey(lookKey: string, dir: Direction): string {
  return `${lookKey}-idle-${dir}`;
}

/** A held one-frame pose: wand raised and lit. */
export function castKey(lookKey: string, dir: Direction): string {
  return `${lookKey}-cast-${dir}`;
}

/** A held one-frame pose: lunging into a swing. */
export function attackKey(lookKey: string, dir: Direction): string {
  return `${lookKey}-attack-${dir}`;
}

/** Frame index of a direction's first idle frame - a good still for portraits and duels. */
export function standingFrame(dir: Direction): number {
  return DIRS.indexOf(dir) * COLS + WALK_FRAMES;
}

export function hasLook(key: string): boolean {
  return Boolean(LOOKS[key]);
}

// --- poses -------------------------------------------------------------------

function facingOf(dir: Direction): Facing {
  return dir === "right" ? "left" : dir;
}

/** The pose for one column of the sheet. */
function poseFor(look: Look, dir: Direction, col: number): Pose {
  const facing = facingOf(dir);
  const floats = look.floats === true;
  const base: Pose = {
    facing,
    stride: 0,
    bob: 0,
    breath: 0,
    blink: false,
    action: "none",
    t: 0,
    hover: floats ? -3 : 0,
  };

  if (col < WALK_FRAMES) {
    const phase = ((col + 0.5) / WALK_FRAMES) * Math.PI * 2;
    const stride = Math.sin(phase);
    return {
      ...base,
      stride: floats ? stride * 0.4 : stride,
      bob: floats ? 0 : Math.abs(stride) < 0.75 ? -1 : 0,
      t: col / WALK_FRAMES,
      hover: floats ? -3 + Math.round(Math.sin((col / WALK_FRAMES) * Math.PI * 2) * 1.5) : 0,
    };
  }

  if (col < CAST_COL) {
    const i = col - WALK_FRAMES;
    return {
      ...base,
      breath: i === 1 || i === 2 ? (floats ? 0 : 1) : 0,
      blink: i === 3,
      t: i / IDLE_FRAMES,
      hover: floats ? -3 + [0, -1, -1, 0][i]! : 0,
    };
  }

  return {
    ...base,
    action: col === CAST_COL ? "cast" : "attack",
    bob: col === ATTACK_COL && !floats ? 1 : 0,
    stride: col === ATTACK_COL ? 0.5 : 0,
    t: 0.25,
  };
}

function paintFrame(look: Look, dir: Direction, col: number): Pix {
  const pose = poseFor(look, dir, col);
  if (look.body === "humanoid") return paintHumanoid(look, pose);
  return paintCreature(look, pose, col < WALK_FRAMES || col >= CAST_COL);
}

// --- sheets ----------------------------------------------------------------------

function buildSheet(scene: Phaser.Scene, look: Look): void {
  const key = sheetKey(look.key);
  const sheetW = FRAME_W * COLS;
  const sheetH = FRAME_H * DIRS.length;
  const { tex, ctx } = canvasTex(scene, key, sheetW, sheetH);
  const sheet = new Pix(sheetW, sheetH);

  for (let d = 0; d < DIRS.length; d++) {
    const dir = DIRS[d]!;
    for (let col = 0; col < COLS; col++) {
      const frame = paintFrame(look, dir, col);
      sheet.stamp(frame, col * FRAME_W, d * FRAME_H, dir === "right");
    }
  }

  writePix(ctx, sheet);

  for (let i = 0; i < COLS * DIRS.length; i++) {
    const col = i % COLS;
    const row = Math.floor(i / COLS);
    tex.add(i, 0, col * FRAME_W, row * FRAME_H, FRAME_W, FRAME_H);
  }
  tex.refresh();
}

/** Copies a pixel buffer straight into a fresh canvas. */
export function writePix(ctx: CanvasRenderingContext2D, pix: Pix): void {
  const img = ctx.createImageData(pix.w, pix.h);
  const d = img.data;
  for (let i = 0; i < pix.w * pix.h; i++) {
    const a = pix.alpha[i]!;
    if (!a) continue;
    const c = pix.rgb[i]!;
    d[i * 4] = (c >> 16) & 0xff;
    d[i * 4 + 1] = (c >> 8) & 0xff;
    d[i * 4 + 2] = c & 0xff;
    d[i * 4 + 3] = a;
  }
  ctx.putImageData(img, 0, 0);
}

function registerAnims(scene: Phaser.Scene, look: Look): void {
  const key = sheetKey(look.key);
  // Bats never stop flapping; the lamp's flame never stops dancing.
  const restless = look.body === "bat";
  const walkRate = look.body === "spider" ? 16 : look.body === "bat" ? 14 : look.floats ? 8 : 10;

  for (let d = 0; d < DIRS.length; d++) {
    const dir = DIRS[d]!;
    const start = d * COLS;

    const walk = animKey(look.key, dir);
    if (scene.anims.exists(walk)) scene.anims.remove(walk);
    scene.anims.create({
      key: walk,
      frames: scene.anims.generateFrameNumbers(key, { start, end: start + WALK_FRAMES - 1 }),
      frameRate: walkRate,
      repeat: -1,
    });

    const idle = idleKey(look.key, dir);
    if (scene.anims.exists(idle)) scene.anims.remove(idle);
    if (restless) {
      scene.anims.create({
        key: idle,
        frames: scene.anims.generateFrameNumbers(key, { start, end: start + WALK_FRAMES - 1 }),
        frameRate: walkRate,
        repeat: -1,
      });
    } else {
      const i0 = start + WALK_FRAMES;
      // Breathing is slow; the blink is quick. A lamp flickers evenly.
      const durations = look.body === "lamp" ? [160, 160, 160, 160] : [900, 650, 750, 130];
      scene.anims.create({
        key: idle,
        frames: durations.map((duration, k) => ({ key, frame: i0 + k, duration })),
        repeat: -1,
      });
    }

    for (const [poseKey, col] of [
      [castKey(look.key, dir), CAST_COL],
      [attackKey(look.key, dir), ATTACK_COL],
    ] as const) {
      if (scene.anims.exists(poseKey)) scene.anims.remove(poseKey);
      scene.anims.create({ key: poseKey, frames: [{ key, frame: start + col }], frameRate: 1, repeat: -1 });
    }
  }
}

export function buildCharacters(scene: Phaser.Scene): void {
  for (const look of Object.values(LOOKS)) {
    buildSheet(scene, look);
    registerAnims(scene, look);
  }
}
