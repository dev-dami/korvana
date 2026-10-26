import type { DialogueTree } from "./types";

/**
 * Seren Ashdown. Emberhart, expelled, relic-hunter. Quick, wry, mercenary on
 * the surface and grieving all the way down; calls the player "first-year"
 * and means it more kindly each time. She is walking north to find out what
 * happened to her brother, and she will tell you it is about money until she
 * trusts you enough to stop.
 *
 * Her arc branches on one choice at the Barrow - work with her (`seren_ally`)
 * or race her (`seren_rival`) - and both branches can still turn.
 */
export const SEREN_DIALOGUES: Record<string, DialogueTree> = {
  // =================================================== at the Barrow mouth

  seren_barrow: {
    id: "seren_barrow",
    start: "start",
    nodes: {
      start: {
        redirect: [{ requiresAnyFlag: ["seren_ally", "seren_rival"], next: "hub" }],
        text: "So you're the Lamp's latest. Seren Ashdown. You'll have heard of me, or you will have by teatime. Sit down; the roots are calmer when you're not looming.",
        variants: [
          {
            requiresHouse: "emberhart",
            text: "So you're the Lamp's latest - and an Emberhart, look at that pin. The old girl's still got taste. Seren Ashdown. Same table, nine years back. Sit down; the roots are calmer when you're not looming.",
          },
          {
            requiresHouse: "thornwick",
            text: "So you're the Lamp's latest. Thornwick, by the pin. You lot used to leave biscuits on my windowsill when I was in detention, which was always. Seren Ashdown. Sit down; the roots like Thornwicks.",
          },
          {
            requiresHouse: "ravelle",
            text: "So you're the Lamp's latest. A Ravelle. You're going to ask me a lot of questions I won't answer, and I'm going to enjoy it. Seren Ashdown. Sit down; the roots are calmer when you're not looming.",
          },
          {
            requiresHouse: "stillwater",
            text: "So you're the Lamp's latest. A Stillwater - you've been standing there a full minute deciding whether I'm dangerous. I am. Seren Ashdown. Sit down; the roots are calmer when you're not looming.",
          },
        ],
        choices: [
          { text: "You're the one Vey expelled.", tone: "sharp", next: "expelled" },
          { text: "What are you doing here?", tone: "curious", next: "why_here" },
          {
            text: "Professor Alden still has your road drawn in his book. He never rubbed it out.",
            tone: "kind",
            requiresFlag: "heard_of_ashdowns",
            once: true,
            affinity: 4,
            next: "alden_road",
          },
          { text: "Nice rope.", tone: "funny", affinity: 1, next: "rope" },
        ],
      },
      expelled: {
        text: "Before breakfast, the same night. Very efficient woman, Vey. I've always admired that about her, from a great distance, preferably downhill. Did she tell you why? No. She wouldn't. She's discreet. It's her worst quality.",
        next: "pitch",
      },
      why_here: {
        text: "Same as you, I expect, except I'm being paid. There's a Key in that hill, and in the lowlands a Key like that buys a house with a garden and nobody asking where you've been. I'd like a garden. I'd like nobody asking.",
        next: "pitch",
      },
      alden_road: {
        text: "...Does he. Does he really. The old - . Hm. The roots are very loud today, aren't they. Give me a moment. ... Tell him I still walk it. Tell him it still goes the same way. He'll know what that means.",
        onEnter: { setFlag: "seren_alden_message" },
        next: "pitch",
      },
      rope: {
        text: "Thank you. It's lowland hemp, waxed, eighty feet, and it has never once let me down, which is more than I can say for anybody I've ever been at school with. Present company excepted. So far.",
        next: "pitch",
      },
      pitch: {
        text: "Here's how it is. There's a Key in that hill. I want it - or I want what it's worth. You want it for Vey. We can go down together and split the danger, or we can race, and you can lose. Your choice, first-year. I don't mind which. Much.",
        choices: [
          {
            text: "Together. But the Key goes back to Vey.",
            tone: "kind",
            affinity: 5,
            setFlag: "seren_ally",
            completeStage: "seren_bargain",
            next: "ally",
          },
          {
            text: "Together - and I'll find a way to pay you for your trouble.",
            tone: "honest",
            affinity: 4,
            setFlags: ["seren_ally", "seren_paid_promise"],
            completeStage: "seren_bargain",
            next: "ally_paid",
          },
          {
            text: "No. I'll race you for it.",
            tone: "brave",
            affinity: -1,
            setFlag: "seren_rival",
            completeStage: "seren_bargain",
            next: "rival",
          },
          {
            text: "Why do you really want it?",
            tone: "curious",
            requiresAffinity: { min: 3 },
            once: true,
            next: "real",
          },
        ],
      },
      real: {
        text: "...Perceptive. All right: I don't want the Key. I want the Lantern, and Vey's sitting on it, and a woman with a Key has something to trade. That's all you're getting, first-year. That's more than I've told anyone in seven years.",
        onEnter: { setFlag: "seren_wants_lantern" },
        next: "pitch",
      },
      ally: {
        text: "Ugh. Principles. Fine. Together, and it goes to Vey, and I'll take my cut out of your share of the glory, which I expect to be considerable. Down we go. Watch the roots - when they tighten, stop moving. They're not cruel. They're just very old and very literal.",
      },
      ally_paid: {
        text: "Pay me? With what, first-year - pocket money? ... No. Don't. That was mean. You meant it. Nobody's offered to pay me fairly in years; they usually just try to have me arrested. Together, then. Mind the roots.",
      },
      rival: {
        text: "Good. I was hoping you'd say that. It's been years since anybody made it interesting. I'll give you a head start - one root - because I'm a gentlewoman. See you at the bottom. Or rather: you'll see me there.",
      },

      // ------------------------------------------------- after the terms

      hub: {
        text: "Still here, first-year?",
        variants: [
          { requiresFlag: "seren_ally", requiresItem: "ninefold_key", text: "There it is. One Key, back from the dead. Take it to Vey. She'll send you up the high moor next - the Reliquary. I'll be on the steps. I'm predictable too; it's a family failing." },
          { requiresFlag: "seren_rival", requiresItem: "ninefold_key", text: "Well played. Really. I mean it, which is annoying. Enjoy your Key, first-year. There are two more relics, and I'm a very fast climber." },
          { requiresFlag: "seren_ally", text: "Ready when you are, partner. The roots like you, by the way. They keep loosening when you walk past. It's revolting. I've been cutting my way into places for nine years." },
          { requiresFlag: "seren_rival", text: "Still here, first-year? I'd have thought you'd be halfway down by now. Unless you've come to concede. Have you come to concede?" },
        ],
        choices: [
          { text: "Tell me about the Academy, in your day.", tone: "curious", requiresFlag: "seren_ally", next: "h_academy" },
          { text: "Why did you really break the Undercroft seal?", tone: "curious", requiresAffinity: { min: 8 }, once: true, next: "h_seal" },
          { text: "Here - take a tonic. For the roots.", tone: "kind", requiresItem: "lesser_tonic", once: true, takeItem: "lesser_tonic", affinity: 2, next: "h_tonic" },
          {
            text: "I've changed my mind. Let's do this together.",
            requiresFlag: "seren_rival",
            requiresNotItem: "ninefold_key",
            tone: "kind",
            affinity: 3,
            clearFlag: "seren_rival",
            setFlag: "seren_ally",
            next: "h_switch_ally",
          },
          {
            text: "I'm going on alone from here.",
            requiresFlag: "seren_ally",
            requiresNotItem: "ninefold_key",
            tone: "sharp",
            affinity: -3,
            clearFlag: "seren_ally",
            setFlag: "seren_rival",
            next: "h_switch_rival",
          },
          { text: "Later, Seren.", next: "h_bye" },
        ],
      },
      h_bye: { text: "Later, first-year. Mind the roots." },
      h_academy: {
        text: "Louder. Emberhart won the House cup four years running because I climbed the clock tower and moved the hands. Alden taught Divination by predicting what we'd do wrong and being right. Fennick hasn't changed at all. I think Fennick was installed with the shelving.",
        next: "hub",
      },
      h_seal: {
        text: "Everyone thinks I broke it to find the Lantern. I let them. ... I broke it because a boy of twelve asked me to. Vey's ward. Thin, clever, wouldn't stop asking. He wanted to see his mother's name on the wall of the Warden's chamber. I couldn't say no to that. Vey expelled me to keep anyone asking who I'd taken down.",
        onEnter: { setFlag: "seren_secret" },
        choices: [
          { text: "Vale.", tone: "honest", next: "h_seal2" },
        ],
      },
      h_seal2: {
        text: "Vale. I know what he's doing now. I've heard. I'm not going to tell you he's a good person, first-year. I'm going to tell you he was a lonely little boy who wanted to read a name, and I helped, and I'd do it again. Make of that what you like.",
        next: "hub",
      },
      h_tonic: {
        text: "For me? ... You're a strange one. Thank you. I'll drink it at the bottom, in your honour, if the roots let me get there.",
        next: "hub",
      },
      h_switch_ally: {
        text: "Oh, thank goodness. Racing you was going to be exhausting; you're very determined and I'm very old, nearly twenty-six. Together, then. And the Key goes to Vey. I heard you the first time.",
      },
      h_switch_rival: {
        text: "...Right. Fine. That's fine. I've been on my own for nine years; I know the way. Good luck, first-year. I mean that. Mostly.",
      },
    },
  },

  // ================================================ on the Reliquary steps

  seren_reliquary: {
    id: "seren_reliquary",
    start: "start",
    nodes: {
      start: {
        redirect: [
          { requiresFlag: "battle_reward_seren_duel", requiresNotFlag: "seren_bargain_done", next: "yielded" },
          { requiresNotFlag: ["seren_ally", "seren_rival"], next: "late" },
          { requiresStage: { quest: "the_reliquary", stage: "report" }, requiresFlag: "seren_ally", next: "ra1" },
          { requiresStage: { quest: "the_reliquary", stage: "report" }, requiresFlag: "seren_rival", next: "rr1" },
          // Walked straight past her to Alden: she is still owed the conversation.
          { requiresCompleteQuest: "the_reliquary", requiresFlag: "seren_ally", next: "ra1" },
          { requiresCompleteQuest: "the_reliquary", requiresFlag: "seren_rival", next: "rr1" },
        ],
        text: "Bells. Hundreds of them. Every one tuned to a different note, and a right order, and if you get it wrong I'm told the gallery rings you, personally, until you stop.",
        variants: [
          {
            requiresFlag: "seren_rival",
            text: "Took you long enough. I've been sitting on these steps since dawn, eating your Headmistress's apples. I've tried the bells twice. My ears are still ringing. Your turn.",
          },
        ],
        choices: [
          {
            text: "Shall we go in?",
            tone: "brave",
            requiresStage: { quest: "seren_bargain", stage: "reliquary" },
            completeStage: "seren_bargain",
            next: "go_in",
          },
          { text: "What do you know about the bells?", tone: "curious", next: "bells" },
          { text: "Who built this place?", tone: "curious", next: "anwen" },
          { text: "Later.", next: "later" },
        ],
      },
      later: { text: "I'll be here. The steps and I have an understanding." },
      go_in: {
        text: "After you. No, really. If anything falls on somebody, I'd prefer it to be the Lamp's favourite. Statistically, you're more likely to survive it. The Lamp sees to that sort of thing.",
        variants: [
          {
            requiresFlag: "seren_rival",
            text: "Go in? Together? No, first-year. You go in, and you solve it, and you bring the Bell out. And then we'll talk about who carries it home.",
          },
        ],
      },
      bells: {
        text: "Anwen of the Bells wrote that the true order is the one the Bell itself would ring if it could ring. Which is the most Keeper sentence ever written. I think it means: the order things go quiet. Listen to which ones stop first.",
        next: "start",
      },
      anwen: {
        text: "Anwen of the Bells. One of the Nine. She cast the Silent Bell from the iron of a star that fell here, and built the vault to be robbed exactly once. Once. So when you lift that Bell, first-year, run. Don't look round. I mean it.",
        onEnter: { lore: "skyfall_reliquary" },
        next: "start",
      },

      late: {
        text: "Ah. You. We never did settle things, at the Barrow. You were busy. I was busy. The roots were showing off. Let me make it simple, before we go in: together, or not?",
        choices: [
          { text: "Together.", tone: "kind", affinity: 4, setFlag: "seren_ally", next: "late_ally" },
          { text: "Not. I'll do this alone.", tone: "brave", setFlag: "seren_rival", next: "late_rival" },
        ],
      },
      late_ally: {
        text: "Good. Then mind the bells, and when I say run, run. Partner.",
        next: "start",
      },
      late_rival: {
        text: "Then it's a race, and I'm already on the steps. Good luck, first-year.",
        next: "start",
      },

      // --- after the escape, as an ally: the loyalty moment

      ra1: {
        text: "That was close. That was - . Give me a moment. ... First-year. I need to ask you something, and I need you not to laugh. Let me look through the Lantern. Once.",
        choices: [
          { text: "Of course.", tone: "kind", affinity: 6, next: "ra_look" },
          { text: "Why?", tone: "curious", next: "ra_why" },
          { text: "No. It isn't a toy.", tone: "sharp", affinity: -4, next: "ra_no" },
        ],
      },
      ra_why: {
        text: "Because eight years ago my brother sent me home from the north waystone with a lie about the road, and stayed. Tobin. He's somewhere up there. The Lantern shows the Lock - the threads of it. If he's part of it, I'll see. If he's not, I'll know that too. Either way I'll stop walking north in my sleep.",
        onEnter: { setFlag: "seren_told_tobin" },
        choices: [
          { text: "Then look.", tone: "kind", affinity: 6, next: "ra_look" },
          { text: "I'm sorry, Seren. Not yet. Not until it's done.", tone: "honest", affinity: -1, next: "ra_no" },
        ],
      },
      ra_look: {
        text: "...There. North. All of them, like a loom. And there - a thread with a knot in it I'd know anywhere. He always tied them wrong. A granny knot. In the Lock of the world. ... He's not singing, first-year. He's holding. He chose it.",
        onEnter: { setFlags: ["seren_saw_tobin", "seren_told_tobin"] },
        choices: [
          { text: "Come north with me. To the end of it.", tone: "brave", affinity: 3, next: "ra_north" },
          { text: "Are you all right?", tone: "kind", affinity: 2, next: "ra_north" },
        ],
      },
      ra_north: {
        text: "North. Yes. I'll go to the Keepers' camp ahead of you - I know the road; I've walked it in my head every night for eight years. I'll have a fire going. You deliver your relics to Alden like a good student, and then come and find me in the ash.",
        choices: [
          {
            text: "I'll see you in the Scar.",
            tone: "kind",
            setFlag: "seren_to_camp",
            completeQuest: "seren_bargain",
          },
        ],
      },
      ra_no: {
        text: "...Fair. It's not a toy. And you don't owe me anything. ... I'll go north anyway. I always was going to. I'll be at the Keepers' camp, if there are any Keepers left. Bring your relics. Don't be late.",
        choices: [
          {
            text: "Seren - I'm sorry.",
            tone: "kind",
            affinity: 1,
            setFlag: "seren_to_camp",
            completeQuest: "seren_bargain",
          },
        ],
      },

      // --- after the escape, as a rival: the betrayal moment

      rr1: {
        text: "Three relics. One satchel. One first-year. One very empty mountain. Here's my offer, and it's a good one: the Bell. Give me the Bell and I'll go away, and you'll never see me again, and you can tell Vey you were robbed by a professional.",
        choices: [
          { text: "Here. Take it.", tone: "kind", requiresItem: "silent_bell", next: "rr_give" },
          { text: "No. Fight me for it, then.", tone: "brave", requiresItem: "silent_bell", battle: "seren_duel" },
          { text: "Why do you want it? The truth, this time.", tone: "curious", requiresAffinity: { min: 4 }, next: "rr_truth" },
          { text: "Not today, Seren.", next: "rr_later" },
        ],
      },
      rr_later: {
        text: "I'll wait. I'm good at waiting. Ask anyone who's ever been owed money by me.",
      },
      rr_give: {
        text: "You -. You're actually giving it to me. Just like that. You're either very kind or very stupid, and I'm going to spend the whole walk north working out which.",
        choices: [
          {
            text: "Do something good with it.",
            tone: "kind",
            affinity: 4,
            takeItem: "silent_bell",
            setFlag: "seren_has_bell",
            completeQuest: "seren_bargain",
            next: "rr_give2",
          },
        ],
      },
      rr_give2: {
        text: "North. Did I say north? I meant south. To the auction houses. Obviously. ... Goodbye, first-year. Don't follow me.",
      },
      rr_truth: {
        text: "The truth. ... My brother is somewhere north, inside the Lock, and the singing never stops, and the Bell makes things stop. I want to ring it for him. Is that the truth enough for you?",
        onEnter: { setFlag: "seren_told_tobin" },
        choices: [
          {
            text: "Then come north with me. We'll find him together.",
            tone: "kind",
            affinity: 5,
            clearFlag: "seren_rival",
            setFlags: ["seren_ally", "seren_to_camp", "seren_turned"],
            completeQuest: "seren_bargain",
            next: "rr_turn",
          },
          { text: "I'm sorry. I still can't give it to you.", tone: "honest", next: "rr1" },
        ],
      },
      rr_turn: {
        text: "...Together. All right. All right, first-year. You win. I'll go ahead to the Keepers' camp and get a fire going. Don't make me regret this. I regret almost everything eventually, so you'll have to be quick.",
      },

      yielded: {
        text: "All right. All right. You win. I haven't been beaten by a student since I was one. ... I came up here for the Bell because my brother is somewhere north and the singing never stops, and I thought if I could just make it stop -. Keep it. Ring it for him, if you find him.",
        onEnter: { setFlag: "seren_told_tobin" },
        choices: [
          { text: "Come north with me, Seren.", tone: "kind", affinity: 4, next: "yielded_north" },
          {
            text: "Go home, Seren.",
            tone: "sharp",
            completeQuest: "seren_bargain",
            next: "yielded_go",
          },
        ],
      },
      yielded_north: {
        text: "With the person who just knocked me down a mountain? ... Not yet. I've some pride left and I'd like to keep it in a box somewhere safe. I'll see you north, first-year. Probably at the worst possible moment. It's a gift.",
        choices: [{ text: "I'll be waiting.", completeQuest: "seren_bargain" }],
      },
      yielded_go: {
        text: "Home. Ha. I haven't got one of those. Never mind. Mind how you go, first-year.",
      },
    },
  },

  // ===================================================== at Keeper's Rest

  seren_camp: {
    id: "seren_camp",
    start: "start",
    nodes: {
      start: {
        text: "There you are. I've got the fire going, and I've met the Keeper, and she's exactly as charming as you'd expect from a woman who's been talking to nobody but the dead for four years. I like her enormously.",
        variants: [
          {
            requiresFlag: "seren_mourned",
            text: "First-year. Sit down. I've been sitting here looking at the rota post where his token used to hang. It's just a nail now. I keep looking at the nail.",
          },
        ],
        choices: [
          {
            text: "Ilse gave me something of Tobin's. It's for you.",
            tone: "kind",
            requiresActiveQuest: "tobins_token",
            requiresItem: "tobins_token",
            next: "token1",
          },
          { text: "What do you make of the Scar?", tone: "curious", next: "scar" },
          { text: "What will you do when this is over?", tone: "curious", requiresAffinity: { min: 12 }, once: true, next: "after" },
          { text: "Vale. What do you think we should do?", requiresFlag: "ilse_done", next: "vale" },
          { text: "Rest a while, Seren.", next: "bye" },
        ],
      },
      bye: { text: "I'll rest when the world's shut. Go on." },
      token1: {
        text: "That's -. That's his. That's the one he made at the waystone, the night he sent me home. He carved it with my knife and I never got the knife back. ... Turn it over. I can't. Turn it over for me.",
        choices: [
          { text: "'S. - I stayed. Do not come after me. Come after me anyway.'", tone: "kind", next: "token2" },
        ],
      },
      token2: {
        text: "...That idiot. That beautiful idiot. Come after me anyway. That's what the Lamp writes, isn't it? Come anyway. He knew. He always knew everything first and told me last.",
        choices: [
          {
            text: "You did come. That's what he wanted.",
            tone: "kind",
            affinity: 8,
            takeItem: "tobins_token",
            completeQuest: "tobins_token",
            next: "token3",
          },
        ],
      },
      token3: {
        text: "I did, didn't I. Eight years late. ... Thank you, first-year. Wren. Thank you, Wren. I've got it now. I'm going to wear it. And when we go down to that well, I'm going to tell him I'm here.",
      },
      scar: {
        text: "I think it's the saddest place I've ever been, and I've been to a lowland tax office. Nothing's dead here. It's just - lifted. Like someone took the life off the ground to look at it and forgot to put it back.",
        next: "start",
      },
      after: {
        text: "Honestly? I don't know. I've been walking north for eight years. I never thought about what happened when I got here. ... Maybe I'll keep the watch. Somebody has to. Tobin did. I'm told it's very boring, which would be a lovely change.",
        onEnter: { setFlag: "seren_might_stay" },
        next: "start",
      },
      vale: {
        text: "I think he's a little boy who wanted to read his mother's name off a wall, and grew up, and found the wall wasn't enough. I think if you can make him look instead of argue, you've got a chance. And if you can't - I'll be right behind you. Either way.",
        next: "start",
      },
    },
  },

  // ======================================================= at the Wellhead

  seren_wellhead: {
    id: "seren_wellhead",
    start: "start",
    nodes: {
      start: {
        redirect: [
          { requiresFlag: "game_complete", next: "post" },
          { requiresFlag: "battle_reward_seren_wellhead", requiresNotFlag: "seren_settled", next: "beaten" },
          { requiresFlag: ["seren_rival", "seren_has_bell"], requiresNotFlag: "seren_settled", next: "standoff" },
          { requiresFlag: "seren_rival", next: "rival" },
        ],
        text: "I'm here, Wren. Whatever happens. Do what you came to do; I'll hold the edges.",
        choices: [
          {
            text: "Tobin left you this.",
            tone: "kind",
            requiresItem: "tobins_token",
            requiresActiveQuest: "tobins_token",
            affinity: 6,
            takeItem: "tobins_token",
            completeQuest: "tobins_token",
            next: "ally_token",
          },
          { text: "Any advice?", tone: "curious", next: "ally_advice" },
          { text: "Thank you, Seren.", tone: "kind", affinity: 1 },
        ],
      },
      ally_token: {
        text: "Come after me anyway. ... I'm here, Tobin. You idiot. I'm right here.",
      },
      ally_advice: {
        text: "Don't let him talk you into the well. Don't let the singing talk you into anything. And if you've got the Lantern - make him look. Arguments he can win. Looking, he can't.",
      },

      // --- rival, holding the Bell

      standoff: {
        text: "Here's my plan, first-year. One of us has to stand in that hole for ever, apparently. Better him than Ilse, or you, or whatever's left of my brother. I ring the Bell, the Lock gets its Keeper, everyone else goes home.",
        choices: [
          {
            text: "Give me the Bell, Seren.",
            tone: "brave",
            requiresAffinity: { min: 8 },
            affinity: 2,
            giveItem: "silent_bell",
            clearFlag: "seren_has_bell",
            setFlag: "seren_settled",
            next: "standoff_give",
          },
          {
            text: "Tobin left you this.",
            tone: "kind",
            requiresItem: "tobins_token",
            affinity: 8,
            takeItem: "tobins_token",
            completeQuest: "tobins_token",
            giveItem: "silent_bell",
            clearFlag: "seren_has_bell",
            setFlags: ["seren_settled", "seren_turned"],
            next: "standoff_token",
          },
          { text: "Then I'll stop you.", tone: "brave", battle: "seren_wellhead" },
          {
            text: "...Do it, then.",
            tone: "sad",
            next: "standoff_ring",
          },
          { text: "Wait. Let me talk to him first.", next: "standoff_wait" },
        ],
      },
      standoff_wait: {
        text: "Talk, then. I'll be right here, with my bell. Take your time. Not too much.",
      },
      standoff_give: {
        text: "...Fine. Fine. Take it. You've been a better friend to me than I've been to anyone, first-year, and you weren't even trying to be. Do it your way. Do it properly.",
      },
      standoff_token: {
        text: "That's his. That's - 'Come after me anyway.' ... Here. Take the Bell. Take it. I don't want to ring anything any more. I want to sit down. I'm going to sit down.",
      },
      standoff_ring: {
        text: "You're sure? ... Yes. You're sure. All right. I'll make it quick. He won't feel it. I don't think he'll feel anything, ever again. That's rather the point.",
        choices: [
          {
            text: "Ring it.",
            tone: "sad",
            setFlags: ["seren_rang_bell", "ending_bound", "seren_settled"],
            clearFlag: "seren_has_bell",
            completeQuest: "the_hollow_choir",
            cutscene: "ending_bound",
          },
          { text: "No - wait. Not yet.", next: "standoff" },
        ],
      },
      beaten: {
        text: "Stop. Stop - you've made your point, and my ribs have made theirs. ... Here. The Bell. Take it. I'd only have rung it on the wrong person anyway. I always pick the wrong person.",
        choices: [
          {
            text: "Thank you, Seren.",
            tone: "kind",
            affinity: 2,
            giveItem: "silent_bell",
            clearFlag: "seren_has_bell",
            setFlag: "seren_settled",
          },
        ],
      },

      // --- rival, empty-handed

      rival: {
        text: "Go on, then, first-year. Save the world. I'm just here to see what it costs, and who pays, and whether there's anything left lying about afterwards.",
        choices: [
          {
            text: "Help me instead.",
            tone: "kind",
            requiresAffinity: { min: 6 },
            requiresNotFlag: "seren_turned",
            affinity: 3,
            clearFlag: "seren_rival",
            setFlags: ["seren_ally", "seren_turned"],
            next: "rival_turn",
          },
          {
            text: "Tobin left you this.",
            tone: "kind",
            requiresItem: "tobins_token",
            affinity: 8,
            takeItem: "tobins_token",
            completeQuest: "tobins_token",
            clearFlag: "seren_rival",
            setFlags: ["seren_ally", "seren_turned"],
            next: "rival_token",
          },
          { text: "What are you after?", tone: "curious", next: "rival_after" },
          { text: "Stay out of my way.", tone: "sharp", affinity: -1 },
        ],
      },
      rival_after: {
        text: "The Key, once it's turned. A key that locked the world. Do you know what that's worth? ... Neither do I. That's what makes it interesting.",
        next: "rival",
      },
      rival_turn: {
        text: "...You really are the most annoying person I've ever met. Yes. Fine. I'll hold the edges. Don't tell anyone I came round. I have a reputation for being impossible.",
      },
      rival_token: {
        text: "'Come after me anyway.' ... I did, you idiot. I did. ... All right, first-year. All right. I'm with you. Whatever this is. I'm with you.",
      },

      post: {
        text: "Still here, Wren. Still not lucky. Still walking north, except now there's no further north to walk.",
        variants: [
          {
            requiresFlag: "ending_redeemed",
            text: "Second watch. Mine. Do you know, it's the first job I've ever had that I didn't steal? It's very boring. Ilse says that's the point. I've started a rope bridge across the well. For the next one.",
          },
        ],
        choices: [{ text: "Take care of yourself, Seren.", tone: "kind", affinity: 1 }],
      },
    },
  },
};
