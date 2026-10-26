import type { Biome } from "../types";

/**
 * Decorative scatter tables. The terrain generator decides *where* something
 * solid stands; these only decide what it looks like, plus the walk-through
 * ground cover and flat decals that give each biome its texture.
 */

type Weighted = ReadonlyArray<readonly [string, number]>;

function pickWeighted(table: Weighted, roll: number): string | null {
  let total = 0;
  for (const [, w] of table) total += w;
  let r = roll * total;
  for (const [key, w] of table) {
    r -= w;
    if (r <= 0) return key;
  }
  return table[table.length - 1]?.[0] ?? null;
}

/**
 * Species swaps for the solid props the generator places. A swap keeps the
 * footprint (tree for tree, rock for rock), so collision is unchanged.
 */
const VARIETY: Partial<Record<string, Partial<Record<Biome, Weighted>>>> = {
  prop_oak: {
    forest: [["prop_oak", 5], ["prop_maple", 1], ["prop_birch", 2]],
    meadow: [["prop_oak", 6], ["prop_birch", 2], ["prop_maple", 1]],
    marsh: [["prop_willow", 3], ["prop_oak", 1]],
    highland: [["prop_oak", 2], ["prop_birch", 2]],
  },
  prop_oak_small: {
    forest: [["prop_oak_small", 4], ["prop_birch_small", 2], ["prop_maple_small", 1]],
    meadow: [["prop_oak_small", 4], ["prop_birch_small", 2]],
    marsh: [["prop_willow_small", 2], ["prop_oak_small", 1]],
  },
  prop_pine: {
    peak: [["prop_pine_snow", 1]],
  },
  prop_pine_small: {
    peak: [["prop_pine_snow_small", 1]],
  },
  prop_bush: {
    forest: [["prop_bush", 3], ["prop_bush_berry", 2], ["prop_fern_big", 2]],
    meadow: [["prop_bush", 3], ["prop_bush_flower", 2]],
    marsh: [["prop_bush", 2], ["prop_reeds_big", 2]],
    scar: [["prop_bush_dead", 1]],
    beach: [["prop_bush_dune", 1]],
  },
  prop_bush_small: {
    forest: [["prop_bush_small", 2], ["prop_bush_berry_small", 1]],
    meadow: [["prop_bush_small", 2], ["prop_bush_flower_small", 2]],
    scar: [["prop_bush_dead", 1]],
    beach: [["prop_bush_dune", 1]],
  },
  prop_rock: {
    forest: [["prop_rock_mossy", 3], ["prop_stump", 2], ["prop_log", 2], ["prop_rock", 1]],
    meadow: [["prop_rock", 5], ["prop_rock_mossy", 2], ["prop_ruin_pillar", 1]],
    highland: [["prop_rock", 5], ["prop_rock_mossy", 2], ["prop_standing_stone", 1]],
    marsh: [["prop_stump", 2], ["prop_rock_mossy", 2]],
    peak: [["prop_rock_snow", 1]],
    scar: [["prop_rock_ash", 4], ["prop_ruin_pillar", 1]],
    beach: [["prop_rock_sand", 3], ["prop_rock", 1]],
  },
  prop_rock_small: {
    forest: [["prop_rock_small_mossy", 2], ["prop_rock_small", 1]],
    meadow: [["prop_rock_small", 2], ["prop_rock_small_mossy", 1]],
    peak: [["prop_rock_small_snow", 1]],
    scar: [["prop_rock_small_ash", 1]],
  },
  prop_deadtree: {
    scar: [["prop_deadtree", 3], ["prop_deadtree_small", 2]],
    peak: [["prop_deadtree_small", 1]],
  },
};

export function propVariety(texture: string, biome: Biome, roll: number): string {
  const table = VARIETY[texture]?.[biome];
  if (!table) return texture;
  return pickWeighted(table, roll) ?? texture;
}

/** Chance per free tile of walk-through ground cover. */
export const COVER_DENSITY: Partial<Record<Biome, number>> = {
  meadow: 0.07,
  forest: 0.1,
  marsh: 0.12,
  highland: 0.05,
  beach: 0.025,
  scar: 0.03,
  peak: 0.02,
};

const COVER: Partial<Record<Biome, Weighted>> = {
  meadow: [["cover_tallgrass_0", 4], ["cover_tallgrass_1", 3], ["cover_tallgrass_2", 2], ["cover_wildflowers", 2]],
  forest: [["cover_fern_0", 4], ["cover_fern_1", 3], ["cover_mushrooms", 2], ["cover_tallgrass_1", 2]],
  marsh: [["cover_reeds_0", 4], ["cover_reeds_1", 3], ["cover_tallgrass_2", 2]],
  highland: [["cover_heather", 3], ["cover_tallgrass_0", 1]],
  beach: [["cover_dunegrass", 1]],
  scar: [["cover_deadgrass", 1]],
  peak: [["cover_snowgrass", 1]],
};

export function coverFor(biome: Biome, roll: number): string | null {
  const table = COVER[biome];
  return table ? pickWeighted(table, roll) : null;
}

/** Extra flat decals on top of the generator's own flower scatter. */
export const EXTRA_DECALS: Partial<Record<Biome, number>> = {
  meadow: 0.05,
  forest: 0.12,
  marsh: 0.08,
  highland: 0.1,
  beach: 0.06,
  scar: 0.1,
  peak: 0.06,
};

const DECALS: Partial<Record<Biome, Weighted>> = {
  meadow: [
    ["decal_flowers_rose", 2],
    ["decal_flowers_gold", 3],
    ["decal_flowers_violet", 2],
    ["decal_flowers_white", 3],
    ["decal_flowers_mixed", 2],
    ["decal_clover", 3],
    ["decal_pebbles", 1],
  ],
  forest: [
    ["decal_leaves", 4],
    ["decal_twigs", 2],
    ["decal_mushroom_ring", 1],
    ["decal_flowers_white", 1],
    ["decal_moss", 2],
  ],
  marsh: [["decal_puddle", 3], ["decal_lilies", 2], ["decal_flowers_violet", 1], ["decal_moss", 1]],
  beach: [["decal_shells", 2], ["decal_pebbles", 2], ["decal_driftwood", 1]],
  highland: [["decal_stones", 3], ["decal_moss", 2], ["decal_flowers_white", 1], ["decal_flowers_violet", 1]],
  peak: [["decal_snowdrift", 3], ["decal_stones", 1]],
  scar: [["decal_bones", 0.4], ["decal_charred", 3], ["decal_embers", 2]],
};

export function decalFor(biome: Biome, roll: number): string | null {
  const table = DECALS[biome];
  return table ? pickWeighted(table, roll) : null;
}
