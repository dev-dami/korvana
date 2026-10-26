import type { DialogueTree } from "./types";

/**
 * Professor Alden. Divination, which he teaches as the study of being wrong.
 * Dry to the point of dust, kind underneath it, and carrying eight years of
 * guilt about two students he sent up the north road. He speaks in qualified
 * sentences and undercuts himself before anyone else can.
 */
export const ALDEN_DIALOGUES: Record<string, DialogueTree> = {
  alden_intro: {
    id: "alden_intro",
    start: "start",
    nodes: {
      start: {
        redirect: [
          { requiresStage: { quest: "the_choosing", stage: ["arrive", "vey"] }, next: "arrive" },
          { requiresFlag: "game_complete", next: "post" },
        ],
        text: "Ah. You have the look of someone who has read the acceptance letter twice and understood it once. That is the correct ratio; do not let anyone tell you otherwise.",
        variants: [
          {
            requiresActiveQuest: "the_north_road",
            text: "You are still here. I can see the waystone road from my window, and you are not on it. I say that with affection and some alarm.",
          },
          {
            requiresActiveQuest: "the_reliquary",
            text: "The high moor. I went up there once, as a student, and came down convinced the wind was trying to tell me something. It was. It was 'go home'.",
          },
          {
            requiresActiveQuest: "the_barrow",
            text: "Vey has opened the forest road. I watched her do it. She stood at the gate for a long time with her hand on the latch, and then she did it very quickly, the way one pulls a tooth.",
          },
          {
            requiresActiveQuest: "restricted_section",
            text: "Fennick has asked me to return a book. He asked me in the corridor, in front of the second-years, using my full name. I have not been so frightened in a decade.",
          },
          {
            requiresHouse: "emberhart",
            text: "Our newest Emberhart. You will want to be told that courage is a virtue. It is. So is checking whether the floor is there before you leap on to it. Hold both.",
          },
          {
            requiresHouse: "thornwick",
            text: "A Thornwick. Excellent. Your House is the only one that remembers my birthday, and only because Wick has it written in a planting calendar between turnips and the frost.",
          },
          {
            requiresHouse: "ravelle",
            text: "A Ravelle. Good. You will ask me questions I cannot answer and I will pretend that is pedagogy. We are going to get on very well, or not at all.",
          },
          {
            requiresHouse: "stillwater",
            text: "A Stillwater. I can never tell what your House is thinking, which is excellent practice for a Divination tutor. Do keep it up.",
          },
        ],
        choices: [
          {
            text: "I have cast a spell, as you asked.",
            requiresStage: { quest: "first_lesson", stage: "report" },
            advanceQuest: "first_lesson",
            affinity: 2,
            next: "lesson_report",
          },
          {
            text: "What would you have me do first?",
            requiresFlag: "sorted",
            requiresNotQuest: "first_lesson",
            next: "offer",
          },
          {
            text: "Fennick wants 'On the Unreliability of Maps' back.",
            requiresStage: { quest: "restricted_section", stage: "books" },
            requiresNotFlag: "got_maps",
            next: "maps1",
          },
          {
            text: "I have them. All three relics.",
            requiresStage: { quest: "the_reliquary", stage: "report" },
            requiresItem: ["wardens_lantern", "ninefold_key"],
            next: "relics1",
          },
          { text: "Could we talk?", next: "talk" },
          { text: "Good day, Professor.", next: "bye" },
        ],
      },
      bye: {
        text: "Off you go then. The treeline is that way, and the students are mostly harmless. I have predicted this, so naturally it may not be true.",
      },

      arrive: {
        text: "Ah - you must be the one the Lamp has been going on about. You are late. Everyone is in the Great Hall being Chosen, and the Lamp has been holding the last question open for you since breakfast, which it will tell you about. At length.",
        choices: [
          { text: "Where is the Great Hall?", tone: "curious", next: "arrive_where" },
          { text: "I'm sorry. The road was longer than the letter said.", tone: "kind", affinity: 2, next: "arrive_road" },
          { text: "Who are you?", tone: "curious", next: "arrive_who" },
        ],
      },
      arrive_where: {
        text: "The very large building you are standing in front of. Go in through the great door and keep walking until somebody tells you to stop, and then stand in front of the Headmistress and look apologetic.",
      },
      arrive_road: {
        text: "Roads here are always longer than the letter says. The grounds are... generous, with distance. Go in. Vey will be glad to see you, though she will not show it until about Thursday.",
      },
      arrive_who: {
        text: "Alden. I teach Divination, which is the rigorous study of how often we are wrong. I predicted you would arrive on Thursday. As you see, I am very good at my subject. Go in - the great door. Quickly.",
      },

      offer: {
        text: "Before I teach you anything worth knowing, I want to see you cast. The Lamp gave you a spell, I hope? Good. Go out on the practice ground and use it on something that deserves it, and then come back and tell me how it felt.",
        choices: [
          { text: "Consider it done.", tone: "brave", startQuest: "first_lesson", next: "offer_go" },
          { text: "Spar with me instead.", tone: "brave", next: "spar" },
          { text: "How should it feel?", tone: "curious", next: "offer_feel" },
        ],
      },
      offer_feel: {
        text: "Like the moment before a sneeze, followed by a small apology to the universe. If it feels like anything else, come and see me before you try it twice.",
        choices: [{ text: "Right. Off I go.", startQuest: "first_lesson", next: "offer_go" }],
      },
      offer_go: {
        text: "And if you meet Amelia, Wick or Corvin on the way, any of them will find you something to do. Wick has a book, Amelia has a missing owl, and Corvin has a theory, which is worse than either.",
      },
      spar: {
        text: "Bold. Very well - wand up. My practice shade is a patient opponent and a sore winner. Try not to embarrass us both.",
        choices: [
          { text: "Ready.", tone: "brave", battle: "sparring" },
          { text: "On second thought, the practice ground sounds fine.", next: "start" },
        ],
      },
      lesson_report: {
        text: "You have. Adequately, even, which is more than most manage on the first morning. Here - Fire Bolt. It is a real spell, so do not practise it indoors, near Fennick, or near anything Fennick is fond of, which is books.",
        next: "lesson_report2",
      },
      lesson_report2: {
        text: "Now your first lesson in Divination, free of charge: you will spend the next year being told that you are special. Some of it will be true. None of it will help. Watch what is actually in front of you.",
        choices: [
          { text: "That's surprisingly good advice.", tone: "funny", affinity: 2, next: "lesson_report3" },
          { text: "Is it a prediction?", tone: "curious", affinity: 1, next: "lesson_report3" },
        ],
      },
      lesson_report3: {
        text: "Everything I say is a prediction. Most of them are about lunch. Go on - Wick has been muttering about wards, Amelia has lost an owl, and Corvin has lost his manners. Any of them will keep you busy.",
      },

      // --- the overdue book

      maps1: {
        text: "Does he. ... Eleven years. Has it been eleven years? I suppose it has. Yes, I have it. It is on my desk. It has been on my desk the entire time. I have been - using it.",
        choices: [
          { text: "Using it for what?", tone: "curious", next: "maps2" },
          { text: "He said you'd say that.", tone: "funny", affinity: 1, next: "maps2" },
        ],
      },
      maps2: {
        text: "Eight years ago I sent two students up the north road to check the waystones. Brother and sister. Ashdown. Good climbers, good minds. I drew them the road on the endpapers of this book so they would not get lost.",
        next: "maps3",
      },
      maps3: {
        text: "One of them came back. Seren. She would not say what happened, and she would not look at me, and a year later she broke the seal on the Undercroft stair and Vey had no choice. Tobin did not come back at all.",
        onEnter: { setFlag: "heard_of_ashdowns" },
        choices: [
          { text: "That isn't your fault.", tone: "kind", affinity: 3, next: "maps4" },
          { text: "Why did you send students?", tone: "sharp", next: "maps_sharp" },
          { text: "What do you think happened to him?", tone: "curious", next: "maps_think" },
        ],
      },
      maps_sharp: {
        text: "Because the faculty would not go, and because I would not go, which is the part I find hardest. I was frightened of the north road. I am a Divination tutor. I knew exactly how frightened to be.",
        next: "maps4",
      },
      maps_think: {
        text: "I think he reached something worth staying for. I have predicted that every morning for eight years, so as to have one entry in the RIGHT column I could live with. I would very much like to be told.",
        next: "maps4",
      },
      maps4: {
        text: "Here. Take it back to Fennick. Tell him the fine is acceptable. And if you ever meet Seren Ashdown - which you may, the way things are going - tell her I still have the road drawn. Tell her I never rubbed it out.",
        choices: [
          {
            text: "I'll tell her.",
            tone: "kind",
            giveItem: "overdue_maps",
            setFlag: "got_maps",
            advanceQuest: "restricted_section",
          },
        ],
      },

      // --- the three relics

      relics1: {
        text: "You - all three? Show me. No, put them down, I do not want to hold them, I want to look at them. ...The Lantern. The Key. And the Bell. I have only ever seen drawings.",
        variants: [
          {
            requiresFlag: "seren_has_bell",
            text: "You - two of three, and Seren Ashdown has the Bell? Well. That is either a disaster or the most Seren thing that has ever happened. Possibly both. Show me the others.",
          },
        ],
        choices: [
          { text: "What happens now?", tone: "curious", next: "relics2" },
          { text: "The Reliquary fell in. I nearly didn't get out.", tone: "honest", affinity: 1, next: "relics_fell" },
          { text: "Seren went back for me.", requiresFlag: "seren_ally", tone: "kind", affinity: 2, next: "relics_seren" },
        ],
      },
      relics_fell: {
        text: "Anwen of the Bells was not a hospitable woman. I am glad you are standing in my study and not under her moor. I am going to make a note of it in the RIGHT column. Small handwriting, so as not to tempt anything.",
        next: "relics2",
      },
      relics_seren: {
        text: "Did she. ... Did she. Then she is still her brother's sister. I do not know if that is good news for her, but it is very good news for you.",
        next: "relics2",
      },
      relics2: {
        text: "Now, I am afraid, I send you north. To the waystone, and past it, to the Scar. There is someone there you need to meet, if she is still alive, and I have been afraid for four years to find out whether she is.",
        choices: [
          { text: "I'm ready.", tone: "brave", completeStage: "the_reliquary" },
          { text: "Who is she?", tone: "curious", next: "relics_who" },
        ],
      },
      relics_who: {
        text: "Ilse. The last Keeper. Wick's apprentice. She went north twelve years ago in place of six students Vey would not send, and she has been holding the watch alone for four. Tell her - no. Tell her nothing from me. Just go.",
        choices: [{ text: "I'll go.", tone: "brave", completeStage: "the_reliquary" }],
      },

      // ---------------------------------------------------------- talk

      talk: {
        text: "Talk? Certainly. I am at my most reliable when talking, as there is no pressure to be right.",
        choices: [
          { text: "What is Divination, really?", tone: "curious", once: true, next: "t_div" },
          { text: "What do you make of the others? The faculty.", tone: "curious", next: "t_faculty" },
          { text: "Tell me about the grounds.", tone: "curious", next: "t_grounds" },
          { text: "About Seren and Tobin...", requiresFlag: "heard_of_ashdowns", next: "t_ashdown" },
          { text: "Spar with me.", tone: "brave", next: "spar" },
          { text: "Never mind.", next: "start" },
        ],
      },
      t_div: {
        text: "The rigorous study of how often we are wrong, and in which direction. I keep a tally on my wall. WRONG is very long. RIGHT has two entries. One was that it would rain at my wedding. The other I will tell you about when it has happened.",
        onEnter: { lore: "divination" },
        next: "talk",
      },
      t_faculty: {
        text: "Vey is the best Headmistress this Academy has had and the unhappiest, and those may be related. Wick is kind in a way that leaves bruises. Fennick is the only man I have ever met who can make silence sound like an accusation. I would trust all three with my life. I would not trust any of them with my library card.",
        next: "talk",
      },
      t_grounds: {
        text: "Endless, officially. The further you walk the stranger it gets, and the stranger it gets the more it looks like where you started. If you ever find yourself somewhere that looks exactly like home, stop, and check behind you. Then check again.",
        variants: [
          {
            requiresFlag: "vey_confessed",
            text: "You know the truth now, so I can say it: folded. Closed like a hand around something it does not want us to touch. I used to find that frightening. Lately I find it rather tender, which I suspect means I am getting old.",
          },
        ],
        next: "talk",
      },
      t_ashdown: {
        text: "Tobin used to argue with me about whether prophecy was possible. Seren used to climb the outside of the Divination tower to get to class on time. They were the best two students I ever taught and I sent them up a road I would not walk myself.",
        variants: [
          {
            requiresFlag: "seren_mourned",
            text: "You found out, then. He stayed. He chose it. ... Thank you. I have moved him from my list of failures to a list I keep of people who were braver than me. It is a longer list than I would like.",
          },
        ],
        next: "talk",
      },

      // ---------------------------------------------------------- after

      post: {
        text: "You have been gone a season. I did not send anyone after you, and I would like you to know that was a decision and not an oversight.",
        choices: [
          { text: "Tell me what I missed.", cutscene: "alden_epilogue" },
          { text: "Did your prediction come true? The second one?", tone: "curious", next: "post_pred" },
          { text: "Goodbye, Professor.", next: "bye" },
        ],
      },
      post_pred: {
        text: "It did. I predicted that a student would put the three relics on my desk and I would have to send them north. I did not predict that they would come back. I have added a third entry to the RIGHT column. It is in very large letters.",
        next: "post",
      },
    },
  },
};
