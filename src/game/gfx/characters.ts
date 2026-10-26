import type Phaser from "phaser";

import { canvasTex } from "./canvas";
import type { Direction } from "../types";

const ART_W = 16;
const ART_H = 20;
const SCALE = 2;
export const FRAME_W = ART_W * SCALE;
export const FRAME_H = ART_H * SCALE;

const FRAMES = 3;
const DIRS: Direction[] = ["down", "left", "right", "up"];

/**
 * Pixel art authored as strings. Each character maps to a palette entry:
 *   H hat   h hat underside   S skin   E eye   A hair
 *   T trim  R robe            r robe shade
 *   L left boot               K right boot
 */
const ART_DOWN = [
  "................",
  "......HHHH......",
  ".....HHHHHH.....",
  "....HHHHHHHH....",
  "...HHHHHHHHHH...",
  "..HHHHHHHHHHHH..",
  ".HHHHHHHHHHHHHH.",
  "...hhhhhhhhhh...",
  "....SSSSSSSS....",
  "....SSSSSSSS....",
  "....SESSSSES....",
  "....SSSSSSSS....",
  ".....SSSSSS.....",
  "....TTTTTTTT....",
  "...RRRRRRRRRR...",
  "..RRRRrRRRRrRR..",
  "..RRRRRRRRRRRR..",
  "..RRRRRRRRRRRR..",
  "...rrrrrrrrrr...",
  "...LL......KK...",
];

const ART_UP = [
  "................",
  "......HHHH......",
  ".....HHHHHH.....",
  "....HHHHHHHH....",
  "...HHHHHHHHHH...",
  "..HHHHHHHHHHHH..",
  ".HHHHHHHHHHHHHH.",
  "...hhhhhhhhhh...",
  "....AAAAAAAA....",
  "....AAAAAAAA....",
  "....AAAAAAAA....",
  "....AAAAAAAA....",
  ".....AAAAAA.....",
  "....TTTTTTTT....",
  "...RRRRRRRRRR...",
  "..RRRRrRRRRrRR..",
  "..RRRRRRRRRRRR..",
  "..RRRRRRRRRRRR..",
  "...rrrrrrrrrr...",
  "...LL......KK...",
];

const ART_SIDE = [
  "................",
  ".....HHHH.......",
  "....HHHHHH......",
  "...HHHHHHHH.....",
  "..HHHHHHHHHH....",
  "..HHHHHHHHHHH...",
  ".HHHHHHHHHHHHH..",
  "...hhhhhhhhh....",
  "...SSSSSS.......",
  "...SSSSSS.......",
  "...ESSSSS.......",
  "...SSSSSS.......",
  "....SSSS........",
  "...TTTTTTT......",
  "..RRRRRRRRR.....",
  ".RRRRrRRRRrR....",
  ".RRRRRRRRRRR....",
  ".RRRRRRRRRRR....",
  "..rrrrrrrrr.....",
  "..LL....KK......",
];

/**
 * A hooded, legless figure with a tattered hem, for the things that carry the
 * Moonwell away. Symmetric, so one set covers both down and up.
 */
const ART_WRAITH = [
  "................",
  "......hhhh......",
  ".....hHHHHh.....",
  "....hHHHHHHh....",
  "...hHHHHHHHHh...",
  "...HHHHHHHHHH...",
  "...HEEHHHHEEH...",
  "...HHHHHHHHHH...",
  "...hHHHHHHHHh...",
  "..hHHHHHHHHHHh..",
  "..hHHHHHHHHHHh..",
  "..HHHHHHHHHHHH..",
  "..HHHrHHHHrHHH..",
  "..HHHHHHHHHHHH..",
  ".HHHHHHHHHHHHHH.",
  ".HHHrHHHHHHrHHH.",
  ".HH.HHHHHHHH.HH.",
  "..H..HHHHHH..H..",
  "....H.HH.H......",
  "................",
];

