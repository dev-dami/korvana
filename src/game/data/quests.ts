import type { Effects } from "./effects";
import type { GameEventKind } from "../systems/GameEvents";

/**
 * What makes a quest stage tick.
 *
 * A stage with a trigger advances whenever the matching game event happens -
 * killing a wraith, walking into the Scar, picking up a shard. A stage without
 * one is advanced from dialogue (`advanceQuest`), which is how "go and tell
 * Alden" works: it would be strange if merely existing near him counted.
 */
export interface QuestTrigger {
  kind: GameEventKind;
  /** Restrict the trigger to one subject: a biome, enemy, item, landmark... */
  id?: string;
  amount?: number;
}

export interface QuestStage {
  id: string;
  /** Shown in the quest log. */
  objective: string;
  /** How many of the thing must be done. */
  count: number;
  trigger?: QuestTrigger;
  /**
   * Landmark the compass points at while this stage is current. Omitted for
   * objectives with no place attached ("cast a spell"), which leaves the compass
   * showing the objective text alone.
   */
  target?: string;
  /** Applied once, when this stage becomes the current one. */
  onEnter?: Effects;
}

export interface QuestDef {
  id: string;
  name: string;
  summary: string;
  /** NPC id who hands it out, for the journal. */
  giver: string;
  /** Which chapter this belongs to. Journal grouping only. */
  act: number;
  stages: QuestStage[];
  rewardGold: number;
  /** Items granted on completion. */
  rewardItems: string[];
  /** Spell taught on completion, if any. */
  rewardSpell?: string;
  /** Applied after the rewards, when the quest completes. */
  onComplete?: Effects;
}

