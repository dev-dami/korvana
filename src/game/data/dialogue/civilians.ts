import type { DialogueTree } from "./types";

/**
 * The rest of the school: students and staff who are not in the story, but
 * who notice it. Each has a short tree with a greeting that reacts to your
 * House and to how far things have gone, and a line for the last time you
 * duelled them (flags `duel_won_<npc>` and `duel_lost_<npc>`, set by
 * systems/CivilianSystem.ts).
 *
 * Variants are checked in order and the first that holds wins, so the most
 * specific memory goes first.
 */
export const CIVILIAN_DIALOGUES: Record<string, DialogueTree> = {
  amb_tamsin: {
    id: "amb_tamsin",
    start: "start",
    nodes: {
      start: {
        text: "A girl with a scorched cuff is practising a disarming charm on a fence post. The fence post is winning. \"Don't just stand there. Hold this.\"",
        variants: [
          { requiresFlag: "duel_lost_amb_tamsin_reed", text: "\"Back for another hiding?\" Tamsin twirls her wand. \"I'm only joking. Mostly. You had a good stance, you just kept standing in it.\"" },
          { requiresFlag: "duel_won_amb_tamsin_reed", text: "\"You.\" Tamsin points her wand at you, then thinks better of it. \"I've been practising. Every night. Don't look at me like that.\"" },
          { requiresHouse: "emberhart", text: "\"An Emberhart! Good. The others are all very nice and I want to set fire to every one of them.\" She grins. \"In the friendly way.\"" },
          { requiresFlag: "sorted", text: "\"So the Lamp didn't put you in Emberhart. Its loss. If you ever want to learn to duel properly, find me.\"" },
        ],
        choices: [
          { text: "Why are you fighting a fence post?", tone: "curious", next: "post" },
          { text: "Good luck with that.", next: "bye" },
        ],
      },
      post: {
        text: "\"Because nobody will duel me twice.\" She says it with enormous pride. \"Hex anyone round here and they'll square up to you - that's the custom. Clout them and they'll just run. Very undignified, clouting.\"",
      },
      bye: {
        text: "\"I don't need luck. I need a fence post that stops cheating.\"",
      },
    },
  },

  amb_bram: {
    id: "amb_bram",
    start: "start",
    nodes: {
      start: {
        text: "A round-faced first-year is cupping something green and very small in both hands, shielding it from the wind. \"It's a moonwort. Mistress Wick says it might not live. I've decided it will.\"",
        variants: [
          { requiresFlag: "duel_won_amb_bram_oakes", text: "Bram brightens when he sees you. \"You won fair. The moonwort didn't mind, I asked. It's got a second leaf now - look!\"" },
          { requiresHouse: "thornwick", text: "\"Oh, you're Thornwick too! Do you want to hold the moonwort? Only for a second. Gently. GENTLY.\"" },
          { requiresFlag: "relics_gathered", text: "\"Everyone says you've been down in the old tombs.\" Bram holds the moonwort a little closer. \"Did anything grow down there? I always wonder.\"" },
        ],
        choices: [
          { text: "It'll live. You're looking after it.", tone: "kind", affinity: 1, once: true, next: "kind" },
          { text: "Leave him to his plant.", next: "bye" },
        ],
      },
      kind: {
        text: "Bram goes quite pink. \"That's what I said! Thank you. I'll name a leaf after you.\"",
      },
      bye: {
        text: "Bram nods without looking up. He is whispering encouragement to the moonwort.",
      },
    },
  },

  amb_isolde: {
    id: "amb_isolde",
    start: "start",
    nodes: {
      start: {
        text: "A tall fourth-year in Ravelle blue looks you over the way a jeweller looks over a doubtful stone. \"You're the late one. Everyone's talking about you. I'm deciding whether to.\"",
        variants: [
          { requiresFlag: "duel_won_amb_isolde_marr", text: "\"Ah. The one who beat me.\" Isolde smiles without warmth or malice. \"I've written it down. I write everything down. It is how I win the second time.\"" },
          { requiresFlag: "duel_lost_amb_isolde_marr", text: "\"Feeling better?\" Isolde does not wait for the answer. \"You telegraph your left. Fix that and you'll be dangerous.\"" },
          { requiresHouse: "ravelle", text: "\"Ravelle. Well, that settles it. You'll do.\" She leans in. \"Rule one: never tell anyone what you know. Rule two: see rule one.\"" },
          { requiresFlag: "restricted_pass", text: "\"A Restricted pass, in your first term.\" Isolde's eyes narrow very slightly. \"I've been trying for three years. Who did you charm?\"" },
        ],
        choices: [
          { text: "And have you decided?", tone: "curious", next: "decided" },
          { text: "Don't strain yourself.", tone: "sharp", next: "sharp" },
        ],
      },
      decided: {
        text: "\"Not yet. That's the delicious part.\"",
      },
      sharp: {
        text: "Isolde laughs, once, genuinely surprised. \"Oh, I like that. Keep it. You'll need it here.\"",
      },
    },
  },

  amb_peregrine: {
    id: "amb_peregrine",
    start: "start",
    nodes: {
      start: {
        text: "A solemn third-year is lying flat on his back on the cold stones, watching the clouds. \"Do not mind me. I am being patient. It takes practice.\"",
        variants: [
          { requiresFlag: "duel_won_amb_peregrine_lusk", text: "Peregrine does not get up. \"You beat me. I have been lying here thinking about it. It was very instructive. I may lie here a while longer.\"" },
          { requiresHouse: "stillwater", text: "\"Ah. Stillwater.\" Peregrine pats the stones beside him. \"Lie down. Watch the clouds. Nobody will bother you; they think we are thinking.\"" },
          { requiresFlag: "undercroft_open", text: "\"The clouds have been strange since you went below the Library.\" Peregrine frowns at the sky. \"They go round the Academy now, instead of over it.\"" },
        ],
        choices: [
          { text: "Lie down beside him.", tone: "kind", next: "lie" },
          { text: "Leave him to it.", next: "bye" },
        ],
      },
      lie: {
        text: "You lie down. The stones are cold. A cloud goes over shaped exactly like a heron, and Peregrine says \"There,\" very softly, as if he had arranged it.",
      },
      bye: {
        text: "\"Goodbye. I shall still be here. That is rather the point.\"",
      },
    },
  },

  amb_nell: {
    id: "amb_nell",
    start: "start",
    nodes: {
      start: {
        text: "A freckled second-year has a pencil behind each ear and a notebook open on her knee. \"Name? House? Any scandal? I run the gossip sheet. Circulation: everyone.\"",
        variants: [
          { requiresFlag: "duel_won_amb_nell_quarry", text: "\"Oh, it's you.\" Nell taps her notebook. \"I've printed it, you know. 'First-year flattens columnist.' Sold out. You're welcome.\"" },
          { requiresFlag: "duel_lost_amb_nell_quarry", text: "\"The headline's 'Columnist Triumphs'.\" Nell beams. \"I've been very generous about your footwork. Page two.\"" },
          { requiresFlag: "sorted", text: "\"The Lamp argued with you! Everyone says so. Is it true? Say yes. Say yes and I'll spell your name right.\"" },
        ],
        choices: [
          { text: "No comment.", tone: "funny", next: "nocomment" },
          { text: "Heard anything about the splinters?", tone: "curious", next: "splinters" },
        ],
      },
      nocomment: {
        text: "\"'No comment,'\" Nell repeats, writing it down with relish. \"That's the best kind of comment.\"",
      },
      splinters: {
        text: "Nell lowers her voice. \"Corvin's got a drawer full. And a fourth-year called Vale's been seen out past the treeline after dark. I'm not printing that one. Some stories bite.\"",
      },
    },
  },

  amb_wyn: {
    id: "amb_wyn",
    start: "start",
    nodes: {
      start: {
        text: "A third-year is shuffling a deck of cards one-handed, without looking. \"Fancy a game? Penny a point. I'll go easy on you. That's a lie, but it's a friendly one.\"",
        variants: [
          { requiresFlag: "duel_lost_amb_wyn_calloway", text: "\"My favourite customer!\" Wyn fans the cards. \"Thanks for the fee. I've spent it on more cards. Fancy losing it back?\"" },
          { requiresFlag: "duel_won_amb_wyn_calloway", text: "Wyn sighs theatrically. \"You took my purse and my dignity. I've only replaced one of them. Guess which.\"" },
          { requiresHouse: "ravelle", text: "\"Ravelle! Then you'll know this deck has six queens, and you'll keep that to yourself.\"" },
        ],
        choices: [
          { text: "No thanks.", next: "bye" },
          { text: "How many queens are in that deck?", tone: "sharp", next: "queens" },
        ],
      },
      queens: {
        text: "\"Exactly the right number,\" says Wyn, with a perfectly straight face.",
      },
      bye: {
        text: "\"Wise. Very wise. Come back when you're feeling less wise.\"",
      },
    },
  },

  amb_hobb: {
    id: "amb_hobb",
    start: "start",
    nodes: {
      start: {
        speaker: "Hobb",
        text: "An old man in a work coat is raking the same patch of gravel with total concentration. \"Mind where you walk. I've raked that. And that. Don't go near that, I'm about to rake it.\"",
        variants: [
          { requiresFlag: "duel_won_amb_hobb", text: "\"You again.\" Hobb leans on his rake. \"Beat an old man fair and square. Your mother'd be proud. Now get off my gravel.\"" },
          { requiresFlag: "relics_gathered", text: "\"Things have been growing wrong at the edges of the grounds.\" Hobb does not stop raking. \"Leaves falling up. I don't hold with it. You sort it out, whatever it is.\"" },
          { requiresFlag: "sorted", text: "\"Sorted, are you? Well, the Lamp sorts 'em and I sweep up after 'em. You'll be no different. No offence.\"" },
        ],
        choices: [
          { text: "How long have you worked here?", tone: "curious", next: "years" },
          { text: "Sorry. I'll mind the gravel.", tone: "kind", next: "bye" },
        ],
      },
      years: {
        speaker: "Hobb",
        text: "\"Forty-one years. Raked up after four Headmistresses, a dragon - small one - and every first-year who ever learned a fire charm. You lot never aim at the sky.\"",
      },
      bye: {
        speaker: "Hobb",
        text: "\"See that you do.\"",
      },
    },
  },

  amb_pell: {
    id: "amb_pell",
    start: "start",
    nodes: {
      start: {
        speaker: "Madam Pell",
        text: "A starched woman with a satchel of bandages looks you up and down. \"Any bites, burns, curses, splinters? No? Give it a week. Come and see me when it happens.\"",
        variants: [
          { requiresFlag: "duel_lost_amb_madam_pell", text: "\"How's the bruise?\" Madam Pell prods your arm without waiting. \"Good. Healing nicely. Don't do it again; I haven't the bandages.\"" },
          { requiresFlag: "duel_won_amb_madam_pell", text: "\"You beat the matron.\" Madam Pell sniffs. \"Very well. When you need me - and you will - you'll find I've a long memory and a very cold spoon.\"" },
          { requiresFlag: "undercroft_open", text: "\"You've been in the cellars under the Library. Don't argue, you smell of wet stone.\" She presses a peppermint into your hand. \"For the damp.\"" },
        ],
        choices: [
          { text: "What's the worst you've ever seen?", tone: "curious", next: "worst" },
          { text: "I'll try to stay in one piece.", next: "bye" },
        ],
      },
      worst: {
        speaker: "Madam Pell",
        text: "\"A boy who tried to turn his own shadow into a cat. Two weeks before it stopped scratching him.\" She considers. \"Lovely cat, though.\"",
      },
      bye: {
        speaker: "Madam Pell",
        text: "\"Nobody does. That's why I'm here.\"",
      },
    },
  },

  amb_osric: {
    id: "amb_osric",
    start: "start",
    nodes: {
      start: {
        text: "A fifth-year with a prefect's badge polished to a mirror shine blocks the aisle between the tables. \"Name and business. The Great Hall is for eating and ceremonies. Which is this?\"",
        variants: [
          { requiresFlag: "duel_won_amb_osric_dunmore", text: "Osric goes slightly pale. \"We agreed it never happened.\" He straightens his badge. \"Move along. Nothing to see. Nothing ever happened.\"" },
          { requiresFlag: "duel_lost_amb_osric_dunmore", text: "\"Ah, the duellist.\" Osric's badge somehow shines brighter. \"I've reported myself for duelling in the Hall, and then excused myself. That's what leadership is.\"" },
          { requiresHouse: "stillwater", text: "\"A Stillwater! Excellent. You'll want the rota for the common room kettle. I've laminated it. Well. Charmed it flat.\"" },
          { requiresNotFlag: "sorted", text: "\"Unsorted? Then you should be by the dais, waiting for the Lamp. Off you go. Chop chop. That is an official chop chop.\"" },
        ],
        choices: [
          { text: "Ceremonies, obviously.", tone: "funny", next: "ceremony" },
          { text: "Sorry, Prefect.", tone: "kind", next: "bye" },
        ],
      },
      ceremony: {
        text: "\"...Carry on, then.\" He clearly suspects something and cannot think what.",
      },
      bye: {
        text: "\"Very good. Very good indeed. You'll go far, if you stay in the correct aisles.\"",
      },
    },
  },

  amb_dorrit: {
    id: "amb_dorrit",
    start: "start",
    nodes: {
      start: {
        text: "A small first-year is hiding behind a bench end, holding a wand like it might bite. \"Oh! Hello. Sorry. I'm not hiding. I'm practising being brave, and it's going badly.\"",
        variants: [
          { requiresFlag: "duel_lost_amb_dorrit_fane", text: "\"I beat you!\" Dorrit is still glowing about it. \"I've written to my gran. Twice. She thinks I'm making it up. Will you sign something?\"" },
          { requiresFlag: "duel_won_amb_dorrit_fane", text: "\"You beat me, but you were nice about it.\" Dorrit squares his shoulders. \"So next time I won't be scared. Probably. Less.\"" },
          { requiresHouse: "emberhart", text: "\"You're Emberhart too! Does it ever stop feeling like everyone expects you to be brave all the time?\"" },
        ],
        choices: [
          { text: "Being scared and doing it anyway counts.", tone: "kind", affinity: 1, once: true, next: "brave" },
          { text: "You're doing fine.", next: "bye" },
        ],
      },
      brave: {
        text: "Dorrit thinks about this very seriously. \"Then I've been brave four times today. Five, counting talking to you.\"",
      },
      bye: {
        text: "\"Thanks. Sorry. Thanks.\"",
      },
    },
  },

  amb_hester: {
    id: "amb_hester",
    start: "start",
    nodes: {
      start: {
        text: "A sixth-year with a monitor's ribbon and a stack of returns raises one finger without looking at you. Then a second finger, meaning: wait. Then, at last: \"Yes? Quietly.\"",
        variants: [
          { requiresFlag: "duel_won_amb_hester_quill", text: "\"You beat me in my own stacks.\" Hester does not look up. \"I've reshelved everything you knocked over. Alphabetically. As a warning.\"" },
          { requiresFlag: "restricted_pass", text: "\"Master Fennick says you have a pass.\" Hester looks at you over her returns for the first time. \"Then you'll know what's behind the grille is not for borrowing. It is for surviving.\"" },
          { requiresHouse: "ravelle", text: "\"Ravelle. Then you already know the best books are on the top shelf, and the ladder squeaks on purpose.\"" },
        ],
        choices: [
          { text: "Where would I find books on the Keepers?", tone: "curious", next: "keepers" },
          { text: "Sorry to disturb you.", next: "bye" },
        ],
      },
      keepers: {
        text: "\"History, third bay, bottom shelf. Most of it is wrong.\" She hesitates. \"The parts that are right are in the Restricted Section. Ask Master Fennick. Bring something he cannot refuse, like manners.\"",
      },
      bye: {
        text: "\"Shh.\"",
      },
    },
  },

  amb_thackery: {
    id: "amb_thackery",
    start: "start",
    nodes: {
      start: {
        speaker: "Thackery",
        text: "A broad man in a waistcoat is carrying a stack of books taller than you are. He peers round it. \"Mind out, mind out. Volumes nine through fourteen of the Abridged Bestiary, coming through.\"",
        variants: [
          { requiresFlag: "duel_won_amb_thackery", text: "\"Ah, the champion of the stacks.\" Thackery shifts his load. \"Dropped volume eleven on my foot when you got me. Worth it. Good spell, that.\"" },
          { requiresFlag: "undercroft_open", text: "\"Funny draught coming up from the Restricted Section since last week.\" Thackery sniffs. \"Smells like a cellar that's been thinking.\"" },
        ],
        choices: [
          { text: "Abridged? That's abridged?", tone: "funny", next: "abridged" },
          { text: "Let him pass.", next: "bye" },
        ],
      },
      abridged: {
        speaker: "Thackery",
        text: "\"The unabridged is in the cellar. Forty-two volumes. Took six porters and a pony to get it down there, and the pony's never been the same.\"",
      },
      bye: {
        speaker: "Thackery",
        text: "\"Much obliged.\" The stack sways off between the shelves, apparently under its own power.",
      },
    },
  },
};
