import type { EncounterAction } from "./encounters";
import type { NpcDef } from "./npcs";

/**
 * How the people of Korvana react to being struck.
 *
 * A blade or a fist is an outrage: they yelp and run. A spell is a different
 * matter entirely - at a school of magic, a hex is an invitation, and almost
 * everyone answers it with a friendly duel. This file holds who answers how,
 * in their own voice; systems/CivilianSystem.ts does the running and the
 * squaring up.
 */

/** Who they are in a duel. Decides the default skill, health and purse. */
export type ChallengeRank = "faculty" | "student" | "civilian";

/**
 * What a spell does to them.
 *
 *   duel    - they stop, face you and call a friendly duel (the default)
 *   absorb  - it is swallowed whole and nothing else happens
 *   pass    - it goes straight through them and keeps flying
 *   flee    - they bolt, as from a blow
 *   decline - they refuse, with a line, and stand their ground
 */
export type SpellReaction = "duel" | "absorb" | "pass" | "flee" | "decline";

/** What a blow does to them. Most people run; some cannot be struck at all. */
export type MeleeReaction = "flee" | "absorb" | "pass";

export interface CivilianVoice {
  /** Yelped as they turn tail from a blow. */
  yelp: string[];
  /** Shouted as they square up to a spell. */
  challenge: string[];
  /** Said when you win. */
  concede: string[];
  /** Said, sheepishly or not, when you lose. */
  gloat: string[];
  /** Said when hexed again before they have got their breath back. */
  refuse: string[];
}

export interface CivilianProfile {
  rank: ChallengeRank;
  voice: CivilianVoice;
  onSpell?: SpellReaction;
  onMelee?: MeleeReaction;
  /** The line for absorb, pass and decline, which have no voice of their own. */
  spellLine?: string;
  /** The line for a blow that is absorbed or passes through. */
  meleeLine?: string;
  /** Overrides the rank's duel skill (0..1). */
  skill?: number;
  /** Overrides the rank's duel health. */
  health?: number;
  /** Gold they hand over when beaten. */
  gold?: number;
  /** Gold they take as a winner's fee when they beat you. */
  fee?: number;
  /** Affinity change when you beat them: positive for the respect-minded. */
  respect?: number;
  /** Fraction of your health they mend afterwards if they win. Most leave you at 30%. */
  mend?: number;
  /** Their own moves, added to the rank's ordinary ones. */
  moves?: EncounterAction[];
  victoryText?: string;
  defeatText?: string;
  /** Bark colour, so the faculty and the students sound different at a glance. */
  color?: string;
}

/** Defaults per rank. A professor is meant to be a wall; a groundskeeper is not. */
export const RANK_DEFAULTS: Record<
  ChallengeRank,
  { skill: number; health: number; gold: number; fee: number; moves: EncounterAction[] }
> = {
  faculty: {
    skill: 0.85,
    health: 210,
    gold: 12,
    fee: 0,
    moves: [
      { label: "precise hex", min: 9, max: 14, weight: 3, text: "{name} flicks a hex you never saw coming, for {d}." },
      { label: "lecture", min: 0, max: 0, weight: 1, text: "{name} pauses to correct your footwork. It is, annoyingly, good advice." },
      { label: "full measure", min: 15, max: 20, weight: 1, text: "{name} stops holding back for exactly one spell. {d}." },
    ],
  },
  student: {
    skill: 0.5,
    health: 80,
    gold: 4,
    fee: 3,
    moves: [
      { label: "dart", min: 5, max: 9, weight: 3, text: "{name} looses a dart, for {d}." },
      { label: "wild swing", min: 8, max: 12, weight: 1, text: "{name} tries a spell from next term's book. It half works, for {d}." },
      { label: "fumble", min: 0, max: 0, weight: 1, text: "{name} drops their wand, picks it up, and pretends that was a feint." },
    ],
  },
  civilian: {
    skill: 0.3,
    health: 55,
    gold: 2,
    fee: 0,
    moves: [
      { label: "household charm", min: 4, max: 7, weight: 3, text: "{name} throws a household charm at you, for {d}." },
      { label: "old trick", min: 6, max: 10, weight: 1, text: "{name} remembers something from their own school days. {d}." },
    ],
  },
};

const voice = (
  yelp: string[],
  challenge: string[],
  concede: string[],
  gloat: string[],
  refuse: string[],
): CivilianVoice => ({ yelp, challenge, concede, gloat, refuse });

