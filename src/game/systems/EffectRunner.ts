import { resolveCutscene } from "../data/cutscenes";
import { ITEMS } from "../data/items";
import { npcById } from "../data/npcs";
import { SPELLS } from "../data/spells";
import { WEAPONS } from "../data/weapons";
import type { Effects } from "../data/effects";
import { landmarkById } from "../data/landmarks";
import { loreById } from "../data/lore";
import { HOUSE_IDS } from "../state/GameState";
import type { GameState, HouseId } from "../state/GameState";
import { TILE } from "../config";
import { ConditionChecker } from "./ConditionChecker";
import type { GameEvents } from "./GameEvents";
import type { InventorySystem } from "./InventorySystem";
import type { AdvanceResult, QuestSystem } from "./QuestSystem";

/** Where the Choosing Lamp keeps its running tally, inside the relationship table. */
export const HOUSE_TALLY_PREFIX = "house_tally_";
/** The most recent House an answer leaned towards, stored as its HOUSE_IDS index. */
const HOUSE_TALLY_LAST = "house_tally_last";

/**
 * Somewhere for the story layer to put things the scene has to do.
 *
 * Effects can ask for a cutscene, a battle or a toast, but none of them know
 * about Phaser. They drop a request in here; WorldScene drains it once a frame
 * and turns the requests into scenes and text. That is what keeps data files
 * free of rendering concerns.
 */
export interface StoryOutbox {
  messages: string[];
  cutscenes: string[];
  battle: string | null;
  checkpoint: string | null;
}

export function createOutbox(): StoryOutbox {
  return { messages: [], cutscenes: [], battle: null, checkpoint: null };
}

export function clearOutbox(outbox: StoryOutbox): void {
  outbox.messages.length = 0;
  outbox.cutscenes.length = 0;
  outbox.battle = null;
  outbox.checkpoint = null;
}

export function isEmptyOutbox(outbox: StoryOutbox): boolean {
  return (
    outbox.messages.length === 0 &&
    outbox.cutscenes.length === 0 &&
    outbox.battle === null &&
    outbox.checkpoint === null
  );
}

/**
 * Applies an `Effects` block.
 *
 * Every mutation the story can perform goes through here, which is the point:
 * there is one place to read to know what a piece of content is allowed to do,
 * and adding a reward to a quest is a data edit rather than a new branch
 * somewhere in a scene.
 */
export class EffectRunner {
  private readonly state: GameState;
  private readonly quests: QuestSystem;
  private readonly inventory: InventorySystem;
  private readonly events: GameEvents;
  /** Guards against a quest chain that loops back on itself. */
  private depth = 0;
  /** Shared with dialogue, so a cutscene line and a dialogue choice agree on what a condition means. */
  readonly conditions: ConditionChecker;

  constructor(
    state: GameState,
    quests: QuestSystem,
    inventory: InventorySystem,
    events: GameEvents,
  ) {
    this.state = state;
    this.quests = quests;
    this.inventory = inventory;
    this.events = events;
    this.conditions = new ConditionChecker(state, quests);
  }

  /**
   * Applies the story consequences of a quest moving forward: any per-step
   * effects, the entered stage's `onEnter`, and the quest's `onComplete` if it
   * just finished.
   *
   * Both paths that advance a quest - a game event reaching the StoryDirector,
   * and a dialogue choice calling `advanceQuest` - must come through here.
   * They did not, which meant handing in a quest by talking to someone skipped
   * its completion effects entirely.
   */
  applyQuestProgress(questId: string, result: AdvanceResult, outbox: StoryOutbox): void {
    // Per-step effects first (the fourth Keeper page unlocks the fourth
    // journal entry), then whatever the next stage or completion brings.
    for (const step of result.progressEffects ?? []) this.run(step, outbox);
    if (result.stage?.onEnter) this.run(result.stage.onEnter, outbox);

    if (result.completed) {
      const def = this.quests.def(questId);
      if (def?.onComplete) this.run(def.onComplete, outbox);
      this.events.emit({ kind: "quest_completed", id: questId });
    }
  }

