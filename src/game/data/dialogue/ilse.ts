import type { DialogueTree } from "./types";

/**
 * Keeper Ilse. The last of the Nine on watch. Thornwick by birth, Stillwater by
 * temper, Wick's apprentice in wards. Stark, exhausted, precise as a drill
 * sergeant and funny in the way of people who have stopped expecting to be
 * rescued. She has been holding the Lock alone for four years and she is very
 * angry with the Headmistress, who was right, which makes it worse.
 */
export const ILSE_DIALOGUES: Record<string, DialogueTree> = {
  ilse_main: {
    id: "ilse_main",
    start: "start",
    nodes: {
      start: {
        redirect: [
          { requiresFlag: "game_complete", next: "post" },
          { requiresNotQuest: "keeper_ilse", next: "early" },
          { requiresNotFlag: "ilse_briefed", next: "meet1" },
        ],
        text: "Still here. Good. The fire needs feeding and I need someone to complain to who is not already dead.",
        variants: [
          {
            requiresActiveQuest: "the_hollow_choir",
            text: "Why are you still up here? He is down there. The well is singing louder by the hour. Go. I will be in the doorway, where I always am.",
          },
        ],
        choices: [
          {
            text: "Six singers. Silenced.",
            tone: "brave",
            requiresStage: { quest: "keeper_ilse", stage: "return" },
            advanceQuest: "keeper_ilse",
            affinity: 4,
            next: "cull1",
          },
          {
            text: "The Headmistress sent you a letter.",
            requiresItem: "vey_letter",
            requiresNotFlag: "letter_given",
            next: "letter1",
          },
          {
            text: "Mistress Wick sent you something.",
            tone: "kind",
            requiresFlag: "wick_message",
            requiresNotFlag: "wick_delivered",
            next: "wick1",
          },
          {
            text: "Did you know Tobin Ashdown?",
            requiresAnyFlag: ["heard_of_ashdowns", "seren_told_tobin", "seren_ally", "seren_rival"],
            requiresNotQuest: "tobins_token",
            next: "tobin1",
          },
          {
            text: "Tell me about Vale.",
            requiresFlag: "ilse_done",
            requiresNotQuest: "the_hollow_choir",
            next: "vale_offer",
          },
          { text: "Can we talk?", next: "talk" },
        ],
      },

      early: {
        text: "You are a long way from the Academy, child. Turn round. The Scar is no place to be without the Lantern, the Key and the Bell, and you have none of them that I can see. Come back when you have all three, or do not come back.",
      },

      // ------------------------------------------------- first meeting

      meet1: {
        text: "Who sent you? And do not say 'nobody'. Nobody walks into the Scar by accident. The ground does not allow it.",
        choices: [
          { text: "Headmistress Vey.", tone: "honest", next: "meet_vey" },
          { text: "Professor Alden.", tone: "honest", next: "meet_alden" },
          { text: "The Choosing Lamp, I think. In a way.", tone: "curious", affinity: 2, next: "meet_lamp" },
        ],
      },
      meet_vey: {
        text: "Orlaith. Of course. Twelve years and not a word, and then she sends a first-year with all three relics in a satchel. ... That is very like her. She always did think a gesture was the same as an apology.",
        next: "meet2",
      },
      meet_alden: {
        text: "Alden sent you. Alden sent Tobin, too, and Seren. Alden has a talent for sending people up roads he will not walk himself, and an even greater talent for being sorry about it afterwards. Well. You are here.",
        next: "meet2",
      },
      meet_lamp: {
        text: "...The Lamp. Edda. She wrote to me too, once, a long time ago, when I was a girl in a Thornwick village with dirt under my nails. 'Come anyway.' I did. Look where it got me. ... I am glad it got you here.",
        next: "meet2",
      },
      meet2: {
        text: "I am Ilse. Keeper of the Moonwell, which is a title that used to have nine people attached to it. There were seven when I came. Eight with Tobin. Four years ago the rest went north along the seam to stitch where it was tearing, and did not come back. I have held the doorway alone since.",
        choices: [
          { text: "Alone? For four years?", tone: "kind", affinity: 2, next: "meet3" },
          { text: "What's tearing it?", tone: "curious", next: "meet3_tear" },
          { text: "Why didn't you come back for help?", tone: "sharp", next: "meet3_why" },
        ],
      },
      meet3_tear: {
        text: "Vale. And before Vale, the shattering. And before that, the fact that the Vigil says nine and Orlaith sent none. Every splinter in the grass is a piece of the watch that nobody is keeping. The wraiths collect them. Vale feeds them to the well.",
        next: "meet3",
      },
      meet3_why: {
        text: "Because somebody has to stand in the doorway, and if I leave it for the length of the walk south, there will not be a doorway to come back to. That is not a figure of speech. Nothing up here is a figure of speech.",
        next: "meet3",
      },
      meet3: {
        text: "Here is what you will do. The Hollow Choir - the singers, the wraiths - are thick in the ash between here and the Wellhead. Break six of them. Your Bell will stun them, if you have the nerve to ring it. Then come back, and I will tell you how to stop him.",
        onEnter: { lore: "hollow_choir" },
        choices: [
          { text: "Six. I'll be back.", tone: "brave", setFlag: "ilse_briefed", next: "meet4" },
          { text: "What are they, really?", tone: "curious", setFlag: "ilse_briefed", next: "meet_choir" },
        ],
      },
      meet_choir: {
        text: "The Lock trying to mend itself without hands. That is my opinion. Vale thinks they are somebody's mother. We may both be right. That is the trouble with up here: everybody is a little bit right, and the well does not care.",
        next: "meet4",
      },
      meet4: {
        text: "Break them where the ash is deep. They come apart like wet paper, and they do not like it. Neither did the two students I had before you, and they were older. Go on.",
      },

      // ------------------------------------------------- the letter

      letter1: {
        text: "A letter. From Orlaith. ... Twelve years. Give it here. No - wait. Hold it a moment longer. I would like to decide whether I am going to read it before I am holding it.",
        choices: [
          { text: "Read it. She's been writing it for twelve years.", tone: "kind", affinity: 2, next: "letter_read" },
          { text: "You don't have to read it. You don't owe her that.", tone: "honest", affinity: 3, next: "letter_keep" },
          { text: "Burn it, if you'd rather. I won't tell her.", tone: "sharp", next: "letter_burn" },
        ],
      },
      letter_read: {
        text: "...She says she was wrong. She says she is not sorry for what she meant, only for what it cost. She says she has written to me every week and sent none of them. She says she is coming north when it is done. ... She always did write too small.",
        onEnter: { setFlags: ["letter_given", "ilse_read_letter"], takeItem: "vey_letter" },
        choices: [
          { text: "Will you write back?", tone: "kind", affinity: 2, next: "letter_reply" },
          { text: "I'm sorry.", tone: "kind", next: "start" },
        ],
      },
      letter_reply: {
        text: "Two lines. The first will say that she was wrong. The second will say that I am glad she wrote. Take it back with you, if you go back. If you do not, I will find another way. I am very good at finding other ways. It is all that has kept me alive.",
        onEnter: { setFlag: "ilse_wrote_back" },
        next: "start",
      },
      letter_keep: {
        text: "...No. I do not. Thank you. That is the first time in twelve years anybody has said I did not owe something. I will keep it. Unopened. For now. It is a comfort, oddly, to have it and not to know.",
        onEnter: { setFlags: ["letter_given", "ilse_kept_letter"], takeItem: "vey_letter" },
        next: "start",
      },
      letter_burn: {
        text: "Burn it. ... I could. I have imagined it often enough. No. I will keep it. Burning things is what she does. I keep things. It is the only difference between us that has ever mattered.",
        onEnter: { setFlags: ["letter_given", "ilse_kept_letter"], takeItem: "vey_letter" },
        next: "start",
      },

      // ------------------------------------------------- Wick

      wick1: {
        text: "Wick? ... What has the old weed sent me now. Seeds? It is always seeds. She sent seeds with me when I left, and I planted them, and nothing grew, and I wrote and told her nothing would grow up here, and she -.",
        choices: [
          { text: "She says plant them by the tents. She's never wrong about soil.", tone: "kind", affinity: 3, next: "wick2" },
        ],
      },
      wick2: {
        text: "Never wrong about soil. She used to say that about everything. Students, mostly. ... Give them here. I will plant them by the tents. If anything comes up, I will never tell her, and she will know anyway, because plants talk. That is the other thing she used to say.",
        onEnter: { setFlag: "wick_delivered" },
        next: "start",
      },

      // ------------------------------------------------- Tobin

      tobin1: {
        text: "Tobin. ... Yes. I knew him. He walked in here eight years ago with a sister he had sent home and a knife he had stolen from her, and he looked at the rota, and he counted, and he stayed. He tied every knot wrong. He was the best of us.",
        choices: [
          { text: "What happened to him?", tone: "curious", next: "tobin2" },
          { text: "His sister is looking for him.", tone: "honest", next: "tobin2" },
        ],
      },
      tobin2: {
        text: "He went north with the others, four years ago, along the seam. None of them came back. He is in the Lock, now, I think - not singing, holding. He left his token on the rota post. I turn it every morning so the stone does not fade on one side. Here. Take it to her. He would want her to have it.",
        choices: [
          {
            text: "I'll give it to her.",
            tone: "kind",
            affinity: 3,
            giveItem: "tobins_token",
            startQuest: "tobins_token",
            next: "start",
          },
        ],
      },

      // ------------------------------------------------- the cull, and Vale

      cull1: {
        text: "Six. You are either very good or very lucky, and I have stopped being able to tell the difference. Take this - and this is not a reward, it is equipment. And sit. Now I will tell you how the Lock is set.",
        next: "cull2",
      },
      cull2: {
        text: "In the Wellhead stone there is a keyhole with nine sides. The Ninefold Key turns it, and sets the Lock again, fresh, as the Nine set it. But the Lock must be held while it is turned, or it will not take. The Bell stills the thing behind it. The Lantern shows you where to hold.",
        onEnter: { lore: "the_moonwell" },
        choices: [
          { text: "And the Bell's last clause?", tone: "curious", requiresFlag: "bell_clause_known", next: "cull_clause" },
          { text: "Tell me about Vale.", tone: "curious", next: "vale_offer" },
        ],
      },
      cull_clause: {
        text: "Orlaith told you. Good. Yes: ring the Bell over a person at the Wellhead and they become a strand of the Lock. For ever. The Lock would never need nine again. It would need only them. ... I have thought about ringing it over myself. Every night for four years. Do not let him make you think about it too.",
        next: "vale_offer",
      },
      vale_offer: {
        text: "Vale. Fourth-year, went missing mid-term, listed as left rather than lost. He is at the Wellhead, and he is feeding it, and he is doing it because his mother is in the choir and he thinks I am keeping her prisoner. He may be right. I have run out of other people to send.",
        choices: [
          { text: "I'll go down to him.", tone: "brave", startQuest: "the_hollow_choir" },
          { text: "What if he's right?", tone: "curious", next: "vale_doubt" },
          { text: "His mother - you knew her?", tone: "kind", next: "vale_ansa" },
        ],
      },
      vale_ansa: {
        text: "Ansa Vale. She was on watch the night it broke. She sang the watch-song to keep awake - badly, she had a voice like a gate - and when the well shattered she did not stop. None of them stopped. They are still singing it, down there, the nine who were on watch. That is the Choir. It is her.",
        onEnter: { setFlag: "ansa_known" },
        choices: [
          { text: "Is she trapped? Or is she holding?", tone: "curious", next: "vale_ansa2" },
          { text: "Then I'll go to him.", tone: "brave", startQuest: "the_hollow_choir" },
        ],
      },
      vale_ansa2: {
        text: "I do not know. I have never been able to look - I have not had the Lantern. You have. If you can make him look through it, and if the answer is the one I hope, you might be able to bring him home. If it is not -. Then you will do what the Keepers do.",
        choices: [{ text: "Then I'll go.", tone: "brave", startQuest: "the_hollow_choir" }],
      },
      vale_doubt: {
        text: "He might be. That is the trouble with him. But the doorway does not care whether the argument for opening it was a good one, and the Scar is what happens when it is open for the length of a breath. Imagine it everywhere.",
        choices: [{ text: "Then I'll go.", tone: "brave", startQuest: "the_hollow_choir" }],
      },

      // ---------------------------------------------------------- talk

      talk: {
        text: "Talk. Very well. Keep feeding the fire while you do; it is the only thing up here that is grateful.",
        choices: [
          { text: "What's the watch like?", tone: "curious", next: "t_watch" },
          { text: "What do you miss?", tone: "kind", once: true, next: "t_miss" },
          { text: "Do you hate the Headmistress?", tone: "sharp", next: "t_vey" },
          { text: "What's on the other side of the well?", tone: "curious", next: "t_dark" },
          { text: "Back to the fire.", next: "start" },
        ],
      },
      t_watch: {
        text: "You sit. You listen to the well. You do not answer it. You sleep in the shifts the Vigil allows for nine, which for one is about an hour in four. You count things - stones, breaths, stars that are not where they should be. You keep the tents aired. Discipline, not hope.",
        next: "talk",
      },
      t_miss: {
        text: "Bread. Real bread, with a crust. And Wick shouting at me about compost. And being somebody's student instead of everybody's last hope. ... And the colour green. Mostly the colour green.",
        next: "talk",
      },
      t_vey: {
        text: "I hated her for about a year. Then I was too tired. Now I think she was right that it was cruel and wrong that refusing would fix it, and I think she knows both, and I think knowing both is worse than hate. I would not wish it on her. I would not take it off her either.",
        next: "talk",
      },
      t_dark: {
        text: "The Long Dark Between Stars, the Vigil calls it. It is not evil. It is not awake. It does not know we are here. It is simply very large, and pressed against a very thin place. You do not fight it. You stand in the doorway, and you do not move.",
        onEnter: { lore: "the_long_dark" },
        next: "talk",
      },

      post: {
        text: "Wren. The watch is quiet. I am almost bored. Do you know how long I have waited to be bored?",
        variants: [
          {
            requiresFlag: "ending_redeemed",
            text: "Wren! I slept. Four days, in Wick's greenhouse, under the tomato frames. Then I came back up for my shift. My shift. A season, and then home. Do you understand what you have done? There are names on the rota. Living names.",
          },
          {
            requiresFlag: "ending_bound",
            text: "Wren. He is holding. Very well. Better than any of us ever did. I sit with him in the evenings and argue. He never argues back. I am going to keep trying until he does.",
          },
          {
            requiresFlag: "ending_defeated",
            text: "Wren. The well is shut. I am keeping it. I am good at keeping it. ... Thank you for coming. I mean that. It is the first thing I have meant in four years.",
          },
        ],
        choices: [{ text: "Take care of yourself, Keeper.", tone: "kind", affinity: 1 }],
      },
    },
  },
};
