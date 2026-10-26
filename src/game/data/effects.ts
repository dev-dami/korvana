/**
 * One vocabulary for "something the story wants to happen".
 *
 * Dialogue choices, quest stages, quest completion and cutscenes all describe
 * themselves with an `Effects` block, and a single runner applies it. Content
 * therefore never needs new code: adding a reward or a flag is a data edit in
 * one file, and there is exactly one place where story data is allowed to
 * mutate the world.
 */
import type { HouseId } from "../state/GameState";

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

  /** Several items at once - "hand over all three overdue books". */
  giveItems?: string[];
  takeItems?: string[];

  setFlag?: string;
  clearFlag?: string;
  setFlags?: string[];
  clearFlags?: string[];

  /**
   * Places the player in a House: sets `sorted` and exactly one `house_<id>`
   * flag, clearing any other. Applied before quest effects, so a quest that
   * completes on the same choice already sees the House.
   */
  setHouse?: HouseId;
  /**
   * Weights the Choosing Lamp's verdict. Each answer in the Choosing nudges one
   * or more Houses; `resolveHouse` reads the tallies back.
   */
  houseWeight?: Partial<Record<HouseId, number>>;
  /**
   * Sets `lamp_suggests_<id>` for the House with the highest tally (ties go to
   * whichever tied House the player leaned towards most recently), clearing the other suggestions.
   */
  resolveHouse?: boolean;

  /**
   * Changes how other characters feel about the player, by npc id. Used when a
   * choice in one conversation would plainly get back to someone else.
   */
  affinityWith?: Record<string, number>;

  /** Restores health and mana to full - a breath before a hard fight. */
  restore?: boolean;

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