/** Faculty speak in gold, students in white, everyone else in a warm grey. */
const FACULTY = "#ffd98a";
const STAFF = "#e8dcc0";

/**
 * The story cast. Their stories are told elsewhere; these are only the lines
 * they say when you hit them, which is not something the story expects.
 */
export const STORY_REACTIONS: Record<string, CivilianProfile> = {
  headmistress_vey: {
    rank: "faculty",
    skill: 0.9,
    health: 260,
    gold: 15,
    respect: 2,
    color: FACULTY,
    voice: voice(
      ["I beg your pardon?", "Wren. Hands. Down."],
      ["A spell at the Headmistress. Bold. Wand up, then.", "Very well. Let us see what they are teaching you."],
      ["Well struck. Do not tell the staff room."],
      ["There. Now you know where the ceiling is."],
      ["Once was instructive. Twice is detention."],
    ),
    moves: [
      { label: "headmistress's ward", min: 0, max: 0, weight: 1, text: "Vey raises a ward without looking up from you. It has clearly stopped worse." },
      { label: "the old working", min: 16, max: 22, weight: 1, text: "Something older than the Academy moves behind Vey's spell. {d}." },
    ],
    victoryText: "Headmistress Vey lowers her wand, and for a moment looks very pleased indeed.",
    defeatText: "You find yourself sitting down, with no memory of deciding to. Vey offers you a hand up.",
  },
  choosing_lamp: {
    rank: "faculty",
    onSpell: "absorb",
    onMelee: "absorb",
    spellLine: "The flame drinks it, and looks at you.",
    meleeLine: "Your blow passes through warm light. The Lamp sighs.",
    color: FACULTY,
    voice: voice([], [], [], [], []),
  },
  professor_alden: {
    rank: "faculty",
    skill: 0.85,
    health: 200,
    respect: 1,
    color: FACULTY,
    voice: voice(
      ["Ah. I did not foresee that, which is itself alarming.", "Oi! I'm a seer, not a target!"],
      ["I foresaw this. Roughly. Wand up.", "The cards said a duel. I assumed they meant cards."],
      ["The stars said I'd win. The stars are frequently drunk."],
      ["Don't feel bad. I knew which way you'd dodge before you did."],
      ["Not again. I've seen how this one ends, and it's tedious."],
    ),
    moves: [
      { label: "foresight", min: 0, max: 0, weight: 1, text: "Alden steps aside from a spell you have not cast yet. \"Next one's to the left.\"" },
      { label: "falling star", min: 13, max: 18, weight: 1, text: "Alden calls down a mote of starlight, apologetically, for {d}." },
    ],
  },
  professor_wick: {
    rank: "faculty",
    skill: 0.8,
    health: 190,
    respect: 2,
    color: FACULTY,
    voice: voice(
      ["Have you lost your mind?", "Mind the seedlings!"],
      ["Right. Sleeves up, dear.", "Hexing a herbologist. In a garden. Brave."],
      ["Oh, well done. Well done! Now help me find my hat."],
      ["There we are. Tea and a sit down for you."],
      ["Once is cheek. Twice is weeding duty."],
    ),
    moves: [
      { label: "bramble ward", min: 8, max: 13, weight: 2, text: "Wick's ward comes up as brambles. You find out the hard way, for {d}." },
      { label: "nettle sting", min: 10, max: 14, weight: 1, text: "A hex that smells of nettles and stings like them. {d}." },
    ],
  },
  librarian_fennick: {
    rank: "faculty",
    skill: 0.85,
    health: 200,
    respect: 1,
    color: FACULTY,
    voice: voice(
      ["SILENCE. And also: ow.", "Not near the folios!"],
      ["Hexing the librarian. There is a form for this. I shall fill it in afterwards."],
      ["Hm. Adequate. Your fines are... reconsidered."],
      ["Shh."],
      ["No. I have shelving."],
    ),
    moves: [
      { label: "shelf-ward", min: 11, max: 16, weight: 2, text: "Fennick inverts a shelf-ward. It shushes you physically, for {d}." },
      { label: "overdue", min: 14, max: 19, weight: 1, text: "\"Overdue,\" says Fennick, and the word hits like a dropped encyclopaedia. {d}." },
    ],
  },
  student_amelia: {
    rank: "student",
    skill: 0.55,
    health: 90,
    respect: 2,
    voice: voice(
      ["Oi!", "Have you lost your mind?"],
      ["Oh, you're on!", "Right. Emberhart rules. No crying."],
      ["Ha! Fair's fair. You owe me a rematch."],
      ["Told you. Winner's fee, and no hard feelings."],
      ["Give it a rest, I've only just got my breath back."],
    ),
    moves: [
      { label: "ember flick", min: 7, max: 11, weight: 2, text: "Amelia flicks a spark at your sleeve, grinning, for {d}." },
    ],
  },
  student_corvin: {
    rank: "student",
    skill: 0.5,
    health: 75,
    respect: 1,
    voice: voice(
      ["Not the notes!", "My splinter diagrams!"],
      ["You've disturbed my sequencing. This means war. Polite war."],
      ["I'll note that down. Under 'humiliations, minor'."],
      ["Statistically, that was always going to happen."],
      ["I am in the middle of a footnote."],
    ),
    moves: [
      { label: "citation", min: 6, max: 10, weight: 2, text: "Corvin casts something from a footnote. It is better referenced than it is aimed. {d}." },
    ],
  },
  owl_pip: {
    rank: "civilian",
    onSpell: "flee",
    spellLine: "Pip explodes into feathers and indignation.",
    color: STAFF,
    voice: voice(["Pip screeches, and leaves."], [], [], [], ["Pip screeches, and leaves."]),
  },
  ghost_hollis: {
    rank: "faculty",
    onSpell: "pass",
    onMelee: "pass",
    spellLine: "The spell passes straight through him. He looks faintly embarrassed for you.",
    meleeLine: "Your blow passes through cold air and old sorrow.",
    color: "#bfeef4",
    voice: voice([], [], [], [], []),
  },
  seren_ashdown: {
    rank: "faculty",
    skill: 0.7,
    health: 150,
    gold: 8,
    respect: 2,
    color: "#f2b27a",
    voice: voice(
      ["Hands to yourself, first-year.", "Oi! I bruise, you know."],
      ["Oh, good. I was getting bored.", "Expelled, not rusty. Come on."],
      ["Not bad. Don't let it go to your head."],
      ["Up you get. I'll not leave you lying in the dirt."],
      ["Once was funny."],
    ),
    moves: [
      { label: "rope", min: 9, max: 14, weight: 2, text: "Seren's rope finds your ankle - gently, by her standards - for {d}." },
    ],
  },
  keeper_ilse: {
    rank: "faculty",
    onSpell: "decline",
    spellLine: "\"Child. I have held back the dark for forty years. Put that away.\"",
    color: FACULTY,
    voice: voice(["I am too old to be struck by students."], [], [], [], []),
  },
  vale: {
    rank: "student",
    onSpell: "decline",
    spellLine: "\"Not here,\" Vale says. \"Not yet.\" The spell dies on his sleeve.",
    color: "#9fe8c4",
    voice: voice(["Don't."], [], [], [], []),
  },
};

