import type { Biome, GroundTile } from "../types";

/**
 * A picked-up item sitting at a fixed spot near a landmark. Offsets are in
 * tiles from the landmark's origin, so they move with it.
 */
export interface LandmarkPickup {
  id: string;
  qty?: number;
  dx: number;
  dy: number;
}

/**
 * A place that exists at a known point in the world.
 *
 * Korvana generates endlessly, which is lovely to wander and hopeless to tell a
 * story in: there is nowhere to walk *to*. Landmarks fix that. They are pinned
 * to tile coordinates, stamped into whatever chunk they land in, and can force
 * the ground and biome beneath themselves so they are never dropped into the
 * sea or on a cliff.
 */
export interface LandmarkDef {
  id: string;
  name: string;
  /** Tile coordinate of the landmark's top-left corner. */
  tx: number;
  ty: number;
  /**
   * Structure stamped into the world, from data/structures.ts. A landmark with
   * no structure is a pure region - useful for forcing a biome over a wide area.
   */
  structure?: string;
  /**
   * Biome forced over a radius of tiles around the origin. This is how the
   * Moonwell Scar exists as somewhere you can actually find.
   */
  forceBiome?: Biome;
  forceRadius?: number;
  /**
   * Where the forced circle is centred, in tiles from the origin. Defaults to
   * the origin itself; a big structure sets it to its own middle so the region
   * it forces sits under it rather than off its top-left corner.
   */
  forceCentre?: { dx: number; dy: number };
  /**
   * A rectangular forced region instead of a wobbling circle, in tiles from the
   * origin. Underground levels use this: a crypt has to be solid rock right up
   * to its authored walls, and a noisy edge would cut rooms in half.
   */
  forceRect?: { x: number; y: number; w: number; h: number };
  /** Ground forced under the footprint, so a landmark is never in water. */
  forceGround?: GroundTile;
  /**
   * Radius, in world pixels, inside which nothing hostile spawns. Kept modest
   * by default so story locations are gathering places rather than no-go areas;
   * `the_scar` deliberately has none, because the whole region is the arena.
   */
  safeRadius?: number;
  /** Journal entry unlocked the first time the player arrives. */
  lore?: string;
  pickups?: LandmarkPickup[];
}

/**
 * The world's fixed geography.
 *
 * Distances are chosen so Act I plays out within sight of the arrival grounds,
 * while the Scar is a genuine journey north - roughly 240 tiles, or about half
 * a minute of running from the waystone.
 */
