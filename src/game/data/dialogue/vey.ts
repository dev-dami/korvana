import type { DialogueTree } from "./types";

/**
 * Headmistress Orlaith Vey. Stillwater, sixty-odd, measured; kind on the
 * surface and steel all the way down. She speaks in long, careful sentences
 * because she has learned that the short ones are the ones people remember
 * against you. She knows what the Lock is, and what she did to it.
 */
export const VEY_DIALOGUES: Record<string, DialogueTree> = {
  vey_main: {
    id: "vey_main",
    start: "start",
    nodes: {
      start: {
        redirect: [
          { requiresStage: { quest: "the_choosing", stage: ["arrive", "vey"] }, next: "pre_choosing" },
          { requiresStage: { quest: "the_choosing", stage: "lamp" }, next: "waiting_lamp" },
          { requiresStage: { quest: "the_undercroft", stage: "vey" }, requiresItem: "wardens_lantern", next: "lr1" },
          { requiresStage: { quest: "the_barrow", stage: "report" }, requiresItem: "ninefold_key", next: "kr1" },
          { requiresFlag: "game_complete", next: "post" },
        ],
        text: "Wren. Sit, if you like. The chair is ugly, but it was the first Headmaster's, and it is very hard to get anyone to take it away.",
        variants: [
          {
            requiresFlag: "relics_gathered",
            text: "Wren. Alden tells me you have all three, and that he made a speech. I am sorry about the speech. Go north, and come back, in that order.",
          },
          {
            requiresActiveQuest: "the_reliquary",
            text: "The high moor is cold even in summer, and the Reliquary was built by a woman who did not want visitors. Wrap up. And come back.",
          },
          {
            requiresActiveQuest: "the_barrow",
            text: "The forest road is open for the first time in my life. I keep going to the window to check that it still is. It still is. Go carefully.",
          },
          {
            requiresActiveQuest: "the_undercroft",
            text: "Fennick tells me the shelf has opened. He told me in a tone I have not heard from him in thirty years, and I am not sure it was disapproval.",
          },
          {
            requiresHouse: "stillwater",
            text: "Wren. A Stillwater. The Lamp does not hand us out often; we are, it says, an acquired taste. Sit. Take your time. We have a great deal of it.",
          },
          {
            requiresHouse: "emberhart",
            text: "Wren. You have the Emberhart habit of entering a room as if it might need rescuing. It does not, today. Sit.",
          },
          {
            requiresHouse: "thornwick",
            text: "Wren. Mistress Wick tells me you have already been adopted by half of Thornwick. That is their way. Resistance is possible but rarely attempted.",
          },
          {
            requiresHouse: "ravelle",
            text: "Wren. A Ravelle in my study always looks at the bookshelves first and me second. You did it too. It is all right; I would.",
          },
        ],
        choices: [
          { text: "May I ask you something, Headmistress?", next: "topics" },
          {
            text: "You look tired. Are you all right?",
            tone: "kind",
            requiresFlag: "vey_confessed",
            requiresAffinity: { min: 10 },
            next: "personal",
          },
          { text: "I should go.", next: "bye" },
        ],
      },

      bye: {
        text: "Go on, then. And Wren - the Academy keeps very odd hours, but it does keep them. Sleep at some point.",
      },

      // ------------------------------------------------- before the Choosing

      pre_choosing: {
        text: "You must be Wren. You are the only person in the Academy without a seat, and you have the look of somebody who walked here, which nobody has done in my time.",
        choices: [
          { text: "I am so sorry I'm late.", tone: "kind", affinity: 2, next: "pre_sorry" },
          { text: "Nobody told me there was a ceremony.", tone: "sharp", next: "pre_sharp" },
          { text: "Who sent my letter? It isn't signed.", tone: "curious", affinity: 1, next: "pre_letter" },
          { text: "Is it too late to be sorted? I can come back next year.", tone: "funny", affinity: 1, next: "pre_funny" },
        ],
      },
      pre_sorry: {
        text: "Do not be. The Choosing has been delayed by worse - one year by a goat, which the Lamp sorted into Thornwick before anyone could stop it. Lateness is a minor sin. Arriving at all is the important part.",
        next: "pre_send",
      },
      pre_sharp: {
        text: "No. I imagine nobody told you there was an Academy, either, until a letter did. That is a poor way to run things, and I will speak to whoever is responsible, as soon as I discover who that is.",
        next: "pre_send",
      },
      pre_letter: {
        text: "That is a better question than you know, and I am going to decline to answer it until you have been sorted, because I would like the Lamp to have the pleasure of being mysterious first. It so rarely gets the chance.",
        next: "pre_send",
      },
      pre_funny: {
        text: "Next year the Lamp would be unbearable about it. It has been holding a question open for you since breakfast, and it has told everyone. Several times. No - you will be sorted today, if only so that I can have my lunch.",
        next: "pre_send",
      },
      pre_send: {
        text: "Go and stand before the Lamp, on the dais. It will ask you questions. Answer them honestly; it can tell when you do not, and it sulks, and a sulking lantern is a very dim one.",
        choices: [
          {
            text: "I'm ready.",
            tone: "brave",
            requiresStage: { quest: "the_choosing", stage: "vey" },
            completeStage: "the_choosing",
            cutscene: "the_great_hall",
          },
          {
            text: "I'm ready.",
            tone: "brave",
            requiresStage: { quest: "the_choosing", stage: "lamp" },
            cutscene: "the_great_hall",
          },
          { text: "What will it ask me?", tone: "curious", next: "pre_advice" },
        ],
      },
      pre_advice: {
        text: "Nothing you can prepare for. It once asked me which way I would fall if I fell. I said 'forwards', and it said 'liar', and put me in Stillwater, and it was right on both counts.",
        choices: [
          {
            text: "Then I'll go and be honest at it.",
            requiresStage: { quest: "the_choosing", stage: "vey" },
            completeStage: "the_choosing",
            cutscene: "the_great_hall",
          },
          {
            text: "Then I'll go and be honest at it.",
            requiresStage: { quest: "the_choosing", stage: "lamp" },
            cutscene: "the_great_hall",
          },
        ],
      },
      waiting_lamp: {
        text: "The Lamp is waiting, Wren. It does not wait well. It has been waiting for six hundred years and has never once got any better at it.",
        choices: [
          { text: "Going.", tone: "brave" },
          { text: "What will it ask me?", tone: "curious", next: "pre_advice_late" },
        ],
      },
      pre_advice_late: {
        text: "Whatever it likes. Answer honestly, and if you disagree with what it decides, say so. It has been argued with perhaps a dozen times in its life and it enjoyed every one.",
      },

      // --------------------------------------------------------- topics

      topics: {
        text: "Ask. I will answer what I can, and tell you when I cannot, which is more than most of the people in this building will do.",
        choices: [
          { text: "Tell me about the Choosing Lamp.", tone: "curious", next: "t_lamp" },
          {
            text: "What do you think of my House?",
            requiresFlag: "sorted",
            requiresNotFlag: "act3_started",
            next: "t_house",
          },
          { text: "About my letter. Who sent it?", tone: "curious", requiresFlag: "sorted", next: "t_letter" },
          { text: "Who is Vale?", requiresFlag: "vale_glimpsed", next: "t_vale" },
          { text: "Tell me about Seren Ashdown.", requiresQuest: "seren_bargain", next: "t_seren" },
          { text: "Tell me more about the Lock. And Ilse.", requiresFlag: "vey_confessed", next: "t_lock" },
        ],
      },
      t_lamp: {
        text: "It is older than the Academy. The Academy was, in a sense, built around it, the way a house is built around a hearth. It chooses well. It has chosen badly perhaps twice, and both times it was right and we were wrong about what it had chosen for.",
        choices: [
          { text: "What does it actually look for?", tone: "curious", next: "t_lamp2" },
          { text: "Thank you.", next: "start" },
        ],
      },
      t_lamp2: {
        text: "It has told me: 'the ones who come anyway'. I have never been entirely sure what it means. I suspect it means you. Ask it yourself, when you are better friends. It is a terrible gossip, once it trusts you.",
        next: "start",
      },
      t_house: {
        text: "Every House believes itself the best and the others necessary. That is healthy. Yours, I think, will suit you.",
        variants: [
          {
            requiresHouse: "emberhart",
            text: "Emberhart will keep you warm and get you into trouble, in roughly equal measure. Their founder walked into a fire. They have been trying to live up to it ever since, which is admirable, and expensive in eyebrows.",
          },
          {
            requiresHouse: "thornwick",
            text: "Thornwick will never let you go, which you may find a comfort or a trial depending on the week. Their founder grew a hedge in a night and stayed forty years to keep it. They are like that about people.",
          },
          {
            requiresHouse: "ravelle",
            text: "Ravelle will teach you to ask the second question, and, I hope, to know when to stop asking. Not all of them learn the second part. I would like you to.",
          },
          {
            requiresHouse: "stillwater",
            text: "Stillwater is my own. We are patient, and the rest of the Academy thinks that means we are slow. Let them. The heron catches the fish, Wren, not the splashing.",
          },
        ],
        next: "start",
      },
      t_letter: {
        text: "Not I. I have never sent one in fourteen years, and neither did any Headmaster before me. The Lamp writes them. It always has. We pretend otherwise because it is easier to explain to parents.",
        choices: [
          { text: "A lantern writes letters?", tone: "curious", next: "t_letter2" },
          { text: "Why did it write to me so late?", tone: "curious", next: "t_letter3" },
        ],
      },
      t_letter2: {
        text: "In a very good hand, on paper nobody admits to supplying. I asked it once how. It said it had been many things before it was a lantern, and that some habits are harder to put out than a flame.",
        onEnter: { setFlag: "letter_truth" },
        next: "start",
      },
      t_letter3: {
        text: "I do not know. It has never written one this late before - after the term began, after the Choosing had started. Whatever it saw, it saw it in a hurry. That troubles me, a little. Most things that hurry the Lamp are bad news.",
        onEnter: { setFlag: "letter_truth" },
        next: "start",
      },
      t_vale: {
        text: "A fourth-year. Ravelle. The finest student of old texts this Academy has had in a century, and listed as withdrawn since midsummer. That is the official answer.",
        variants: [
          {
            requiresFlag: "vey_confessed",
            text: "My ward. His mother went north to keep the watch when he was four and was on it when the well shattered. I raised him from five. I have not been a good enough mother to him to stop this, and I have had a long time to notice.",
          },
        ],
        choices: [
          { text: "And the unofficial answer?", tone: "curious", requiresNotFlag: "vey_confessed", next: "t_vale2" },
          { text: "Is there anything of him left to reach?", tone: "kind", requiresFlag: "vey_confessed", affinity: 2, next: "t_vale3" },
          { text: "I see.", next: "start" },
        ],
      },
      t_vale2: {
        text: "Is not one I am ready to give you, Wren, and I would rather tell you that than lie. Bring me what you found down there, and I will tell you everything. I promise you that.",
        next: "start",
      },
      t_vale3: {
        text: "All of him, I think. That is the worst of it. He is not lost; he is perfectly himself, and grieving, and right about nearly everything. If you meet him, listen to him. Please. Nobody did, here. I did not.",
        onEnter: { setFlag: "vey_asked_listen" },
        next: "start",
      },
      t_seren: {
        text: "Seren Ashdown. Emberhart. The best climber the Academy ever had, and the only student I have ever expelled. She broke the seal on the Undercroft stair. I expelled her the same night, before breakfast, so that I could not change my mind.",
        choices: [
          { text: "Was it fair?", tone: "sharp", next: "t_seren2" },
          {
            text: "She's working with me now.",
            requiresFlag: "seren_ally",
            affinity: 1,
            next: "t_seren_ally",
          },
          {
            text: "She's racing me for the relics.",
            requiresFlag: "seren_rival",
            next: "t_seren_rival",
          },
          { text: "Thank you, Headmistress.", next: "start" },
        ],
      },
      t_seren2: {
        text: "It was necessary. Those are different words, and I have spent seven years learning the difference. She was not looking for treasure, whatever she says now. She was looking for her brother. I could not let her find the stair to him. Not then.",
        next: "start",
      },
      t_seren_ally: {
        text: "Good. Good. She will be the most infuriating companion you have ever had and the last one to leave you. Tell her - no. Do not tell her anything from me. She has earned the right not to hear it.",
        next: "start",
      },
      t_seren_rival: {
        text: "Then be faster than her, and be kinder than her, and expect neither to be enough. If she gets something you need, do not fight her for it until you have asked her why she wants it. The answer will surprise you less than you think.",
        next: "start",
      },
      t_lock: {
        text: "Ask. I owe you that, and more.",
        choices: [
          { text: "What happens if the Lock fails completely?", tone: "curious", next: "t_lock_fail" },
          { text: "What can the Silent Bell do?", tone: "curious", next: "t_bell" },
          { text: "Tell me about Ilse.", tone: "kind", next: "t_ilse" },
          { text: "That's enough for now.", next: "start" },
        ],
      },
      t_lock_fail: {
        text: "You have seen the Scar. Imagine it everywhere. Not fire, not war: just everything that lives lifted gently off the ground like dust off a sill, by something too large to notice it had done so. That is what the Keepers stood in front of. That is what I gambled with.",
        next: "t_lock",
      },
      t_bell: {
        text: "It stills things. Wraiths. The well's song. And there is a last clause in the Accord that we do not teach: that a person rung into silence at the Wellhead becomes part of the Lock. Held. For ever. Never needing relief. Do not let anyone use it on a person, Wren. I mean anyone.",
        onEnter: { setFlag: "bell_clause_known", lore: "silent_bell" },
        next: "t_lock",
      },
      t_ilse: {
        text: "My best student. Thornwick by birth and Stillwater by temper, and Wick's apprentice in wards. When I burned the list, she went north anyway, alone, because she could count and I apparently could not. She has not written. I have written to her every week for twelve years and never once sent it.",
        choices: [
          { text: "Then send one now. I'll carry it.", tone: "kind", affinity: 3, requiresNotItem: "vey_letter", next: "t_ilse2" },
          { text: "She'll hate you.", tone: "sharp", next: "t_ilse3" },
          { text: "I see.", next: "t_lock" },
        ],
      },
      t_ilse2: {
        text: "...When it is time. When you go north. I will have it ready. I have had it ready, more or less, for twelve years.",
        next: "t_lock",
      },
      t_ilse3: {
        text: "She has every right to. I would like to be hated by her in person, which is a privilege I have not earned and intend to ask for anyway.",
        next: "t_lock",
      },

      personal: {
        text: "Am I - ? Nobody has asked me that since my own Choosing. I am a Stillwater, Wren. We look tired; it is how the rest of you know we are thinking.",
        choices: [
          { text: "That isn't an answer.", tone: "sharp", affinity: 1, next: "personal2" },
          { text: "You can tell me. I won't repeat it.", tone: "kind", affinity: 2, next: "personal2" },
          { text: "All right. Forgive me.", next: "start" },
        ],
      },
      personal2: {
        text: "Very well. When he was six, Vale used to sit under the Lamp after supper and ask it about his mother. Every night. It told him she was brave. I told him she was busy. Neither of us told him she was not coming back, because neither of us could bear to.",
        choices: [
          { text: "That wasn't your fault.", tone: "kind", next: "personal3" },
          { text: "Then tell him now. When this is over.", tone: "brave", affinity: 2, next: "personal3" },
        ],
      },
      personal3: {
        text: "Perhaps. When this is over I am going north myself, Wren, to stand a season beside Ilse. I have told nobody else. I wanted somebody to know, so that I cannot pretend later that I did not decide it.",
        onEnter: { setFlag: "vey_trusts" },
        choices: [{ text: "I'll remember.", tone: "honest", affinity: 2, next: "start" }],
      },

      // ------------------------------------------------- the confession

      lr1: {
        text: "You found it. ... Put it on the sill, please. No - turn it. Let it look north. It has been wanting to for two hundred years, and I do not see why it should wait on my account.",
        choices: [
          { text: "You knew it was down there.", tone: "sharp", next: "lr2" },
          { text: "Brother Hollis sends his regards.", tone: "funny", affinity: 1, next: "lr1_hollis" },
          { text: "There was a boy in the Warden's chamber. Vale.", tone: "honest", next: "lr1_vale" },
        ],
      },
      lr1_hollis: {
        text: "Does he. He has been sending them up the stair for two centuries, in the form of very cold draughts. Return mine, if you see him again. Tell him the Academy is sorry, and that it was a long time coming.",
        next: "lr2",
      },
      lr1_vale: {
        text: "Yes. I know. I have known for a season where he goes, and I have let him go there, because the alternative was to lock him in a room, and I have tried that with people before and it has never once worked.",
        next: "lr2",
      },
      lr2: {
        text: "Sit down, Wren. I am going to tell you what the Lock is, and then I am going to tell you what I did to it, and you may think what you like of me afterwards. I would rather you thought it with the facts.",
        choices: [{ text: "Tell me.", tone: "brave", next: "lr3" }],
      },
      lr3: {
        text: "The grounds are not endless. Six hundred years ago the Moonwell opened, and something on the other side of it leaned in. Nine people folded the land shut around the well, so that the thing could find no edge, and they sat down at the Wellhead to keep it folded.",
        next: "lr4",
      },
      lr4: {
        text: "The fold is held by attention. That is the whole of it. A lock is only a lock while someone remembers it is locked. So there must always be nine at the Wellhead, watching, in shifts, for the rest of their lives.",
        choices: [
          { text: "For the rest of their lives?", tone: "curious", next: "lr5" },
          { text: "And the Academy?", tone: "curious", next: "lr5_academy" },
        ],
      },
      lr5_academy: {
        text: "Was founded by four of the Nine, to train the ones who would come after. Every twelfth year the Headmaster chooses a handful of graduates to go north. The Lamp writes to them first. That is what Korvana is for. It is in the charter, on page four hundred, in very small print.",
        next: "lr5",
      },
      lr5: {
        text: "The rest of their lives. They go at twenty-one and they do not come back. Twelve years ago I sat at this desk with the list in front of me - six names, six faces I had taught - and I put it in that fire, and I watched it burn.",
        choices: [
          { text: "Why?", tone: "curious", next: "lr6_why" },
          { text: "You let the well break.", tone: "sharp", affinity: -3, next: "lr6_sharp" },
          { text: "You were trying to save them.", tone: "kind", affinity: 3, next: "lr6_kind" },
        ],
      },
      lr6_why: {
        text: "Because I could not see why the price of the world should be paid in twenty-one-year-olds, a handful at a time, for ever. I meant to find another way. A Lock that did not cost a life apiece. I had read everything. I was so sure there was another way.",
        next: "lr7",
      },
      lr6_sharp: {
        text: "Yes. I did. A year later it shattered, because there were seven of them on watch and the Vigil says nine, and two people I refused to send were not there to hold it. Say it as plainly as you like. I have said it to myself much less kindly.",
        next: "lr7",
      },
      lr6_kind: {
        text: "That is generous. It is even true. It is also not a defence, and I will not use it as one. I was trying to save them, and I saved six, and the price of saving them was paid by everyone else.",
        next: "lr7",
      },
      lr7: {
        text: "Ilse went north anyway, alone, in my students' place. Vale's mother was on watch the night it broke. I took him in. Seren's brother went north and stayed. Every one of the people this has cost, Wren, I have known by name.",
        choices: [
          { text: "And you still think you were right?", tone: "sharp", next: "lr8_right" },
          { text: "What do you need me to do?", tone: "brave", affinity: 2, next: "lr9" },
        ],
      },
      lr8_right: {
        text: "I think I was right that it is wrong. I think I was wrong to think I could fix it by refusing. Both of those are true, and I would like you to understand how that is possible, because one day you will have to believe two such things at once yourself.",
        next: "lr9",
      },
      lr9: {
        text: "The Lantern shows the Lock. The Ninefold Key turns it. The Silent Bell stills the thing behind it while it is turned. With all three, at the Wellhead, the Lock can be set again - properly - before Vale finishes taking it apart. The other two are still in their tombs.",
        choices: [
          { text: "Then I'll fetch them.", tone: "brave", next: "lr10" },
          { text: "Why me?", tone: "curious", next: "lr9_why" },
          { text: "Why not go yourself?", tone: "sharp", next: "lr9_self" },
        ],
      },
      lr9_why: {
        text: "Because the Lamp wrote to you, late, in a hurry, when it has never hurried in six hundred years. Because the Lantern let you lift it. And because you came anyway. I am told that is the whole of what it looks for.",
        next: "lr10",
      },
      lr9_self: {
        text: "Because I am the one person in this Academy the Lock has every reason not to trust, and because if I leave, Fennick will be in charge, and he will reclassify the students alphabetically. I will go north, Wren. When it is time. It is not time.",
        next: "lr10",
      },
      lr10: {
        text: "I have opened the forest road. The Ninefold Key lies in the Thornroot Barrow, with the Keymaker. And Wren - someone else has been seen on that road this month. Seren Ashdown. If you meet her, be careful, and be kind, and do not believe a word she says about money.",
        choices: [
          {
            text: "I'll bring back the Key.",
            tone: "brave",
            startQuest: "seren_bargain",
            completeStage: "the_undercroft",
            setFlag: "vey_confessed",
            lore: "the_withheld",
          },
        ],
      },

      // ------------------------------------------------- the Key returns

      kr1: {
        text: "Let me see it. ... Nine wards, and each one turning. I used to dream about this key when I was a girl, you know. In the dream it was always much smaller, and I always lost it.",
        choices: [
          { text: "Seren helped me get it.", requiresFlag: "seren_ally", affinity: 1, next: "kr_seren_ally" },
          { text: "Seren nearly beat me to it.", requiresFlag: "seren_rival", next: "kr_seren_rival" },
          { text: "The Keymaker seemed glad to let it go.", tone: "kind", next: "kr2" },
        ],
      },
      kr_seren_ally: {
        text: "Did she. ... She always did go back for people. It is why she was a very good climber and a very bad student. Thank you for telling me.",
        next: "kr2",
      },
      kr_seren_rival: {
        text: "Nearly is Seren's favourite word. She will be at the Reliquary before you, I expect, sitting on the steps with an apple. Do not let her rush you, and do not let her see that she can.",
        next: "kr2",
      },
      kr2: {
        text: "One remains. The Silent Bell, in the Skyfall Reliquary on the high moor, north-east, before the waystone. I have opened the highland road. The Reliquary was built to be robbed exactly once, Wren. Do not be in it afterwards.",
        choices: [{ text: "Understood.", next: "kr3" }],
      },
      kr3: {
        text: "And take this. ... It is the letter. For Ilse. I wrote it a long time ago and I have rewritten it every week since, and it does not get any better. If you get as far as the Scar, give it to her. She may burn it. She is entitled.",
        choices: [
          {
            text: "I'll put it in her hands.",
            tone: "kind",
            affinity: 3,
            giveItem: "vey_letter",
            startQuest: "corvins_folly",
            completeStage: "the_barrow",
            next: "kr4",
          },
        ],
      },
      kr4: {
        text: "Thank you. And - one more thing, small, and I am sorry to add it. Amelia was at my door this morning in a state. Something about Corvin, and a letter, and the treeline. Would you see to it, before the moor? He listens to you more than to me.",
      },

      // ------------------------------------------------------ after

      post: {
        text: "Wren. Sit in the ugly chair. I have had it re-covered. It is still ugly, but now it is ugly on purpose, which I find I prefer.",
        variants: [
          {
            requiresFlag: "ending_redeemed",
            text: "Wren. The rota is on my desk. Look at it - names, dozens of them, each for a season, each coming home. Vale's at the top in his own hand. I have read it eleven times this morning. I may read it again.",
          },
          {
            requiresFlag: "ending_bound",
            text: "Wren. Sit. I have been reading the last clause of the Accord again. I do it every night now. It does not change. I keep hoping it will have been mistranslated.",
          },
          {
            requiresFlag: "ending_defeated",
            text: "Wren. Sit. I have been packing. Not for ever; for a season. Somebody has to go and stand beside Ilse, and it has been my turn for twelve years.",
          },
        ],
        choices: [
          { text: "Was it worth it?", tone: "honest", next: "post_worth" },
          {
            text: "Did you send Ilse the letter in the end?",
            requiresFlag: "ilse_read_letter",
            next: "post_letter",
          },
          { text: "Goodbye, Headmistress.", next: "bye" },
        ],
      },
      post_worth: {
        text: "Ask me in twelve years. That is how long it took me to learn the answer to the last one. But I will tell you this: when the Lamp wrote your letter it wrote 'Come anyway' at the bottom. I have it framed. I look at it when I need to.",
        variants: [
          {
            requiresFlag: "ending_bound",
            text: "I do not know. The world is shut, and a boy I raised is holding it shut for ever, and I cannot decide whether you saved him from himself or simply gave him what he feared. Perhaps both. Most mercies are.",
          },
        ],
        next: "post",
      },
      post_letter: {
        text: "She wrote back. Two lines. The first says that I was wrong. The second says that she is glad I wrote. I have read it more times than I have read the Accord, and the Accord is very much longer.",
        next: "post",
      },
    },
  },
};
