export type SwingKind = "light" | "heavy";

export interface SwingDef {
  /** Damage before any variance. */
  damage: number;
  /** Milliseconds before the same swing can be used again. */
  cooldown: number;
  /** Half-angle of the swing arc, in radians. */
  arc: number;
  /** How far the blade reaches, in pixels. */
  reach: number;
  /** Milliseconds the character is committed to the swing. */
  duration: number;
}

export interface WeaponDef {
  id: string;
  name: string;
  description: string;
  kind: "sword" | "greatsword" | "dagger" | "wand";
  light: SwingDef;
  heavy: SwingDef;
  /** Blade colour, used for the slash effect. */
  color: number;
  /** Extra reach drawn for the slash sprite. */
  visualLength: number;
  value: number;
}

/**
 * Weapons are data. Light swings are quick and safe, heavy swings hit far
 * harder but lock you in place for longer - which is the whole decision the
 * combat system asks the player to make.
 */
export const WEAPONS: Record<string, WeaponDef> = {
  training_sword: {
    id: "training_sword",
    name: "Training Sword",
    description: "Blunted, scuffed, and issued to every first-year. Reliable in the way a stick is reliable.",
    kind: "sword",
    color: 0xc8ccd4,
    visualLength: 34,
    value: 15,
    light: { damage: 6, cooldown: 340, arc: 0.95, reach: 52, duration: 150 },
    heavy: { damage: 15, cooldown: 900, arc: 0.7, reach: 62, duration: 330 },
  },
  iron_longsword: {
    id: "iron_longsword",
    name: "Iron Longsword",
    description: "Dull grey steel with a chipped fuller. It has been sharpened a great many times.",
    kind: "sword",
    color: 0xaeb4c0,
    visualLength: 46,
    value: 90,
    light: { damage: 10, cooldown: 360, arc: 0.95, reach: 60, duration: 160 },
    heavy: { damage: 24, cooldown: 1000, arc: 0.72, reach: 72, duration: 360 },
  },
  duelists_rapier: {
    id: "duelists_rapier",
    name: "Duelist's Rapier",
    description: "Narrow, quick, and rather pleased with itself. Rewards patience and punishes greed.",
    kind: "sword",
    color: 0xdfe6ee,
    visualLength: 52,
    value: 140,
    light: { damage: 7, cooldown: 200, arc: 0.65, reach: 66, duration: 110 },
    heavy: { damage: 17, cooldown: 880, arc: 0.5, reach: 78, duration: 340 },
  },
  ember_blade: {
    id: "ember_blade",
    name: "Ember Blade",
    description: "The steel is warm even in snow. Something inside it is still burning.",
    kind: "sword",
    color: 0xffa04d,
    visualLength: 44,
    value: 260,
    light: { damage: 12, cooldown: 320, arc: 1.0, reach: 58, duration: 150 },
    heavy: { damage: 30, cooldown: 1050, arc: 0.8, reach: 70, duration: 340 },
  },
  keepers_greatsword: {
    id: "keepers_greatsword",
    name: "Keeper's Greatsword",
    description: "Too heavy for the corridors. Perfect for everything else.",
    kind: "greatsword",
    color: 0x9aa2b0,
    visualLength: 62,
    value: 320,
    light: { damage: 15, cooldown: 540, arc: 1.15, reach: 70, duration: 230 },
    heavy: { damage: 40, cooldown: 1300, arc: 0.95, reach: 86, duration: 430 },
  },
};

export const STARTING_WEAPON = "training_sword";

/** Weapons the player can cycle through with T, in a stable order. */
export const WEAPON_ORDER = [
  "training_sword",
  "iron_longsword",
  "duelists_rapier",
  "ember_blade",
  "keepers_greatsword",
];

export function weaponById(id: string): WeaponDef {
  return WEAPONS[id] ?? WEAPONS[STARTING_WEAPON]!;
}

export function weaponList(): WeaponDef[] {
  return Object.values(WEAPONS);
}
