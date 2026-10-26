/**
 * Turn-based duels.
 *
 * The boss fights live here alongside the sparring ring, because once the
 * encounter is data the difference between "practice duel" and "climax" is a
 * health bar and a set of actions, not a second scene.
 *
 * A fight that should change with the story is written as several encounters
 * and the story picks one: Vale is a different opponent if you have listened to
 * him, and the second half of the finale is a different fight if Seren came.
 * Phases are consecutive encounters joined by a cutscene, so each phase can
 * say something of its own between the blows.
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
  /**
   * Item granted once, on the first victory. Granting it also sets the flag
   * `battle_reward_<id>`, which the story reads as "you have beaten them".
   */
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
      { label: "mimic", min: 6, max: 9, weight: 1, text: "The shade copies your stance badly, and hits you anyway, for {d}." },
    ],
    victoryText: "The practice shade unravels, and reassembles itself sulkily at the edge of the ring.",
    defeatText: "You are knocked from your feet. The shade waits, politely, for you to get up.",
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

  // ------------------------------------------------------------ Seren

  /** The Reliquary steps, if you raced her: she wants the Bell, and she fights like it. */
  seren_duel: {
    id: "seren_duel",
    name: "Seren Ashdown",
    look: "raider",
    health: 150,
    gold: 30,
    scale: 4.2,
    actions: [
      { label: "hook", min: 10, max: 15, weight: 3, text: "Seren hooks your ankle with the rope and you go down hard, for {d}." },
      { label: "flare", min: 14, max: 19, weight: 2, text: "She cracks a flare in your face - \"Expelled, not stupid\" - for {d}." },
      { label: "feint", min: 0, max: 0, weight: 1, text: "Seren feints, grins, and does not follow through. \"Still deciding whether I like you.\"" },
      { label: "old trick", min: 18, max: 24, weight: 1, text: "\"Fennick taught me this one by accident.\" A shelf-ward, inverted. {d}." },
    ],
    victoryText: "Seren sits down on the steps, rope slack, and laughs until it turns into something else.",
    defeatText: "Seren steps back, breathing hard. \"Get up, first-year. I'm not leaving you on a mountain.\"",
    rewardItem: "serens_compass",
  },

  /** The Wellhead, if she is still your rival when it matters. */
  seren_wellhead: {
    id: "seren_wellhead",
    name: "Seren Ashdown",
    look: "raider",
    health: 175,
    gold: 0,
    scale: 4.2,
    actions: [
      { label: "rope", min: 12, max: 17, weight: 3, text: "The rope again. She has had a long walk to get better at it. {d}." },
      { label: "ash", min: 15, max: 21, weight: 2, text: "Seren kicks a drift of ash into the air and comes through it, for {d}." },
      { label: "plea", min: 0, max: 0, weight: 1, text: "\"He stayed here. Do you understand? He stayed.\" She does not strike." },
    ],
    victoryText: "Seren lets the rope fall into the ash. \"Fine. Fine. Do it your way, and do it properly.\"",
    defeatText: "\"Stay down.\" Her voice cracks on it. \"Please, just stay down.\"",
    rewardItem: "ashdown_coin",
  },

  // ------------------------------------------------------------- Vale

  /** Phase one, if you never really listened. He has nothing to lose by you. */
  vale: {
    id: "vale",
    name: "Vale",
    look: "vale",
    health: 200,
    gold: 0,
    scale: 4.6,
    noYield: true,
    actions: [
      { label: "cold light", min: 12, max: 18, weight: 3, text: "Vale draws down cold light for {d}. \"You have not even read the books.\"" },
      { label: "recitation", min: 15, max: 20, weight: 2, text: "He recites a Keeper's ward backwards, and it comes apart in your hands. {d}." },
      { label: "the long dark", min: 22, max: 28, weight: 1, text: "Something answers him from the well, for {d}." },
      { label: "ward", min: 0, max: 0, weight: 1, text: "Vale raises a ward and gives himself room to think. He always did." },
    ],
    victoryText: "Vale staggers back to the lip of the well. Below him, something begins to sing.",
    defeatText: "The well comes up to meet you and the light goes out.",
  },

  /** Phase one, if you listened. He fights as if every blow were an argument he is losing. */
  vale_torn: {
    id: "vale_torn",
    name: "Vale",
    look: "vale",
    health: 170,
    gold: 0,
    scale: 4.6,
    noYield: true,
    actions: [
      { label: "cold light", min: 11, max: 16, weight: 3, text: "\"I wish you had not listened.\" Cold light, for {d}." },
      { label: "her ward", min: 14, max: 19, weight: 2, text: "He casts his mother's ward, the one from the notebook, and it hurts more for being kind. {d}." },
      { label: "hesitate", min: 0, max: 0, weight: 2, text: "Vale lifts his hand, and does not bring it down. \"Why are you making this hard?\"" },
      { label: "the long dark", min: 20, max: 26, weight: 1, text: "The well answers him without being asked, for {d}. He flinches." },
    ],
    victoryText: "Vale goes to one knee at the lip of the well. \"Not yet,\" he says, to the well rather than to you.",
    defeatText: "\"Lie still,\" Vale says, quite gently. \"I will explain it all when you wake.\"",
  },

  /** Phase two, alone: Vale calls up the Hollow Choir and wears it like a coat. */
  vale_choir: {
    id: "vale_choir",
    name: "Vale and the Hollow Choir",
    look: "vale",
    health: 220,
    gold: 200,
    scale: 5.2,
    noYield: true,
    boss: true,
    actions: [
      { label: "chorus", min: 14, max: 20, weight: 3, text: "Nine voices that are not voices sing through him, for {d}." },
      { label: "splinter storm", min: 18, max: 24, weight: 2, text: "Every splinter he ever carried comes up out of the well at once. {d}." },
      { label: "the long dark", min: 26, max: 34, weight: 1, text: "The Long Dark notices you, briefly and without interest, for {d}." },
      { label: "her voice", min: 0, max: 0, weight: 1, text: "One voice in the choir is louder than the others. Vale stops to listen to it." },
    ],
    victoryText: "The choir breaks off mid-note. Vale falls, and the light in the well falls with him.",
    defeatText: "The singing fills your head until there is no room left for you.",
    lore: "hollow_choir_truth",
  },

  /** Phase two, with Seren: she takes half the choir's attention and most of its temper. */
  vale_choir_aided: {
    id: "vale_choir_aided",
    name: "Vale and the Hollow Choir",
    look: "vale",
    health: 180,
    gold: 200,
    scale: 5.2,
    noYield: true,
    boss: true,
    actions: [
      { label: "chorus", min: 12, max: 18, weight: 3, text: "The choir sings through him for {d} - and Seren's rope cuts the next verse short." },
      { label: "splinter storm", min: 15, max: 21, weight: 2, text: "Splinters come up out of the well like sleet. Seren takes half of them. You take {d}." },
      { label: "the long dark", min: 22, max: 30, weight: 1, text: "The Long Dark leans on the well, for {d}. \"Hold,\" Seren shouts. \"Tobin held. Hold.\"" },
      { label: "seren", min: 0, max: 0, weight: 1, text: "Seren flings a flare into the well. The choir loses its place, and Vale loses his." },
    ],
    victoryText: "Between the two of you the choir falls silent. Vale falls with it.",
    defeatText: "Seren drags you back from the lip. \"Again,\" she says. \"Again, and better.\"",
    lore: "hollow_choir_truth",
  },
};

export function encounterById(id: string): EncounterDef | undefined {
  return ENCOUNTERS[id];
}
