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
  /** Restrict the trigger to any of several subjects - "beat Vale, in whichever mood he is in". */
  ids?: string[];
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
  /**
   * Applied once, when this stage becomes the current one.
   *
   * Content rule: a stage that follows an `npc_talked` stage must not play a
   * cutscene here, because it would open over the conversation that triggered
   * it. Put the cutscene on the choice that ends that conversation instead.
   */
  onEnter?: Effects;
  /** Applied as each step of `count` is reached: entry 0 on the first, and so on. */
  onProgress?: Effects[];
}

export interface QuestDef {
  id: string;
  name: string;
  summary: string;
  /** NPC id who hands it out, for the journal. */
  giver: string;
  /** Which chapter this belongs to. Journal grouping only. */
  act: number;
  /** Side quests are optional; the main chain is everything else. */
  side?: boolean;
  stages: QuestStage[];
  rewardGold: number;
  /** Items granted on completion. */
  rewardItems: string[];
  /** Spell taught on completion, if any. */
  rewardSpell?: string;
  /** Applied after the rewards, when the quest completes. */
  onComplete?: Effects;
}

/** One journal entry per Keeper page, unlocked as each is found. */
const PAGE_LORE: Effects[] = Array.from({ length: 9 }, (_, i) => ({ lore: `keeper_page_${i + 1}` }));

/**
 * The story, as a chain of quests.
 *
 * Main chain, in order:
 *   the_choosing -> (first_lesson, side quests) -> restricted_section ->
 *   the_undercroft -> the_barrow -> the_reliquary -> the_north_road ->
 *   keeper_ilse -> the_hollow_choir
 *
 * Each link starts the next, either from its own onComplete or from the
 * conversation that finishes it. The shared flags other workstreams gate on
 * (`restricted_pass`, `undercroft_open`, `barrow_unsealed`,
 * `reliquary_unsealed`, `relics_gathered`) are all set here or in the dialogue
 * that completes these quests.
 */
