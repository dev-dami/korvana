import type { DialogueChoice, DialogueTree } from "./types";
import type { HouseId } from "../../state/GameState";

/**
 * The Choosing Lamp. Theatrical, ancient, imperious, fond; talks about itself
 * in the language of wicks and oil, and about everyone else as if they were
 * slightly underlit. It was a woman once - Edda, the Ninth Keeper - and it
 * will tell you so, if you are kind to it for long enough.
 */

const HOUSE_NAMES: Record<HouseId, string> = {
  emberhart: "Emberhart",
  thornwick: "Thornwick",
  ravelle: "Ravelle",
  stillwater: "Stillwater",
};

/** "I accept" - the one choice that actually sorts you. */
function accept(house: HouseId, text: string, argued: boolean): DialogueChoice {
  return {
    text,
    tone: "brave",
    setHouse: house,
    setFlag: argued ? "lamp_argued" : undefined,
    affinity: argued ? 2 : 1,
    giveItem: `badge_${house}`,
    lore: `house_${house}`,
    advanceQuest: "the_choosing",
    cutscene: "the_chosen",
  };
}

/** The four answers to the arguing node, minus the House the Lamp already proposed. */
function argueChoices(): DialogueChoice[] {
  const pitch: Record<HouseId, string> = {
    emberhart: "Emberhart. I would rather be brave than right.",
    thornwick: "Thornwick. I don't leave people behind.",
    ravelle: "Ravelle. I have to know why.",
    stillwater: "Stillwater. I want to learn how to wait.",
  };
  const out: DialogueChoice[] = [];
  for (const house of Object.keys(pitch) as HouseId[]) {
    out.push({
      text: pitch[house],
      tone: "honest",
      requiresNotFlag: `lamp_suggests_${house}`,
      next: `argue_${house}`,
    });
  }
  out.push({ text: "No. You're right. I was only testing you.", tone: "funny", next: "c_verdict" });
  return out;
}

function verdictChoices(house: HouseId): DialogueChoice[] {
  return [
    accept(house, `${HOUSE_NAMES[house]}. Yes.`, false),
    { text: "I'd like to argue.", tone: "brave", next: "argue" },
    { text: "Could I be in all four?", tone: "funny", once: true, next: "c_all_four" },
  ];
}