const ART_WRAITH_SIDE = [
  "................",
  ".....hhhh.......",
  "....hHHHHh......",
  "...hHHHHHHh.....",
  "..hHHHHHHHHh....",
  "..HHHHHHHHHH....",
  "..HEEHHHHHHH....",
  "..HHHHHHHHHH....",
  "..hHHHHHHHHh....",
  ".hHHHHHHHHHHh...",
  ".hHHHHHHHHHHh...",
  ".HHHHHHHHHHHH...",
  ".HHHrHHHHrHHH...",
  ".HHHHHHHHHHHH...",
  "HHHHHHHHHHHHHH..",
  "HHHrHHHHHHrHHH..",
  "HH.HHHHHHHHH.HH.",
  ".H..HHHHHHH..H..",
  "....H.HH.H......",
  "................",
];

export interface CharacterLook {
  key: string;
  hat: string;
  hatDark: string;
  robe: string;
  robeDark: string;
  trim: string;
  skin: string;
  hair: string;
  boot: string;
  eye: string;
  /** Which silhouette to draw. Defaults to the humanoid student shape. */
  body?: "humanoid" | "wraith";
}

export const LOOKS: Record<string, CharacterLook> = {
  hero: {
    key: "hero",
    hat: "#4a2f6b",
    hatDark: "#33204a",
    robe: "#9c2f3f",
    robeDark: "#71212e",
    trim: "#d9b44a",
    skin: "#e8b98a",
    hair: "#4a3423",
    boot: "#3a2a1c",
    eye: "#241f2b",
  },
  professor: {
    key: "professor",
    hat: "#1f3a63",
    hatDark: "#152945",
    robe: "#2f5a8c",
    robeDark: "#214166",
    trim: "#c9d4e2",
    skin: "#dcae82",
    hair: "#8d8d94",
    boot: "#2b2b33",
    eye: "#241f2b",
  },
  herbologist: {
    key: "herbologist",
    hat: "#22503a",
    hatDark: "#173627",
    robe: "#37785a",
    robeDark: "#275940",
    trim: "#cfe0a8",
    skin: "#c98f62",
    hair: "#3d2a17",
    boot: "#33261a",
    eye: "#241f2b",
  },
  student: {
    key: "student",
    hat: "#7a4a1c",
    hatDark: "#553314",
    robe: "#c07a2c",
    robeDark: "#8e5920",
    trim: "#f0dca0",
    skin: "#e8b98a",
    hair: "#6b4a26",
    boot: "#3a2a1c",
    eye: "#241f2b",
  },
  scholar: {
    key: "scholar",
    hat: "#5a2f5e",
    hatDark: "#3e2041",
    robe: "#8b52a8",
    robeDark: "#623a78",
    trim: "#e0cff0",
    skin: "#d9a97f",
    hair: "#241a12",
    boot: "#2f2233",
    eye: "#241f2b",
  },
  shade: {
    key: "shade",
    hat: "#22222e",
    hatDark: "#131320",
    robe: "#2f2f45",
    robeDark: "#1c1c2c",
    trim: "#5a5a80",
    skin: "#3a3a52",
    hair: "#18181f",
    boot: "#101018",
    eye: "#ff5a5a",
  },
  husk: {
    key: "husk",
    hat: "#3a2f2b",
    hatDark: "#241d1a",
    robe: "#4a3a33",
    robeDark: "#2f2521",
    trim: "#8a4a2a",
    skin: "#5a4a42",
    hair: "#1a1512",
    boot: "#1a1512",
    eye: "#ff7a3a",
  },
  wraith: {
    key: "wraith",
    hat: "#3b4a63",
    hatDark: "#26313f",
    robe: "#4d6076",
    robeDark: "#354454",
    trim: "#9fb6cc",
    skin: "#7d93ab",
    hair: "#2b3646",
    boot: "#2b3646",
    eye: "#bfe9ff",
    body: "wraith",
  },
  adept: {
    key: "adept",
    hat: "#2a1f3d",
    hatDark: "#1a1328",
    robe: "#3d2c58",
    robeDark: "#281c3a",
    trim: "#8f6fd0",
    skin: "#b39ac9",
    hair: "#150f20",
    boot: "#150f20",
    eye: "#d0a6ff",
  },
  vale: {
    key: "vale",
    hat: "#1c2a24",
    hatDark: "#111a16",
    robe: "#24382f",
    robeDark: "#16241d",
    trim: "#6fd0a0",
    skin: "#a8c4b4",
    hair: "#0e1512",
    boot: "#0e1512",
    eye: "#8fffd0",
  },
};

