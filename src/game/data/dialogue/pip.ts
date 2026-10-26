import type { DialogueTree } from "./types";

/**
 * Pip, Amelia's owl. Does not talk, so every node is narration; the comedy is
 * entirely in the owl's opinion of you, which is low and occasionally revised.
 */
const PIP = "Pip";

export const PIP_DIALOGUES: Record<string, DialogueTree> = {
  pip_lost: {
    id: "pip_lost",
    start: "start",
    nodes: {
      start: {
        speaker: PIP,
        text: "An owl the colour of a dusty biscuit regards you from a low branch with enormous, tragic eyes. It has a feather in its beak. It is quite clearly its own feather.",
        variants: [
          {
            requiresStage: { quest: "missing_owl", stage: ["search", "feathers"] },
            text: "An owl the colour of a dusty biscuit regards you from a low branch. It looks pointedly at the feathers scattered on the ground around the camp, then back at you, as if to say: those are evidence, and you have not collected them.",
          },
        ],
        choices: [
          { text: "Pip? Amelia's worried sick about you.", tone: "kind", next: "worried" },
          { text: "Hoot at her.", tone: "funny", next: "hoot" },
          { text: "Offer her one of the feathers.", tone: "kind", requiresItem: "quillfeather", next: "feather" },
          {
            text: "Go home, Pip.",
            requiresStage: { quest: "missing_owl", stage: "return" },
            setFlag: "pip_found",
            next: "home",
          },
          { text: "Leave her be for now.", next: "leave" },
        ],
      },
      worried: {
        speaker: PIP,
        text: "Pip hoots, very quietly - the hoot of an owl who knows exactly how worried Amelia is, has been listening to it for three days from fifteen feet away, and has found it very gratifying.",
        next: "start",
      },
      hoot: {
        speaker: PIP,
        text: "You hoot. Pip hoots back, a tone lower, correcting your pronunciation. You try again. Pip closes her eyes slowly, which in owl is roughly the same as a long-suffering sigh.",
        next: "start",
      },
      feather: {
        speaker: PIP,
        text: "Pip accepts the feather, inspects it with great care, and tucks it back into her own wing in the correct place, as if you had been returning something she had lent you. You have the strong impression of having passed a test.",
        next: "start",
      },
      home: {
        speaker: PIP,
        text: "Pip launches herself off the branch, circles you once - close enough to ruffle your hair, purely to make a point - and flies south towards the Academy with tremendous dignity and no hurry whatsoever.",
      },
      leave: {
        speaker: PIP,
        text: "Pip watches you go with the air of someone who will be here when you have finished being silly.",
      },
    },
  },

  pip_home: {
    id: "pip_home",
    start: "start",
    nodes: {
      start: {
        speaker: PIP,
        text: "Pip is perched on a fence post near Amelia, looking at you in a way that suggests you owe her something, possibly a mouse.",
        variants: [
          {
            requiresFlag: "game_complete",
            text: "Pip is asleep on the fence post with her head turned entirely backwards. When you approach, one eye opens, considers you, and closes again. It is, you feel, the warmest welcome she has ever given anyone.",
          },
          {
            requiresActiveQuest: "corvins_folly",
            text: "Pip is pacing up and down the fence post, which owls are not built for. She keeps looking towards the treeline. Even the owl is worried about Corvin.",
          },
          {
            requiresFlag: "relics_gathered",
            text: "Pip lands on your shoulder without being asked, digs her claws in exactly as hard as is necessary, and stays there for a full minute. Then she leaves. You think that may have been goodbye.",
          },
        ],
        choices: [
          { text: "Scratch her head.", tone: "kind", next: "scratch" },
          { text: "Ask her where she's been.", tone: "funny", next: "where" },
          { text: "Leave her to it.", next: "end" },
        ],
      },
      scratch: {
        speaker: PIP,
        text: "Pip permits it. For exactly three seconds. Then she bites you, gently, on the knuckle, to establish that it was permitted rather than enjoyed.",
      },
      where: {
        speaker: PIP,
        text: "Pip looks at you for a very long time. Then she turns her head all the way round and looks at the treeline. Then back. You have been told, comprehensively, that it is none of your business.",
      },
      end: {
        speaker: PIP,
        text: "Pip ruffles her feathers and goes back to looking disappointed at the middle distance, which is her preferred occupation.",
      },
    },
  },
};
