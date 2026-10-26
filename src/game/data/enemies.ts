import type { Biome } from "../types";

/**
 * An enemy archetype. Spawning is driven by `spawn`: a weight per biome, so
 * walking north out of the meadow into the ash changes what is hunting you
 * without any code deciding that it should.
 */
export interface EnemyArchetype {
  id: string;
  name: string;
  /** Character sheet key, from gfx/characters.ts. */
  look: string;
  health: number;
  damage: number;
  speed: number;
  aggroRange: number;
  attackRange: number;
  /** How far the enemy will stray from where it spawned. */
  leash: number;
  /** Gold awarded on death. */
  gold: number;
  drop?: { id: string; chance: number };
  /** Relative spawn weight per biome. Omitted biomes spawn none. */
  spawn: Partial<Record<Biome, number>>;
}

export const ENEMIES: Record<string, EnemyArchetype> = {
  shade: {
    id: "shade",
    name: "Practice Shade",
    look: "shade",
    health: 24,
    damage: 6,
    speed: 78,
    aggroRange: 260,
    attackRange: 38,
    leash: 420,
    gold: 2,
    spawn: { meadow: 0.45, forest: 0.5, highland: 0.3, beach: 0.3, marsh: 0.4 },
  },
  husk: {
    id: "husk",
    name: "Cinder Husk",
    look: "husk",
    health: 34,
    damage: 9,
    speed: 84,
    aggroRange: 290,
    attackRange: 40,
    leash: 460,
    gold: 4,
    drop: { id: "lesser_tonic", chance: 0.22 },
    spawn: { scar: 0.6 },
  },
  wraith: {
    id: "wraith",
    name: "Splinter Wraith",
    look: "wraith",
    health: 46,
    damage: 13,
    speed: 96,
    aggroRange: 330,
    attackRange: 44,
    leash: 520,
    gold: 7,
    // A second, slower source of shards for anyone who would rather fight than
    // pick them off the ground.
    drop: { id: "moonwell_shard", chance: 0.3 },
    spawn: { scar: 0.5 },
  },
  adept: {
    id: "adept",
    name: "Hollow Adept",
    look: "adept",
    health: 62,
    damage: 16,
    speed: 88,
    aggroRange: 360,
    attackRange: 46,
    leash: 560,
    gold: 12,
    drop: { id: "moonwell_shard", chance: 0.5 },
    spawn: { scar: 0.22 },
  },

  // --- Tomb dwellers. They spawn in the `crypt` biome, which is every
  // underground level; the Academy interior is kept clear by its landmark's
  // safe radius, and each tomb's landing and relic chamber by theirs. ---
  crypt_bat: {
    id: "crypt_bat",
    name: "Crypt Bat",
    look: "bat",
    health: 14,
    damage: 4,
    speed: 118,
    aggroRange: 250,
    attackRange: 34,
    leash: 380,
    gold: 1,
    spawn: { crypt: 0.5 },
  },
  tomb_spider: {
    id: "tomb_spider",
    name: "Tomb Spider",
    look: "spider",
    health: 26,
    damage: 7,
    speed: 92,
    aggroRange: 240,
    attackRange: 36,
    leash: 360,
    gold: 3,
    drop: { id: "lesser_tonic", chance: 0.18 },
    spawn: { crypt: 0.34 },
  },
  bone_warden: {
    id: "bone_warden",
    name: "Bone Warden",
    look: "skeleton",
    health: 44,
    damage: 10,
    speed: 76,
    aggroRange: 280,
    attackRange: 40,
    leash: 420,
    gold: 6,
    drop: { id: "mana_draught", chance: 0.2 },
    spawn: { crypt: 0.2 },
  },
  barrow_guardian: {
    id: "barrow_guardian",
    name: "Barrow Guardian",
    look: "guardian",
    // Slow and heavy: a wall of armour you outpace rather than outfight.
    health: 72,
    damage: 14,
    speed: 58,
    aggroRange: 220,
    attackRange: 42,
    leash: 300,
    gold: 12,
    drop: { id: "lesser_tonic", chance: 0.4 },
    spawn: { crypt: 0.1 },
  },
};

export function enemyById(id: string): EnemyArchetype {
  return ENEMIES[id] ?? ENEMIES.shade!;
}

/** Picks an archetype that fits the biome, or null where nothing spawns. */
export function rollBiomeEnemy(biome: Biome, roll: number): EnemyArchetype | null {
  let total = 0;
  for (const archetype of Object.values(ENEMIES)) total += archetype.spawn[biome] ?? 0;
  if (total <= 0) return null;

  let pick = roll * total;
  for (const archetype of Object.values(ENEMIES)) {
    const weight = archetype.spawn[biome] ?? 0;
    pick -= weight;
    if (pick <= 0) return archetype;
  }
  return null;
}

/** Biomes that should never be populated, so spawn attempts can bail early. */
export function biomeHasEnemies(biome: Biome): boolean {
  for (const archetype of Object.values(ENEMIES)) {
    if ((archetype.spawn[biome] ?? 0) > 0) return true;
  }
  return false;
}