  run(effects: Effects | undefined, outbox: StoryOutbox): void {
    if (!effects) return;
    if (this.depth > 16) {
      console.warn("EffectRunner: effect chain exceeded 16 steps and was truncated.");
      return;
    }
    this.depth++;
    try {
      this.apply(effects, outbox);
    } finally {
      this.depth--;
    }
  }

  private apply(effects: Effects, outbox: StoryOutbox): void {
    // Facts first. A choice that both sets a flag and moves a quest on must
    // have the flag in place before the next stage's cutscene decides which of
    // its lines to show.
    if (effects.setFlag) this.state.setFlag(effects.setFlag);
    if (effects.clearFlag) this.state.setFlag(effects.clearFlag, false);
    for (const flag of effects.setFlags ?? []) this.state.setFlag(flag);
    for (const flag of effects.clearFlags ?? []) this.state.setFlag(flag, false);
    if (effects.houseWeight) this.weighHouses(effects.houseWeight);
    if (effects.resolveHouse) this.resolveHouse();
    if (effects.setHouse) this.setHouse(effects.setHouse);
    if (effects.affinityWith) {
      for (const [npc, delta] of Object.entries(effects.affinityWith)) {
        if (!delta) continue;
        this.state.adjustRelationship(npc, delta);
        const name = npcById(npc)?.name ?? npc;
        outbox.messages.push(`${delta > 0 ? "+" : ""}${delta} with ${name}`);
      }
    }

    if (effects.startQuest && this.quests.start(effects.startQuest)) {
      const def = this.quests.def(effects.startQuest);
      outbox.messages.push(`Quest started: ${def?.name ?? effects.startQuest}`);
      this.events.emit({ kind: "quest_started", id: effects.startQuest });
      // The opening stage's onEnter counts too: act transitions and the lore
      // that goes with them are authored there, and starting a quest does not
      // go through advance().
      const entry = def?.stages[0];
      if (entry?.onEnter) this.run(entry.onEnter, outbox);
    }

    if (effects.advanceQuest) {
      const result = this.quests.advance(effects.advanceQuest, effects.amount ?? 1);
      if (result.reward) outbox.messages.push(result.reward);
      else if (result.stageChanged) outbox.messages.push("Quest updated.");
      this.applyQuestProgress(effects.advanceQuest, result, outbox);
    }

    if (effects.completeStage) {
      const result = this.quests.completeStage(effects.completeStage);
      if (result.reward) outbox.messages.push(result.reward);
      this.applyQuestProgress(effects.completeStage, result, outbox);
    }

    if (effects.completeQuest) this.finishQuest(effects.completeQuest, outbox);

    if (effects.giveItem) {
      const qty = effects.giveItemQty ?? 1;
      if (this.inventory.add(effects.giveItem, qty)) {
        const def = ITEMS[effects.giveItem];
        outbox.messages.push(`Received ${def?.name ?? effects.giveItem}${qty > 1 ? ` x${qty}` : ""}.`);
        this.events.emit({ kind: "item_gained", id: effects.giveItem, amount: qty });
      }
    }

    if (effects.takeItem) {
      const qty = effects.takeItemQty ?? 1;
      if (this.inventory.remove(effects.takeItem, qty)) {
        const def = ITEMS[effects.takeItem];
        outbox.messages.push(`Handed over ${def?.name ?? effects.takeItem}${qty > 1 ? ` x${qty}` : ""}.`);
      }
    }

    for (const id of effects.giveItems ?? []) this.giveOne(id, outbox);
    for (const id of effects.takeItems ?? []) {
      if (this.inventory.remove(id, 1)) outbox.messages.push(`Handed over ${ITEMS[id]?.name ?? id}.`);
    }

    if (effects.restore) {
      this.state.player.health = this.state.player.maxHealth;
      this.state.player.mana = this.state.player.maxMana;
    }

    if (effects.gold) {
      this.state.player.gold = Math.max(0, this.state.player.gold + effects.gold);
      outbox.messages.push(effects.gold > 0 ? `+${effects.gold} gold.` : `${effects.gold} gold.`);
      if (effects.gold > 0) this.events.emit({ kind: "gold_gained", amount: effects.gold });
    }

    if (effects.learnSpell && this.state.learnSpell(effects.learnSpell)) {
      const spell = SPELLS[effects.learnSpell];
      outbox.messages.push(`Learned ${spell?.name ?? effects.learnSpell}.`);
    }

    if (effects.equipWeapon && WEAPONS[effects.equipWeapon]) {
      this.state.equipWeapon(effects.equipWeapon);
      outbox.messages.push(`Wielding the ${WEAPONS[effects.equipWeapon]?.name}.`);
    }

    if (effects.lore && this.state.unlockLore(effects.lore)) {
      const entry = loreById(effects.lore);
      outbox.messages.push(`Journal: ${entry?.title ?? effects.lore}`);
      this.events.emit({ kind: "lore_found", id: effects.lore });
    }

    if (effects.checkpoint) {
      const landmark = landmarkById(effects.checkpoint);
      if (landmark) {
        // Stand at the landmark's doorway rather than its top-left corner.
        this.state.setCheckpoint(
          (landmark.tx + 1) * TILE,
          (landmark.ty + 2) * TILE,
        );
        this.state.setFlag(`checkpoint_${effects.checkpoint}`);
        outbox.checkpoint = effects.checkpoint;
      }
    }

    if (effects.battle) outbox.battle = effects.battle;
    if (effects.cutscene) {
      // Cutscenes may branch, and their lines may be conditional. Resolve both
      // now, while the facts that chose them are current.
      const id = resolveCutscene(effects.cutscene, (c) => this.conditions.check(c));
      if (id) outbox.cutscenes.push(id);
    }
    if (effects.toast) outbox.messages.push(effects.toast);
  }