export const LAMP_DIALOGUES: Record<string, DialogueTree> = {
  lamp_choosing: {
    id: "lamp_choosing",
    start: "start",
    nodes: {
      start: {
        redirect: [
          { requiresStage: { quest: "the_choosing", stage: "lamp" }, next: "c_intro" },
          { requiresStage: { quest: "the_choosing", stage: ["arrive", "vey"] }, next: "early" },
          { requiresFlag: "game_complete", next: "post" },
        ],
        text: "Ah. My little late one. Come and stand in the light where I can see you; my eyes are not what they were, chiefly because I have not had eyes for six centuries.",
        variants: [
          { requiresHouse: "emberhart", text: "Ah, my little ember. Still smouldering, I see. Come and warm yourself; I promise not to take it personally." },
          { requiresHouse: "thornwick", text: "Ah, my little briar. Rooted, I hope? Good. Come and sit by the glass. You can tell me about the greenhouses. Nobody ever does." },
          { requiresHouse: "ravelle", text: "Ah, my little raven. Come to ask me something you are not supposed to ask? Good. Ask it quietly; the Headmistress has excellent hearing." },
          { requiresHouse: "stillwater", text: "Ah, my little heron. You have been standing there for a full minute without saying anything. I approve. Speak when you are ready." },
        ],
        choices: [
          { text: "How do you really choose?", tone: "curious", once: true, next: "how" },
          { text: "Did you really write my letter?", tone: "curious", once: true, next: "letter" },
          { text: "Can I ask you about Vale?", requiresFlag: "vale_glimpsed", next: "vale" },
          { text: "You've been looking north.", requiresFlag: "act3_started", next: "north" },
          {
            text: "Who were you, before you were a lamp?",
            tone: "kind",
            requiresFlag: "vey_confessed",
            requiresNotFlag: "edda_known",
            requiresAffinity: { min: 8 },
            next: "edda1",
          },
          { text: "Goodnight, Lamp.", affinity: 1, next: "bye" },
        ],
      },
      bye: {
        text: "Goodnight, little wick. Do not let anyone blow you out.",
      },
      early: {
        text: "Not yet, not yet! The Headmistress must present you first. There are forms. I am one of them. Go and stand in front of her and look late; she will know what to do.",
      },

      how: {
        text: "I ask questions, and I listen to the answers, and then I listen to the bit underneath the answers, which is the bit that is actually talking. Nobody has ever once given me the answer they meant to. That is what makes it work.",
        onEnter: { lore: "the_choosing_lamp" },
        choices: [
          { text: "Did you ever get it wrong?", tone: "curious", next: "how_wrong" },
          { text: "That sounds exhausting.", tone: "kind", affinity: 2, next: "how_tired" },
        ],
      },
      how_wrong: {
        text: "Twice. Once I put a boy in Ravelle who should have been in Thornwick, where somebody would have held on to him. And once I put a goat in Thornwick, which was not a mistake, whatever you have been told. It was an excellent goat.",
        next: "start",
      },
      how_tired: {
        text: "It is. Thank you for noticing. Nobody notices whether a lamp is tired. They notice whether it is bright. Those are not the same thing, and I would like that written on my plinth.",
        next: "start",
      },
      letter: {
        text: "Every one of them. In my best hand. You were the hardest I ever wrote, because I wrote it in a hurry and I have not hurried since the year the well woke. I had to look up how.",
        choices: [
          { text: "Why the hurry?", tone: "curious", next: "letter_why" },
          { text: "Thank you for writing.", tone: "kind", affinity: 2, next: "start" },
        ],
      },
      letter_why: {
        text: "Because something I have been holding very still for a long time began, this spring, to move. And because you were a long way off, and the road was closing, and you are the sort who comes anyway. I can always tell. It is the only thing I can always tell.",
        next: "start",
      },
      vale: {
        text: "He used to sit where you are standing, every night after supper, when he was small. He asked me about his mother. I told him she was very brave, which was true. I did not tell him the rest, which was cowardly. Lamps can be cowards. It is mostly a matter of where you point.",
        choices: [
          { text: "Is that why he's doing this?", tone: "curious", next: "vale2" },
          { text: "You were trying to be kind.", tone: "kind", affinity: 2, next: "vale2" },
        ],
      },
      vale2: {
        text: "He is doing this because he loves somebody who is in the well, and he cannot bear that she is there, and nobody ever told him that she might have chosen it. Tell him, if you can. He will not believe me. He thinks I am a lamp.",
        onEnter: { setFlag: "lamp_vale_hint" },
        next: "start",
      },
      north: {
        text: "Yes. Somebody took my sister out of the dark. The Warden's Lantern - I was lit from it, you know, a very long time ago. Now it is in the Headmistress's window and we can see each other across the courtyard. It is like having a light on in the house again.",
        variants: [
          {
            requiresFlag: "relics_gathered",
            text: "Yes. All three of them are together again: my sister the Lantern, and the Key, and the Bell. I have not felt them in one place since the Accord. It is like hearing a chord you had forgotten. Take them north, little wick. Take them carefully.",
          },
        ],
        next: "start",
      },

      edda1: {
        text: "...Oh. Nobody has asked me that in two hundred years. The last one who asked was a drowned archivist, and he was not a very good listener, being at the time quite busy drowning.",
        choices: [
          { text: "I'm listening.", tone: "kind", affinity: 2, next: "edda2" },
          { text: "You don't have to tell me.", tone: "kind", affinity: 3, next: "edda2" },
        ],
      },
      edda2: {
        text: "My name was Edda. I was the youngest of the Nine, and I could not sit still - I was always the one getting up for more wood. When the others sat down at the well for good, I asked the Warden for something else to do.",
        next: "edda3",
      },
      edda3: {
        text: "'Somebody has to choose who comes next,' I said, 'and keep choosing, for as long as there is a next.' So Maudrey lit a lamp from her Lantern, and I went into it. And I have been choosing ever since.",
        choices: [
          { text: "Do you regret it?", tone: "curious", next: "edda4" },
          { text: "That's the bravest thing I've ever heard.", tone: "kind", affinity: 3, next: "edda4" },
          { text: "So you're the Ninth Keeper.", tone: "honest", next: "edda4" },
        ],
      },
      edda4: {
        text: "I miss my hands. That is all. I always talked with my hands. ... Here. Take this - a coal from my own wick. It will not go out. If you are ever somewhere very dark and very far down, hold it up, and you will not be entirely alone there.",
        onEnter: { setFlag: "edda_known", giveItem: "lamp_coal", lore: "edda" },
        choices: [{ text: "Thank you, Edda.", tone: "kind", affinity: 4, next: "edda5" }],
      },
      edda5: {
        text: "Hm. Nobody has called me that out loud in six hundred years. Go on, now, before I flicker in front of the first-years. I have a reputation.",
      },

      // ====================================================== the Choosing

      c_intro: {
        text: "Closer. Closer. I do not bite; I have not had teeth since the Accord. ... So. You came. Late, alone, on foot, with a letter you cannot account for. Do you have any idea how rare that is?",
        choices: [
          { text: "Did you write my letter?", tone: "curious", affinity: 1, next: "c_letter" },
          { text: "I'm ready to be chosen.", tone: "brave", next: "c_q1" },
          { text: "Is this going to hurt?", tone: "funny", affinity: 1, next: "c_hurt" },
          { text: "You're very talkative for a lantern.", tone: "sharp", next: "c_talk" },
        ],
      },
      c_letter: {
        text: "Of course I wrote it. Nobody believes me, which is restful. Now hush; I have four questions and an audience, and the audience has been waiting since breakfast.",
        next: "c_q1",
      },
      c_hurt: {
        text: "Only your pride, and only if you are a Ravelle and I put you in Thornwick, which I have done, and they wept, and they thanked me at their wedding. Stand still.",
        next: "c_q1",
      },
      c_talk: {
        text: "I have been silent for most of six hundred years, little wick, hanging on a hook. Once a year I get to talk. You will forgive me if I make an evening of it.",
        next: "c_q1",
      },

      c_q1: {
        text: "First question. You come to a door you were told never to open. Behind it, someone is weeping. What do you do?",
        choices: [
          { text: "Open it. Whoever told me not to can explain later.", tone: "brave", houseWeight: { emberhart: 2 }, next: "c_q1_e" },
          { text: "Sit down by the door and talk to them until they stop.", tone: "kind", houseWeight: { thornwick: 2 }, next: "c_q1_t" },
          { text: "Find out who told me not to, and why, before I touch the handle.", tone: "curious", houseWeight: { ravelle: 2 }, next: "c_q1_r" },
          { text: "Listen a while longer. Weeping can be a lure.", tone: "honest", houseWeight: { stillwater: 2 }, next: "c_q1_s" },
          { text: "Knock.", tone: "funny", houseWeight: { thornwick: 1, ravelle: 1 }, affinity: 1, next: "c_q1_k" },
        ],
      },
      c_q1_e: { text: "Straight in. No dithering on the threshold. The hall at the back is cheering, which it is not allowed to do yet.", next: "c_q2" },
      c_q1_t: { text: "Through the door, then, for as long as it takes. Patient as a root. Somebody at the green table has just sat up.", next: "c_q2" },
      c_q1_r: { text: "The rule before the room. Interesting. You will be a nightmare to set homework for.", next: "c_q2" },
      c_q1_s: { text: "Cautious. Not cold - cautious. There is a difference, and most people die not learning it.", next: "c_q2" },
      c_q1_k: { text: "...Knock. Six hundred years and nobody has said knock. I am going to think about knock for a century.", next: "c_q2" },

      c_q2: {
        text: "Second. A library is burning. You may carry one thing out. What do you carry?",
        choices: [
          { text: "The person still inside.", tone: "brave", houseWeight: { emberhart: 2 }, next: "c_q2_e" },
          { text: "The librarian's cat. Then the librarian.", tone: "kind", houseWeight: { thornwick: 2 }, next: "c_q2_t" },
          { text: "The catalogue. Then at least we'd know what was lost.", tone: "curious", houseWeight: { ravelle: 2 }, next: "c_q2_r" },
          { text: "The oldest book. The new ones can be written again.", tone: "honest", houseWeight: { stillwater: 2 }, next: "c_q2_s" },
          { text: "Whatever started the fire. So it can't happen again.", tone: "sharp", houseWeight: { ravelle: 1, emberhart: 1 }, next: "c_q2_x" },
        ],
      },
      c_q2_e: { text: "There is always a person still inside, in your version of the story. Hold on to that. It will get you into a great deal of trouble.", next: "c_q3" },
      c_q2_t: { text: "The cat first. Very proper. Fennick, at the back, has gone a colour I have not seen on him before.", next: "c_q3" },
      c_q2_r: { text: "Knowing what was lost. That is a sadder answer than you think it is, and a wiser one.", next: "c_q3" },
      c_q2_s: { text: "The long view. The young rarely have it. Perhaps you are older than you look. Perhaps you have had to be.", next: "c_q3" },
      c_q2_x: { text: "The cause, not the symptom. Very good. Very alarming. Put the matches down, please.", next: "c_q3" },

      c_q3: {
        text: "Third. Your dearest friend has done something wrong, and begs you to keep it secret. What do you do?",
        choices: [
          { text: "Tell them to own up, and stand next to them when they do.", tone: "brave", houseWeight: { emberhart: 2 }, next: "c_q3_e" },
          { text: "Keep it, and help them put it right quietly.", tone: "kind", houseWeight: { thornwick: 2 }, next: "c_q3_t" },
          { text: "Ask them what really happened. All of it.", tone: "curious", houseWeight: { ravelle: 2 }, next: "c_q3_r" },
          { text: "Say nothing yet. Let them come to it in their own time.", tone: "honest", houseWeight: { stillwater: 2 }, next: "c_q3_s" },
        ],
      },
      c_q3_e: { text: "Candour, and company in it. That is the whole of what the stag means, if they ever told you, which they will not; they think it is about the fire.", next: "c_q4" },
      c_q3_t: { text: "Loyal before righteous. The briar does not ask whether you deserve to be held. It holds.", next: "c_q4" },
      c_q3_r: { text: "All of it. Not the part they confessed - the part they left out. The raven always wants the second page.", next: "c_q4" },
      c_q3_s: { text: "Time, given as a gift. The heron's way. Very few people realise that waiting for someone can be a kindness.", next: "c_q4" },

      c_q4: {
        text: "Last. You are alone, in the dark, a very long way under the ground. What do you want most?",
        choices: [
          { text: "A fire.", tone: "brave", houseWeight: { emberhart: 2 }, resolveHouse: true, next: "c_ponder" },
          { text: "A hand to hold.", tone: "kind", houseWeight: { thornwick: 2 }, resolveHouse: true, next: "c_ponder" },
          { text: "A key.", tone: "curious", houseWeight: { ravelle: 2 }, resolveHouse: true, next: "c_ponder" },
          { text: "To see.", tone: "honest", houseWeight: { stillwater: 2 }, resolveHouse: true, next: "c_ponder" },
          { text: "To not be alone.", tone: "sad", houseWeight: { thornwick: 1, stillwater: 1 }, affinity: 2, resolveHouse: true, next: "c_ponder_alone" },
        ],
      },
      c_ponder_alone: {
        text: "...Yes. That is what everyone wants down there, and almost nobody says it. I will remember that you did.",
        next: "c_ponder",
      },
      c_ponder: {
        text: "Hmm. Hmmmm. Do not fidget; I am being profound. The hall has gone so quiet I can hear the soup cooling.",
        next: "c_verdict",
      },
      c_verdict: {
        text: "Well. I have it.",
        redirect: [
          { requiresFlag: "lamp_suggests_emberhart", next: "verdict_emberhart" },
          { requiresFlag: "lamp_suggests_thornwick", next: "verdict_thornwick" },
          { requiresFlag: "lamp_suggests_ravelle", next: "verdict_ravelle" },
          { requiresFlag: "lamp_suggests_stillwater", next: "verdict_stillwater" },
        ],
        next: "verdict_emberhart",
      },
      verdict_emberhart: {
        text: "You would open the door. You would carry out the person. You would go first, and say so, and probably say so rather loudly. EMBERHART! ...Unless you have something to say about it.",
        choices: verdictChoices("emberhart"),
      },
      verdict_thornwick: {
        text: "You would sit by the door until the weeping stopped. You would not leave anyone in the fire, not even the cat. You hold on. THORNWICK! ...Unless you have something to say about it.",
        choices: verdictChoices("thornwick"),
      },
      verdict_ravelle: {
        text: "You want the rule before the room, the catalogue before the shelf, and the whole story before the verdict. You ask the second question. RAVELLE! ...Unless you have something to say about it.",
        choices: verdictChoices("ravelle"),
      },
      verdict_stillwater: {
        text: "You listen longer than is comfortable. You give people time. In the dark you want to see, not to be saved. You wait, and then you wait a little more. STILLWATER! ...Unless you have something to say about it.",
        choices: verdictChoices("stillwater"),
      },
      c_all_four: {
        text: "Four Houses at once? You would be expected at four breakfasts. You would be in four common rooms during every argument and on every side of it. You would be exhausted by Tuesday. No.",
        next: "c_verdict",
      },

      argue: {
        text: "Oh, good. Nobody argues any more. They used to argue all the time - one girl threw a shoe. Go on, then. Which, and why?",
        choices: argueChoices(),
      },
      argue_emberhart: {
        text: "Brave rather than right. That is a dangerous creed, little wick, and it has filled the Emberhart table for six hundred years. Very well. If you will say it to my face, you are already halfway to being one.",
        choices: [
          accept("emberhart", "Then I choose Emberhart.", true),
          { text: "On reflection, I'll take your word.", next: "c_verdict" },
        ],
      },
      argue_thornwick: {
        text: "You do not leave people behind. ... No. I can hear that you do not. I can hear somebody you did not leave, in the way you said it. Very well. Thornwick will be glad of you.",
        choices: [
          accept("thornwick", "Then I choose Thornwick.", true),
          { text: "On reflection, I'll take your word.", next: "c_verdict" },
        ],
      },
      argue_ravelle: {
        text: "You have to know why. Of course you do - you have just asked a six-hundred-year-old lamp to justify itself in public. That is the most Ravelle thing anyone has done all evening. Very well.",
        choices: [
          accept("ravelle", "Then I choose Ravelle.", true),
          { text: "On reflection, I'll take your word.", next: "c_verdict" },
        ],
      },
      argue_stillwater: {
        text: "You want to learn to wait. Which means you know you cannot, yet, and that you would like to. That is the beginning of patience, and the Herons will teach you the rest. Slowly. Very well.",
        choices: [
          accept("stillwater", "Then I choose Stillwater.", true),
          { text: "On reflection, I'll take your word.", next: "c_verdict" },
        ],
      },

      // ------------------------------------------------------ after

      post: {
        text: "There you are. I have been telling the first-years about you. I have been exaggerating, but only in the places where the truth was inconveniently modest.",
        variants: [
          {
            requiresFlag: "ending_redeemed",
            text: "There you are. I have written forty-one letters this week. Forty-one! Come north for a season, they say, and then come home. Do you know how long it has been since I could write 'and then come home'? My wick has never been so bright.",
          },
          {
            requiresFlag: "ending_bound",
            text: "There you are. ... I can feel him, you know. Up north, holding. He is very good at it. He was always very good at everything he decided to do. I wish I had chosen him for Thornwick.",
          },
          {
            requiresFlag: "ending_defeated",
            text: "There you are. The well is quiet. I can feel Ilse up there, keeping it. One candle in a very big room. I am writing to her every night now. She has not written back, but she has not asked me to stop.",
          },
        ],
        choices: [
          { text: "Thank you for choosing me.", tone: "kind", affinity: 2, next: "post2" },
          { text: "Goodnight, Lamp.", next: "bye" },
        ],
      },
      post2: {
        text: "I did not choose you, little wick. I only wrote to you. You chose to come. That is all I have ever looked for, and it is all anybody has ever had to give.",
      },
    },
  },
};
