import type { DialogueTree } from "./types";

/**
 * Vale. Fourth-year, Ravelle, withdrawn. Brilliant, articulate, grieving, and
 * perfectly sincere; speaks in long, balanced sentences with the cadence of
 * someone who has rehearsed every argument alone. He is not a villain. He is
 * a boy who wants his mother back and has read enough to think he can have her.
 *
 * Three meetings. Listening to him in the first two (`vale_listened_1`,
 * `vale_listened_2`, ending in `vale_heard`) is what makes redemption possible
 * at the third.
 */
export const VALE_DIALOGUES: Record<string, DialogueTree> = {
  // ===================================== first meeting: the scarred ground

  vale_first: {
    id: "vale_first",
    start: "start",
    nodes: {
      start: {
        text: "You followed me. I asked you not to, which I suppose was the same as asking you to. Hello, Wren. Yes, I know your name. The Lamp has been saying it for weeks.",
        choices: [
          { text: "Give back the splinters.", tone: "sharp", affinity: -1, next: "sharp" },
          { text: "Who are you?", tone: "curious", affinity: 1, next: "who" },
          { text: "Are you all right? You look frozen.", tone: "kind", affinity: 2, next: "kind" },
          { text: "I'm going to tell the Headmistress.", tone: "brave", next: "brave" },
        ],
      },
      sharp: {
        text: "Give them back to whom? The Keepers put them in those niches as markers - candles in a window for people who were never coming home. They are not yours. They are not mine either. I am only taking them where they were going.",
        next: "ask",
      },
      who: {
        text: "Vale. Ravelle, fourth-year, withdrawn. 'Withdrawn' is the word they use when you leave and they would rather you had not. Vey raised me. Fennick taught me to read. The Lamp chose me. I am, you might say, the Academy's finest work.",
        next: "ask",
      },
      kind: {
        text: "...Nobody has asked me that in a season. I am, as it happens, very cold. The splinters are not warm enough to make up for the coat. Thank you for asking. It changes nothing, but thank you.",
        next: "ask",
      },
      brave: {
        text: "Tell her. Please. Tell her I said she was right, too - about the cruelty of it. It will confuse her, and she deserves to be confused by something other than me.",
        next: "ask",
      },
      ask: {
        text: "Since you are here: do you want to know what I am doing, or would you rather go on not knowing? Most people prefer the second. It is very restful.",
        choices: [
          { text: "Tell me.", tone: "curious", affinity: 2, setFlag: "vale_listened_1", next: "l1" },
          { text: "Only if you'll listen to me after.", tone: "honest", affinity: 3, setFlags: ["vale_listened_1", "vale_bargained"], next: "l1" },
          { text: "I don't need to listen to a thief.", tone: "sharp", affinity: -2, next: "refuse" },
        ],
      },
      refuse: {
        text: "No. You do not. That is all right; it is what everybody decides, in the end. Go home, Wren. If we meet again it will be further north, and I will be less pleasant.",
        choices: [{ text: "Goodbye, Vale.", completeQuest: "the_splinter_thief" }],
      },
      l1: {
        text: "The Lock is not a mechanism. It is nine people sitting very still at the Wellhead for the rest of their lives, so that something on the other side of the world cannot find the edge of it. For six hundred years. Nine at a time. Every twelve years, more children sent north to replace the ones who stopped.",
        choices: [
          { text: "That's monstrous.", tone: "honest", affinity: 2, next: "l2" },
          { text: "That's devotion.", tone: "honest", next: "l1_devotion" },
          { text: "What does that have to do with the splinters?", tone: "curious", next: "l2" },
        ],
      },
      l1_devotion: {
        text: "It is both. That is what makes it so very hard to argue with. Devotion is the most beautiful word anyone has ever found for a cage.",
        next: "l2",
      },
      l2: {
        text: "When the well shattered, the nine on watch did not die. They are still in there. Singing. The wraiths are their song walking about in the ash, collecting what was lost. Every splinter I return makes the song a little clearer. I can nearly hear the words now.",
        choices: [
          { text: "Whose voice are you listening for?", tone: "kind", affinity: 3, next: "l3" },
          { text: "You're making it worse.", tone: "sharp", next: "l2_worse" },
        ],
      },
      l2_worse: {
        text: "Possibly. Almost certainly, from the Keepers' point of view. But the Keepers' point of view is from the top of the well, and I am interested in what it looks like from the bottom.",
        choices: [{ text: "Whose voice are you listening for, Vale?", tone: "kind", affinity: 2, next: "l3" }],
      },
      l3: {
        text: "Ansa Vale. Keeper. She went north when I was four. She wrote every week for a year, and then the well broke, and the letters stopped. And then, this spring, in the Undercroft, by the Warden's niche, I heard her. Humming. The way she did when she was plaiting her hair.",
        onEnter: { setFlag: "vale_mother_known" },
        choices: [
          { text: "I'm so sorry.", tone: "kind", affinity: 3, next: "l4" },
          { text: "And if opening the well kills everyone else?", tone: "honest", affinity: 1, next: "l3_cost" },
          {
            text: "Let me help you find another way.",
            tone: "kind",
            requiresAffinity: { min: 5 },
            affinity: 2,
            setFlag: "vale_offered_help",
            next: "l4_help",
          },
        ],
      },
      l3_cost: {
        text: "It will not. The thing beyond the door is not malicious; it is weather. It would pass over. ... It might not pass over. I have read everything, Wren, and nobody knows, and I have decided that not knowing is not a good enough reason to leave her there.",
        next: "l4",
      },
      l4_help: {
        text: "Another way. Vey said that, once, twelve years ago, and burned a list, and the well shattered. ... But you mean it. I can hear that you mean it. Very well. If you find one, come and tell me. I will listen. I owe you that, for listening.",
        next: "l4",
      },
      l4: {
        text: "Go home, Wren. Tell the Headmistress I am well, which is a lie, and that I am sorry, which is not. If we meet again it will be further north, and I will try to be less pleasant. I am out of practice.",
        variants: [
          {
            requiresFlag: "vale_bargained",
            text: "You asked me to listen to you after. Say it, then. ... No? Then keep it for next time. I will remember that I owe you. Go home, Wren. If we meet again it will be further north.",
          },
        ],
        choices: [
          {
            text: "Goodbye, Vale. Get a better coat.",
            tone: "funny",
            affinity: 1,
            completeQuest: "the_splinter_thief",
          },
          {
            text: "Fennick says your library card is still valid.",
            tone: "kind",
            requiresFlag: "fennick_card",
            affinity: 3,
            completeQuest: "the_splinter_thief",
            next: "l4_card",
          },
        ],
      },
      l4_card: {
        text: "...Does he. Does he really. ... Tell him I still have 'The Vigil of the Nine'. Tell him it is in perfect condition. Tell him I am sorry it is late.",
      },
    },
  },

  // ======================================= second meeting: the treeline

  vale_second: {
    id: "vale_second",
    start: "start",
    nodes: {
      start: {
        text: "Corvin wrote to me. I wrote back. I am not going to apologise for that; he is the only person at the Academy who ever asked me a second question.",
        variants: [
          {
            requiresFlag: "vale_met_1",
            text: "Wren. Again. You have the Key now; I can see it pulling at your satchel like a dog on a lead. ... Corvin wrote to me. I wrote back. I am not going to apologise for that.",
          },
        ],
        choices: [
          { text: "Leave Corvin alone.", tone: "sharp", affinity: -1, next: "corvin" },
          {
            text: "You said you'd listen, if I found another way. I'm still looking. Talk to me.",
            tone: "honest",
            requiresFlag: "vale_listened_1",
            affinity: 2,
            next: "d1",
          },
          { text: "I'm listening now. Tell me why.", tone: "curious", requiresNotFlag: "vale_listened_1", affinity: 2, next: "f1" },
          { text: "Come back with us. Vey misses you.", tone: "kind", affinity: 1, next: "home" },
          { text: "Draw your wand.", tone: "brave", affinity: -3, next: "draw" },
        ],
      },
      corvin: {
        text: "I will, if he asks me to. He has not. He has asked me to explain the Lock to him, which nobody else at the Academy will do. Would you rather he learned it from me, or from a wraith?",
        choices: [
          { text: "I'd rather he learned it at home.", tone: "kind", affinity: 1, next: "start" },
          { text: "Fine. Then explain it to me too.", tone: "curious", next: "start" },
        ],
      },
      home: {
        text: "Vey misses the boy who sat under the Lamp asking about his mother. That boy grew up and went to find out. ... Tell her I said thank you. For the years. She did what she could. It was not enough, and that is not her fault, and I am not coming back.",
        next: "start",
      },
      draw: {
        text: "Not here. Not in front of him. ... If you want to fight me, Wren, come north. I will be at the Wellhead. I will be waiting, and I will be sorry, and it will not help either of us.",
        choices: [{ text: "Then I'll see you there.", tone: "brave", setFlag: "vale_met_2" }],
      },

      // --- first real listening, for anyone who missed the scarred ground

      f1: {
        text: "Why. ... Because nine people at a time have given up their lives to stand still for six hundred years. Because when the well broke the nine on watch were caught in it, singing. Because one of them is my mother. Is that enough of a why?",
        onEnter: { setFlags: ["vale_listened_2", "vale_mother_known"] },
        choices: [
          { text: "It's enough. I'm sorry.", tone: "kind", affinity: 3, next: "f2" },
          { text: "And the rest of the world?", tone: "honest", affinity: 1, next: "f2_world" },
        ],
      },
      f2_world: {
        text: "Would go on, I think. The thing beyond the door is weather, not a wolf. I may be wrong. I have stopped being able to care whether I am wrong, and that frightens me, a little, when I let it.",
        next: "f2",
      },
      f2: {
        text: "You are the first person who has asked why and waited for the answer. Here - take this. My notebook. Everything I found. If you think I am wrong, prove it. I would honestly like to be proved wrong. It would be such a relief.",
        onEnter: { giveItem: "vales_notebook", lore: "vales_notebook" },
        choices: [
          {
            text: "I'll read every page.",
            tone: "honest",
            requiresAffinity: { min: 5 },
            affinity: 2,
            setFlags: ["vale_heard", "vale_met_2"],
            next: "end_heard",
          },
          {
            text: "I'll read every page.",
            tone: "honest",
            requiresAffinity: { max: 4 },
            affinity: 2,
            setFlag: "vale_met_2",
            next: "end",
          },
        ],
      },

      // --- deep listening, for those who heard him once already

      d1: {
        text: "Still looking. Good. So am I. ... Ask me the second question, then. Not 'what are you doing' - you know that. The other one.",
        choices: [
          { text: "Why do you think opening it will free them?", tone: "curious", affinity: 2, next: "d2" },
          { text: "What would she want, Vale?", tone: "kind", affinity: 3, next: "d2_want" },
        ],
      },
      d2: {
        text: "Because a song needs a reason to stop. The Choir sings the watch-song because the watch is not finished - the door is shut, so the watch goes on. Open the door and there is nothing left to watch. They could stop. She could stop. It is very simple, and I have checked it nine hundred times.",
        onEnter: { setFlag: "vale_listened_2" },
        choices: [
          { text: "Or you could finish the watch for them. Shut it properly. Then they could stop too.", tone: "honest", affinity: 4, next: "d3" },
          { text: "And if you're wrong?", tone: "curious", affinity: 1, next: "d3_wrong" },
        ],
      },
      d2_want: {
        text: "...That is not fair. That is the one question I do not ask. She went north. She chose it. She wrote to me every week that she was proud to be there. And I have decided that she did not mean it, because the alternative is that she chose a doorway over me.",
        onEnter: { setFlag: "vale_listened_2" },
        choices: [
          { text: "Maybe she chose it for you. So you'd have a world to grow up in.", tone: "kind", affinity: 4, next: "d3" },
        ],
      },
      d3_wrong: {
        text: "Then the Scar, everywhere. I know. I dream about it. I wake up and I count the splinters and I go back to the well. ... You are going to tell me there is another way. Everybody says that.",
        next: "d3",
      },
      d3: {
        text: "...Hm. Nobody has put it like that. Shut it properly, so they can stop. With the Key, and the Bell, and someone to hold it while it turns. It would need - . It would need people. Willing ones. More than nine.",
        choices: [
          { text: "Then let's find them.", tone: "brave", affinity: 2, next: "d4" },
        ],
      },
      d4: {
        text: "Take this. My notebook. Everything I found, and the rota for six hundred years, and every name. If there is another way, it is in there, between the lines. I could not find it. Perhaps someone who was not looking for his mother could.",
        onEnter: { giveItem: "vales_notebook", lore: "vales_notebook", setFlags: ["vale_heard", "vale_met_2"] },
        next: "end_heard",
      },

      end: {
        text: "Go and get your Bell, Wren. I will be at the Wellhead. I will not stop because you asked me to. But I will remember that you asked.",
      },
      end_heard: {
        text: "Go and get your Bell. I will be at the Wellhead. ... And Wren - if Corvin goes home, tell him it was not because he stopped understanding. Tell him it was because he understood. I would like him to know the difference.",
      },
    },
  },

  // ================================================ the Wellhead

  vale_final: {
    id: "vale_final",
    start: "start",
    nodes: {
      start: {
        redirect: [
          { requiresFlag: "ending_redeemed", next: "post_redeemed" },
          { requiresFlag: "ending_bound", next: "post_bound" },
          { requiresFlag: ["seren_rival", "seren_has_bell", "seren_at_wellhead"], requiresNotFlag: "seren_settled", next: "blocked" },
          { requiresStage: { quest: "the_hollow_choir", stage: "aftermath" }, next: "after1" },
          { requiresStage: { quest: "the_hollow_choir", stage: "choir" }, next: "choir_again" },
          { requiresFlag: "vale_confronted", next: "again" },
          { requiresNotQuest: "the_hollow_choir", next: "too_soon" },
        ],
        text: "Do not. Whatever Ilse told you, she told you because it is what she needs to be true.",
        variants: [
          {
            requiresFlag: "vale_heard",
            text: "Wren. You came. I hoped you would and I hoped you would not, in roughly equal measure, which is a very tiring way to spend a week.",
          },
        ],
        choices: [
          { text: "She's been standing in a doorway for four years.", tone: "honest", next: "argue" },
          { text: "You're feeding it your own splinters.", tone: "sharp", next: "argue" },
          { text: "I know about your mother.", tone: "kind", requiresFlag: "vale_mother_known", affinity: 2, next: "mother" },
          {
            text: "Seren broke the Undercroft seal for you, once. She told me.",
            tone: "kind",
            requiresFlag: "seren_secret",
            once: true,
            affinity: 3,
            next: "seren_seal",
          },
          {
            text: "Corvin went home. He said to tell you he didn't stop caring - only following.",
            tone: "kind",
            requiresFlag: "corvin_home",
            once: true,
            affinity: 2,
            next: "corvin_msg",
          },
        ],
      },
      too_soon: {
        text: "Not yet, Wren. Ilse has not sent you. When she does, I will be here. I am always here now.",
      },
      blocked: {
        text: "Your friend with the bell would like a word with you first, I think. She has been looking at me the way a butcher looks at a ham. Go on. I will wait. I am very good at it now.",
      },
      seren_seal: {
        text: "...She did. Seren Ashdown, at two in the morning, with a hairpin and a hymn, because a twelve-year-old asked her to. She was expelled for it, and she never told anyone why. ... I never thanked her. I should like that to be added to the list of things I did not do.",
        next: "start",
      },
      corvin_msg: {
        text: "Only following. ... Good. Good. That is the right way round. He was always going to be cleverer than me; I am glad he is also going to be wiser. Tell him to bring toast, when he is old enough to come north. He will know what it means.",
        next: "start",
      },
      argue: {
        text: "I am returning them. She calls it a lock. I have read the same books she has - it is a delay, and the delay ran out eleven years ago. Nothing she does now changes that. All she is doing is making the people inside it sing for longer.",
        choices: [
          { text: "It changes whether we're the ones who broke it.", tone: "honest", next: "answer" },
          { text: "Then there's nothing to argue about.", tone: "sharp", next: "answer" },
          {
            text: "You told me to find another way. I think I have.",
            tone: "brave",
            requiresFlag: "vale_heard",
            requiresItem: "wardens_lantern",
            next: "redeem1",
          },
        ],
      },
      mother: {
        text: "Then you know why I cannot stop. She is down there. She is singing. Every splinter I bring her, she sings a little clearer, and last night, Wren, last night she sang my name.",
        choices: [
          {
            text: "What if she doesn't want to be freed? What if she's holding?",
            tone: "curious",
            requiresAffinity: { min: 10 },
            setFlag: "vale_heard",
            affinity: 2,
            next: "mother_holding",
          },
          { text: "Then I'm sorry. I have to stop you.", tone: "brave", next: "answer" },
        ],
      },
      mother_holding: {
        text: "...Holding. You think she is - . No. No, you cannot know that. Nobody can know that. Nobody has been able to look.",
        choices: [
          { text: "I can. I have the Lantern.", tone: "brave", requiresItem: "wardens_lantern", next: "redeem1" },
          { text: "Then I'm sorry.", tone: "sad", next: "answer" },
        ],
      },
      answer: {
        text: "It is a very old argument, and I have had a season to prepare for it. So: hold the doorway, or open it and see. Choose.",
        choices: [
          {
            text: "I will hold it.",
            tone: "brave",
            requiresNotFlag: "vale_heard",
            setFlag: "vale_confronted",
            restore: true,
            battle: "vale",
          },
          {
            text: "I will hold it.",
            tone: "brave",
            requiresFlag: "vale_heard",
            setFlag: "vale_confronted",
            restore: true,
            battle: "vale_torn",
          },
          { text: "Ring the Silent Bell.", tone: "sad", requiresItem: "silent_bell", setFlag: "vale_confronted", next: "bell1" },
          {
            text: "Look through the Lantern with me first.",
            tone: "kind",
            requiresFlag: "vale_heard",
            requiresItem: "wardens_lantern",
            setFlag: "vale_confronted",
            next: "redeem1",
          },
        ],
      },
      again: {
        text: "Again? ... Very well. I will not pretend I am not tired. I will not pretend I will stop.",
        choices: [
          { text: "Again.", tone: "brave", requiresNotFlag: "vale_heard", restore: true, battle: "vale" },
          { text: "Again.", tone: "brave", requiresFlag: "vale_heard", restore: true, battle: "vale_torn" },
          { text: "Ring the Silent Bell.", tone: "sad", requiresItem: "silent_bell", next: "bell1" },
          {
            text: "Look through the Lantern with me.",
            tone: "kind",
            requiresFlag: "vale_heard",
            requiresItem: "wardens_lantern",
            next: "redeem1",
          },
          { text: "I know about your mother.", tone: "kind", requiresFlag: "vale_mother_known", requiresNotFlag: "vale_heard", next: "mother" },
        ],
      },
      choir_again: {
        text: "The choir has not finished with you. Neither have I.",
        choices: [
          { text: "Then let's finish it.", tone: "brave", requiresNotFlag: "seren_ally", restore: true, battle: "vale_choir" },
          { text: "Then let's finish it.", tone: "brave", requiresFlag: "seren_ally", restore: true, battle: "vale_choir_aided" },
        ],
      },

      // --- the Bell

      bell1: {
        text: "You know what that does. The last clause. A person rung into silence at the Wellhead becomes part of the Lock. Held. For ever. Never needing relief. ... It is very elegant. I would have admired it, in a book.",
        choices: [
          { text: "I know. I'm sorry.", tone: "sad", next: "bell2" },
          { text: "No. Not like this.", tone: "kind", next: "answer" },
        ],
      },
      bell2: {
        text: "Do it, then, if you can bear it. I would rather be still than wrong. I would rather hold her than lose her. And this way, at least, nobody else will ever have to stand here. Ring it, Wren.",
        choices: [
          {
            text: "Ring the Bell.",
            tone: "sad",
            setFlags: ["ending_bound", "bell_rung_on_vale"],
            completeQuest: "the_hollow_choir",
            cutscene: "ending_bound",
          },
          { text: "...I can't.", tone: "honest", next: "answer" },
        ],
      },

      // --- redemption

      redeem1: {
        text: "...Why? What do you think you will show me that I have not already read?",
        choices: [
          { text: "Your mother isn't trapped. She's holding. Look.", tone: "kind", requiresAffinity: { min: 10 }, next: "redeem_look" },
          { text: "Your mother isn't trapped. She's holding. Look.", tone: "kind", requiresAffinity: { max: 9 }, next: "redeem_fail" },
        ],
      },
      redeem_fail: {
        text: "I cannot. If I look, and you are right, then everything I have done - every splinter, every night down here, every lie to Corvin - was for nothing. I cannot look, Wren. Not yet. You will have to make me.",
        choices: [
          {
            text: "Then I will.",
            tone: "brave",
            setFlag: "vale_confronted",
            restore: true,
            battle: "vale_torn",
          },
          { text: "Ring the Silent Bell.", tone: "sad", requiresItem: "silent_bell", next: "bell1" },
        ],
      },
      redeem_look: {
        text: "...All right. All right. Hold it up. ... Oh. Oh, the threads. All of them, like a loom. And there - there - that one. That one is humming. That one is - . She is not caught. She is keeping it. She has been keeping it all this time, and I have been trying to take it away from her.",
        choices: [
          { text: "Help me shut it properly. So she can stop.", tone: "kind", next: "redeem_end" },
        ],
      },
      redeem_end: {
        text: "Properly. With the Key, and the Bell, and someone to hold it while it turns. And then more someones, after. Not for ever. For a season each. ... Give me the Key, Wren. Let me be the first.",
        choices: [
          {
            text: "Turn it together. And ring the Bell for the Choir.",
            tone: "kind",
            requiresItem: "silent_bell",
            setFlags: ["ending_redeemed", "choir_freed"],
            completeQuest: "the_hollow_choir",
            cutscene: "ending_redeemed",
          },
          {
            text: "Turn it together.",
            tone: "kind",
            requiresNotItem: "silent_bell",
            setFlag: "ending_redeemed",
            completeQuest: "the_hollow_choir",
            cutscene: "ending_redeemed",
          },
        ],
      },

      // --- after the fight

      after1: {
        text: "Finish it, then. Turn your Key. I will not stop you. I cannot. ... I can hear her, Wren. She is the only one still singing. She is finishing the verse.",
        choices: [
          {
            text: "Turn the Key.",
            tone: "honest",
            requiresNotFlag: "seren_rival",
            setFlag: "ending_defeated",
            completeQuest: "the_hollow_choir",
            cutscene: "ending_defeated",
          },
          {
            text: "Turn the Key.",
            tone: "honest",
            requiresFlag: "seren_rival",
            setFlags: ["ending_defeated", "seren_took_key"],
            completeQuest: "the_hollow_choir",
            cutscene: "ending_defeated",
          },
          { text: "Ring the Bell over him.", tone: "sad", requiresItem: "silent_bell", next: "bell1" },
          {
            text: "Give me your hand, Vale. And look.",
            tone: "kind",
            requiresFlag: "vale_heard",
            requiresItem: "wardens_lantern",
            next: "redeem_look",
          },
          {
            text: "She isn't trapped, Vale. She's holding.",
            tone: "kind",
            requiresNotFlag: "vale_heard",
            requiresFlag: "vale_mother_known",
            next: "after_late",
          },
        ],
      },
      after_late: {
        text: "Holding. ... That is a kind thing to say to a beaten man. I do not believe it. I would like to. I do not. Turn the Key, Wren. Please. Before I start to.",
        next: "after1",
      },

      // --- epilogue at the well

      post_redeemed: {
        text: "Wren. The watch is extremely boring. I had not appreciated that. I read the Keepers' records aloud to keep awake and the Choir - what is left of it, which is nothing, which is wonderful - does not complain.",
        choices: [
          { text: "Is she at peace?", tone: "kind", next: "post_peace" },
          { text: "Corvin says to expect toast.", tone: "funny", requiresFlag: "corvin_home", next: "post_toast" },
          { text: "Goodbye, Vale.", tone: "kind", affinity: 1 },
        ],
      },
      post_peace: {
        text: "She stopped singing when the Lock was set. Halfway through the verse. I think she was waiting to hear someone else take it up. I took it up. I sing it very badly. I am told that is traditional.",
      },
      post_toast: {
        text: "Good. Tell him to bring jam. And tell him the second question is still the best one. And tell him - no. I will write to him. I have stamps now. The owls take my letters. It is the most extraordinary feeling.",
      },
      post_bound: {
        text: "He does not look at you. He is standing very straight at the edge of the Wellhead, perfectly still, and his lips are moving. He is reading, very quietly, from memory, to the well.",
        choices: [
          { text: "Sit with him a while.", tone: "sad", next: "post_bound2" },
          { text: "Goodbye, Vale.", tone: "sad" },
        ],
      },
      post_bound2: {
        text: "You sit. The ash is cold. After a long time, without turning his head, Vale says: 'You came anyway.' And then he goes back to reading, and does not say anything else.",
      },
    },
  },
};
