import type { MusicZone } from "../../audio/zones";
import { TILE } from "../../config";
import { landmarkById } from "../landmarks";
import { ACADEMY_INTERIOR } from "./academy";
import { THORNROOT_BARROW } from "./barrow";
import { processLevel, toStructure } from "./build";
import type { ProcessedLevel } from "./build";
import { ACADEMY_GROUNDS, BARROW_MOUTH, RELIQUARY_STEPS } from "./grounds";
import { SKYFALL_RELIQUARY } from "./reliquary";
import { UNDERCROFT } from "./undercroft";
import type { LevelDef } from "./types";

export type { LevelDef } from "./types";
export type { ProcessedLevel } from "./build";

/** Every authored level, surface and underground. */
export const LEVEL_DEFS: LevelDef[] = [
  ACADEMY_GROUNDS,
  BARROW_MOUTH,
  RELIQUARY_STEPS,
  ACADEMY_INTERIOR,
  UNDERCROFT,
  THORNROOT_BARROW,
  SKYFALL_RELIQUARY,
];

/** Levels with walls raised and glyphs resolved, computed once at load. */
export const LEVELS: ProcessedLevel[] = LEVEL_DEFS.map(processLevel);

/** Structure templates for data/structures.ts. */
export const LEVEL_STRUCTURES = LEVELS.map(toStructure);

export function levelById(id: string): ProcessedLevel | undefined {
  return LEVELS.find((l) => l.def.id === id);
}

/** Where a level is stamped: the origin of the landmark it belongs to. */
export function levelOrigin(level: ProcessedLevel): { tx: number; ty: number } | null {
  const landmark = landmarkById(level.def.landmark);
  return landmark ? { tx: landmark.tx, ty: landmark.ty } : null;
}

/** The level whose footprint holds this world pixel, if any. */
export function levelAtPixel(x: number, y: number): ProcessedLevel | null {
  const tx = Math.floor(x / TILE);
  const ty = Math.floor(y / TILE);
  for (const level of LEVELS) {
    const origin = levelOrigin(level);
    if (!origin) continue;
    if (tx >= origin.tx && ty >= origin.ty && tx < origin.tx + level.width && ty < origin.ty + level.height) {
      return level;
    }
  }
  return null;
}

/**
 * Music for wherever the player stands, when a level wants its own. The
 * Academy interior is underground (so its walls are solid rock), but it should
 * still sound like the Academy rather than a tomb.
 */
export function levelMusicAt(x: number, y: number): MusicZone | null {
  return levelAtPixel(x, y)?.def.music ?? null;
}