  private giveOne(id: string, outbox: StoryOutbox): void {
    if (!this.inventory.add(id, 1)) return;
    outbox.messages.push(`Received ${ITEMS[id]?.name ?? id}.`);
    this.events.emit({ kind: "item_gained", id, amount: 1 });
  }

  /**
   * Runs a quest to its end, so its rewards and completion effects fire. The
   * stages skipped on the way do not get their onEnter: when a choice ends a
   * quest outright, only the ending matters.
   */
  private finishQuest(id: string, outbox: StoryOutbox): void {
    if (!this.quests.has(id) && this.quests.start(id)) {
      this.events.emit({ kind: "quest_started", id });
    }
    for (let guard = 0; guard < 32 && this.quests.isActive(id); guard++) {
      const result = this.quests.completeStage(id);
      if (!result.stageChanged) break;
      if (result.completed) {
        if (result.reward) outbox.messages.push(result.reward);
        this.applyQuestProgress(id, result, outbox);
      }
    }
  }

  private weighHouses(weights: Partial<Record<HouseId, number>>): void {
    for (const house of HOUSE_IDS) {
      const delta = weights[house];
      if (!delta) continue;
      this.state.adjustRelationship(`${HOUSE_TALLY_PREFIX}${house}`, delta);
      if (delta > 0) this.state.data.relationships[HOUSE_TALLY_LAST] = HOUSE_IDS.indexOf(house);
    }
  }

  private resolveHouse(): void {
    let best: HouseId = HOUSE_IDS[this.state.relationship(HOUSE_TALLY_LAST)] ?? HOUSE_IDS[0];
    for (const house of HOUSE_IDS) {
      const score = this.state.relationship(`${HOUSE_TALLY_PREFIX}${house}`);
      if (score > this.state.relationship(`${HOUSE_TALLY_PREFIX}${best}`)) best = house;
    }
    for (const house of HOUSE_IDS) this.state.setFlag(`lamp_suggests_${house}`, house === best);
  }

  private setHouse(house: HouseId): void {
    for (const id of HOUSE_IDS) this.state.setFlag(`house_${id}`, id === house);
    this.state.setFlag("sorted");
  }
}