export const QUESTS: Record<string, QuestDef> = {
  // ================================================================ Act I

  the_choosing: {
    id: "the_choosing",
    name: "The Choosing",
    summary:
      "You have arrived late, with a letter nobody remembers sending. The Choosing is already under way in the Great Hall, and the Lamp does not like to be kept waiting.",
    giver: "headmistress_vey",
    act: 1,
    stages: [
      {
        id: "arrive",
        objective: "Find someone who was expecting you",
        count: 1,
        target: "arrival_grounds",
        trigger: { kind: "npc_talked" },
      },
      {
        id: "vey",
        objective: "Present yourself to Headmistress Vey in the Great Hall",
        count: 1,
        target: "arrival_grounds",
        trigger: { kind: "npc_talked", id: "headmistress_vey" },
      },
      {
        id: "lamp",
        objective: "Stand before the Choosing Lamp",
        count: 1,
        target: "arrival_grounds",
      },
    ],
    rewardGold: 0,
    rewardItems: [],
    rewardSpell: "arcane_dart",
    onComplete: {
      lore: "the_houses",
      // Straight into the first lesson, so the tracker always has somewhere
      // to point once the ceremony is over.
      startQuest: "first_lesson",
      toast: "Every student leaves the Choosing with one spell. Yours is Arcane Dart. Professor Alden would like to see it.",
    },
  },

  first_lesson: {
    id: "first_lesson",
    name: "The First Lesson",
    summary: "Alden wants to see you cast before he will teach you anything worth knowing.",
    giver: "professor_alden",
    act: 1,
    stages: [
      { id: "cast", objective: "Cast a spell on the practice ground", count: 1, trigger: { kind: "spell_cast" } },
      { id: "report", objective: "Tell Alden what you can do", count: 1 },
    ],
    rewardGold: 10,
    rewardItems: [],
    rewardSpell: "fire_bolt",
    onComplete: { setFlag: "first_lesson_done", lore: "divination", toast: "Alden taught you Fire Bolt." },
  },

  wards_reading: {
    id: "wards_reading",
    name: "A Primer on Wards",
    summary: "Mistress Wick thinks you are ready for shield magic, and has lent you the book. She will know if you skim.",
    giver: "professor_wick",
    act: 1,
    side: true,
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
    rewardItems: ["lesser_tonic"],
    onComplete: { setFlag: "wards_done", lore: "wards" },
  },

  missing_owl: {
    id: "missing_owl",
    name: "The Missing Owl",
    summary: "Amelia's owl, Pip, went out to the treeline three days ago and has not come back. Amelia is being very calm about it.",
    giver: "student_amelia",
    act: 1,
    side: true,
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
        objective: "Follow the trail of moulted feathers",
        count: 3,
        target: "treeline",
        trigger: { kind: "item_gained", id: "quillfeather" },
      },
      {
        id: "pip",
        objective: "Find Pip",
        count: 1,
        target: "treeline",
        trigger: { kind: "npc_talked", id: "owl_pip" },
      },
      { id: "return", objective: "Tell Amelia what you found", count: 1, target: "arrival_grounds" },
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
    summary: "Corvin swears the Moonwell is coming apart and that the pieces are turning up in the grass. He would like three of them, and your silence.",
    giver: "student_corvin",
    act: 1,
    stages: [
      {
        id: "gather",
        objective: "Recover Moonwell splinters from the scarred ground",
        count: 3,
        target: "scarred_ground",
        trigger: { kind: "item_gained", id: "moonwell_shard" },
      },
      { id: "return", objective: "Bring the splinters to Corvin", count: 1, target: "arrival_grounds" },
    ],
    rewardGold: 60,
    rewardItems: ["mana_draught"],
    onComplete: {
      lore: "splinters",
      setFlag: "shards_done",
    },
  },

  proving_ground: {
    id: "proving_ground",
    name: "The Proving Ground",
    summary: "Amelia says nobody will take you seriously until you have won a duel properly. Three times, against Alden's practice shade.",
    giver: "student_amelia",
    act: 1,
    side: true,
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

  // =============================================================== Act II

  restricted_section: {
    id: "restricted_section",
    name: "The Restricted Section",
    summary:
      "The splinters all point north, and the only books that say why are behind Master Fennick, who has not issued a Restricted pass since Vale.",
    giver: "librarian_fennick",
    act: 2,
    stages: [
      {
        id: "ask",
        objective: "Ask Master Fennick for a Restricted pass",
        count: 1,
        target: "arrival_grounds",
        trigger: { kind: "npc_talked", id: "librarian_fennick" },
        onEnter: { cutscene: "act1_close" },
      },
      { id: "catechism", objective: "Answer the Librarian's Catechism", count: 1, target: "arrival_grounds" },
      {
        id: "books",
        objective: "Recover the three overdue books (Alden, Wick, Corvin)",
        count: 3,
        target: "arrival_grounds",
      },
      { id: "return", objective: "Return the overdue books to Fennick", count: 1, target: "arrival_grounds" },
      {
        id: "read",
        objective: "Read the Vigil of the Nine",
        count: 1,
        trigger: { kind: "item_used", id: "keepers_vigil" },
      },
    ],
    rewardGold: 30,
    rewardItems: [],
    rewardSpell: "kindlesight",
    onComplete: {
      setFlag: "undercroft_open",
      lore: "the_vigil",
      startQuest: "the_undercroft",
      cutscene: "shelf_opens",
    },
  },

  the_nine_pages: {
    id: "the_nine_pages",
    name: "The Nine Pages",
    summary:
      "The Keepers kept a commonplace book, one page each. Someone unbound it centuries ago and hid the pages in the dark. Fennick would like them back, in order, unfolded.",
    giver: "librarian_fennick",
    act: 2,
    side: true,
    stages: [
      {
        id: "pages",
        objective: "Find the Keepers' lost pages in the tombs",
        count: 9,
        trigger: { kind: "item_gained", id: "keeper_page" },
        onProgress: PAGE_LORE,
      },
      { id: "return", objective: "Bring the nine pages to Fennick", count: 1, target: "arrival_grounds" },
    ],
    rewardGold: 120,
    rewardItems: ["mana_draught"],
    rewardSpell: "keepers_strand",
    onComplete: { lore: "keepers_commonplace", setFlag: "pages_done" },
  },

  the_undercroft: {
    id: "the_undercroft",
    name: "The Undercroft",
    summary:
      "Behind the sealed shelf a stair goes down into water. Something down there has been singing the same four notes for two hundred years.",
    giver: "ghost_hollis",
    act: 2,
    stages: [
      {
        id: "descend",
        objective: "Go down through the sealed shelf and find who is singing",
        count: 1,
        target: "arrival_grounds",
        trigger: { kind: "npc_talked", id: "ghost_hollis" },
      },
      {
        id: "floodgate",
        objective: "Open the floodgates and drain the drowned galleries",
        count: 1,
        trigger: { kind: "puzzle_solved", id: "undercroft_floodgate" },
      },
      {
        id: "lantern",
        objective: "Find the Warden's resting place and take up her Lantern",
        count: 1,
        trigger: { kind: "item_gained", id: "wardens_lantern" },
        onEnter: { cutscene: "floodgates_open" },
      },
      {
        id: "vey",
        objective: "Bring the Lantern to Headmistress Vey",
        count: 1,
        target: "arrival_grounds",
        onEnter: { cutscene: "lantern_claimed" },
      },
    ],
    rewardGold: 80,
    rewardItems: ["mana_draught"],
    onComplete: {
      lore: "the_lock",
      setFlags: ["vey_confessed", "barrow_unsealed", "act3_started"],
      startQuest: "the_barrow",
      cutscene: "act2_close",
    },
  },

  hollis_rest: {
    id: "hollis_rest",
    name: "Two Hundred Years Is Long Enough",
    summary:
      "Brother Hollis drowned keeping the Lantern hidden. He has asked you, very politely, to read him his own name by its light.",
    giver: "ghost_hollis",
    act: 2,
    side: true,
    stages: [
      {
        id: "read",
        objective: "Bring the Lantern back to Brother Hollis",
        count: 1,
      },
    ],
    rewardGold: 0,
    rewardItems: [],
    rewardSpell: "stilling_word",
    onComplete: { lore: "brother_hollis", toast: "Brother Hollis taught you the Stilling Word." },
  },

  the_splinter_thief: {
    id: "the_splinter_thief",
    name: "The Splinter Thief",
    summary:
      "You saw him leave the Undercroft with his arms full of cold light: a fourth-year in a coat too thin for the season. Corvin's scarred ground is the place to look.",
    giver: "ghost_hollis",
    act: 2,
    side: true,
    stages: [
      {
        id: "find",
        objective: "Find the boy who carried the splinters away",
        count: 1,
        target: "scarred_ground",
        trigger: { kind: "npc_talked", id: "vale" },
      },
      { id: "talk", objective: "Hear what Vale has to say - or do not", count: 1, target: "scarred_ground" },
    ],
    rewardGold: 0,
    rewardItems: [],
    onComplete: { setFlag: "vale_met_1", lore: "vale" },
  },

  // ============================================================== Act III

  the_barrow: {
    id: "the_barrow",
    name: "The Thornroot Barrow",
    summary:
      "The Keymaker was buried with her Key under a hill of roots in the deep forest. Vey has unsealed the forest road. Someone else is already on it.",
    giver: "headmistress_vey",
    act: 3,
    stages: [
      {
        id: "forest",
        objective: "Find the Thornroot Barrow in the deep forest",
        count: 1,
        target: "barrow_entrance",
        trigger: { kind: "landmark_reached", id: "barrow_entrance" },
      },
      {
        id: "roots",
        objective: "Untangle the Thornroot and open the way down",
        count: 1,
        target: "barrow_entrance",
        trigger: { kind: "puzzle_solved", id: "barrow_roots" },
        onEnter: { cutscene: "seren_intro" },
      },
      {
        id: "key",
        objective: "Take the Ninefold Key from the Keymaker's hands",
        count: 1,
        trigger: { kind: "item_gained", id: "ninefold_key" },
        onEnter: { cutscene: "roots_part" },
      },
      {
        id: "report",
        objective: "Bring the Key to Headmistress Vey",
        count: 1,
        target: "arrival_grounds",
        onEnter: { cutscene: "key_claimed" },
      },
    ],
    rewardGold: 100,
    rewardItems: ["lesser_tonic"],
    onComplete: {
      setFlags: ["reliquary_unsealed", "vale_due_2", "corvin_gone"],
      lore: "ninefold_key",
      startQuest: "the_reliquary",
    },
  },

  seren_bargain: {
    id: "seren_bargain",
    name: "The Other Expedition",
    summary:
      "Vey mentioned, too lightly, that someone else has been seen on the forest road: Seren Ashdown, expelled seven years ago for breaking the Undercroft seal.",
    giver: "seren_ashdown",
    act: 3,
    side: true,
    stages: [
      {
        id: "meet",
        objective: "Find out who else is hunting the Keepers' relics",
        count: 1,
        target: "barrow_entrance",
        trigger: { kind: "npc_talked", id: "seren_ashdown" },
      },
      { id: "terms", objective: "Settle terms with Seren Ashdown", count: 1, target: "barrow_entrance" },
      {
        id: "barrow",
        objective: "Get the Ninefold Key out of the Barrow",
        count: 1,
        trigger: { kind: "item_gained", id: "ninefold_key" },
      },
      { id: "reliquary", objective: "Find Seren at the Skyfall Reliquary", count: 1, target: "reliquary_entrance" },
      { id: "reckoning", objective: "Settle accounts with Seren after the Reliquary", count: 1, target: "reliquary_entrance" },
    ],
    rewardGold: 0,
    rewardItems: [],
    onComplete: { setFlag: "seren_bargain_done", lore: "seren_ashdown" },
  },

  corvins_folly: {
    id: "corvins_folly",
    name: "The Apprentice's Error",
    summary:
      "Corvin left before dawn with a satchel of splinters and a letter he would not show anyone. Amelia says he went towards the treeline, and that he was smiling, which is how she knew.",
    giver: "student_amelia",
    act: 3,
    side: true,
    stages: [
      {
        id: "find",
        objective: "Find Corvin at the treeline",
        count: 1,
        target: "treeline",
        trigger: { kind: "npc_talked", id: "student_corvin" },
      },
      { id: "home", objective: "Bring Corvin home", count: 1, target: "treeline" },
    ],
    rewardGold: 40,
    rewardItems: ["mana_draught"],
    onComplete: { setFlag: "corvin_home" },
  },

  the_reliquary: {
    id: "the_reliquary",
    name: "The Skyfall Reliquary",
    summary:
      "The Bellwright cast the Silent Bell from a fallen star and hung it in a vault on the high moor. Vey has opened the highland road. The vault was built to be robbed exactly once.",
    giver: "headmistress_vey",
    act: 3,
    stages: [
      {
        id: "climb",
        objective: "Climb to the Skyfall Reliquary in the highlands",
        count: 1,
        target: "reliquary_entrance",
        trigger: { kind: "landmark_reached", id: "reliquary_entrance" },
      },
      {
        id: "bells",
        objective: "Ring the Reliquary's bells in their true order",
        count: 1,
        target: "reliquary_entrance",
        trigger: { kind: "puzzle_solved", id: "reliquary_bells" },
        onEnter: { cutscene: "reliquary_threshold" },
      },
      {
        id: "bell",
        objective: "Take the Silent Bell",
        count: 1,
        trigger: { kind: "item_gained", id: "silent_bell" },
      },
      {
        id: "escape",
        objective: "Get out before the Reliquary comes down",
        count: 1,
        trigger: { kind: "puzzle_solved", id: "reliquary_escape" },
        onEnter: { cutscene: "bell_claimed" },
      },
      {
        id: "report",
        objective: "Bring the relics to Professor Alden",
        count: 1,
        target: "arrival_grounds",
        onEnter: { cutscene: "reliquary_escaped" },
      },
    ],
    rewardGold: 120,
    rewardItems: ["mana_draught", "lesser_tonic"],
    onComplete: {
      setFlag: "relics_gathered",
      lore: "silent_bell",
      cutscene: "act3_close",
    },
  },

  // =============================================================== Act IV

  the_north_road: {
    id: "the_north_road",
    name: "The North Road",
    summary:
      "Alden says the grounds are not endless, only very good at closing, and that the waystone north of the hall is the way out of them. The relics are heavy. Take them anyway.",
    giver: "professor_alden",
    act: 4,
    stages: [
      {
        id: "waystone",
        objective: "Find the north waystone",
        count: 1,
        target: "waystone_north",
        trigger: { kind: "landmark_reached", id: "waystone_north" },
        onEnter: { cutscene: "act4_open", lore: "waystones" },
      },
      {
        id: "scar",
        objective: "Cross into the Moonwell Scar",
        count: 1,
        target: "the_scar",
        trigger: { kind: "biome_entered", id: "scar" },
        onEnter: { cutscene: "waystone_reached" },
      },
      {
        id: "camp",
        objective: "Find the fire burning in the ash",
        count: 1,
        target: "keeper_camp",
        trigger: { kind: "landmark_reached", id: "keeper_camp" },
        onEnter: { cutscene: "scar_crossing" },
      },
    ],
    rewardGold: 50,
    rewardItems: ["ember_blade"],
    rewardSpell: "blink_step",
    onComplete: {
      setFlag: "act4_started",
      startQuest: "keeper_ilse",
      toast: "You have reached the Moonwell Scar.",
    },
  },

  keeper_ilse: {
    id: "keeper_ilse",
    name: "The Last Keeper",
    summary:
      "Someone has been holding a watch alone in the ash for four years. She has the look of a person who stopped expecting relief some time ago.",
    giver: "keeper_ilse",
    act: 4,
    stages: [
      {
        id: "meet",
        objective: "Speak with the Keeper at the fire",
        count: 1,
        target: "keeper_camp",
        trigger: { kind: "npc_talked", id: "keeper_ilse" },
        onEnter: { cutscene: "ilse_meeting" },
      },
      {
        id: "cull",
        objective: "Silence six of the Hollow Choir's singers",
        count: 6,
        target: "the_scar",
        trigger: { kind: "enemy_defeated", id: "wraith" },
      },
      { id: "return", objective: "Return to Keeper Ilse", count: 1, target: "keeper_camp" },
    ],
    rewardGold: 80,
    rewardItems: ["ember_wand"],
    rewardSpell: "ember_nova",
    onComplete: {
      lore: "wellhead",
      setFlag: "ilse_done",
      toast: "Ilse taught you Ember Nova.",
    },
  },

  tobins_token: {
    id: "tobins_token",
    name: "What Tobin Left",
    summary: "Ilse kept a token for four years in case anyone ever came asking after Tobin Ashdown. Someone has.",
    giver: "keeper_ilse",
    act: 4,
    side: true,
    stages: [{ id: "deliver", objective: "Give Tobin's token to his sister", count: 1 }],
    rewardGold: 0,
    rewardItems: [],
    onComplete: { setFlag: "seren_mourned", lore: "tobin_ashdown" },
  },

  // ================================================================ Act V

  the_hollow_choir: {
    id: "the_hollow_choir",
    name: "The Hollow Choir",
    summary:
      "Vale has been feeding the Moonwell its own splinters, and the well has begun to sing back in voices he knows. Ilse cannot leave the doorway. You can.",
    giver: "keeper_ilse",
    act: 5,
    stages: [
      {
        id: "reach",
        objective: "Go down to the Wellhead",
        count: 1,
        target: "wellhead",
        trigger: { kind: "landmark_reached", id: "wellhead" },
        onEnter: { cutscene: "act5_open", lore: "vale_research" },
      },
      {
        id: "confront",
        objective: "Face Vale at the Wellhead",
        count: 1,
        target: "wellhead",
        trigger: { kind: "npc_talked", id: "vale" },
        onEnter: { cutscene: "wellhead_arrival" },
      },
      {
        id: "duel",
        objective: "Stop Vale",
        count: 1,
        target: "wellhead",
        trigger: { kind: "battle_won", ids: ["vale", "vale_torn"] },
      },
      {
        id: "choir",
        objective: "Silence the Hollow Choir",
        count: 1,
        target: "wellhead",
        trigger: { kind: "boss_defeated" },
        onEnter: { cutscene: "vale_phase2" },
      },
      {
        id: "aftermath",
        objective: "Decide what becomes of Vale",
        count: 1,
        target: "wellhead",
        onEnter: { cutscene: "vale_fallen" },
      },
    ],
    rewardGold: 200,
    rewardItems: ["keepers_greatsword"],
    onComplete: {
      lore: "the_long_dark",
      setFlags: ["game_complete", "act5_complete"],
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
  2: "Act II - The Undercroft",
  3: "Act III - Relics of the Keepers",
  4: "Act IV - The Scar",
  5: "Act V - The Hollow Choir",
};
