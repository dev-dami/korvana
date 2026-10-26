import { QUESTS } from "../data/quests";
import type { Effects } from "../data/effects";
import { ITEMS } from "../data/items";
import { SPELLS } from "../data/spells";
import type { QuestDef, QuestStage } from "../data/quests";
import type { GameState } from "../state/GameState";
import type { GameEvent } from "./GameEvents";
import type { InventorySystem } from "./InventorySystem";

export interface AdvanceResult {
  stageChanged: boolean;
  completed: boolean;
  /** Human-readable reward summary, present only when the quest just finished. */
  reward?: string;
  /** The stage now current, if the quest is still running. Its onEnter is the caller's to apply. */
  stage?: QuestStage;
  /**
   * The finished stage's `onProgress` entries for every step just crossed,
   * in order. The caller applies them, exactly like `stage.onEnter`.
   */
  progressEffects?: Effects[];
}

export interface RecordedAdvance {
  questId: string;
  result: AdvanceResult;
}

/**
 * The quest state machine.
 *
 * It knows how to move a quest forward and what to hand over when one finishes;
 * it does not know about cutscenes, toasts or scenes. Anything a stage wants to
 * *do* is returned as data (`stage.onEnter`) or applied by the StoryDirector,
 * which keeps this testable without a renderer.
 */
export class QuestSystem {
  private readonly state: GameState;
  private readonly inventory: InventorySystem;

  constructor(state: GameState, inventory: InventorySystem) {
    this.state = state;
    this.inventory = inventory;
  }

  start(id: string): boolean {
    const def = QUESTS[id];
    if (!def || this.state.quest(id)) return false;
    this.state.data.quests[id] = { id, stageIndex: 0, progress: 0, complete: false };
    return true;
  }

  isActive(id: string): boolean {
    const q = this.state.quest(id);
    return !!q && !q.complete;
  }

  isComplete(id: string): boolean {
    return this.state.quest(id)?.complete === true;
  }

  has(id: string): boolean {
    return !!this.state.quest(id);
  }

  currentStage(id: string): QuestStage | null {
    const def = QUESTS[id];
    const q = this.state.quest(id);
    if (!def || !q || q.complete) return null;
    return def.stages[q.stageIndex] ?? null;
  }

  /** Pushes a quest forward, granting rewards when it finishes. */
  advance(id: string, count = 1): AdvanceResult {
    const def = QUESTS[id];
    const q = this.state.quest(id);
    if (!def || !q || q.complete) return { stageChanged: false, completed: false };

    const stage = def.stages[q.stageIndex];
    if (!stage) return { stageChanged: false, completed: false };

    const before = q.progress;
    q.progress = Math.min(stage.count, q.progress + count);

    // Steps crossed on the way, for stages that mark each one ("the third
    // Keeper page"). Collected before the stage rolls over and resets.
    let progressEffects: Effects[] | undefined;
    if (stage.onProgress) {
      progressEffects = [];
      for (let step = before + 1; step <= q.progress; step++) {
        const effect = stage.onProgress[step - 1];
        if (effect) progressEffects.push(effect);
      }
    }

    if (q.progress < stage.count) return { stageChanged: false, completed: false, progressEffects };

    q.stageIndex++;
    q.progress = 0;

    if (q.stageIndex >= def.stages.length) {
      q.complete = true;
      return { stageChanged: true, completed: true, reward: this.grantRewards(def), progressEffects };
    }
    return { stageChanged: true, completed: false, stage: def.stages[q.stageIndex], progressEffects };
  }

  /** Marks the current objective done regardless of its count. */
  completeStage(id: string): AdvanceResult {
    const stage = this.currentStage(id);
    if (!stage) return { stageChanged: false, completed: false };
    return this.advance(id, stage.count);
  }

  /**
   * Feeds a game event to every running quest, advancing any whose current
   * stage declares it as its trigger.
   *
   * This is the whole reason WorldScene does not contain a branch per quest:
   * it reports what happened, and the trigger table in data/quests.ts decides
   * what that means.
   */
  record(event: GameEvent): RecordedAdvance[] {
    const changes: RecordedAdvance[] = [];

    for (const [id, quest] of Object.entries(this.state.data.quests)) {
      if (quest.complete) continue;
      const def = QUESTS[id];
      const stage = def?.stages[quest.stageIndex];
      if (!def || !stage?.trigger) continue;

      const trigger = stage.trigger;
      if (trigger.kind !== event.kind) continue;
      if (trigger.id !== undefined && trigger.id !== event.id) continue;
      if (trigger.ids !== undefined && (event.id === undefined || !trigger.ids.includes(event.id))) {
        continue;
      }

      const result = this.advance(id, event.amount ?? trigger.amount ?? 1);
      if (result.stageChanged || result.progressEffects?.length) changes.push({ questId: id, result });
    }

    return changes;
  }

  def(id: string): QuestDef | undefined {
    return QUESTS[id];
  }

  /** Every quest the player has started and not finished, with its current objective. */
  activeQuests(): Array<{ def: QuestDef; stage: QuestStage; progress: number }> {
    const out: Array<{ def: QuestDef; stage: QuestStage; progress: number }> = [];
    for (const [id, quest] of Object.entries(this.state.data.quests)) {
      if (quest.complete) continue;
      const def = QUESTS[id];
      const stage = def?.stages[quest.stageIndex];
      if (def && stage) out.push({ def, stage, progress: quest.progress });
    }
    return out.sort((a, b) => a.def.act - b.def.act);
  }

  /** Completed quests, newest chapter last. */
  completedQuests(): QuestDef[] {
    const out: QuestDef[] = [];
    for (const [id, quest] of Object.entries(this.state.data.quests)) {
      if (!quest.complete) continue;
      const def = QUESTS[id];
      if (def) out.push(def);
    }
    return out.sort((a, b) => a.act - b.act);
  }

  private grantRewards(def: QuestDef): string {
    this.state.player.gold += def.rewardGold;
    for (const item of def.rewardItems) this.inventory.add(item);
    if (def.rewardSpell) this.state.learnSpell(def.rewardSpell);

    const bits: string[] = [];
    if (def.rewardGold) bits.push(`+${def.rewardGold}g`);
    if (def.rewardItems.length) bits.push(def.rewardItems.map((id) => ITEMS[id]?.name ?? id).join(", "));
    if (def.rewardSpell) bits.push(`spell: ${SPELLS[def.rewardSpell]?.name ?? def.rewardSpell}`);
    return bits.length ? `${def.name} complete (${bits.join(" | ")})` : `${def.name} complete`;
  }
}
