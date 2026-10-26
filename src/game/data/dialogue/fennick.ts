import type { DialogueTree } from "./types";

/**
 * Master Fennick, Librarian. Stillwater. Speaks in complete sentences with
 * subordinate clauses and the occasional spoken footnote. Pedantic, dry,
 * scrupulously fair, and privately fond of exactly the students who break his
 * rules. He gave Vale his pass, and has not issued one since.
 */
export const FENNICK_DIALOGUES: Record<string, DialogueTree> = {
  fennick_main: {
    id: "fennick_main",
    start: "start",
    nodes: {
      start: {
        redirect: [{ requiresFlag: "game_complete", next: "post" }],
        text: "Shh. ... You may speak. Quietly. The Library is open to all students. The Restricted Section is open to almost none. Which are you here for?",
        variants: [
          {
            requiresFlag: "restricted_pass",
            text: "Ah. The pass-holder. Speak quietly; the books in here have very good hearing and very long memories, and several of them are related to the people they describe.",
          },
          {
            requiresHouse: "stillwater",
            text: "A Stillwater. You will not need telling to be quiet. I find that very restful. What can the Library do for you?",
          },
          {
            requiresHouse: "ravelle",
            text: "A Ravelle. Kindly do not reshelve anything to see what happens. Somebody did that in my second year and we are still finding the poetry. What do you need?",
          },
          {
            requiresHouse: "emberhart",
            text: "An Emberhart. Lower your voice by approximately half, and then by half again. Good. What do you need?",
          },
          {
            requiresHouse: "thornwick",
            text: "A Thornwick. Please inform Mistress Wick that I have not forgotten the ferns. She will know what it means. What do you need?",
          },
        ],
        choices: [
          {
            text: "I need a pass to the Restricted Section.",
            tone: "brave",
            requiresStage: { quest: "restricted_section", stage: "catechism" },
            next: "ask1",
          },
          {
            text: "About those overdue books...",
            requiresStage: { quest: "restricted_section", stage: "books" },
            next: "books_status",
          },
          {
            text: "I have your three books.",
            requiresStage: { quest: "restricted_section", stage: "return" },
            requiresItem: ["overdue_maps", "overdue_ferns", "overdue_accord"],
            next: "return1",
          },
          {
            text: "I have all nine of the Keepers' pages.",
            requiresStage: { quest: "the_nine_pages", stage: "return" },
            requiresItemCount: { id: "keeper_page", min: 9 },
            next: "pages_done",
          },
          {
            text: "Any advice on finding the Keepers' pages?",
            requiresStage: { quest: "the_nine_pages", stage: "pages" },
            next: "t_pages",
          },
          { text: "Could we talk?", next: "talk" },
          { text: "Just browsing.", next: "bye" },
        ],
      },
      bye: {
        text: "Browse quietly. Return punctually. And do not lick your fingers to turn the pages; you have no idea where those pages have been, and in several cases neither do I.",
      },

      // ------------------------------------------------ the Catechism

      ask1: {
        text: "Do you. Everybody does, for about a week, and then they discover girls, or boys, or duelling. I have issued four passes in thirty-one years. Before I issue a fifth, you will answer the Librarian's Catechism.",
        choices: [
          { text: "What's the Librarian's Catechism?", tone: "curious", next: "ask2" },
          { text: "Ask.", tone: "brave", next: "q1" },
        ],
      },
      ask2: {
        text: "Three questions. There are no right answers. There are, however, a great many wrong ones, and I will know them when I hear them, and so will you. Ready?",
        choices: [{ text: "Ready.", next: "q1" }],
      },
      q1: {
        text: "First. Why do you want to read what other people have decided you should not?",
        choices: [
          { text: "Because something is coming apart, and the answer is in there.", tone: "honest", affinity: 2, next: "q1_good" },
          { text: "Because they might be wrong to have decided it.", tone: "sharp", affinity: 1, next: "q1_ok" },
          { text: "Because Corvin asked me to.", tone: "honest", next: "q1_corvin" },
          { text: "Because I'm curious.", tone: "curious", next: "q1_curious" },
        ],
      },
      q1_good: {
        text: "Hm. An answer with a reason in it, and the reason is not you. That is rarer than you would think. Go on.",
        next: "q2",
      },
      q1_ok: {
        text: "They might. Frequently are. That is an honest answer and a dangerous one; Vale gave it, word for word. I will accept it, and I will be watching you. Go on.",
        next: "q2",
      },
      q1_corvin: {
        text: "Then send Corvin. ... No. I will not send Corvin, and you know it, and so does he, which is why he sent you. Try again, and this time answer for yourself.",
        choices: [{ text: "Let me try again.", next: "q1" }],
      },
      q1_curious: {
        text: "Honest. Insufficient. Curiosity is a fine reason to open a book and a very poor reason to open the wrong one. Try again.",
        choices: [{ text: "Let me try again.", next: "q1" }],
      },
      q2: {
        text: "Second. In the Restricted Section you find a book that tells you how to do something terrible, simply and well. What do you do with it?",
        choices: [
          { text: "Close it, put it back, and tell you where it is.", tone: "honest", affinity: 2, next: "q2_good" },
          { text: "Read the rest, so I know how to stop it.", tone: "brave", next: "q2_vale" },
          { text: "Burn it.", tone: "sharp", affinity: -1, next: "q2_burn" },
          { text: "Make a copy, for safekeeping.", tone: "funny", next: "q2_copy" },
        ],
      },
      q2_good: {
        text: "Good. A book about a terrible thing is not a terrible thing. The reader is the terrible thing, on a bad day. Go on.",
        next: "q3",
      },
      q2_vale: {
        text: "...That is what the last one said. And he did read the rest, and he did learn how to stop it, and then he learned why he might not want to. I will accept the answer. I would like you to remember that I flinched.",
        onEnter: { setFlag: "fennick_flinched" },
        next: "q3",
      },
      q2_burn: {
        text: "You will do no such thing in my library. Nothing is safer for being ash; it is only harder to argue with. Try again.",
        choices: [{ text: "Let me try again.", next: "q2" }],
      },
      q2_copy: {
        text: "A copy. For safekeeping. ... That is how this library acquired four of its most dangerous volumes and two of its most tedious. No. Try again.",
        choices: [{ text: "Let me try again.", next: "q2" }],
      },
      q3: {
        text: "Last. What is a library for?",
        choices: [
          { text: "Remembering what people would rather forget.", tone: "honest", affinity: 3, next: "q3_good" },
          { text: "Lending things. So they come back.", tone: "kind", affinity: 2, next: "q3_lend" },
          { text: "Keeping things safe.", tone: "honest", next: "q3_keep" },
          { text: "Being quiet in.", tone: "funny", affinity: 2, next: "q3_quiet" },
        ],
      },
      q3_good: {
        text: "Yes. That is what the Keepers thought too, and it is why the Restricted Section exists: not to hide things, but to keep them from being forgotten by people who would find it convenient to forget them.",
        next: "pass_cond",
      },
      q3_lend: {
        text: "So they come back. Yes. Every book is lent on the understanding that somebody will come back. It is, when you think about it, an act of considerable optimism. Very well.",
        next: "pass_cond",
      },
      q3_keep: {
        text: "Safe is a word for a cupboard. A library is a cupboard that lets things out. ... But you meant well, and that is not nothing. Very well.",
        next: "pass_cond",
      },
      q3_quiet: {
        text: "...Ha. Hm. Being quiet in. It is, as it happens, one of the few correct answers. I have not laughed in this room since the spring of the ink flood. Very well.",
        next: "pass_cond",
      },
      pass_cond: {
        text: "You have passed the Catechism. That entitles you to the condition. I will not issue a pass while three of the Library's books are overdue in the hands of this Academy's own staff and students. Get them back.",
        choices: [
          { text: "Which books?", tone: "curious", advanceQuest: "restricted_section", next: "books_status" },
          { text: "That isn't a test, that's a chore.", tone: "sharp", advanceQuest: "restricted_section", next: "pass_chore" },
        ],
      },
      pass_chore: {
        text: "It is both. Most tests are. You will find, when you go to collect them, that each of these three books has been kept for a reason, and that the reason is a story, and that you will want to hear it. Here is the list.",
        next: "books_status",
      },
      books_status: {
        text: "'On the Unreliability of Maps', from Professor Alden, eleven years overdue. 'A Bestiary of Lesser Ferns', from Mistress Wick, thirty. 'The Accord of the Nine, Abridged', from Corvin, who thinks I do not know he has it.",
        choices: [
          { text: "Why have they kept them so long?", tone: "curious", next: "books_why" },
          { text: "I'll get them.", next: "bye" },
        ],
      },
      books_why: {
        text: "Ask them. Gently. Each of those books is holding something its borrower cannot put down. I would like them back. I would also, strictly between ourselves, like the borrowers to be able to put the other thing down.",
      },

      return1: {
        text: "Let me see. ... Maps, with the road drawn on the endpapers. Ferns, with the flowers still in. And the Accord, with every abridgement pencilled back in, in two different hands. Well.",
        choices: [
          { text: "Two different hands?", tone: "curious", next: "return_hands" },
          { text: "Do I get my pass?", tone: "brave", next: "return2" },
        ],
      },
      return_hands: {
        text: "Corvin's, and Vale's. Vale abridged it back for him, in his first year. I taught Vale to read the old hands myself. I gave him his pass. I am, in a manner of speaking, the man who opened the door.",
        onEnter: { setFlag: "heard_of_vale" },
        next: "return2",
      },
      return2: {
        text: "Your pass. And your first book, which you will read here, in the Restricted Section, under my eye or the eye of something I trust: 'The Vigil of the Nine'. It is the Keepers' handbook. The last page is a word. Do not say it aloud until you mean to.",
        choices: [
          {
            text: "Thank you, Master Fennick.",
            tone: "kind",
            affinity: 3,
            takeItems: ["overdue_maps", "overdue_ferns", "overdue_accord"],
            setFlag: "restricted_pass",
            giveItem: "keepers_vigil",
            advanceQuest: "restricted_section",
            next: "pages_offer",
          },
        ],
      },
      pages_offer: {
        text: "One thing more. The Keepers kept a commonplace book, one page each. Some fool unbound it centuries ago and hid the pages in the dark - the Undercroft, and worse places. If you find them, bring them to me. All nine. In any order. I will put them back in the right one.",
        choices: [
          { text: "I'll keep my eyes open.", startQuest: "the_nine_pages", lore: "the_nine_keepers" },
        ],
      },

      pages_done: {
        text: "All nine. ... All nine. Do you know that I have been looking for these since I was apprenticed? I had, privately, given up. Let me see them. ... They are not about the Lock at all. They are about what each of them would miss.",
        choices: [
          { text: "I read them. They broke my heart a little.", tone: "honest", affinity: 3, next: "pages_done2" },
          { text: "Will you rebind them?", tone: "curious", next: "pages_done2" },
        ],
      },
      pages_done2: {
        text: "In grey buckram, with a label in my own hand. And because I am in an uncharacteristically sentimental humour, I will teach you what the pages teach together, read in order: the Keepers' own ward. It holds as long as you do.",
        choices: [
          {
            text: "Thank you.",
            takeItem: "keeper_page",
            takeItemQty: 9,
            advanceQuest: "the_nine_pages",
            next: "pages_done3",
          },
        ],
      },
      pages_done3: {
        text: "The fine is waived. It was six hundred years overdue. I have decided, on reflection, that this was not their fault.",
      },

      // ---------------------------------------------------------- talk

      talk: {
        text: "Talk. In a library. ... Very well, quietly, and in the reading alcove, where the books are mostly poetry and will not mind.",
        choices: [
          { text: "Why have you issued so few passes?", tone: "curious", once: true, next: "t_passes" },
          { text: "Tell me about Vale.", requiresFlag: "vale_glimpsed", next: "t_vale" },
          { text: "You caught Seren Ashdown, didn't you?", requiresQuest: "seren_bargain", next: "t_seren" },
          { text: "I met Brother Hollis.", requiresQuest: "the_undercroft", requiresFlag: "met_hollis", next: "t_hollis" },
          {
            text: "You've kept that shelf shut a long time. Why, really?",
            tone: "kind",
            requiresAffinity: { min: 8 },
            requiresFlag: "undercroft_open",
            once: true,
            next: "secret1",
          },
          { text: "Never mind.", next: "start" },
        ],
      },
      secret1: {
        text: "...You are not supposed to notice that. Students notice the shelf; they do not notice the man in front of it. Very well. Thirty-one years ago my name was on the Headmaster's list. I was to go north. I was twenty-one.",
        choices: [
          { text: "What happened?", tone: "curious", next: "secret2" },
          { text: "You didn't go.", tone: "honest", next: "secret2" },
        ],
      },
      secret2: {
        text: "I asked to stay. The Headmaster of the day was kinder than the office required, and let me. Somebody else went in my place - a girl from Thornwick who laughed too loudly in the reading room. I have kept the stair shut ever since, so that I would never have to look down it and wonder whether she was still at the bottom.",
        choices: [
          { text: "That wasn't cowardice, Master Fennick.", tone: "kind", affinity: 3, next: "secret3" },
          { text: "Is that why you gave Vale his pass?", tone: "curious", affinity: 1, next: "secret3_vale" },
        ],
      },
      secret3: {
        text: "It was a little cowardice and a great deal of wanting to live, and I have never been able to separate them. That is the trouble with true things; they so rarely come one at a time. ... Thank you. I have not said that aloud before. It is quieter than I expected.",
        onEnter: { setFlag: "fennick_secret" },
        next: "talk",
      },
      secret3_vale: {
        text: "Yes. He asked the question I never had the courage to ask - whether it was right to send anyone at all - and I thought he deserved the books to answer it with. I did not think he would answer it so thoroughly. I suppose I should have.",
        onEnter: { setFlag: "fennick_secret" },
        next: "talk",
      },
      t_passes: {
        text: "Because every pass I have issued has been to a student who then went somewhere I could not follow. Ilse went north. A girl called Maren went into the Undercroft and came back a Divination tutor's wife, which I consider worse. Vale went north. I am beginning to suspect the pass.",
        next: "talk",
      },
      t_vale: {
        text: "The best reader of old hands I have ever taught. He could read a Keeper's note in the dark by the indentations. He asked me once whether the Lock was kind. I said that was not a question a library could answer. He said, 'Then what are you for?' I have not had a good answer since.",
        choices: [
          { text: "Remembering what people would rather forget.", tone: "kind", affinity: 2, next: "t_vale2" },
          { text: "It isn't your fault, Master Fennick.", tone: "kind", affinity: 1, next: "t_vale2" },
        ],
      },
      t_vale2: {
        text: "...Thank you. If you see him - if you see him, tell him his library card is still valid. He will know what I mean. He was the only student who ever returned everything on time.",
        onEnter: { setFlag: "fennick_card" },
        next: "talk",
      },
      t_seren: {
        text: "At the water's edge, at two in the morning, halfway through the seal with a hairpin and a borrowed hymn. She did not run. She asked me, very politely, whether her brother was down there. I said no. I believe that is the only time I have ever been sorry to be right.",
        next: "talk",
      },
      t_hollis: {
        text: "Brother Hollis. The last archivist. ... I have been leaving the Restricted Section's draughtiest window open for thirty-one years, because a cold draught smelling of river water comes up the stair every evening at seven, and it would be rude not to let it in. I did not know it had a name.",
        next: "talk",
      },
      t_pages: {
        text: "The pages are in the tombs, three to a tomb if the old catalogues are honest, and they never are. Look in the places a Keeper would hide something from another Keeper: high, behind, and under anything that looks heavy.",
        next: "start",
      },

      post: {
        text: "Shh. ... Oh. It is you. You may speak at a normal volume. I have decided, for you, to make an exception. Do not tell the Ravelles.",
        choices: [
          { text: "What will you do now?", tone: "curious", next: "post_now" },
          { text: "Goodbye, Master Fennick.", next: "bye" },
        ],
      },
      post_now: {
        text: "What I always do. Catalogue it. All of it. Somebody must write down what happened, accurately, before the Emberharts turn it into a song. They have already started. The second verse rhymes 'Key' with 'tea'.",
        variants: [
          {
            requiresFlag: "ending_redeemed",
            text: "I am on the rota. Fourth, after the Headmistress. A season at the Wellhead. I intend to catalogue the Keepers' camp library, which is three books and a very wet hymnal, and I have never looked forward to anything so much.",
          },
        ],
      },
    },
  },
};
