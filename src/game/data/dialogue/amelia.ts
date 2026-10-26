import type { DialogueTree } from "./types";

/**
 * Amelia. Third-year, Emberhart, and would like everyone to know. Talks fast,
 * in run-on sentences that double back on themselves; brave in daylight
 * because she is terrified of the dark, and has never told anyone that.
 */
export const AMELIA_DIALOGUES: Record<string, DialogueTree> = {
  amelia_intro: {
    id: "amelia_intro",
    start: "start",
    nodes: {
      start: {
        redirect: [{ requiresFlag: "game_complete", next: "post" }],
        text: "You're the new one. Everyone is talking about it, which is unfair, because nobody talks about me.",
        variants: [
          {
            requiresStage: { quest: "the_choosing", stage: ["arrive", "vey"] },
            text: "You're the new one! You haven't been Chosen yet - you have to go in, now, the Lamp's been going on about you all morning and it gets snippy, it once called a boy a 'damp taper' and he never recovered.",
          },
          {
            requiresActiveQuest: "corvins_folly",
            text: "Oh thank goodness. It's Corvin. He's gone. He left before it was light with his satchel and a letter he wouldn't let me read and he was smiling, Wren. Corvin doesn't smile. Something is very wrong.",
          },
          {
            requiresFlag: "relics_gathered",
            text: "Everyone's saying you're going north. Properly north. Past the waystone. Are you? You are. I can tell, you've got the face. I'm not going to cry. I'm just going to stand here and be fine.",
          },
          {
            requiresHouse: "emberhart",
            text: "You're one of us! An Emberhart! I knew it. I said to Corvin, I said, that one's going to be an Emberhart, and he said I say that about everyone, which is a lie, I didn't say it about him.",
          },
          {
            requiresHouse: "thornwick",
            text: "A Thornwick! Well. Somebody has to be. They're lovely. They knitted me a scarf once when I was ill and I hadn't even told them I was ill. It was frightening.",
          },
          {
            requiresHouse: "ravelle",
            text: "A Ravelle. Like Corvin. Please don't become like Corvin. One Corvin is enough Corvin for any Academy. ... Sorry. That was mean. He's all right really.",
          },
          {
            requiresHouse: "stillwater",
            text: "A Stillwater. You'll be very calm about everything and then I'll find out a month later that you were secretly upset and I'll feel terrible. Promise you'll tell me things.",
          },
        ],
        choices: [
          {
            text: "I found Pip. She's on her way home.",
            requiresStage: { quest: "missing_owl", stage: "return" },
            advanceQuest: "missing_owl",
            affinity: 5,
            next: "owl_report",
          },
          {
            text: "About those duels - I've won three.",
            requiresStage: { quest: "proving_ground", stage: "report" },
            advanceQuest: "proving_ground",
            affinity: 4,
            next: "duel_report",
          },
          {
            text: "Are you all right?",
            tone: "kind",
            requiresFlag: "sorted",
            requiresNotQuest: "missing_owl",
            next: "owl",
          },
          {
            text: "Nobody takes me seriously either.",
            requiresCompleteQuest: "missing_owl",
            requiresNotQuest: "proving_ground",
            next: "duel_offer",
          },
          {
            text: "Where did Corvin go?",
            requiresActiveQuest: "corvins_folly",
            next: "corvin_gone",
          },
          { text: "Let's talk.", next: "talk" },
        ],
      },

      owl: {
        text: "Me? I'm fine. Completely fine. My owl went out to the treeline three days ago and hasn't come back, and I keep telling myself owls do that, and I keep not believing me.",
        choices: [
          { text: "I'll go and look for her.", tone: "brave", startQuest: "missing_owl", setFlag: "pip_lost", affinity: 4, next: "owl_thanks" },
          { text: "What's her name?", tone: "kind", affinity: 1, next: "owl_name" },
          { text: "I'm sure she's fine.", next: "smalltalk" },
        ],
      },
      owl_name: {
        text: "Pip. She's small and brown and looks permanently disappointed, like someone's grandmother. She's the best owl in the Academy and she knows it. Will you - would you look?",
        choices: [
          { text: "Of course I'll look.", tone: "kind", startQuest: "missing_owl", setFlag: "pip_lost", affinity: 4, next: "owl_thanks" },
          { text: "Maybe later.", next: "smalltalk" },
        ],
      },
      owl_thanks: {
        text: "Really? Thank you. Look for feathers - she moults when she's nervous. Which she is. Constantly. She once moulted through an entire thunderstorm and came out looking like a dandelion.",
      },
      owl_report: {
        text: "She was roosting the whole time? Three days, on a branch, watching me walk past calling her name? I'm going to be furious about this for a week. Here - this is Frost Shard. It's the only spell I'm really good at, and you've earned it.",
        choices: [
          { text: "She seemed very pleased with herself.", tone: "funny", affinity: 2, next: "owl_report2" },
          { text: "She missed you. I could tell.", tone: "kind", affinity: 3, next: "owl_report2" },
        ],
      },
      owl_report2: {
        text: "She did not. She's an owl. Owls don't miss people, they just sit in trees being superior. ... Did she really? No, don't tell me. Yes. Tell me later.",
      },
      duel_offer: {
        text: "Then do something about it. Alden keeps a practice shade in the ring - beat it three times and nobody gets to call you 'the new one' any more. That's how I did it. Took me eleven tries.",
        choices: [
          { text: "Three times. Fine.", tone: "brave", startQuest: "proving_ground", next: "duel_go" },
          { text: "Eleven?", tone: "funny", affinity: 1, next: "duel_eleven" },
          { text: "I've enough to be getting on with.", next: "smalltalk" },
        ],
      },
      duel_eleven: {
        text: "The shade kept doing a thing with its elbow. You'll see. Don't watch the elbow. Three times. Go on.",
        choices: [{ text: "Three times.", startQuest: "proving_ground", next: "duel_go" }],
      },
      duel_go: {
        text: "Come back when it's three, not two. I'll know, because I'll ask it. It can't lie, it hasn't got a mouth.",
      },
      duel_report: {
        text: "Three. You actually did three. Here - my father's rapier. I hate it, it's far too quick for me, I keep stabbing the furniture, and it would suit you. No, take it. I insist. The furniture insists.",
      },
      smalltalk: {
        text: "Yes. Probably. Anyway. Classes start at nine, don't be late, it reflects badly on me somehow.",
      },
      corvin_gone: {
        text: "The treeline. I'm nearly sure. He's been getting letters - every week, no stamp, the owls won't touch them - and he reads them at the window and goes all quiet. Please find him. He'd never forgive me for asking. Find him anyway.",
        choices: [{ text: "I'll bring him back.", tone: "brave", affinity: 3 }],
      },

      // ---------------------------------------------------------- talk

      talk: {
        text: "Talk? Yes. Good. I'm very good at talking. People tell me so constantly, usually in the library.",
        choices: [
          { text: "What do people say about me?", tone: "funny", once: true, next: "gossip" },
          { text: "Tell me about Corvin.", next: "t_corvin" },
          { text: "What's it like, being an Emberhart?", next: "t_house" },
          {
            text: "You're always so brave. Is it ever hard?",
            tone: "kind",
            requiresAffinity: { min: 10 },
            requiresNotFlag: "amelia_fear_told",
            next: "fear1",
          },
          { text: "How's Pip?", requiresFlag: "owl_done", next: "t_pip" },
          { text: "I should go.", next: "smalltalk" },
        ],
      },
      gossip: {
        text: "That you arrived without a wand and without a House and without a reasonable explanation. Which is quite difficult to do. One of the second-years says you came out of the fog. I said you came out of the south, like a normal person. Did you? Never mind.",
        next: "talk",
      },
      t_corvin: {
        text: "He's clever. Horribly clever. He was tutored by Vale in his first year - you know, the one who left - and since Vale went he's been worse. Counting splinters on the steps at night. I bring him toast. He doesn't notice. He eats it, though.",
        onEnter: { setFlag: "amelia_on_corvin" },
        next: "talk",
      },
      t_house: {
        text: "Loud. Warm. You're always slightly on fire, metaphorically, and twice literally. Everyone argues and then everyone hugs. You get a stag on your badge and a lot of people expecting you to be the first one through every door. Which I usually am.",
        variants: [
          {
            requiresHouse: "emberhart",
            text: "You'll find out! Loud. Warm. Always slightly on fire. If anyone gives you trouble, tell me, and I'll be first through their door. That's the rule. We go first.",
          },
        ],
        next: "talk",
      },
      t_pip: {
        text: "Furious with me, for some reason. As if I went missing. She's been sitting on my pillow every night so I can't use it. That's love, in owl. I looked it up.",
        next: "talk",
      },
      fear1: {
        text: "Hard? No. Why would it be. ... Can I tell you something? Not as an Emberhart. Just as me.",
        choices: [
          { text: "Of course.", tone: "kind", affinity: 2, next: "fear2" },
        ],
      },
      fear2: {
        text: "I'm scared of the dark. Properly scared. Not 'ooh, spooky', I mean I can't breathe. That's why I'm brave in the day - I use it all up then, so there's nothing left over to be frightened with at night. It mostly works. Pip knows. Pip sleeps on the windowsill so the moon gets in.",
        choices: [
          { text: "That's the bravest thing I've heard all week.", tone: "kind", affinity: 4, next: "fear3" },
          { text: "I'm scared of it too, sometimes.", tone: "honest", affinity: 4, next: "fear3" },
          { text: "And you still lead the way into every room.", tone: "brave", affinity: 3, next: "fear3" },
        ],
      },
      fear3: {
        text: "...Thanks. Here. Take this. It's the ribbon I wore at my Choosing. It's been brave ever since, so it's got some to spare. If you're going down into the dark - and you are, everyone can tell - take it with you. Then I'll have been a bit brave down there too.",
        onEnter: { setFlag: "amelia_fear_told", giveItem: "amelias_ribbon" },
        choices: [{ text: "I'll bring it back.", tone: "kind", affinity: 2, next: "talk" }],
      },

      post: {
        text: "You're back! You're back you're back you're back. I knew you would be. I didn't. I told everyone I knew. Pip didn't believe me. Pip owes me a mouse.",
        choices: [
          { text: "I brought your ribbon back.", requiresItem: "amelias_ribbon", tone: "kind", affinity: 3, takeItem: "amelias_ribbon", next: "post_ribbon" },
          { text: "How have you been?", next: "post_how" },
          { text: "Good to see you, Amelia.", next: "smalltalk" },
        ],
      },
      post_ribbon: {
        text: "You -. It's a bit scorched. It's more scorched than when I gave it you. ... It's perfect. I'm going to wear it to everything. I'm going to wear it to bed.",
      },
      post_how: {
        text: "I've been made a prefect. Nobody can work out why, least of all me. I think Vey did it to stop me knocking on her door every morning asking if there was news. It hasn't worked. I just knock in a more official way now.",
      },
    },
  },
};
