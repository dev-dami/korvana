import { ALDEN_DIALOGUES } from "./dialogue/alden";
import { CIVILIAN_DIALOGUES } from "./dialogue/civilians";
import { AMELIA_DIALOGUES } from "./dialogue/amelia";
import { CORVIN_DIALOGUES } from "./dialogue/corvin";
import { FENNICK_DIALOGUES } from "./dialogue/fennick";
import { HOLLIS_DIALOGUES } from "./dialogue/hollis";
import { ILSE_DIALOGUES } from "./dialogue/ilse";
import { LAMP_DIALOGUES } from "./dialogue/lamp";
import { PIP_DIALOGUES } from "./dialogue/pip";
import { SEREN_DIALOGUES } from "./dialogue/seren";
import type { DialogueTree } from "./dialogue/types";
import { VALE_DIALOGUES } from "./dialogue/vale";
import { VEY_DIALOGUES } from "./dialogue/vey";
import { WICK_DIALOGUES } from "./dialogue/wick";

export type {
  DialogueChoice,
  DialogueNode,
  DialogueRedirect,
  DialogueTree,
  DialogueVariant,
  Tone,
} from "./dialogue/types";

/**
 * Dialogue is data.
 *
 * Each character's trees live in their own file under `dialogue/`, written in
 * that character's voice. A tree's opening node is a switchboard: redirects
 * send the player straight to the scene the story is at, variants re-word the
 * greeting for their House or their progress, and the choices carry the
 * conditions - so "have you done the thing I asked" is a `requiresStage` on
 * one line rather than a chain of checks in code. The story can therefore be
 * re-sequenced entirely from data.
 */
export const DIALOGUES: Record<string, DialogueTree> = {
  ...VEY_DIALOGUES,
  ...LAMP_DIALOGUES,
  ...ALDEN_DIALOGUES,
  ...WICK_DIALOGUES,
  ...FENNICK_DIALOGUES,
  ...AMELIA_DIALOGUES,
  ...CORVIN_DIALOGUES,
  ...PIP_DIALOGUES,
  ...HOLLIS_DIALOGUES,
  ...SEREN_DIALOGUES,
  ...ILSE_DIALOGUES,
  ...VALE_DIALOGUES,
  ...CIVILIAN_DIALOGUES,
};

export function dialogueById(id: string): DialogueTree | undefined {
  return DIALOGUES[id];
}