// ------------------------------------------------------------ the ambient cast

/** Ambient characters carry their reaction next to their roster entry. */
interface AmbientDef extends NpcDef {
  reaction: CivilianProfile;
}

const AMBIENT: AmbientDef[] = [
  // --- The courtyard, around the great door ---
  {
    id: "amb_tamsin_reed",
    name: "Tamsin Reed",
    title: "Second-year, Emberhart",
    role: "student",
    look: "student_emberhart",
    dialogueId: "amb_tamsin",
    home: { kind: "arrival", dx: -12, dy: 0 },
    roam: 110,
    reaction: {
      rank: "student",
      skill: 0.55,
      respect: 2,
      voice: voice(
        ["Oi!", "Coward's blow!"],
        ["Finally, someone with a spine. Have at you!"],
        ["Fine. FINE. Best of three."],
        ["Emberhart, second year. Write it on your hand."],
        ["I've already fought you today. I'm resting. Heroically."],
      ),
    },
  },
  {
    id: "amb_bram_oakes",
    name: "Bram Oakes",
    title: "First-year, Thornwick",
    role: "student",
    look: "student_thornwick",
    dialogueId: "amb_bram",
    home: { kind: "arrival", dx: -9, dy: 4 },
    roam: 80,
    reaction: {
      rank: "student",
      skill: 0.4,
      health: 70,
      fee: 0,
      respect: 1,
      voice: voice(
        ["Careful! I've a seedling in my pocket!", "Ow! Why?"],
        ["I don't like fighting. But I like being hexed even less."],
        ["Good fight. Here - have a radish."],
        ["Sorry! Are you all right? Do you want a radish?"],
        ["Let's not. The seedling's upset."],
      ),
    },
  },
  {
    id: "amb_isolde_marr",
    name: "Isolde Marr",
    title: "Fourth-year, Ravelle",
    role: "student",
    look: "student_ravelle",
    dialogueId: "amb_isolde",
    home: { kind: "arrival", dx: 10, dy: -4 },
    roam: 90,
    reaction: {
      rank: "student",
      skill: 0.6,
      health: 85,
      fee: 4,
      voice: voice(
        ["How very uncivilised.", "Was that meant to impress me?"],
        ["A duel? How quaint. Very well."],
        ["Clever. I'll remember that trick, and you won't see it twice."],
        ["Never fight a Ravelle where she can see you thinking."],
        ["I don't repeat myself, darling."],
      ),
      moves: [
        { label: "mirror hex", min: 7, max: 11, weight: 2, text: "Isolde turns your own spell back at you, with interest, for {d}." },
      ],
    },
  },
  {
    id: "amb_peregrine_lusk",
    name: "Peregrine Lusk",
    title: "Third-year, Stillwater",
    role: "student",
    look: "student_stillwater",
    dialogueId: "amb_peregrine",
    home: { kind: "arrival", dx: 13, dy: 1 },
    roam: 70,
    reaction: {
      rank: "student",
      skill: 0.5,
      respect: 2,
      voice: voice(
        ["That was unkind.", "Have you lost your mind?"],
        ["Patience is a virtue. So is a sharp riposte."],
        ["The heron waits. The heron also, sometimes, loses."],
        ["Had you been still, you would have seen it coming."],
        ["Stillwater does not brawl twice before supper."],
      ),
    },
  },
  {
    id: "amb_nell_quarry",
    name: "Nell Quarry",
    title: "Second-year, Thornwick",
    role: "student",
    look: "student_thornwick_2",
    dialogueId: "amb_nell",
    home: { kind: "arrival", dx: 11, dy: 4 },
    roam: 100,
    reaction: {
      rank: "student",
      skill: 0.45,
      voice: voice(
        ["Have you lost your mind? Wait till everyone hears!", "Oi! I'm telling!"],
        ["Oh, this is going in the gossip sheet. Wand up!"],
        ["You'll be the talk of the dormitories by supper."],
        ["And THAT is going in the gossip sheet."],
        ["I've already told everyone about the last one."],
      ),
    },
  },
  {
    id: "amb_wyn_calloway",
    name: "Wyn Calloway",
    title: "Third-year, Ravelle",
    role: "student",
    look: "student_ravelle_2",
    dialogueId: "amb_wyn",
    home: { kind: "arrival", dx: 14, dy: 6 },
    roam: 80,
    reaction: {
      rank: "student",
      skill: 0.5,
      gold: 6,
      fee: 5,
      voice: voice(
        ["Mind the cards!", "Oi! That's my dealing hand!"],
        ["Double or nothing, first-year?"],
        ["The house always wins. You're not the house. Except today."],
        ["Pleasure doing business."],
        ["Table's closed."],
      ),
    },
  },
  {
    id: "amb_hobb",
    name: "Hobb",
    title: "Groundskeeper",
    role: "staff",
    look: "caretaker",
    dialogueId: "amb_hobb",
    home: { kind: "arrival", dx: -14, dy: 6 },
    roam: 90,
    reaction: {
      rank: "civilian",
      skill: 0.35,
      health: 65,
      color: STAFF,
      respect: 1,
      voice: voice(
        ["Oi! I've only just raked that!", "Get off, you young menace!"],
        ["Forty years I've swept up after you lot's spells. Come on, then."],
        ["Aye, well. My knees aren't what they were."],
        ["Mind the flower beds on your way down."],
        ["Go on with you."],
      ),
      moves: [
        { label: "rake", min: 5, max: 9, weight: 2, text: "Hobb sweeps your feet out with a groundskeeper's charm meant for leaves. {d}." },
      ],
    },
  },
  {
    id: "amb_madam_pell",
    name: "Madam Pell",
    title: "Matron",
    role: "staff",
    look: "steward",
    dialogueId: "amb_pell",
    home: { kind: "arrival", dx: -9, dy: -2 },
    roam: 70,
    reaction: {
      rank: "civilian",
      skill: 0.45,
      health: 70,
      gold: 0,
      mend: 1,
      color: STAFF,
      voice: voice(
        ["Young person! I am the matron!", "Have you lost your mind?"],
        ["I have mended every bone in this school. I know where they bend."],
        ["Very good. Now come and have that bruise seen to."],
        ["Sit. Breathe. Drink this. Dreadful taste, works wonders."],
        ["Absolutely not. I have a ward full of your sort already."],
      ),
      moves: [
        { label: "smelling salts", min: 4, max: 8, weight: 2, text: "Madam Pell uncorks a bottle under your nose. Your eyes water for {d}." },
      ],
    },
  },

  // --- The Great Hall ---
  {
    id: "amb_osric_dunmore",
    name: "Osric Dunmore",
    title: "Fifth-year prefect, Stillwater",
    role: "student",
    look: "student_stillwater_2",
    dialogueId: "amb_osric",
    home: { kind: "spot", id: "hall_west", dx: 1, dy: 2 },
    roam: 60,
    reaction: {
      rank: "student",
      skill: 0.6,
      health: 95,
      fee: 3,
      voice: voice(
        ["I'm a PREFECT!", "Assault! In the Hall!"],
        ["Hexing a prefect! Ten points from - oh, just duel me."],
        ["This never happened. I shall write down that it never happened."],
        ["Let that be a lesson in respecting the badge."],
        ["Prefects are exempt from repeat hexing. It's in the rules. Probably."],
      ),
    },
  },
  {
    id: "amb_dorrit_fane",
    name: "Dorrit Fane",
    title: "First-year, Emberhart",
    role: "student",
    look: "student_emberhart_2",
    dialogueId: "amb_dorrit",
    home: { kind: "spot", id: "hall_east", dx: -1, dy: 3 },
    roam: 60,
    reaction: {
      rank: "student",
      skill: 0.4,
      health: 65,
      fee: 0,
      respect: 1,
      voice: voice(
        ["Eep! Sorry! Was that me? Sorry!", "Ow! What did I do?"],
        ["R-right! I know a spell! I know two!"],
        ["I think I'll have a little lie-down."],
        ["I WON? Somebody write that down!"],
        ["Please, my wand's still shaking."],
      ),
    },
  },

  // --- The Library ---
  {
    id: "amb_hester_quill",
    name: "Hester Quill",
    title: "Sixth-year library monitor, Ravelle",
    role: "student",
    look: "student_ravelle",
    dialogueId: "amb_hester",
    home: { kind: "spot", id: "library_stacks", dx: 3, dy: 0 },
    roam: 50,
    reaction: {
      rank: "student",
      skill: 0.6,
      health: 90,
      fee: 2,
      voice: voice(
        ["Not in the library!", "Shh! And ow!"],
        ["In the stacks? Fine. Quietly."],
        ["Shh. Yes. Well done. Shh."],
        ["Overdue, and outmatched."],
        ["One per visit."],
      ),
    },
  },
  {
    id: "amb_thackery",
    name: "Thackery",
    title: "Library porter",
    role: "staff",
    look: "porter",
    dialogueId: "amb_thackery",
    home: { kind: "spot", id: "library_stacks", dx: 8, dy: -3 },
    roam: 50,
    reaction: {
      rank: "civilian",
      skill: 0.25,
      health: 60,
      color: STAFF,
      voice: voice(
        ["Easy! I'm carrying the encyclopaedias!", "Oi! Mind my back!"],
        ["I've hauled the Abridged Bestiary up four flights. You don't frighten me."],
        ["Right you are. I'll sit down on these, if nobody minds."],
        ["Lift with your knees, and dodge with them too."],
        ["My back won't take another."],
      ),
    },
  },
];

/** Roster entries for the ambient cast, merged into NPC_ROSTER. */
export const AMBIENT_ROSTER: NpcDef[] = AMBIENT.map(({ reaction: _reaction, ...def }) => def);

const AMBIENT_REACTIONS: Record<string, CivilianProfile> = Object.fromEntries(
  AMBIENT.map((def) => [def.id, def.reaction]),
);

/** A stranger nobody has written lines for yet still reacts like a person. */
const FALLBACK: CivilianProfile = {
  rank: "civilian",
  voice: voice(
    ["Oi!", "Have you lost your mind?"],
    ["Right, that's it. Wand up!"],
    ["All right, all right. You win."],
    ["Better luck next time."],
    ["Not again."],
  ),
};

/** How this person reacts to being struck. */
export function civilianProfile(npcId: string): CivilianProfile {
  return STORY_REACTIONS[npcId] ?? AMBIENT_REACTIONS[npcId] ?? FALLBACK;
}

/** True for the ambient cast, who have no story affinity worth losing. */
export function isAmbient(npcId: string): boolean {
  return npcId in AMBIENT_REACTIONS;
}
