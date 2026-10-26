export type ItemKind = "potion" | "wand" | "key" | "relic" | "material" | "book" | "weapon";

export interface ItemDef {
  id: string;
  name: string;
  description: string;
  kind: ItemKind;
  value: number;
  stackable: boolean;
  /**
   * What reading or turning over the item says, for keepsakes and books that
   * have no mechanical use. Shown instead of "cannot be used here"; using the
   * item still emits `item_used`, which is how reading a book can be a quest.
   */
  useText?: string;
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

  // --- Tomb relics, keys and pages (Levels & Tomb Mechanics workstream) ---
  // Ids are binding (docs/DESIGN.md). The relics are claimed from pedestals,
  // the pages hide behind secrets: three in each tomb.
  wardens_lantern: {
    id: "wardens_lantern",
    name: "The Warden's Lantern",
    description: "A Keeper's lantern of grey glass. Its thin light finds seams in stone where no seam should be.",
    kind: "relic",
    value: 0,
    stackable: false,
  },
  ninefold_key: {
    id: "ninefold_key",
    name: "The Ninefold Key",
    description: "Nine wards and no teeth. It opens nothing a locksmith made, and every seal a Keeper did.",
    kind: "key",
    value: 0,
    stackable: false,
  },
  silent_bell: {
    id: "silent_bell",
    name: "The Silent Bell",
    description: "A bell the size of a fist that makes no sound at all. Things that should not be awake find that unbearable.",
    kind: "relic",
    value: 0,
    stackable: false,
  },
  keeper_page: {
    id: "keeper_page",
    name: "Keeper's Page",
    description: "A leaf torn from one of the Nine Keepers' daybooks. Master Fennick would give a great deal to see it.",
    kind: "book",
    value: 30,
    stackable: true,
  },

  // ===================================================== STORY ITEMS
  // Owned by the story workstream. Keepsakes, letters and borrowed books handed
  // over in dialogue. The Keepers' relics (wardens_lantern, ninefold_key,
  // silent_bell) and keeper_page are defined by the levels workstream.

  badge_emberhart: {
    id: "badge_emberhart",
    name: "Emberhart Pin",
    description: "A brass stag whose crown is a single drop of red enamel. Warm, which brass should not be.",
    kind: "relic",
    value: 0,
    stackable: false,
    useText: "You turn the pin over. On the back, very small: 'Go first, and say so.'",
  },
  badge_thornwick: {
    id: "badge_thornwick",
    name: "Thornwick Pin",
    description: "A briar wreath in green enamel and bone. One thorn has been filed down so it will not catch.",
    kind: "relic",
    value: 0,
    stackable: false,
    useText: "You turn the pin over. On the back, very small: 'Stay. Tend. Hold.'",
  },
  badge_ravelle: {
    id: "badge_ravelle",
    name: "Ravelle Pin",
    description: "A silver raven holding a key in its beak. The key is real, and opens nothing anyone has found.",
    kind: "relic",
    value: 0,
    stackable: false,
    useText: "You turn the pin over. On the back, very small: 'Ask the second question.'",
  },
  badge_stillwater: {
    id: "badge_stillwater",
    name: "Stillwater Pin",
    description: "A heron in slate and pearl, standing on one leg in a ring of pale water.",
    kind: "relic",
    value: 0,
    stackable: false,
    useText: "You turn the pin over. On the back, very small: 'Wait. Then wait a little more.'",
  },

  overdue_maps: {
    id: "overdue_maps",
    name: "On the Unreliability of Maps",
    description: "Library copy, eleven years overdue. Someone has drawn the same road on the endpapers over and over.",
    kind: "book",
    value: 0,
    stackable: false,
    useText: "The margins are full of a careful hand: two names, and a road that keeps coming back to where it began.",
  },
  overdue_ferns: {
    id: "overdue_ferns",
    name: "A Bestiary of Lesser Ferns",
    description: "Library copy, swollen to twice its thickness with pressed flowers. Several of them are still faintly alive.",
    kind: "book",
    value: 0,
    stackable: false,
    useText: "A pressed sprig of ashbloom falls out. On the page beneath, in pencil: 'For W., who said nothing would grow up there.'",
  },
  overdue_accord: {
    id: "overdue_accord",
    name: "The Accord of the Nine (Abridged)",
    description: "An abridged edition for students. Every abridgement has been carefully pencilled back in.",
    kind: "book",
    value: 0,
    stackable: false,
    useText: "Corvin has written in the margin: 'Abridged by whom? And what did they leave out? V. says: everything that matters.'",
  },
  keepers_vigil: {
    id: "keepers_vigil",
    name: "The Vigil of the Nine",
    description: "A narrow black book that is cold to hold. Not to leave the Restricted Section. Reading it teaches Kindlesight.",
    kind: "book",
    value: 0,
    stackable: false,
    useText: "You read the Vigil by its own faint light. The last page is a word, and the word is a shelf opening somewhere behind you.",
  },
  vey_letter: {
    id: "vey_letter",
    name: "Letter for the Keeper",
    description: "Sealed in grey wax with the Headmistress's ring. Addressed, in a hand that shook, to 'Ilse, if she will read it.'",
    kind: "book",
    value: 0,
    stackable: false,
    useText: "It is sealed, and it is not yours. You put it carefully away again.",
  },
  tobins_token: {
    id: "tobins_token",
    name: "Tobin's Keeper-Token",
    description: "A disc of grey stone on a cord, worn smooth by a thumb. A name is cut into one face: TOBIN ASHDOWN.",
    kind: "relic",
    value: 0,
    stackable: false,
    useText: "On the other face, cut later and less neatly: 'S. - I stayed. Do not come after me. Come after me anyway.'",
  },
  serens_compass: {
    id: "serens_compass",
    name: "Seren's Compass",
    description: "A battered brass compass that does not point north. Seren says it points at whatever you have lost. It points at you.",
    kind: "relic",
    value: 60,
    stackable: false,
    useText: "The needle swings, hesitates, and settles on the direction of the north range.",
  },
  ashdown_coin: {
    id: "ashdown_coin",
    name: "Ashdown's Lucky Coin",
    description: "A coin from a lowland mint, both faces worn to nothing. It has, Seren says, never once been lucky.",
    kind: "relic",
    value: 1,
    stackable: false,
    useText: "You flip it. It lands on its edge, which seems like an opinion.",
  },
  vales_notebook: {
    id: "vales_notebook",
    name: "Vale's Notebook",
    description: "Small, black, full. Vale's hand is beautiful and gets smaller as the pages go on, as if he were running out of room in himself.",
    kind: "book",
    value: 0,
    stackable: false,
    useText: "The last full page is a list of nine names. One of them has been underlined so hard the nib went through: ANSA VALE.",
  },
  amelias_ribbon: {
    id: "amelias_ribbon",
    name: "Amelia's Ribbon",
    description: "An ember-red ribbon, slightly scorched at one end. She wore it at her own Choosing, and says it has been brave ever since.",
    kind: "relic",
    value: 0,
    stackable: false,
    useText: "You tie it round your wrist. It is, very faintly, warm.",
  },
  lamp_coal: {
    id: "lamp_coal",
    name: "A Coal from the Lamp",
    description: "A pea-sized ember the Choosing Lamp gave you. It has not gone out. It does not seem to intend to.",
    kind: "relic",
    value: 0,
    stackable: false,
    useText: "The coal brightens a little, as if it had been asked a question and was pleased to be.",
  },
};

export function itemList(): ItemDef[] {
  return Object.values(ITEMS);
}
