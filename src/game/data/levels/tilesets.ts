import type { StaticTile, Tileset } from "./types";

/**
 * Static glyph vocabularies. Textures are drawn in gfx/dungeonTiles.ts.
 *
 * Shared conventions across every underground tileset, so a map reads the same
 * whichever tomb it belongs to:
 *
 *   ' '  rock (nothing stamped; the crypt ground is solid void)
 *   '.'  floor          ','  worn / mossy floor
 *   '#'  wall face      '"'  wall top (raised by autoWalls, rarely typed)
 *   'T'  wall torch     'P'  pillar        'o'  statue
 *   'u'  urn            'x'  bones / debris (walkable)
 *   'r'  rubble         '~'  deep water or chasm (solid)
 *   'w'  shallow water  '<'  stairs up      'S'  sarcophagus
 *   'M'  mural wall     'R'  roots (solid)     ';'  wet mud (a drained floor)
 *   'a'..'f' hidden floors behind secrets
 */

export const floor = (texture: string): StaticTile => ({ role: "floor", solid: false, texture });
/** Baked into the ground like a floor, but you cannot stand on it. */
export const solidFloor = (texture: string): StaticTile => ({ role: "floor", solid: true, texture });
export const wall = (texture: string): StaticTile => ({ role: "wall", solid: true, texture });
export const prop = (texture: string, solid = true): StaticTile => ({ role: "prop", solid, texture });
export const torch = (texture: string, solid = true): StaticTile => ({ role: "torch", solid, texture });

function underground(set: "crypt" | "barrow" | "reliquary", floorA: string, floorB: string): Record<string, StaticTile> {
  const hidden = floor(floorA);
  return {
    ".": floor(floorA),
    ",": floor(floorB),
    "#": wall(`dg_wall_${set}`),
    '"': wall(`dg_wall_${set}_top`),
    T: torch(`dg_wall_${set}_torch`),
    M: wall(`dg_wall_${set}_mural`),
    P: prop(`dg_pillar_${set}`),
    o: prop("dg_statue"),
    u: prop("dg_urn"),
    x: floor(`dg_bones_${set}`),
    r: prop("dg_rubble"),
    w: floor("dg_water_shallow"),
    "~": solidFloor(set === "crypt" ? "dg_water_deep" : "dg_chasm"),
    "<": floor("dg_stairs_up"),
    S: prop("dg_sarcophagus"),
    R: prop("dg_roots"),
    ";": floor("dg_mud"),
    a: hidden,
    b: hidden,
    c: hidden,
    d: hidden,
    e: hidden,
    f: hidden,
  };
}

const ACADEMY: Record<string, StaticTile> = {
  ".": floor("dg_floor_hall"),
  ":": floor("dg_carpet"),
  ",": floor("dg_floor_parquet"),
  "#": wall("dg_wall_hall"),
  '"': wall("dg_wall_hall_top"),
  T: torch("dg_wall_hall_torch"),
  W: wall("dg_wall_hall_window"),
  "1": wall("dg_wall_banner_emberhart"),
  "2": wall("dg_wall_banner_thornwick"),
  "3": wall("dg_wall_banner_ravelle"),
  "4": wall("dg_wall_banner_stillwater"),
  h: torch("dg_wall_hearth"),
  D: wall("dg_door_hall"),
  "{": prop("dg_table_top"),
  "|": prop("dg_table_mid"),
  "}": prop("dg_table_bot"),
  k: prop("dg_bookshelf"),
  K: prop("dg_bookshelf_chained"),
  c: torch("dg_candelabra"),
  _: floor("dg_dais"),
  "^": floor("dg_dais_step"),
  d: prop("dg_desk"),
  l: prop("dg_lectern"),
  g: prop("dg_globe"),
  o: prop("dg_statue"),
  P: prop("dg_pillar_hall"),
  p: prop("st_prop_plant"),
  s: prop("dg_bench"),
};

/**
 * The castle grounds, on the surface. No autoWalls: the facade, towers and
 * curtain walls are all authored, and ' ' is the meadow itself.
 */
const GROUNDS: Record<string, StaticTile> = {
  ".": floor("dg_cobble"),
  ",": floor("dg_gravel"),
  ";": floor("dg_flowerbed"),
  r: solidFloor("dg_castle_roof"),
  R: solidFloor("dg_castle_roof_ridge"),
  "#": wall("dg_castle_wall"),
  W: torch("dg_castle_window"),
  "1": wall("dg_castle_banner_emberhart"),
  "2": wall("dg_castle_banner_thornwick"),
  "3": wall("dg_castle_banner_ravelle"),
  "4": wall("dg_castle_banner_stillwater"),
  D: wall("dg_castle_door_0"),
  E: wall("dg_castle_door_1"),
  F: wall("dg_castle_door_2"),
  A: wall("dg_tower_0"),
  B: wall("dg_tower_1"),
  C: wall("dg_tower_2"),
  "=": wall("dg_battlement"),
  "[": wall("dg_turret_0"),
  "]": wall("dg_turret_1"),
  L: torch("dg_lamp_post"),
  h: prop("dg_hedge"),
  q: prop("dg_banner_pole_emberhart"),
  y: prop("dg_banner_pole_thornwick"),
  v: prop("dg_banner_pole_ravelle"),
  z: prop("dg_banner_pole_stillwater"),
  f: prop("dg_fountain_0"),
  g: prop("dg_fountain_1"),
  o: prop("dg_statue"),
  T: torch("dg_brazier_post"),
  // Tomb mouths on the surface share this vocabulary.
  m: solidFloor("dg_mound"),
  n: wall("dg_mound_face"),
  k: solidFloor("dg_cliff"),
  K: wall("dg_cliff_face"),
  O: wall("dg_barrow_door"),
  Q: wall("dg_reliquary_door"),
  P: prop("dg_standing_stone"),
  "^": floor("dg_steps"),
  "-": floor("dg_threshold"),
};

export const TILESETS: Record<Tileset, Record<string, StaticTile>> = {
  crypt: underground("crypt", "dg_floor_crypt", "dg_floor_crypt_moss"),
  barrow: underground("barrow", "dg_floor_barrow", "dg_floor_barrow_stone"),
  reliquary: underground("reliquary", "dg_floor_marble", "dg_floor_marble_inlay"),
  academy: ACADEMY,
  grounds: GROUNDS,
};

/** Glyphs that are floors you can walk on, for reachability checks and wall raising. */
export function isWalkableStatic(tile: StaticTile | undefined): boolean {
  return !!tile && !tile.solid;
}