function paletteFor(look: CharacterLook): Record<string, string> {
  return {
    H: look.hat,
    h: look.hatDark,
    S: look.skin,
    E: look.eye,
    A: look.hair,
    T: look.trim,
    R: look.robe,
    r: look.robeDark,
    L: look.boot,
    K: look.boot,
  };
}

function drawArt(
  ctx: CanvasRenderingContext2D,
  art: string[],
  pal: Record<string, string>,
  ox: number,
  oy: number,
  bootDx: { L: number; K: number },
  bob: number,
  mirror: boolean,
): void {
  for (let y = 0; y < art.length; y++) {
    const row = art[y];
    if (!row) continue;
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (!ch || ch === ".") continue;
      const color = pal[ch];
      if (!color) continue;

      let px = mirror ? ART_W - 1 - x : x;
      if (ch === "L") px += bootDx.L;
      if (ch === "K") px += bootDx.K;

      ctx.fillStyle = color;
      ctx.fillRect(ox + px * SCALE, oy + (y + bob) * SCALE, SCALE, SCALE);
    }
  }
}

/** Walk cycle: a 1px bob plus opposite feet swinging out. */
const WALK: Array<{ bob: number; L: number; K: number }> = [
  { bob: 0, L: 0, K: 0 },
  { bob: -1, L: -1, K: 1 },
  { bob: 0, L: 1, K: -1 },
];

export function sheetKey(lookKey: string): string {
  return `char_${lookKey}`;
}

export function animKey(lookKey: string, dir: Direction): string {
  return `${lookKey}-walk-${dir}`;
}

export function idleKey(lookKey: string, dir: Direction): string {
  return `${lookKey}-idle-${dir}`;
}

/** Which silhouette belongs to a look, facing a direction. */
function artFor(look: CharacterLook, dir: Direction): string[] {
  if (look.body === "wraith") {
    return dir === "left" || dir === "right" ? ART_WRAITH_SIDE : ART_WRAITH;
  }
  return dir === "down" ? ART_DOWN : dir === "up" ? ART_UP : ART_SIDE;
}

function buildSheet(scene: Phaser.Scene, look: CharacterLook): void {
  const key = sheetKey(look.key);
  const sheetW = FRAME_W * FRAMES;
  const sheetH = FRAME_H * DIRS.length;
  const { tex, ctx } = canvasTex(scene, key, sheetW, sheetH);
  const pal = paletteFor(look);

  for (let d = 0; d < DIRS.length; d++) {
    const dir = DIRS[d];
    if (!dir) continue;
    const art = artFor(look, dir);
    const mirror = dir === "right";

    for (let f = 0; f < FRAMES; f++) {
      const step = WALK[f] ?? WALK[0]!;
      drawArt(
        ctx,
        art,
        pal,
        f * FRAME_W,
        d * FRAME_H,
        { L: step.L, K: step.K },
        step.bob,
        mirror,
      );
    }
  }

  for (let i = 0; i < FRAMES * DIRS.length; i++) {
    const col = i % FRAMES;
    const row = Math.floor(i / FRAMES);
    tex.add(i, 0, col * FRAME_W, row * FRAME_H, FRAME_W, FRAME_H);
  }
  tex.refresh();
}

function registerAnims(scene: Phaser.Scene, look: CharacterLook): void {
  const key = sheetKey(look.key);
  for (let d = 0; d < DIRS.length; d++) {
    const dir = DIRS[d];
    if (!dir) continue;
    const start = d * FRAMES;
    const walk = animKey(look.key, dir);
    if (!scene.anims.exists(walk)) {
      scene.anims.create({
        key: walk,
        frames: scene.anims.generateFrameNumbers(key, { start, end: start + FRAMES - 1 }),
        frameRate: 8,
        repeat: -1,
      });
    }
    const idle = idleKey(look.key, dir);
    if (!scene.anims.exists(idle)) {
      scene.anims.create({
        key: idle,
        frames: [{ key, frame: start }],
        frameRate: 1,
        repeat: -1,
      });
    }
  }
}

export function buildCharacters(scene: Phaser.Scene): void {
  for (const look of Object.values(LOOKS)) {
    buildSheet(scene, look);
    registerAnims(scene, look);
  }
}
