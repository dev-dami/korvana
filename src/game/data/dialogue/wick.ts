import type { DialogueTree } from "./types";

/**
 * Mistress Wick. Herbology and Wards. Brisk, short sentences, mothering by
 * instruction; would rather hand you a trowel than a compliment. Thornwick to
 * the bone. Ilse was her apprentice, and she has never once said the name
 * out loud in front of a student.
 */
export const WICK_DIALOGUES: Record<string, DialogueTree> = {
  wick_intro: {
    id: "wick_intro",
    start: "start",
    nodes: {
      start: {
        redirect: [{ requiresFlag: "game_complete", next: "post" }],
        text: "Mind the herbs. Half of them bite, and the other half bite later.",
        variants: [
          {
            requiresStage: { quest: "the_choosing", stage: ["arrive", "vey"] },
            text: "You're the late one. Don't stand there dripping on my seedlings - inside, the Great Hall, the Lamp's waiting. Go. And wipe your feet.",
          },
          {
            requiresQuest: "keeper_ilse",
            text: "You've been north. I can see the ash in your hem. ... Sit down. No, sit. I'll make tea. Then you'll tell me.",
          },
          {
            requiresHouse: "thornwick",
            text: "One of mine! Good. Thornwick looks after its own. You'll get a trowel, a pot, and an opinion about compost. Mind the herbs.",
          },
          {
            requiresHouse: "emberhart",
            text: "An Emberhart. Keep your sleeves away from the dragonwort; it remembers fire and likes to be reminded. Mind the herbs.",
          },
          {
            requiresHouse: "ravelle",
            text: "A Ravelle. Don't poke that. Don't ask what it does. It does what it does to people who poke it. Mind the herbs.",
          },
          {
            requiresHouse: "stillwater",
            text: "A Stillwater. Good. You'll be patient with the slow ones. Most of my students dig them up to check. Mind the herbs.",
          },
        ],
        choices: [
          {
            text: "I have read the Primer.",
            requiresStage: { quest: "wards_reading", stage: "report" },
            advanceQuest: "wards_reading",
            affinity: 3,
            next: "read_report",
          },
          {
            text: "Can you teach me defensive magic?",
            requiresFlag: "sorted",
            requiresNotQuest: "wards_reading",
            next: "teach",
          },
          {
            text: "Fennick says you have 'A Bestiary of Lesser Ferns'.",
            requiresStage: { quest: "restricted_section", stage: "books" },
            requiresNotFlag: "got_ferns",
            next: "ferns1",
          },
          {
            text: "I met Ilse.",
            tone: "honest",
            requiresQuest: "keeper_ilse",
            requiresNotFlag: "told_wick_ilse",
            next: "ilse1",
          },
          { text: "Could we talk?", next: "talk" },
          { text: "I'll keep my distance.", affinity: 1, next: "distance" },
        ],
      },
      distance: {
        text: "Sensible. Sensible students live longer, though they feature less in the histories.",
      },

      teach: {
        text: "Warding, you mean. I can. Here - the Primer. Read it, actually read it, and then come and tell me what the first page says, without looking.",
        choices: [
          {
            text: "I'll read it tonight.",
            tone: "brave",
            startQuest: "wards_reading",
            giveItem: "primer_of_wards",
            next: "teach_done",
          },
          { text: "Do they actually bite? The herbs?", tone: "funny", next: "bite" },
        ],
      },
      bite: {
        text: "One of them. I forget which. That's rather the game.",
        next: "teach",
      },
      teach_done: {
        text: "The greenhouses are open to you. Don't let the cauldrons out. And read the margins - a student of mine wrote in them years ago. She was better at wards than the book.",
      },
      read_report: {
        text: "Well. Go on. What does the first page say?",
        choices: [
          { text: "A ward is not a wall. It's an argument about where you end.", tone: "honest", affinity: 3, next: "read_right" },
          { text: "Something about posture?", tone: "funny", next: "read_posture" },
          { text: "Hold it longer than you think you can.", tone: "brave", affinity: 2, next: "read_margin" },
        ],
      },
      read_right: {
        text: "Good. Most people carry it about for a term and tell me they read it. Take these - you'll want them in the ash, if you get that far.",
        next: "ash_warn",
      },
      read_posture: {
        text: "That's pages two to two hundred. Page one's the important one. Never mind. You read it; I can tell, you've got the stoop. Take these.",
        next: "ash_warn",
      },
      read_margin: {
        text: "...That's not the book. That's the margin. That's her. ... Well. Then you read it properly. Take these. You'll want them in the ash, if you get that far.",
        onEnter: { setFlag: "wick_margin" },
        next: "ash_warn",
      },
      ash_warn: {
        text: "You'll hear the students say the Scar is a story. It's not a story. It's a mile of ground where nothing has grown for eleven years, and it's getting bigger.",
        choices: [
          { text: "Who wrote in the margins?", tone: "curious", requiresFlag: "wick_margin", next: "margin_who" },
          { text: "I'll remember.", next: "teach_done" },
        ],
      },
      margin_who: {
        text: "A student. A good one. Ask me another time. Or don't.",
      },

      // --- the overdue book

      ferns1: {
        text: "Does he now. Thirty years he's been after that book. ...Fine. Fine. Here. Mind, it's full.",
        choices: [
          { text: "Full of what?", tone: "curious", next: "ferns2" },
          { text: "It's twice the thickness it should be.", tone: "funny", next: "ferns2" },
        ],
      },
      ferns2: {
        text: "Pressed flowers. One for every spring since. Ashbloom, mostly. It's a northern flower. It grows where nothing else will, which is why she liked it. She used to say nothing would grow up there. I used to say: then take this.",
        choices: [
          { text: "Who?", tone: "kind", next: "ferns3" },
          { text: "You don't have to tell me.", tone: "kind", affinity: 3, next: "ferns3" },
        ],
      },
      ferns3: {
        text: "Ilse. My apprentice. Wards. Best I ever taught. Went north twelve years ago when nobody else would, and I helped her pack. I've pressed a flower every spring since. Haven't anywhere to send them.",
        onEnter: { setFlag: "heard_of_ilse" },
        choices: [
          {
            text: "If I go north, I'll find her.",
            tone: "brave",
            affinity: 4,
            giveItem: "overdue_ferns",
            setFlag: "got_ferns",
            advanceQuest: "restricted_section",
            next: "ferns4",
          },
          {
            text: "I'll take good care of the book.",
            giveItem: "overdue_ferns",
            setFlag: "got_ferns",
            advanceQuest: "restricted_section",
            next: "ferns4",
          },
        ],
      },
      ferns4: {
        text: "Tell Fennick the flowers stay in. If he takes one out I'll know. Plants talk. Go on.",
      },

      // --- Ilse

      ilse1: {
        text: "You -. Sit down. Is she - how is she?",
        choices: [
          { text: "Alive. Tired. Still holding.", tone: "honest", affinity: 2, next: "ilse2" },
          { text: "She asked about you.", tone: "kind", affinity: 3, next: "ilse_asked" },
          { text: "Angry. With all of us.", tone: "honest", next: "ilse_angry" },
        ],
      },
      ilse_asked: {
        text: "Did she. ... She never could lie to me; she'd go red in the ears. You can, I see. Kindly. That's a Thornwick habit and I approve of it entirely.",
        next: "ilse2",
      },
      ilse_angry: {
        text: "Good. Angry's good. Angry means she's still got something left to be angry with. It's the quiet ones you lose.",
        next: "ilse2",
      },
      ilse2: {
        text: "Take her this. It's ashbloom seed. Tell her - tell her to plant it by the tents. Tell her I said it'll grow, and I'm never wrong about soil. And tell her the book's back in the library, where it belongs, the fool.",
        onEnter: { setFlags: ["told_wick_ilse", "wick_message"] },
        choices: [{ text: "I'll tell her every word.", tone: "kind", affinity: 3 }],
      },

      // ---------------------------------------------------------- talk

      talk: {
        text: "Talk. While I pot these. You can hold the trowel. No - the other end.",
        choices: [
          { text: "Tell me about your House.", next: "t_house" },
          { text: "What do you think of the Headmistress?", tone: "curious", next: "t_vey" },
          { text: "Why don't you and Fennick get on?", tone: "curious", once: true, next: "t_fennick" },
          { text: "What about Amelia and Corvin?", next: "t_students" },
          { text: "Who wrote in the Primer's margins?", requiresFlag: ["heard_of_ilse", "wick_margin"], next: "t_margin" },
          { text: "I'll let you work.", next: "start" },
        ],
      },
      t_house: {
        text: "Thornwick. Founder grew a hedge round a village in one night, then stayed forty years trimming it. That's us. We don't do the dramatic bit. We do the forty years. Somebody has to.",
        next: "talk",
      },
      t_vey: {
        text: "Orlaith? Best woman I know. Worst at forgiving herself. She did a thing twelve years ago she thought was right, and it might've been, and it cost more than anybody can pay. She pays it anyway. Every day. You can see it on her.",
        next: "talk",
      },
      t_fennick: {
        text: "Thirty years ago I pressed a flower in a library book. He called it vandalism. I called it a bookmark. We have not agreed since, on anything, except that the Academy would fall down without either of us. Which it would.",
        next: "talk",
      },
      t_students: {
        text: "Amelia's braver than she is sensible, which at her age is the right way round. Corvin's cleverer than he is happy, which isn't. Watch him for me. He's got the look Vale had, the year before.",
        onEnter: { setFlag: "wick_warned_corvin" },
        next: "talk",
      },
      t_margin: {
        text: "Ilse. 'Hold it longer than you think you can.' She wrote that the night before she left. I've never had the heart to rub it out, and I've never had the heart to read it twice.",
        next: "talk",
      },

      post: {
        text: "There you are. I've been out to the edge of the Scar. Planted ashbloom all along it. Somebody told me once nothing would grow up there.",
        variants: [
          {
            requiresFlag: "ending_redeemed",
            text: "There you are! Ilse came home. For a week. She slept for four days of it in my greenhouse, under the tomato frames, and on the fifth she weeded the lot without being asked. I could weep. I did, a bit.",
          },
        ],
        choices: [
          { text: "Is it growing?", tone: "curious", next: "post_grow" },
          { text: "Goodbye, Mistress Wick.", next: "distance" },
        ],
      },
      post_grow: {
        text: "Of course it's growing. I'm never wrong about soil. Mind the herbs.",
      },
    },
  },
};
