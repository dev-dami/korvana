export type ItemKind = "potion" | "wand" | "key" | "relic" | "material" | "book" | "weapon";

export interface ItemDef {
  id: string;
  name: string;
  description: string;
  kind: ItemKind;
  value: number;
  stackable: boolean;
}

export const ITEMS: Record<string, ItemDef> = {
  lesser_tonic: {
    id: "lesser_tonic",
    name: "Lesser Tonic",
    description: "Restores 40 health. Tastes faintly of pine.",
    kind: "potion",
    value: 12,
    stackable: true,
  },
  mana_draught: {
    id: "mana_draught",
    name: "Mana Draught",
    description: "Restores 35 mana. Bottled starlight, allegedly.",
    kind: "potion",
    value: 18,
    stackable: true,
  },
  ember_wand: {
    id: "ember_wand",
    name: "Ember Wand",
    description: "Warm to the touch. Faintly hums when fire magic is near.",
    kind: "wand",
    value: 90,
    stackable: false,
  },
  brass_key: {
    id: "brass_key",
    name: "Brass Key",
    description: "Opens something. Nobody remembers what.",
    kind: "key",
    value: 5,
    stackable: true,
  },
  moonwell_shard: {
    id: "moonwell_shard",
    name: "Moonwell Shard",
    description: "A splinter of cold light. The Keepers pay well for these.",
    kind: "relic",
    value: 140,
    stackable: true,
  },
  quillfeather: {
    id: "quillfeather",
    name: "Quill Feather",
    description: "Plucked from a very patient owl.",
    kind: "material",
    value: 3,
    stackable: true,
  },
  primer_of_wards: {
    id: "primer_of_wards",
    name: "Primer of Wards",
    description: "Reading it teaches the Aegis spell.",
    kind: "book",
    value: 120,
    stackable: false,
  },

  // Weapons pair with data/weapons.ts: the id must match a WeaponDef.
  iron_longsword: {
    id: "iron_longsword",
    name: "Iron Longsword",
    description: "Dull grey steel, sharpened a great many times. Equip it to wield it.",
    kind: "weapon",
    value: 90,
    stackable: false,
  },
  duelists_rapier: {
    id: "duelists_rapier",
    name: "Duelist's Rapier",
    description: "Narrow and quick. Rewards patience and punishes greed.",
    kind: "weapon",
    value: 140,
    stackable: false,
  },
  ember_blade: {
    id: "ember_blade",
    name: "Ember Blade",
    description: "Warm even in snow. Something inside it is still burning.",
    kind: "weapon",
    value: 260,
    stackable: false,
  },
  keepers_greatsword: {
    id: "keepers_greatsword",
    name: "Keeper's Greatsword",
    description: "Too heavy for the corridors. Perfect for everything else.",
    kind: "weapon",
    value: 320,
    stackable: false,
  },
};

export function itemList(): ItemDef[] {
  return Object.values(ITEMS);
}
