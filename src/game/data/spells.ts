export type SpellKind = "projectile" | "nova" | "ward" | "blink";

export interface Spell {
  id: string;
  name: string;
  description: string;
  school: "Evocation" | "Conjuration" | "Abjuration" | "Transmutation" | "Divination";
  kind: SpellKind;
  manaCost: number;
  /** Cooldown in milliseconds. */
  cooldown: number;
  range: number;
  damage: number;
  color: number;
  speed?: number;
  /**
   * Hit radius for projectiles, and the visual size of the bolt - the two are
   * deliberately the same number so what you see is what you hit.
   */
  radius?: number;
}

/**
 * Spells are pure data. The SpellSystem interprets `kind`, which keeps balance
 * tweaks out of the code and makes a spell editor a realistic next step.
 */
export const SPELLS: Record<string, Spell> = {
  arcane_dart: {
    id: "arcane_dart",
    name: "Arcane Dart",
    description: "A cheap, fast dart of raw magic. The first spell every student learns.",
    school: "Evocation",
    kind: "projectile",
    manaCost: 4,
    cooldown: 260,
    range: 420,
    damage: 7,
    color: 0x8fd4ff,
    speed: 620,
    radius: 13,
  },
  fire_bolt: {
    id: "fire_bolt",
    name: "Fire Bolt",
    description: "A bolt of conjured flame that burns on impact.",
    school: "Evocation",
    kind: "projectile",
    manaCost: 9,
    cooldown: 520,
    range: 460,
    damage: 16,
    color: 0xff8a3d,
    speed: 560,
    radius: 18,
  },
  frost_shard: {
    id: "frost_shard",
    name: "Frost Shard",
    description: "A splinter of winter that slows whatever it strikes.",
    school: "Evocation",
    kind: "projectile",
    manaCost: 11,
    cooldown: 640,
    range: 430,
    damage: 13,
    color: 0x9fe8ff,
    speed: 500,
    radius: 15,
  },
  ember_nova: {
    id: "ember_nova",
    name: "Ember Nova",
    description: "A ring of fire erupts around the caster, striking everything nearby.",
    school: "Evocation",
    kind: "nova",
    manaCost: 22,
    cooldown: 2400,
    range: 108,
    damage: 21,
    color: 0xff7043,
  },
  aegis: {
    id: "aegis",
    name: "Aegis",
    description: "A shimmering ward that turns aside the next few blows.",
    school: "Abjuration",
    kind: "ward",
    manaCost: 15,
    cooldown: 6000,
    range: 0,
    damage: 0,
    color: 0xd9b44a,
  },
  blink_step: {
    id: "blink_step",
    name: "Blink Step",
    description: "Slip a short distance through space in the direction you face.",
    school: "Transmutation",
    kind: "blink",
    manaCost: 12,
    cooldown: 3200,
    range: 160,
    damage: 0,
    color: 0xb98ce0,
  },

  // --- Taught by the story ---

  kindlesight: {
    id: "kindlesight",
    name: "Kindlesight",
    description:
      "The first charm in the Vigil of the Nine: a breath of pale light that shows what is hiding, and burns what hides in the dark for a living.",
    school: "Divination",
    kind: "nova",
    manaCost: 14,
    cooldown: 1800,
    range: 150,
    damage: 12,
    color: 0xfff1b8,
  },
  stilling_word: {
    id: "stilling_word",
    name: "Stilling Word",
    description:
      "The archivists' hush, taught by Brother Hollis. A slow, heavy syllable that strikes like a closed door. Wraiths hate it.",
    school: "Abjuration",
    kind: "projectile",
    manaCost: 16,
    cooldown: 1100,
    range: 380,
    damage: 24,
    color: 0xc8b8ff,
    speed: 340,
    radius: 22,
  },
  keepers_strand: {
    id: "keepers_strand",
    name: "Keeper's Strand",
    description:
      "Pieced together from nine scattered pages: the Keepers' own ward, a thread of attention wound round the caster. It holds as long as you do.",
    school: "Abjuration",
    kind: "ward",
    manaCost: 20,
    cooldown: 5200,
    range: 0,
    damage: 0,
    color: 0x9fe0d0,
  },
};

/** New students begin untrained; the first lesson grants Arcane Dart. */
export const STARTING_SPELLS: string[] = [];

export function spellList(): Spell[] {
  return Object.values(SPELLS);
}
