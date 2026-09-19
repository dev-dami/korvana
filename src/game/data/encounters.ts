/**
 * Turn-based duels.
 *
 * The boss fights live here alongside the sparring ring, because once the
 * encounter is data the difference between "practice duel" and "climax" is a
 * health bar and a set of actions, not a second scene.
 */
export interface EncounterAction {
  label: string;
  min: number;
  max: number;
  /** Relative likelihood of choosing this action. */
  weight: number;
  /** Line added to the log, with {d} replaced by the damage dealt. */
  text: string;
}

export interface EncounterDef {
  id: string;
  name: string;
  /** Character sheet key, from gfx/characters.ts. */
  look: string;
  health: number;
  actions: EncounterAction[];
  gold: number;
  /** Sprite scale multiplier, for bosses that should loom. */
  scale?: number;
  /** Suppresses the Yield option - you cannot walk away from this one. */
  noYield?: boolean;
  /** Emits `boss_defeated` on victory, which is what the finale waits for. */
  boss?: boolean;
  victoryText: string;
  defeatText: string;
  /** Item granted once, on the first victory. */
  rewardItem?: string;
  /** Journal entry unlocked on victory. */
  lore?: string;
}

export const ENCOUNTERS: Record<string, EncounterDef> = {
  sparring: {
    id: "sparring",
    name: "Alden's Practice Shade",
    look: "shade",
    health: 70,
    gold: 0,
    actions: [
      { label: "lash out", min: 8, max: 12, weight: 3, text: "{name} lashes out for {d}." },
      { label: "press the attack", min: 13, max: 17, weight: 1, text: "{name} presses hard for {d}." },
    ],
    victoryText: "The practice shade unravels.",
    defeatText: "You are knocked from your feet.",
  },

  husk_duel: {
    id: "husk_duel",
    name: "Cinder Husk",
    look: "husk",
    health: 90,
    gold: 15,
    actions: [
      { label: "strike", min: 9, max: 14, weight: 3, text: "The husk strikes for {d}." },
      { label: "seize", min: 16, max: 22, weight: 1, text: "It seizes your arm and burns for {d}." },
    ],
    victoryText: "The husk collapses into ash that is already cold.",
    defeatText: "The ash gets into your throat and you cannot get up.",
    rewardItem: "lesser_tonic",
  },

  vale: {
    id: "vale",
    name: "Vale",
    look: "vale",
    health: 220,
    gold: 200,
    scale: 4.6,
    noYield: true,
    boss: true,
    actions: [
      { label: "cold light", min: 12, max: 18, weight: 3, text: "Vale draws down cold light for {d}." },
      { label: "the long dark", min: 24, max: 32, weight: 1, text: "Something answers him from the well for {d}." },
      { label: "ward", min: 0, max: 0, weight: 1, text: "Vale raises a ward and gives himself room." },
    ],
    victoryText: "Vale goes down, and stays down, and the singing stops.",
    defeatText: "The well comes up to meet you and the light goes out.",
    rewardItem: "keepers_greatsword",
    lore: "the_moonwell",
  },
};

export function encounterById(id: string): EncounterDef | undefined {
  return ENCOUNTERS[id];
}
