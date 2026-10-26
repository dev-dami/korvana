import type { Biome, TileRole } from "../types";
import { LEVEL_STRUCTURES } from "./levels";

export interface StructureDef {
  id: string;
  /** Texture used for `.` floor tiles. */
  floor: string;
  /** Texture used for `#` wall tiles. */
  wall: string;
  rows: string[];
  /** Relative likelihood when several defs suit the biome. */
  weight: number;
  biomes: Biome[];
  /**
   * Per-structure glyphs, checked before the shared ones below. Authored levels
   * (data/levels) carry a whole vocabulary here - bookshelves, banners, crypt
   * walls - without every glyph having to mean the same thing everywhere.
   */
  legend?: Record<string, ResolvedTile>;
}

export interface ResolvedTile {
  role: TileRole;
  solid: boolean;
  texture: string;
  /** Floor baked beneath a prop or torch sprite. Without it the ground shows through. */
  under?: string;
}

const PROPS: Record<string, { texture: string; solid: boolean }> = {
  c: { texture: "st_prop_crate", solid: true },
  b: { texture: "st_prop_barrel", solid: true },
  s: { texture: "st_prop_shelf", solid: true },
  k: { texture: "st_prop_cauldron", solid: true },
  d: { texture: "st_prop_desk", solid: true },
  p: { texture: "st_prop_plant", solid: false },
};

export function resolveTile(def: StructureDef, ch: string): ResolvedTile | null {
  if (ch === " ") return null;
  const custom = def.legend?.[ch];
  if (custom) return custom;
  if (ch === ",") return null;
  if (ch === "#") return { role: "wall", solid: true, texture: def.wall };
  if (ch === ".") return { role: "floor", solid: false, texture: def.floor };
  if (ch === "D") return { role: "door", solid: false, texture: "st_door" };
  if (ch === "T") return { role: "torch", solid: false, texture: "st_torch" };
  const prop = PROPS[ch];
  if (prop) return { role: "prop", solid: prop.solid, texture: prop.texture };
  return null;
}

export const STRUCTURES: StructureDef[] = [
  {
    id: "cottage",
    floor: "st_floor_wood",
    wall: "st_wall_plaster",
    weight: 3,
    biomes: ["meadow", "forest", "beach"],
    rows: [
      "#######",
      "#.....#",
      "#.T.T.#",
      "#.....#",
      "###D###",
    ],
  },
  {
    id: "stone_cottage",
    floor: "st_floor_stone",
    wall: "st_wall_stone",
    weight: 2,
    biomes: ["meadow", "highland", "forest"],
    rows: [
      "#######",
      "#..b..#",
      "#.T.T.#",
      "#.....#",
      "##D####",
    ],
  },
  {
    id: "tower",
    floor: "st_floor_stone",
    wall: "st_wall_stone",
    weight: 2,
    biomes: ["meadow", "highland", "forest"],
    rows: [
      "#####",
      "#.T.#",
      "#...#",
      "#.s.#",
      "#...#",
      "#.T.#",
      "##D##",
    ],
  },
  {
    id: "scriptorium",
    floor: "st_floor_carpet",
    wall: "st_wall_wood",
    weight: 2,
    biomes: ["meadow", "forest"],
    rows: [
      "#########",
      "#..s.s..#",
      "#.......#",
      "#.d...d.#",
      "#.......#",
      "#.k...k.#",
      "####D####",
    ],
  },
  {
    id: "great_hall",
    floor: "st_floor_stone",
    wall: "st_wall_stone",
    weight: 1,
    biomes: ["meadow"],
    rows: [
      "###########",
      "#.........#",
      "#.T.....T.#",
      "#....s....#",
      "#.........#",
      "#.p.....p.#",
      "#####D#####",
    ],
  },
  {
    id: "ruin",
    floor: "st_floor_stone",
    wall: "st_wall_stone",
    weight: 3,
    biomes: ["meadow", "forest", "highland", "marsh", "beach", "scar"],
    rows: [
      "##.###.##",
      "#.......#",
      "#..#.#..#",
      "#.......#",
      "##.###.##",
    ],
  },
  {
    id: "camp",
    floor: "g_dirt_0",
    wall: "st_wall_wood",
    weight: 3,
    biomes: ["meadow", "forest", "highland", "marsh", "beach", "scar"],
    rows: [
      ",,c.b,,",
      ",..T..,",
      ",b...c,",
    ],
  },
  {
    id: "greenhouse",
    floor: "st_floor_wood",
    wall: "st_wall_plaster",
    weight: 2,
    biomes: ["meadow", "forest", "marsh"],
    rows: [
      "#######",
      "#p...p#",
      "#.....#",
      "#p...p#",
      "##D####",
    ],
  },
  {
    id: "shrine",
    floor: "st_floor_stone",
    wall: "st_wall_stone",
    weight: 2,
    biomes: ["meadow", "forest", "highland", "marsh", "beach"],
    rows: [
      ",#.#,",
      "#...#",
      ". T .",
      "#...#",
      ",#.#,",
    ],
  },
  {
    // The mouth of the shattered Moonwell. The inner ring is deliberately
    // sealed - it is scenery and a boss arena wall, not a room to enter.
    id: "moonwell_wellhead",
    floor: "st_floor_stone",
    wall: "st_wall_stone",
    weight: 1,
    biomes: ["scar"],
    rows: [
      "###########",
      "#.........#",
      "#..#####..#",
      "#..#...#..#",
      "#..#.s.#..#",
      "#..#...#..#",
      "#..#####..#",
      "#.........#",
      "#....T....#",
      "#####D#####",
    ],
  },
];

// The Academy, its grounds and the tombs. Never placed at random (no biomes).
STRUCTURES.push(...LEVEL_STRUCTURES);

export function structureById(id: string): StructureDef | undefined {
  return STRUCTURES.find((s) => s.id === id);
}

export function defsForBiome(biome: Biome): StructureDef[] {
  return STRUCTURES.filter((s) => s.biomes.includes(biome));
}

export function maxWidth(def: StructureDef): number {
  return def.rows.reduce((m, r) => Math.max(m, r.length), 0);
}
