import type { Conditions } from "../conditions";
import type { Effects } from "../effects";

/**
 * The register a choice is spoken in. Purely descriptive for now - the UI may
 * colour or label choices by tone - but it also keeps the writing honest: a
 * node whose choices are all "kind" is a node with no choice in it.
 */
export type Tone = "kind" | "sharp" | "curious" | "brave" | "funny" | "honest" | "sad";

/**
 * A choice is an `Effects` block plus the bits that only make sense in
 * conversation: what it says, where it goes, and what must be true for it to
 * appear at all.
 */
export interface DialogueChoice extends Effects, Conditions {
  text: string;
  /** Node to move to. Omitted ends the conversation. */
  next?: string;
  /** Change towards the speaker. Applied by the dialogue system, which knows who that is. */
  affinity?: number;
  /** Disappears once taken - questions you only need to ask once. */
  once?: boolean;
  tone?: Tone;
}

/** Alternative wording for a node, used when its conditions hold. The first match wins. */
export interface DialogueVariant extends Conditions {
  text: string;
  /** Overrides who is speaking for this variant. */
  speaker?: string;
}

/** A node that forwards elsewhere when its conditions hold, before anything is shown. */
export interface DialogueRedirect extends Conditions {
  next: string;
}

export interface DialogueNode {
  text: string;
  /**
   * Who says this line, when it is not the person you walked up to - the
   * Headmistress interrupting the Lamp, an owl being narrated.
   */
  speaker?: string;
  variants?: DialogueVariant[];
  /** Checked on arrival, in order; the first that holds sends the player on. */
  redirect?: DialogueRedirect[];
  /** Applied once each time the node is entered. */
  onEnter?: Effects;
  choices?: DialogueChoice[];
  /** Followed automatically when there are no choices to take. */
  next?: string;
}

export interface DialogueTree {
  id: string;
  start: string;
  nodes: Record<string, DialogueNode>;
}
