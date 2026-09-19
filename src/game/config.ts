export const TILE = 32;
export const CHUNK_TILES = 16;
export const CHUNK_PX = TILE * CHUNK_TILES;

export const VIEW_W = 1280;
export const VIEW_H = 720;

/** How many chunks in each direction stay resident around the player. */
export const LOAD_RADIUS = 2;

/** World seed. Change it for a completely different Korvana. */
export const WORLD_SEED = 0x4b4f5256;

/** Length of a full in-game day, in milliseconds of real time. */
export const DAY_LENGTH_MS = 8 * 60 * 1000;

export const PLAYER_SPEED = 190;
export const PLAYER_SPRINT = 340;
export const PLAYER_DASH_DISTANCE = 112;
export const PLAYER_DASH_COOLDOWN = 900;

/** Depths. Entities sort by their feet Y inside ENTITY_BAND. */
export const DEPTH = {
  ground: -10000,
  decal: -9000,
  shadow: -8000,
  entityMin: 0,
  entityMax: 200000,
  weather: 300000,
  ui: 400000,
} as const;
