export type Biome =
  | "ocean"
  | "shallows"
  | "beach"
  | "marsh"
  | "meadow"
  | "forest"
  | "highland"
  | "peak"
  /** The Moonwell Scar: ash flats blasted out of the north range. */
  | "scar";

export type GroundTile =
  | "deep_water"
  | "water"
  | "shore"
  | "grass"
  | "meadow"
  | "forest_floor"
  | "marsh"
  | "dirt"
  | "stone"
  | "snow"
  | "ash"
  | "cracked_earth";

/** Roles used by structure templates and drawn as their own sprites. */
export type TileRole = "wall" | "floor" | "door" | "prop" | "torch";

export interface WorldSample {
  elevation: number;
  moisture: number;
  temperature: number;
  biome: Biome;
}

export interface PlacedStructure {
  cx: number;
  cy: number;
  /** Tile origin inside the chunk (already resolved, may exceed chunk bounds is never allowed). */
  ox: number;
  oy: number;
  defId: string;
  seed: number;
}

export interface StructureTile {
  role: TileRole;
  solid: boolean;
  /** Texture key suffix for the role, resolved by the tileset. */
  tx: number;
  ty: number;
}

export type Direction = "down" | "up" | "left" | "right";

export interface Vec2 {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Anything the SpellSystem can resolve a hit against. */
export interface Damageable {
  takeDamage(amount: number, source?: unknown): void;
}
