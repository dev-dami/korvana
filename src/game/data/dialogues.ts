import type { Effects } from "./effects";

/**
 * A choice is an `Effects` block plus the bits that only make sense in
 * conversation: what it says, where it goes, and what must be true for it to
 * appear at all.
 */
export interface DialogueChoice extends Effects {
  text: string;
  /** Node to move to. Omitted ends the conversation. */
  next?: string;
  /** Change towards the speaker. Applied by the dialogue system, which knows who that is. */
  affinity?: number;
  requiresFlag?: string;
  /** Visible only once this quest has been started. */
  requiresQuest?: string;
  /** Visible only while this quest is running - i.e. "go and report back". */
  requiresActiveQuest?: string;
  /** Visible only once this quest is finished. */
  requiresCompleteQuest?: string;
  /** Visible only before this quest has been started - used for offers. */
  requiresNotQuest?: string;
}

export interface DialogueNode {
  text: string;
  choices?: DialogueChoice[];
  /** Followed automatically when there are no choices to take. */
  next?: string;
}

export interface DialogueTree {
  id: string;
  start: string;
  nodes: Record<string, DialogueNode>;
}

/**
 * Dialogue is data.
 *
 * Each tree's opening node is a switchboard: the choices carry the conditions,
 * so "have you done the thing I asked" is expressed as a `requiresActiveQuest`
 * on one line and a `requiresCompleteQuest` on another, rather than as a chain
 * of checks in code. The story can therefore be re-sequenced entirely from this
 * file.
 */
