/**
 * One vocabulary for "something the story wants to happen".
 *
 * Dialogue choices, quest stages, quest completion and cutscenes all describe
 * themselves with an `Effects` block, and a single runner applies it. Content
 * therefore never needs new code: adding a reward or a flag is a data edit in
 * one file, and there is exactly one place where story data is allowed to
 * mutate the world.
 */
export interface Effects {
  /** Starts the quest if the player has not begun it. */
  startQuest?: string;
  /** Pushes a quest forward by `amount` (default 1). */
  advanceQuest?: string;
  amount?: number;
  /** Marks the named quest's current objective done regardless of count. */
  completeStage?: string;
  /** Completes the quest outright, granting its rewards. */
  completeQuest?: string;

  giveItem?: string;
  giveItemQty?: number;
  takeItem?: string;
  takeItemQty?: number;
  gold?: number;
  learnSpell?: string;
  equipWeapon?: string;

  setFlag?: string;
  clearFlag?: string;

  /** Records a journal entry, by id from data/lore.ts. */
  lore?: string;

  /** Launches a battle overlay, by id from data/encounters.ts. */
  battle?: string;

  /** Plays a cutscene, by id from data/cutscenes.ts. */
  cutscene?: string;

  /** Moves the player's respawn point to a landmark, by id. */
  checkpoint?: string;

  /** A line to show as a toast, in addition to the standard summaries. */
  toast?: string;
}
