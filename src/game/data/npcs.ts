/**
 * Where an NPC stands. Act I's cast lives around the player's arrival; anyone
 * the story meets later is pinned to the landmark or named spot they belong
 * to, so they are in the right place no matter which direction the player
 * wandered in from.
 */
export type NpcHome =
  | { kind: "arrival"; dx: number; dy: number }
  | { kind: "landmark"; id: string; dx: number; dy: number }
  /** A named spot from data/spots.ts, for precise placement inside a structure. */
  | { kind: "spot"; id: string };

export interface NpcDef {
  id: string;
  name: string;
  title: string;
  look: string;
  dialogueId: string;
  home: NpcHome;
  /** How far from home the NPC is willing to wander. */
  roam: number;
  /** Only appears once this flag is set. Used to stage late arrivals. */
  requiresFlag?: string;
  /**
   * Leaves the world once this flag (or any of these flags) is set. Used to
   * move a character along the story: Seren at the barrow mouth is hidden
   * when she reappears on the Reliquary steps.
   */
  hiddenByFlag?: string | string[];
}

/**
 * The cast.
 *
 * One character may have several entries - the same `id`, so affinity and
 * `npc_talked` stay attached to the person, but a different home, dialogue and
 * pair of flags for each place the story finds them.
 */
export const NPC_ROSTER: NpcDef[] = [
  // --- Act I: the courtyard outside the Academy ---
  {
    id: "professor_alden",
    name: "Professor Alden",
    title: "Professor of Divination",
    look: "professor",
    dialogueId: "alden_intro",
    home: { kind: "arrival", dx: 3, dy: -3 },
    roam: 70,
  },
  {
    id: "professor_wick",
    name: "Mistress Wick",
    title: "Mistress of Herbology and Wards",
    look: "herbologist",
    dialogueId: "wick_intro",
    home: { kind: "arrival", dx: -5, dy: 2 },
    roam: 90,
  },
  {
    id: "student_amelia",
    name: "Amelia",
    title: "Third-year, Emberhart",
    look: "student",
    dialogueId: "amelia_intro",
    home: { kind: "arrival", dx: 4, dy: 5 },
    roam: 130,
  },
  {
    id: "student_corvin",
    name: "Corvin",
    title: "Third-year, Ravelle",
    look: "scholar",
    dialogueId: "corvin_intro",
    home: { kind: "arrival", dx: -6, dy: -6 },
    roam: 120,
    hiddenByFlag: "corvin_gone",
  },
  {
    id: "owl_pip",
    name: "Pip",
    title: "Amelia's owl, returned",
    look: "owl",
    dialogueId: "pip_home",
    home: { kind: "arrival", dx: 5, dy: 6 },
    roam: 60,
    requiresFlag: "owl_done",
  },

  // --- Inside the Academy ---
  {
    id: "headmistress_vey",
    name: "Headmistress Vey",
    title: "Headmistress of Korvana",
    look: "headmistress",
    dialogueId: "vey_main",
    home: { kind: "spot", id: "hall_dais" },
    roam: 20,
  },
  {
    id: "choosing_lamp",
    name: "The Choosing Lamp",
    title: "Lit before the Academy was",
    look: "lamp",
    dialogueId: "lamp_choosing",
    home: { kind: "spot", id: "hall_lamp" },
    roam: 0,
  },
  {
    id: "librarian_fennick",
    name: "Master Fennick",
    title: "Librarian",
    look: "librarian",
    dialogueId: "fennick_main",
    home: { kind: "spot", id: "library_desk" },
    roam: 24,
  },

  // --- The treeline ---
  {
    id: "owl_pip",
    name: "Pip",
    title: "An owl, roosting",
    look: "owl",
    dialogueId: "pip_lost",
    home: { kind: "landmark", id: "treeline", dx: 2, dy: -6 },
    roam: 0,
    requiresFlag: "pip_lost",
    hiddenByFlag: "pip_found",
  },
  {
    id: "student_corvin",
    name: "Corvin",
    title: "Third-year, a long way from his books",
    look: "scholar",
    dialogueId: "corvin_treeline",
    home: { kind: "landmark", id: "treeline", dx: -4, dy: 3 },
    roam: 30,
    requiresFlag: "corvin_gone",
    hiddenByFlag: "corvin_home",
  },
  {
    id: "student_corvin",
    name: "Corvin",
    title: "Third-year, Ravelle",
    look: "scholar",
    dialogueId: "corvin_intro",
    home: { kind: "arrival", dx: -6, dy: -6 },
    roam: 120,
    requiresFlag: "corvin_home",
  },

  // --- Act II: the Undercroft ---
  {
    id: "ghost_hollis",
    name: "Brother Hollis",
    title: "Archivist, drowned",
    look: "ghost",
    dialogueId: "hollis_main",
    home: { kind: "spot", id: "undercroft_ghost" },
    roam: 40,
    requiresFlag: "undercroft_open",
    hiddenByFlag: "hollis_released",
  },

  // --- Vale, wherever he is caught between errands ---
  {
    id: "vale",
    name: "Vale",
    title: "Fourth-year, withdrawn",
    look: "vale",
    dialogueId: "vale_first",
    home: { kind: "landmark", id: "scarred_ground", dx: 3, dy: 1 },
    roam: 30,
    requiresFlag: "vale_glimpsed",
    hiddenByFlag: ["vale_met_1", "vale_due_2"],
  },
  {
    id: "vale",
    name: "Vale",
    title: "Fourth-year, withdrawn",
    look: "vale",
    dialogueId: "vale_second",
    home: { kind: "landmark", id: "treeline", dx: -7, dy: 0 },
    roam: 20,
    requiresFlag: "vale_due_2",
    hiddenByFlag: ["vale_met_2", "relics_gathered"],
  },

  // --- Act III: Seren Ashdown ---
  {
    id: "seren_ashdown",
    name: "Seren Ashdown",
    title: "Relic-hunter, expelled",
    look: "raider",
    dialogueId: "seren_barrow",
    home: { kind: "spot", id: "barrow_mouth" },
    roam: 36,
    requiresFlag: "barrow_unsealed",
    hiddenByFlag: "reliquary_unsealed",
  },
  {
    id: "seren_ashdown",
    name: "Seren Ashdown",
    title: "Relic-hunter, expelled",
    look: "raider",
    dialogueId: "seren_reliquary",
    home: { kind: "spot", id: "reliquary_steps" },
    roam: 30,
    requiresFlag: "reliquary_unsealed",
    hiddenByFlag: "seren_bargain_done",
  },
  {
    id: "seren_ashdown",
    name: "Seren Ashdown",
    title: "Relic-hunter, keeping the fire",
    look: "raider",
    dialogueId: "seren_camp",
    home: { kind: "landmark", id: "keeper_camp", dx: -3, dy: 5 },
    roam: 40,
    requiresFlag: "seren_to_camp",
    hiddenByFlag: "seren_at_wellhead",
  },
  {
    id: "seren_ashdown",
    name: "Seren Ashdown",
    title: "Relic-hunter",
    look: "raider",
    dialogueId: "seren_wellhead",
    home: { kind: "landmark", id: "wellhead", dx: -2, dy: 10 },
    roam: 24,
    requiresFlag: "seren_at_wellhead",
  },

  // --- Act IV: the Scar ---
  {
    id: "keeper_ilse",
    name: "Keeper Ilse",
    title: "The Last Keeper",
    look: "keeper",
    dialogueId: "ilse_main",
    home: { kind: "landmark", id: "keeper_camp", dx: 3, dy: 5 },
    roam: 48,
  },

  // --- Act V: the Wellhead ---
  {
    id: "vale",
    name: "Vale",
    title: "Fourth-year, withdrawn",
    look: "vale",
    dialogueId: "vale_final",
    home: { kind: "landmark", id: "wellhead", dx: 5, dy: 12 },
    roam: 24,
    requiresFlag: "ilse_done",
    hiddenByFlag: "ending_defeated",
  },
];

export function npcById(id: string): NpcDef | undefined {
  return NPC_ROSTER.find((n) => n.id === id);
}