export const LANDMARKS: LandmarkDef[] = [
  {
    id: "arrival_grounds",
    name: "The Arrival Grounds",
    tx: 4,
    ty: 6,
    // The Academy's keep, towers and courtyard (data/levels/grounds.ts).
    structure: "academy_castle",
    forceBiome: "meadow",
    forceRadius: 33,
    forceCentre: { dx: 19, dy: 16 },
    safeRadius: 1300,
    lore: "korvana",
    pickups: [{ id: "lesser_tonic", dx: 9, dy: 18 }],
  },
  {
    id: "treeline",
    name: "The Treeline",
    tx: 52,
    ty: -14,
    structure: "camp",
    forceBiome: "forest",
    forceRadius: 13,
    safeRadius: 380,
    lore: "treeline",
    pickups: [
      { id: "quillfeather", dx: -3, dy: -2 },
      { id: "quillfeather", dx: 1, dy: -4 },
      { id: "quillfeather", dx: 4, dy: 1 },
      { id: "quillfeather", dx: -1, dy: 4 },
      { id: "quillfeather", dx: 6, dy: -3 },
    ],
  },
  {
    id: "scarred_ground",
    name: "The Scarred Ground",
    tx: 96,
    ty: -60,
    structure: "ruin",
    forceBiome: "meadow",
    forceRadius: 11,
    forceGround: "dirt",
    safeRadius: 380,
    lore: "splinters",
    pickups: [
      { id: "moonwell_shard", dx: -4, dy: -3 },
      { id: "moonwell_shard", dx: 2, dy: -5 },
      { id: "moonwell_shard", dx: 5, dy: 2 },
      { id: "moonwell_shard", dx: -2, dy: 5 },
    ],
  },
  {
    id: "waystone_north",
    name: "The North Waystone",
    tx: 140,
    ty: -108,
    structure: "shrine",
    forceBiome: "highland",
    forceRadius: 13,
    safeRadius: 380,
    lore: "waystones",
    pickups: [{ id: "mana_draught", dx: 4, dy: 4 }],
  },

  // --- Act II onwards: the Moonwell Scar ---
  {
    id: "the_scar",
    name: "The Moonwell Scar",
    tx: 186,
    ty: -150,
    forceBiome: "scar",
    forceRadius: 40,
    safeRadius: 0,
    lore: "the_scar",
    pickups: [
      { id: "moonwell_shard", dx: 6, dy: -10 },
      { id: "moonwell_shard", dx: -14, dy: 6 },
      { id: "moonwell_shard", dx: 18, dy: 12 },
      { id: "lesser_tonic", dx: -6, dy: -18 },
    ],
  },
  {
    id: "keeper_camp",
    name: "Keeper's Rest",
    tx: 178,
    ty: -144,
    structure: "camp",
    safeRadius: 300,
    lore: "keepers",
    pickups: [
      { id: "mana_draught", dx: 2, dy: 2 },
      { id: "lesser_tonic", dx: -2, dy: 3 },
    ],
  },
  {
    id: "wellhead",
    name: "The Wellhead",
    tx: 192,
    ty: -158,
    structure: "moonwell_wellhead",
    safeRadius: 360,
    lore: "wellhead",
    pickups: [
      { id: "brass_key", dx: 1, dy: -3 },
      { id: "lesser_tonic", dx: 9, dy: 3 },
    ],
  },

  // --- Tomb mouths on the surface (data/levels/grounds.ts) ---
  {
    // Deep in the north-western forest, on the far side of the Treeline.
    id: "barrow_entrance",
    name: "The Thornroot Barrow",
    tx: -112,
    ty: -150,
    structure: "barrow_mound",
    forceBiome: "forest",
    forceRadius: 14,
    forceCentre: { dx: 4, dy: 4 },
    safeRadius: 300,
  },
  {
    // A cliff in a pocket of highland north-east of the Academy, short of the waystone.
    id: "reliquary_entrance",
    name: "The Skyfall Steps",
    tx: 122,
    ty: -80,
    structure: "reliquary_stair",
    forceBiome: "highland",
    forceRadius: 12,
    forceCentre: { dx: 4, dy: 3 },
    safeRadius: 300,
  },

  // --- Underground (y >= 3000). Each level sits in a rectangle of solid rock
  // and only its authored floors are walkable. They are 300 tiles apart so
  // their spawn rules and safe pockets never overlap. ---
  {
    id: "academy_interior",
    name: "Korvana Academy",
    tx: 0,
    ty: 3000,
    structure: "academy_interior",
    forceBiome: "crypt",
    forceRect: { x: -48, y: -40, w: 154, h: 128 },
    // Covers the whole interior: nothing hunts students in their own halls.
    safeRadius: 4200,
  },
  {
    id: "undercroft",
    name: "The Undercroft",
    tx: 300,
    ty: 3000,
    structure: "undercroft",
    forceBiome: "crypt",
    forceRect: { x: -48, y: -40, w: 152, h: 124 },
    safeRadius: 300,
  },
  {
    // Zone: the Undercroft's relic chamber.
    id: "undercroft_heart",
    name: "The Heart of the Undercroft",
    tx: 335,
    ty: 3034,
    safeRadius: 220,
  },
  {
    id: "thornroot_barrow",
    name: "The Thornroot Barrow",
    tx: 600,
    ty: 3000,
    structure: "thornroot_barrow",
    forceBiome: "crypt",
    forceRect: { x: -48, y: -40, w: 162, h: 116 },
    safeRadius: 300,
  },
  {
    // Zone: the Barrow's relic chamber.
    id: "barrow_heart",
    name: "The Barrow Heart",
    tx: 632,
    ty: 3020,
    safeRadius: 220,
  },
  {
    id: "skyfall_reliquary",
    name: "The Skyfall Reliquary",
    tx: 900,
    ty: 3000,
    structure: "skyfall_reliquary",
    forceBiome: "crypt",
    forceRect: { x: -48, y: -40, w: 160, h: 122 },
    safeRadius: 300,
  },
  {
    // Zone: the Reliquary's relic chamber.
    id: "reliquary_heart",
    name: "The Reliquary Heart",
    tx: 945,
    ty: 3020,
    safeRadius: 220,
  },
];

export function landmarkById(id: string): LandmarkDef | undefined {
  return LANDMARKS.find((l) => l.id === id);
}

/** Where a new game begins: in the Academy courtyard (spot `academy_gate`). */
export const START_LANDMARK = "arrival_grounds";

/** Landmarks that override the terrain beneath themselves — the only ones the world model cares about. */
export const TERRAIN_LANDMARKS = LANDMARKS.filter(
  (l) => (l.forceRadius || l.forceRect) && (l.forceBiome || l.forceGround),
);