export const DIALOGUES: Record<string, DialogueTree> = {
  // ------------------------------------------------------------------ Alden

  alden_intro: {
    id: "alden_intro",
    start: "start",
    nodes: {
      start: {
        text: "Ah. The new arrival. You have the look of someone who has read the acceptance letter twice and understood it once.",
        choices: [
          {
            text: "I have cast a spell, as you asked.",
            requiresActiveQuest: "first_lesson",
            advanceQuest: "first_lesson",
            next: "lesson_report",
            affinity: 2,
          },
          {
            text: "The shards are being carried north.",
            requiresCompleteQuest: "moonwell_shards",
            requiresNotQuest: "the_north_road",
            next: "north_road",
            affinity: 4,
          },
          {
            text: "The well is quiet. Ilse is keeping the watch.",
            requiresCompleteQuest: "the_hollow_choir",
            next: "epilogue",
          },
          {
            text: "What would you have me do first?",
            requiresNotQuest: "first_lesson",
            next: "offer",
          },
          { text: "Where am I, exactly?", next: "explain" },
          { text: "I want to learn something dangerous.", next: "warning" },
        ],
      },
      explain: {
        text: "Korvana. The grounds go on further than anyone has mapped, and the further you walk the stranger it gets. Try not to walk off the edge of anything.",
        next: "offer",
      },
      warning: {
        text: "Then you will fit in badly and quickly. Learn to hold a ward first, and I will think about dangerous.",
        choices: [{ text: "Fair enough.", next: "offer", affinity: 3 }],
      },
      offer: {
        text: "Before any of that, I want to see you cast. Show me something on the practice ground.",
        choices: [
          {
            text: "Consider it done.",
            startQuest: "first_lesson",
            learnSpell: "arcane_dart",
            next: "dismiss",
          },
          { text: "Spar with me instead.", next: "spar" },
          { text: "I would rather explore first.", next: "dismiss" },
        ],
      },
      spar: {
        text: "Bold. Very well - wand up. Try not to embarrass us both.",
        choices: [
          { text: "Ready.", battle: "sparring" },
          { text: "On second thought, the practice ground sounds fine.", next: "offer" },
        ],
      },
      lesson_report: {
        text: "You have. Adequately, even, which is more than most manage on the first morning. Here - Fire Bolt. It is a real spell, so do not practise it indoors.",
        next: "offer_more",
      },
      offer_more: {
        text: "Wick has been muttering about wards, and Amelia has lost an owl, and Corvin has lost his manners. Any of them will give you something to do.",
        choices: [{ text: "I will go and be useful.", next: "dismiss", affinity: 2 }],
      },
      north_road: {
        text: "North. Of course north. I have been telling the faculty for a decade that the grounds are closing and they have been telling me it is the wind.",
        choices: [
          { text: "Then let me go and look.", startQuest: "the_north_road", next: "north_warn" },
          { text: "What is out there?", next: "north_explain" },
        ],
      },
      north_explain: {
        text: "A waystone, and past it the Scar. I have not been past it myself. I sent two students and got back one, and the one who came back does not talk about it.",
        choices: [{ text: "I will go.", startQuest: "the_north_road", next: "north_warn" }],
      },
      north_warn: {
        text: "Take the road the waystone points down and do not leave it. The grounds are very good at closing, and they do not care which side of them you are on when they do.",
        choices: [{ text: "Understood.", affinity: 3 }],
      },
      epilogue: {
        text: "You have been gone a season. I did not send anyone after you, and I would like you to know that was a decision and not an oversight.",
        choices: [{ text: "Tell me what I missed.", cutscene: "epilogue" }],
      },
      dismiss: {
        text: "Off you go then. The treeline is that way, and the students are mostly harmless.",
      },
    },
  },

  // ------------------------------------------------------------------- Wick

  wick_intro: {
    id: "wick_intro",
    start: "start",
    nodes: {
      start: {
        text: "Mind the herbs. Half of them bite, and the other half bite later.",
        choices: [
          {
            text: "I have read the Primer.",
            requiresActiveQuest: "wards_reading",
            advanceQuest: "wards_reading",
            next: "read_report",
            affinity: 3,
          },
          {
            text: "Do they actually bite?",
            requiresNotQuest: "wards_reading",
            next: "bite",
          },
          {
            text: "Can you teach me defensive magic?",
            requiresNotQuest: "wards_reading",
            next: "teach",
          },
          { text: "I will keep my distance.", next: "distance", affinity: 1 },
        ],
      },
      bite: {
        text: "One of them. I forget which. That is rather the game.",
        next: "teach",
      },
      distance: {
        text: "Sensible. Sensible students live longer, though they feature less in the histories.",
        next: "teach",
      },
      teach: {
        text: "Warding, you mean. I can. Here - the Primer. Read it, actually read it, and then hold an Aegis without flinching, and I will believe you.",
        choices: [
          {
            text: "I will read it tonight.",
            startQuest: "wards_reading",
            giveItem: "primer_of_wards",
            next: "done",
          },
          { text: "Maybe once I have settled in.", next: "done" },
        ],
      },
      read_report: {
        text: "Well. You read it. Most people carry it about for a term and tell me they read it. Take these - you will want them in the ash, if you get that far.",
        choices: [{ text: "The ash?", next: "ash_warn", affinity: 2 }],
      },
      ash_warn: {
        text: "You will hear the students say the Scar is a story. It is not a story. It is a mile of ground where nothing has grown for eleven years, and it is getting bigger.",
      },
      done: {
        text: "The greenhouses are open to you. Do not let the cauldrons out.",
      },
    },
  },

  // ----------------------------------------------------------------- Amelia

  amelia_intro: {
    id: "amelia_intro",
    start: "start",
    nodes: {
      start: {
        text: "You are the new one. Everyone is talking about it, which is unfair, because nobody talks about me.",
        choices: [
          {
            text: "I found her. She is at the treeline, and she is fine.",
            requiresActiveQuest: "missing_owl",
            advanceQuest: "missing_owl",
            next: "owl_report",
            affinity: 5,
          },
          {
            text: "About those duels - I have won three.",
            requiresActiveQuest: "proving_ground",
            advanceQuest: "proving_ground",
            next: "duel_report",
            affinity: 4,
          },
          {
            text: "Nobody takes me seriously either.",
            requiresCompleteQuest: "missing_owl",
            requiresNotQuest: "proving_ground",
            next: "duel_offer",
          },
          { text: "What do they say about me?", next: "gossip" },
          { text: "Are you all right?", next: "owl", requiresNotQuest: "missing_owl" },
        ],
      },
      gossip: {
        text: "That you arrived without a wand and without a house. Both of which are, frankly, quite difficult to do.",
        next: "owl",
      },
      owl: {
        text: "My owl went out to the treeline three days ago and has not come back. I keep telling myself owls do that.",
        choices: [
          {
            text: "I will go and look for it.",
            startQuest: "missing_owl",
            next: "owl_thanks",
            affinity: 4,
          },
          { text: "I am sure it is fine.", next: "smalltalk" },
        ],
      },
      owl_thanks: {
        text: "Really? Thank you. Look for feathers - she moults when she is nervous. Which she is. Constantly.",
      },
      owl_report: {
        text: "She was roosting the whole time. Three days, on a branch, watching me walk past. I am going to be furious about this for a week. Here - this is Frost Shard, and it is the only thing I am good at.",
      },
      duel_offer: {
        text: "Then do something about it. Alden keeps a practice shade in the ring - beat it three times and nobody gets to call you the new one any more.",
        choices: [
          { text: "Three times. Fine.", startQuest: "proving_ground", next: "duel_go" },
          { text: "I have enough to be getting on with.", next: "smalltalk" },
        ],
      },
      duel_go: {
        text: "Come back when it is three, not two. I will know, because I will ask it.",
      },
      duel_report: {
        text: "Three. You actually did three. Here - my father's rapier. I hate it, it is far too quick for me, and it would suit you.",
      },
      smalltalk: {
        text: "Yes. Probably. Anyway. Classes start at nine, do not be late, it reflects badly on me somehow.",
      },
    },
  },

  // ----------------------------------------------------------------- Corvin

  corvin_intro: {
    id: "corvin_intro",
    start: "start",
    nodes: {
      start: {
        text: "Do not talk to me, I am calculating. ... All right, talk to me. What do you know about the Moonwell?",
        choices: [
          {
            text: "I have your three shards.",
            requiresActiveQuest: "moonwell_shards",
            advanceQuest: "moonwell_shards",
            next: "shards_report",
            affinity: 4,
          },
          { text: "Nothing at all.", next: "explain" },
          { text: "I know it shattered.", next: "impressed", affinity: 3 },
        ],
      },
      explain: {
        text: "It is a well of cold light under the north range. Or it was. Every so often a splinter turns up in the grass, which is not how wells work.",
        next: "ask",
      },
      impressed: {
        text: "... Oh. Good. Then you understand why I need samples, and why I cannot go and get them myself.",
        next: "ask",
      },
      ask: {
        text: "I need three shards. I will make it worth your while.",
        choices: [
          { text: "I will bring you three.", startQuest: "moonwell_shards", next: "deal" },
          { text: "What do you get out of it?", next: "motive" },
        ],
      },
      motive: {
        text: "Understanding. Also a great deal of academic credit. Mostly understanding.",
        choices: [{ text: "Fine. Three shards.", startQuest: "moonwell_shards", next: "deal" }],
      },
      deal: {
        text: "Three. Not two. I will know.",
      },
      shards_report: {
        text: "Three. Three. Right. ... They are warm. Nothing about the Moonwell should be warm, and they are warm, and they are all warm in the same direction.",
        choices: [{ text: "The same direction?", next: "north", affinity: 2 }],
      },
      north: {
        text: "North. All of them pointing north, like iron filings. Something up there is collecting them, and I am not going to be the one who goes and asks what.",
        choices: [{ text: "I might be.", next: "north_warn", affinity: 3 }],
      },
      north_warn: {
        text: "Then tell Alden before you do. He has been waiting ten years for someone to say that to him.",
      },
    },
  },

  // ------------------------------------------------------------------ Ilse

  ilse_intro: {
    id: "ilse_intro",
    start: "start",
    nodes: {
      start: {
        text: "You are the first person to walk in here in four years who was not already dead or already him.",
        choices: [
          {
            text: "The wraiths are broken. All six of them.",
            requiresActiveQuest: "keeper_ilse",
            advanceQuest: "keeper_ilse",
            next: "cull_report",
            affinity: 4,
          },
          {
            text: "What are you keeping watch over?",
            requiresNotQuest: "keeper_ilse",
            next: "explain",
          },
          {
            text: "Tell me about Vale.",
            requiresCompleteQuest: "keeper_ilse",
            requiresNotQuest: "the_hollow_choir",
            next: "vale_offer",
            affinity: 3,
          },
          { text: "Who are you?", next: "who" },
        ],
      },
      who: {
        text: "Ilse. Keeper of the Moonwell, which is a title that used to have nine people attached to it.",
        next: "explain",
      },
      explain: {
        text: "The splinters are the well coming apart. Every one that gets carried away is a piece of the lock. Something has been carrying them, and it has been singing while it does it.",
        choices: [
          { text: "Then I will break them.", startQuest: "keeper_ilse", next: "accept", affinity: 3 },
          { text: "Why has nobody else come?", next: "why" },
        ],
      },
      why: {
        text: "Somebody has to stand in the doorway. The others went north to fetch the survey back and did not return, and I have been standing in it since. Six of the singers, and I will believe you are serious.",
        choices: [{ text: "Six. I will come back.", startQuest: "keeper_ilse", next: "accept" }],
      },
      accept: {
        text: "Break them where the ash is deep. They come apart like wet paper and they do not like it. Neither did the two students I had before you.",
      },
      cull_report: {
        text: "Six. You are either very good or very lucky, and I have stopped being able to tell the difference. Take this - and this is not a reward, it is equipment.",
        choices: [{ text: "Equipment for what?", next: "vale_offer" }],
      },
      vale_offer: {
        text: "Vale. Fourth-year, went missing mid-term, listed as left rather than lost. He is at the Wellhead, and he is feeding it, and he is doing it because he thinks I am wasting my life.",
        choices: [
          { text: "I will go down to him.", startQuest: "the_hollow_choir", next: "vale_warn" },
          { text: "What if he is right?", next: "vale_doubt" },
        ],
      },
      vale_doubt: {
        text: "He might be. That is the trouble with him. But the doorway does not care whether the argument for opening it was a good one, and I have run out of other people to send.",
        choices: [{ text: "Then I will go.", startQuest: "the_hollow_choir", next: "vale_warn" }],
      },
      vale_warn: {
        text: "When it starts singing, do not answer it. That is the whole of the technique. I have not got a better one and I have been here four years.",
      },
    },
  },

  // ------------------------------------------------------------------ Vale

  vale_intro: {
    id: "vale_intro",
    start: "start",
    nodes: {
      start: {
        text: "Do not. Whatever Ilse told you, she told you because it is what she needs to be true.",
        choices: [
          { text: "She has been standing in a doorway for four years.", next: "argue" },
          { text: "You are feeding it your own splinters.", next: "argue" },
        ],
      },
      argue: {
        text: "I am returning them. She calls it a lock. I have read the same books she has - it is a delay, and the delay has already run out. The well shattered eleven years ago. Nothing she does now changes that.",
        choices: [
          { text: "It changes whether we are the ones who broke it.", next: "answer" },
          { text: "Then there is nothing to argue about.", next: "answer" },
        ],
      },
      answer: {
        text: "There is, though. It is a very old argument and I have had a season to prepare for it. So: hold the doorway, or open it and see. Choose.",
        choices: [
          { text: "I will hold it.", battle: "vale" },
          { text: "Show me, then.", battle: "vale" },
        ],
      },
    },
  },
};

export function dialogueById(id: string): DialogueTree | undefined {
  return DIALOGUES[id];
}
