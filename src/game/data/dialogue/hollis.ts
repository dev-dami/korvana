import type { DialogueTree } from "./types";

/**
 * Brother Hollis, last archivist of the Undercroft. Drowned two hundred and
 * twelve years ago, on purpose, and gently embarrassed about it. Old-fashioned
 * without being quaint; apologises a great deal; very funny about his own
 * death in the way of someone who has had a long time to work on the material.
 */
export const HOLLIS_DIALOGUES: Record<string, DialogueTree> = {
  hollis_main: {
    id: "hollis_main",
    start: "start",
    nodes: {
      start: {
        redirect: [
          { requiresFlag: "hollis_stays", requiresCompleteQuest: "hollis_rest", next: "stays" },
          { requiresNotFlag: "met_hollis", next: "first" },
        ],
        text: "Ah, good evening, good evening. Mind the puddle. Mind all the puddles, really; I am afraid it is largely puddle down here.",
        variants: [
          {
            requiresItem: "wardens_lantern",
            text: "Oh - you have her. The Lantern. Hold it up a moment, would you? ... Ah. I have not seen my own hands in two hundred years. They are much as I remember. Ink on the second finger. Some things are eternal.",
          },
        ],
        choices: [
          {
            text: "How do I open the floodgates?",
            tone: "curious",
            requiresStage: { quest: "the_undercroft", stage: "floodgate" },
            next: "gates",
          },
          {
            text: "Is there anything I can do for you?",
            tone: "kind",
            requiresItem: "wardens_lantern",
            requiresNotQuest: "hollis_rest",
            next: "rest_ask",
          },
          {
            text: "I'll read you your name now.",
            tone: "kind",
            requiresActiveQuest: "hollis_rest",
            requiresItem: "wardens_lantern",
            next: "rest1",
          },
          { text: "Tell me about the Undercroft.", tone: "curious", next: "t_under" },
          { text: "Have you seen the boy with the splinters?", requiresFlag: "vale_glimpsed", next: "t_vale" },
          { text: "Goodbye, Brother.", next: "stays3" },
        ],
      },

      first: {
        text: "Oh! Oh, goodness. A living person. On the stair. With a lamp. I do apologise - I was singing - I had no idea anybody could hear. I have been singing for two hundred years and nobody has ever once complained.",
        choices: [
          { text: "Who are you?", tone: "curious", next: "first_who" },
          { text: "It was lovely singing.", tone: "kind", affinity: 3, next: "first_kind" },
          { text: "You're a ghost.", tone: "honest", next: "first_ghost" },
        ],
      },
      first_kind: {
        text: "It was not. It was the same four notes of the evening office, badly, because I only ever knew the first four. But thank you. It has been a very long time since anybody was polite to me who was not a fish.",
        next: "first_who",
      },
      first_ghost: {
        text: "Am I? ... Yes, I suppose I am. One rather stops noticing. I had assumed I was merely very damp. Brother Hollis, archivist, at your service, and very much at the service of anyone with dry socks.",
        next: "first_who",
      },
      first_who: {
        text: "Hollis. Archivist of the Undercroft, which is to say the last one, which is to say the one who flooded it. I closed the gates behind Headmaster Pell and opened the river-sluice in front, and sat down to wait for the water. It took longer than I expected. Most things do.",
        onEnter: { setFlag: "met_hollis", lore: "corrigan_pell" },
        choices: [
          { text: "Why?", tone: "curious", next: "first_why" },
          { text: "You drowned yourself to stop him?", tone: "sad", affinity: 2, next: "first_why" },
        ],
      },
      first_why: {
        text: "He wanted the Warden's Lantern. He wanted to see the edges of the world and sell the maps. And she is not for that. So I made sure nobody could reach her who did not know the way, and I am the only one who knows the way, and - well. Here we are. You must be the one the Lamp sent.",
        choices: [
          { text: "How do I reach her?", tone: "brave", next: "gates" },
          { text: "The Lamp?", tone: "curious", next: "first_lamp" },
        ],
      },
      first_lamp: {
        text: "Who else would send a child down a drowned stair with nothing but a candle and a good heart? She does it every few centuries. She is never wrong about the heart. She is frequently wrong about the candle.",
        next: "gates",
      },
      gates: {
        text: "The floodgates. I closed them in a hurry and you will have to open them with care. The water must be given somewhere to go before it is asked to leave - so the gates nearest the river last, and the little ones by the stair first. Turn the wheels; listen for the water. When it sings back to you, it is going the right way.",
        choices: [
          { text: "Anything else I should know?", tone: "curious", next: "gates2" },
          { text: "Thank you, Brother.", tone: "kind", affinity: 1 },
        ],
      },
      gates2: {
        text: "There are things down here that were set to guard the Warden, and they have had two hundred years to forget why. Be firm with them. And the Keepers left pages hidden, I believe - Fennick's predecessor's predecessor was always looking. Look high, and behind, and under.",
      },

      // --- release

      rest_ask: {
        text: "For me? ... Nobody has asked me that since I was alive, and then it was only ever 'is there anything you can do for me, Brother, about this overdue fine'. ... There is one thing. It is silly.",
        choices: [
          { text: "Tell me.", tone: "kind", affinity: 2, next: "rest_ask2" },
        ],
      },
      rest_ask2: {
        text: "My name is written on the wall of the Warden's chamber, with the other archivists. In the Lantern's light you could read it. I would like - I would like somebody to read it to me, aloud, once. I have forgotten how it sounds in a voice that is not my own.",
        choices: [
          { text: "I'll do it now.", tone: "kind", startQuest: "hollis_rest", next: "rest1" },
          { text: "I will. Soon.", startQuest: "hollis_rest" },
        ],
      },
      rest1: {
        text: "Hold the Lantern up. There - the third line from the bottom, in the small square hand. That is mine. I always wrote too small. My abbot said it was false modesty. It was poor eyesight.",
        choices: [{ text: "'Hollis Wenlow, archivist. He kept the records, and the records kept him.'", tone: "kind", next: "rest2" }],
      },
      rest2: {
        text: "...Wenlow. Yes. Hollis Wenlow. I had quite lost the Wenlow. ... Thank you. Oh, thank you. I feel - lighter. Not drier, sadly, but lighter. As though somebody had finally signed for me.",
        choices: [
          { text: "You can rest now, Brother. You've done enough.", tone: "kind", affinity: 4, next: "rest_go" },
          { text: "Stay, if you'd like. The Academy could use an archivist.", tone: "honest", affinity: 3, next: "rest_stay" },
        ],
      },
      rest_go: {
        text: "I think I can, yes. I think I have been waiting for permission, which is very like me. ... Let me teach you something first, so I go out owing nothing. The archivists' hush - the word we used to quiet the reading room. Wraiths hate it. So did the novices.",
        choices: [
          {
            text: "Goodbye, Brother Hollis.",
            tone: "kind",
            setFlag: "hollis_released",
            completeQuest: "hollis_rest",
            next: "rest_go2",
          },
        ],
      },
      rest_go2: {
        text: "Goodbye, Wren. Tell Fennick that his predecessor owed me four shillings, and that I forgive the debt. And mind the last step.",
      },
      rest_stay: {
        text: "Stay? With the Library above, and people, and ink? ... I should like that very much. Somebody ought to catalogue what the water left. Here - the archivists' hush, so you go out with something. Wraiths hate it. So did the novices.",
        choices: [
          {
            text: "Welcome back, Brother.",
            tone: "kind",
            setFlag: "hollis_stays",
            completeQuest: "hollis_rest",
          },
        ],
      },
      stays: {
        text: "Ah, Wren! Look - I have begun a catalogue. Volume one: things the water left. It is mostly shoes. Several of them are mine. I have asked Master Fennick for ink and he has sent me some, with a note about the fines.",
        choices: [
          { text: "How are you settling in?", tone: "kind", next: "stays2" },
          { text: "Goodbye, Brother.", next: "stays3" },
        ],
      },
      stays2: {
        text: "Splendidly. The students come down on dares and I tell them about the evening office. Half of them run. The other half stay and help me sort shoes. I find the second half very promising.",
      },
      stays3: { text: "Mind the last step!" },

      // ---------------------------------------------------------- talk

      t_under: {
        text: "Four centuries of the Keepers' records, kept dry and in order, down here under the hall. Every watch, every relief, every name. Then Pell. Then the water. The records are mostly soup now, I am sorry to say. But the walls remember. The walls are written on, if you have the light.",
        choices: [
          { text: "And Headmaster Pell?", tone: "curious", next: "t_pell" },
          { text: "Thank you.", next: "start" },
        ],
      },
      t_pell: {
        text: "Corrigan Pell. A handsome man with a beautiful voice and a ledger where his heart should have been. He wanted to sell the edges of the world to the lowland crowns, and he very nearly could have. His portrait faces the wall upstairs, I am told. I like to think the wall is enduring it bravely.",
        onEnter: { lore: "corrigan_pell" },
        next: "start",
      },
      t_vale: {
        text: "The thin boy in the thin coat. Three times this season. He takes the splinters from the wall-niches - the Keepers left them there, as markers, as you might leave a candle in a window. He never says good evening. Once he stood in front of the Warden's name and cried. I did not interrupt. It seemed private.",
        next: "start",
      },
    },
  },
};
