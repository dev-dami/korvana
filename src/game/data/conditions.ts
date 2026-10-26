import type { HouseId } from "../state/GameState";

/**
 * "What must be true" - one vocabulary shared by dialogue choices, dialogue
 * node variants and redirects, and individual cutscene lines.
 *
 * Every field is optional and every field present must hold. Keeping this in
 * one interface means a line of an ending cutscene and a line of dialogue can
 * both say "only if Seren is your ally and you listened to Vale", and the two
 * are guaranteed to mean the same thing.
 */
export interface Conditions {
  /** Every listed flag must be set. */
  requiresFlag?: string | string[];
  /** None of the listed flags may be set. */
  requiresNotFlag?: string | string[];
  /** At least one of the listed flags must be set. */
  requiresAnyFlag?: string[];

  /** Visible only once this quest has been started. */
  requiresQuest?: string;
  /** Visible only while this quest is running - i.e. "go and report back". */
  requiresActiveQuest?: string;
  /** Visible only once this quest (or every listed quest) is finished. */
  requiresCompleteQuest?: string | string[];
  /** Hidden once this quest is finished. */
  requiresNotCompleteQuest?: string;
  /** Visible only before this quest has been started - used for offers. */
  requiresNotQuest?: string;
  /** The named quest is running and its current stage has this id. */
  requiresStage?: { quest: string; stage: string | string[] };

  /** The player carries every listed item. */
  requiresItem?: string | string[];
  /** The player carries none of the listed items. */
  requiresNotItem?: string | string[];
  /** The player carries at least `min` of an item. */
  requiresItemCount?: { id: string; min: number };

  /**
   * Relationship with an NPC lies inside [min, max]. `npc` defaults to whoever
   * the player is talking to, so a tree can say "only if you like me" without
   * naming itself.
   */
  requiresAffinity?: { npc?: string; min?: number; max?: number };

  /** The player belongs to this House (or one of these Houses). */
  requiresHouse?: HouseId | HouseId[];
}

/** Keys of `Conditions`, for tooling that wants to strip them off an object. */
export const CONDITION_KEYS: ReadonlyArray<keyof Conditions> = [
  "requiresFlag",
  "requiresNotFlag",
  "requiresAnyFlag",
  "requiresQuest",
  "requiresActiveQuest",
  "requiresCompleteQuest",
  "requiresNotCompleteQuest",
  "requiresNotQuest",
  "requiresStage",
  "requiresItem",
  "requiresNotItem",
  "requiresItemCount",
  "requiresAffinity",
  "requiresHouse",
];
