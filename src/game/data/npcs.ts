/**
 * Where an NPC stands. Act I's cast lives around the player's arrival; anyone
 * the story meets later is pinned to the landmark they belong to, so they are
 * in the right place no matter which direction the player wandered in from.
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
}

export const NPC_ROSTER: NpcDef[] = [
  // --- Act I: the arrival grounds ---
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
    name: "Professor Wick",
    title: "Mistress of Herbology",
    look: "herbologist",
    dialogueId: "wick_intro",
    home: { kind: "arrival", dx: -5, dy: 2 },
    roam: 90,
  },
  {
    id: "student_amelia",
    name: "Amelia",
    title: "Third-year student",
    look: "student",
    dialogueId: "amelia_intro",
    home: { kind: "arrival", dx: 4, dy: 5 },
    roam: 130,
  },
  {
    id: "student_corvin",
    name: "Corvin",
    title: "Third-year student",
    look: "scholar",
    dialogueId: "corvin_intro",
    home: { kind: "arrival", dx: -6, dy: -6 },
    roam: 120,
  },

  // --- Act II: the Scar ---
  {
    id: "keeper_ilse",
    name: "Keeper Ilse",
    title: "The Last Keeper",
    look: "herbologist",
    dialogueId: "ilse_intro",
    home: { kind: "landmark", id: "keeper_camp", dx: 3, dy: 5 },
    roam: 48,
  },

  // --- Act III: the Wellhead ---
  {
    id: "vale",
    name: "Vale",
    title: "Fourth-year, withdrawn",
    look: "vale",
    dialogueId: "vale_intro",
    home: { kind: "landmark", id: "wellhead", dx: 5, dy: 12 },
    roam: 24,
    requiresFlag: "ilse_done",
  },
];

export function npcById(id: string): NpcDef | undefined {
  return NPC_ROSTER.find((n) => n.id === id);
}