export const QUESTS: Record<string, QuestDef> = {
  // ---------------------------------------------------------------- Act I

  first_lesson: {
    id: "first_lesson",
    name: "The First Lesson",
    summary: "Alden wants to see you cast before he will teach you anything worth knowing.",
    giver: "professor_alden",
    act: 1,
    stages: [
      { id: "cast", objective: "Cast a spell", count: 1, trigger: { kind: "spell_cast" } },
      { id: "report", objective: "Tell Alden what you can do", count: 1 },
    ],
    rewardGold: 10,
    rewardItems: [],
    rewardSpell: "fire_bolt",
    onComplete: { setFlag: "first_lesson_done", toast: "Alden taught you Fire Bolt." },
  },

  wards_reading: {
    id: "wards_reading",
    name: "A Primer on Wards",
    summary: "Mistress Wick thinks you are ready for shield magic, and has lent you the book.",
    giver: "professor_wick",
    act: 1,
    stages: [
      {
        id: "read",
        objective: "Read the Primer of Wards",
        count: 1,
        trigger: { kind: "item_used", id: "primer_of_wards" },
      },
      { id: "report", objective: "Tell Wick you have read it", count: 1 },
    ],
    rewardGold: 40,
    rewardItems: [],
    onComplete: { setFlag: "wards_done" },
  },

  missing_owl: {
    id: "missing_owl",
    name: "The Missing Owl",
    summary: "Amelia's owl went out to the treeline three days ago and has not come back.",
    giver: "student_amelia",
    act: 1,
    stages: [
      {
        id: "search",
        objective: "Search the treeline",
        count: 1,
        target: "treeline",
        trigger: { kind: "landmark_reached", id: "treeline" },
      },
      {
        id: "feathers",
        objective: "Gather owl feathers",
        count: 3,
        trigger: { kind: "item_gained", id: "quillfeather" },
      },
      { id: "return", objective: "Tell Amelia what you found", count: 1 },
    ],
    rewardGold: 25,
    rewardItems: ["lesser_tonic"],
    rewardSpell: "frost_shard",
    onComplete: {
      lore: "treeline",
      setFlag: "owl_done",
      toast: "Amelia taught you Frost Shard.",
    },
  },

  moonwell_shards: {
    id: "moonwell_shards",
    name: "Splinters of the Moonwell",
    summary: "Corvin swears the Moonwell shattered. He would like three pieces of proof.",
    giver: "student_corvin",
    act: 1,
    stages: [
      {
        id: "gather",
        objective: "Recover Moonwell Shards",
        count: 3,
        target: "scarred_ground",
        trigger: { kind: "item_gained", id: "moonwell_shard" },
      },
      { id: "return", objective: "Bring the shards to Corvin", count: 1 },
    ],
    rewardGold: 60,
    rewardItems: ["mana_draught"],
    onComplete: {
      lore: "splinters",
      setFlag: "shards_done",
      toast: "Corvin says the shards are being carried north.",
    },
  },

  proving_ground: {
    id: "proving_ground",
    name: "The Proving Ground",
    summary: "Amelia says nobody will take you seriously until you have won a duel properly.",
    giver: "student_amelia",
    act: 1,
    stages: [
      {
        id: "duel",
        objective: "Win a sparring duel",
        count: 3,
        trigger: { kind: "battle_won", id: "sparring" },
      },
      { id: "report", objective: "Tell Amelia you have won", count: 1 },
    ],
    rewardGold: 20,
    rewardItems: ["duelists_rapier"],
    onComplete: { setFlag: "proving_done" },
  },

  // --------------------------------------------------------------- Act II

  the_north_road: {
    id: "the_north_road",
    name: "The North Road",
    summary: "Alden says the grounds are closing, and that the waystone north of the hall is the way out of them.",
    giver: "professor_alden",
    act: 2,
    stages: [
      {
        id: "waystone",
        objective: "Find the north waystone",
        count: 1,
        target: "waystone_north",
        trigger: { kind: "landmark_reached", id: "waystone_north" },
        onEnter: { cutscene: "act1_close", lore: "waystones" },
      },
      {
        id: "scar",
        objective: "Cross into the Scar",
        count: 1,
        target: "the_scar",
        trigger: { kind: "biome_entered", id: "scar" },
      },
    ],
    rewardGold: 50,
    rewardItems: ["ember_blade"],
    rewardSpell: "blink_step",
    onComplete: {
      cutscene: "act2_open",
      setFlag: "act2_started",
      toast: "You have reached the Moonwell Scar.",
    },
  },

  keeper_ilse: {
    id: "keeper_ilse",
    name: "The Last Keeper",
    summary: "Someone has been holding a watch alone in the ash for four years. She wants the singers broken.",
    giver: "keeper_ilse",
    act: 2,
    stages: [
      {
        id: "cull",
        objective: "Break the Splinter Wraiths",
        count: 6,
        target: "the_scar",
        trigger: { kind: "enemy_defeated", id: "wraith" },
        onEnter: { cutscene: "ilse_meeting", lore: "keepers" },
      },
      { id: "return", objective: "Return to Keeper Ilse", count: 1 },
    ],
    rewardGold: 80,
    rewardItems: ["ember_wand"],
    rewardSpell: "ember_nova",
    onComplete: {
      lore: "wellhead",
      setFlag: "ilse_done",
      toast: "Ilse taught you Ember Nova. Vale is at the Wellhead.",
    },
  },

  // -------------------------------------------------------------- Act III

  the_hollow_choir: {
    id: "the_hollow_choir",
    name: "The Hollow Choir",
    summary: "Vale has been feeding the Moonwell its own splinters. Ilse cannot leave the doorway. You can.",
    giver: "keeper_ilse",
    act: 3,
    stages: [
      {
        id: "reach",
        objective: "Go down to the Wellhead",
        count: 1,
        target: "wellhead",
        trigger: { kind: "landmark_reached", id: "wellhead" },
        onEnter: { cutscene: "act3_open", lore: "vale" },
      },
      {
        id: "defeat",
        objective: "Stop Vale",
        count: 1,
        target: "wellhead",
        trigger: { kind: "boss_defeated", id: "vale" },
      },
    ],
    rewardGold: 200,
    rewardItems: ["keepers_greatsword"],
    onComplete: {
      cutscene: "ending",
      lore: "the_moonwell",
      setFlag: "game_complete",
      toast: "The well is quiet again.",
    },
  },
};

export function questList(): QuestDef[] {
  return Object.values(QUESTS);
}

export function questById(id: string): QuestDef | undefined {
  return QUESTS[id];
}

/** The journal's chapter headings, in order. */
export const ACT_TITLES: Record<number, string> = {
  1: "Act I - The Arrival",
  2: "Act II - The Scar",
  3: "Act III - The Hollow",
};
