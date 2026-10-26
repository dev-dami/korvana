import type { Conditions } from "../data/conditions";
import type { GameState } from "../state/GameState";
import type { QuestSystem } from "./QuestSystem";

function list<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * Evaluates a `Conditions` block against the save.
 *
 * Read-only by construction: it holds the state and the quest machine but
 * never writes to either, so asking "would this line show?" is always safe,
 * even from a renderer polling every frame.
 */
export class ConditionChecker {
  private readonly state: GameState;
  private readonly quests: QuestSystem;

  constructor(state: GameState, quests: QuestSystem) {
    this.state = state;
    this.quests = quests;
  }

  /** True when every condition present holds. `speaker` resolves npc-less affinity checks. */
  check(c: Conditions | undefined, speaker = ""): boolean {
    if (!c) return true;
    const state = this.state;
    const quests = this.quests;

    for (const flag of list(c.requiresFlag)) if (!state.flag(flag)) return false;
    for (const flag of list(c.requiresNotFlag)) if (state.flag(flag)) return false;
    if (c.requiresAnyFlag && c.requiresAnyFlag.length > 0) {
      if (!c.requiresAnyFlag.some((flag) => state.flag(flag))) return false;
    }

    if (c.requiresQuest && !quests.has(c.requiresQuest)) return false;
    if (c.requiresActiveQuest && !quests.isActive(c.requiresActiveQuest)) return false;
    for (const id of list(c.requiresCompleteQuest)) if (!quests.isComplete(id)) return false;
    if (c.requiresNotCompleteQuest && quests.isComplete(c.requiresNotCompleteQuest)) return false;
    if (c.requiresNotQuest && quests.has(c.requiresNotQuest)) return false;
    if (c.requiresStage) {
      const stage = quests.currentStage(c.requiresStage.quest);
      if (!stage || !list(c.requiresStage.stage).includes(stage.id)) return false;
    }

    for (const id of list(c.requiresItem)) if (this.count(id) <= 0) return false;
    for (const id of list(c.requiresNotItem)) if (this.count(id) > 0) return false;
    if (c.requiresItemCount && this.count(c.requiresItemCount.id) < c.requiresItemCount.min) {
      return false;
    }

    if (c.requiresAffinity) {
      const npc = c.requiresAffinity.npc ?? speaker;
      const value = state.relationship(npc);
      if (c.requiresAffinity.min !== undefined && value < c.requiresAffinity.min) return false;
      if (c.requiresAffinity.max !== undefined && value > c.requiresAffinity.max) return false;
    }

    if (c.requiresHouse !== undefined) {
      const house = state.house;
      if (!house || !list(c.requiresHouse).includes(house)) return false;
    }

    return true;
  }

  private count(id: string): number {
    return this.state.player.inventory.find((entry) => entry.id === id)?.qty ?? 0;
  }
}
