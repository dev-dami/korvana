import type { DialogueTree } from "./types";

/**
 * Corvin. Third-year, Ravelle. Clipped, impatient, superior, and lonely in a
 * way he would find vulgar to admit. Vale tutored him in his first year, and
 * he has been following the same trail of splinters ever since, one step
 * behind and closing.
 */
export const CORVIN_DIALOGUES: Record<string, DialogueTree> = {
  corvin_intro: {
    id: "corvin_intro",
    start: "start",
    nodes: {
      start: {
        redirect: [{ requiresFlag: "game_complete", next: "post" }],
        text: "Do not talk to me, I am calculating. ... All right, talk to me. What do you know about the Moonwell?",
        variants: [
          {
            requiresStage: { quest: "the_choosing", stage: ["arrive", "vey"] },
            text: "You're the late one. The Lamp's been insufferable. Go and get Chosen so it stops; I'm trying to count.",
          },
          {
            requiresFlag: "corvin_home",
            text: "Oh. It's you. ... I suppose I should say thank you. For the treeline. I'm not going to, because it would be embarrassing for both of us, but I want you to know that I considered it.",
          },
          {
            requiresFlag: "shards_done",
            text: "Forty-one splinters last night. Forty-one. And nobody in this building will tell me why, because they all know, and they have all agreed that I am too young to.",
          },
          {
            requiresHouse: "ravelle",
            text: "A fellow Ravelle. Good. At last someone who will understand. Do not talk to me, I am calculating. ... All right, talk to me. What do you know about the Moonwell?",
          },
        ],
        choices: [
          {
            text: "I have your three splinters.",
            requiresStage: { quest: "moonwell_shards", stage: "return" },
            advanceQuest: "moonwell_shards",
            affinity: 4,
            next: "shards_report",
          },
          { text: "Nothing at all.", requiresFlag: "sorted", requiresNotQuest: "moonwell_shards", next: "explain" },
          { text: "I know it's coming apart.", requiresFlag: "sorted", requiresNotQuest: "moonwell_shards", affinity: 3, next: "impressed" },
          {
            text: "The splinters all point north. What now?",
            requiresCompleteQuest: ["moonwell_shards", "the_choosing"],
            requiresNotQuest: "restricted_section",
            next: "act2_1",
          },
          {
            text: "Fennick wants his copy of the Accord back.",
            requiresStage: { quest: "restricted_section", stage: "books" },
            requiresNotFlag: "got_accord",
            next: "accord1",
          },
          { text: "Could we talk?", next: "talk" },
        ],
      },
      explain: {
        text: "It is a well of cold light under the north range. Or it was. Every so often a splinter of it turns up in the grass, which is not how wells work. Wells do not shed. I have checked.",
        next: "ask",
      },
      impressed: {
        text: "...Oh. Good. Somebody in this building has been paying attention. Then you understand why I need samples, and why I cannot go and get them myself.",
        next: "ask",
      },
      ask: {
        text: "There is a patch of ground east of here - scarred, nothing grows - where they come up thickest. I need three. Proof. I will make it worth your while.",
        choices: [
          { text: "I'll bring you three.", tone: "brave", startQuest: "moonwell_shards", next: "deal" },
          { text: "Why can't you go yourself?", tone: "curious", next: "motive_why" },
          { text: "What do you get out of it?", tone: "sharp", next: "motive" },
        ],
      },
      motive_why: {
        text: "Because the last time I went out there alone, Mistress Wick found me at midnight lying on my back in the dirt counting, and I am not allowed past the treeline without a 'responsible companion' until I am sixty.",
        choices: [{ text: "Fine. Three splinters.", startQuest: "moonwell_shards", affinity: 1, next: "deal" }],
      },
      motive: {
        text: "Understanding. Also a great deal of academic credit. Mostly understanding. ... Also somebody I used to know studied them, and I would like to know what he knew. That is not your business.",
        choices: [{ text: "Fine. Three splinters.", startQuest: "moonwell_shards", next: "deal" }],
      },
      deal: {
        text: "Three. Not two. I will know.",
      },
      shards_report: {
        text: "Three. Three. Right. ... They are warm. Nothing about the Moonwell should be warm, and they are warm, and they are all warm on the same side.",
        choices: [{ text: "The same side?", tone: "curious", affinity: 2, next: "north" }],
      },
      north: {
        text: "North. All of them pointing north, like iron filings. Something up there is pulling them home, and they want to go. I am going to write a paper. I am going to need the Restricted Section.",
      },

      // --- the turn into Act II

      act2_1: {
        text: "North, and the answer is in the Restricted Section, and Fennick will not let a third-year past the door. Not since - well. Not since the last one.",
        choices: [
          { text: "The last one?", tone: "curious", next: "act2_vale" },
          { text: "Then I'll ask him.", tone: "brave", next: "act2_go" },
        ],
      },
      act2_vale: {
        text: "Vale. Fourth-year. He tutored me in my first year. He was the only person here who ever answered a question with a better question. Fennick gave him a pass, and he read for a term, and then he left. Withdrawn, they call it.",
        onEnter: { setFlag: "heard_of_vale" },
        next: "act2_go",
      },
      act2_go: {
        text: "You ask Fennick. You're new. You haven't had time to disappoint him yet. And if he says yes - tell me what's in there. Everything. Please. I have never once said please to a first-year, so you know I mean it.",
        choices: [
          { text: "I'll go and see Fennick.", tone: "brave", affinity: 2, startQuest: "restricted_section" },
        ],
      },

      // --- the overdue book

      accord1: {
        text: "He knows I have it? Of course he knows. He knows everything that happens to a book within a mile of the Library. It is uncanny and probably illegal.",
        choices: [
          { text: "Why have you kept it?", tone: "curious", next: "accord2" },
          { text: "Hand it over, Corvin.", tone: "sharp", next: "accord_sharp" },
        ],
      },
      accord_sharp: {
        text: "Charming. You'll fit in well with Fennick. ... No. Fine. Here. But look at the margins first. Then you'll understand why it wasn't easy.",
        next: "accord2",
      },
      accord2: {
        text: "Look. Every bit they abridged out of it - pencilled back in. Half in my writing and half in his. Vale's. We did it together, the year he tutored me. Every Tuesday. He'd read the old hands and I'd copy. It's the last thing we did that was normal.",
        onEnter: { setFlag: "heard_of_vale" },
        choices: [
          { text: "You miss him.", tone: "kind", affinity: 3, next: "accord3" },
          { text: "What did they leave out?", tone: "curious", affinity: 1, next: "accord_left" },
        ],
      },
      accord_left: {
        text: "Everything that matters, he said. That the Keepers were people. That they did not come back. That there were children. Read it. Then give it to Fennick, before I change my mind.",
        next: "accord3",
      },
      accord3: {
        text: "...Take it. Go on. And if you ever see him - no. Never mind. Just take it.",
        choices: [
          {
            text: "If I see him, I'll tell him you kept it.",
            tone: "kind",
            affinity: 2,
            giveItem: "overdue_accord",
            setFlag: "got_accord",
            advanceQuest: "restricted_section",
          },
        ],
      },

      // ---------------------------------------------------------- talk

      talk: {
        text: "Talk. Fine. I can calculate and talk. I am, in fact, doing both now. You are not.",
        choices: [
          { text: "What's your theory about the splinters?", tone: "curious", next: "t_theory" },
          { text: "What's Ravelle like?", next: "t_house" },
          { text: "Amelia worries about you.", tone: "kind", requiresFlag: "amelia_on_corvin", next: "t_amelia" },
          { text: "Tell me about Vale.", requiresFlag: "heard_of_vale", next: "t_vale" },
          { text: "What happened at the treeline?", requiresFlag: "corvin_home", next: "t_treeline" },
          { text: "I'll leave you to it.", next: "bye" },
        ],
      },
      bye: { text: "Good. I mean - fine. Goodbye." },
      t_theory: {
        text: "That the Moonwell is not a well at all but a seam, and the splinters are the stitching coming out, and that every one that comes up out of the grass is a stitch somebody, somewhere, stopped holding.",
        variants: [
          {
            requiresFlag: "vey_confessed",
            text: "I was right. I was right! It is a seam, and the splinters are stitches, and the stitches were people. ... I wish I had not been right. I have never wished that before. It is a very strange feeling.",
          },
        ],
        next: "talk",
      },
      t_house: {
        text: "Ravelle has no door to its common room, only a riddle, and the riddle changes. I have slept in the corridor four times. It is a House for people who would rather be locked out than given the answer.",
        next: "talk",
      },
      t_amelia: {
        text: "Amelia worries about everybody. It is her principal hobby. She brings me toast at midnight and I - I do eat it. Do not tell her I noticed. She will become unbearable.",
        next: "talk",
      },
      t_vale: {
        text: "He used to say the second question is where the joy is. The first is 'what is it' and the second is 'why is it like that'. He asked 'why' about the Keepers until there was nothing left of the answer but a door. Then he went to see what was behind it.",
        variants: [
          {
            requiresFlag: "corvin_home",
            text: "He asked me to come north with him. He said I was the only one who ever understood. I think that was true. I think that was the problem. I'd like to understand things without having to follow them into the dark.",
          },
        ],
        next: "talk",
      },
      t_treeline: {
        text: "I nearly went. I had my satchel packed. I'd been packing it for a month. And then you said what you said and I - didn't. I am not sure I will ever entirely forgive you. I am quite sure I will always be grateful. Those feel the same, from the inside.",
        next: "talk",
      },

      post: {
        text: "I'm writing a paper. About the splinters, and the Lock, and the Keepers. And him. Mostly him.",
        variants: [
          {
            requiresFlag: "ending_redeemed",
            text: "He wrote to me. From the Wellhead. A proper letter, with a stamp, and the owls took it. It says the watch is very boring and he's reading the Keepers' records aloud to keep awake and I am to come up for a season when I'm older and bring toast. ... I'm writing a paper. It's about hope. Don't laugh.",
          },
          {
            requiresFlag: "ending_bound",
            text: "I'm writing a paper. About him. About what he got right, which was a great deal, so that he does not just become a story about the boy who went too far. ... Somebody should remember he asked the second question. Even if he is - even if he can't any more.",
          },
        ],
        choices: [{ text: "I'll read it.", tone: "kind", affinity: 2, next: "bye" }],
      },
    },
  },

  // ======================================================= the treeline

  corvin_treeline: {
    id: "corvin_treeline",
    start: "start",
    nodes: {
      start: {
        text: "Go away. ... No. Don't. Don't go away. I'm waiting for someone, and you shouldn't be here when he comes, and I don't want to be on my own when he does.",
        variants: [
          {
            requiresFlag: "vale_met_2",
            text: "He's gone. He asked me to come with him. North. He said I was the only one who ever understood him. He said I could help him bring them home. ... I have my satchel packed.",
          },
        ],
        choices: [
          { text: "Who are you waiting for? Vale?", tone: "curious", requiresNotFlag: "vale_met_2", next: "waiting" },
          { text: "He's going to break the world, Corvin.", tone: "sharp", next: "sharp" },
          { text: "Is this what you want, or what he wants?", tone: "curious", next: "want" },
          { text: "Amelia's frightened for you.", tone: "kind", next: "amelia" },
          {
            text: "I've heard him too. He isn't wrong about everything. That's why you shouldn't go alone.",
            tone: "honest",
            requiresFlag: "vale_heard",
            next: "heard",
          },
        ],
      },
      waiting: {
        text: "Vale. He's been writing to me. Every week since midsummer. No stamp; he leaves them on the windowsill. He's here, actually - over by the old oak, waiting for dusk. He likes to arrive at dusk. He always did have a sense of theatre.",
        choices: [
          { text: "Then I'll go and talk to him first.", tone: "brave", next: "wait_ok" },
          { text: "Come home now, before he comes.", tone: "kind", next: "want" },
        ],
      },
      wait_ok: {
        text: "...All right. Be careful. He's very persuasive. I mean that as a warning, not a compliment. It used to be a compliment.",
      },
      sharp: {
        text: "He says it's already broken. He says the Keepers have been standing in a doorway shouting at a storm to notice them. He says it's cruel. And he's right that it's cruel. I've read the rota. I've read the ages.",
        choices: [
          { text: "Cruel and necessary aren't opposites.", tone: "honest", affinity: 2, next: "home" },
          { text: "And if he's wrong about the storm?", tone: "curious", affinity: 1, next: "home" },
          { text: "Then go with him, if you're so sure.", tone: "sharp", affinity: -2, next: "dare" },
        ],
      },
      dare: {
        text: "...I'm not sure. That's the thing. I'm never sure. He's always sure. I thought if I went with him I'd catch it off him, like a cold.",
        choices: [{ text: "You don't need to catch it. Come home.", tone: "kind", affinity: 2, next: "home" }],
      },
      want: {
        text: "What I want. ... I want to understand it. All of it. I want somebody to tell me the second answer. He's the only one who ever did. If I go home, nobody will.",
        choices: [
          { text: "Then ask the second question yourself. At home. Where it's safe.", tone: "kind", affinity: 3, next: "home" },
          { text: "I'll tell you everything I find. I promise.", tone: "honest", affinity: 4, next: "home" },
        ],
      },
      amelia: {
        text: "Amelia's frightened of everything at night and pretends she isn't. ... She's frightened for me? Really? She said that?",
        choices: [
          { text: "She asked me to bring you back. She said you'd never forgive her.", tone: "honest", affinity: 3, next: "home" },
          { text: "She brings you toast at midnight, Corvin.", tone: "kind", affinity: 3, next: "home" },
        ],
      },
      heard: {
        text: "You -. You listened to him? Properly? ... Then you know. You know he's not mad. He's grieving, and he's right about half of it, and the half he's wrong about is the half that ends the world.",
        choices: [
          { text: "So let's find the other half together. Home first.", tone: "kind", affinity: 4, setFlag: "corvin_understood", next: "home" },
        ],
      },
      home: {
        text: "...If I go home, will you - if you see him again, will you tell him I didn't stop caring? Just that I stopped following. They're different. I'd like him to know they're different.",
        choices: [
          {
            text: "I'll tell him. Come on. It's getting dark.",
            tone: "kind",
            affinity: 2,
            affinityWith: { student_amelia: 3 },
            completeQuest: "corvins_folly",
            setFlag: "corvin_home",
          },
        ],
      },
    },
  },
};
