/**
 * Story sanity check. Run with `bun scripts/check-story.ts`.
 *
 * Two halves:
 *
 * 1. Static: every id a quest, dialogue, cutscene, NPC or effect mentions must
 *    resolve - quests, stages, items, spells, lore, encounters, cutscenes,
 *    dialogue nodes, spots, landmarks. Ids the levels workstream owns (relics,
 *    pages, tomb landmarks, spots, puzzles) are taken from docs/DESIGN.md.
 *
 * 2. Dynamic: the real story systems (GameState, QuestSystem, EffectRunner,
 *    DialogueSystem, StoryDirector) are driven headlessly through a complete
 *    playthrough from a new game, once per ending, talking to NPCs by choosing
 *    lines of dialogue and firing the events the world would fire. Any line
 *    that cannot be chosen, NPC who is not standing where the story needs them,
 *    or quest that does not finish in order fails the run.
 *
 * Exit code is non-zero when anything fails.
 */
import { CONDITION_KEYS } from "../src/game/data/conditions";
import type { Conditions } from "../src/game/data/conditions";
import { CUTSCENES } from "../src/game/data/cutscenes";
import { DIALOGUES } from "../src/game/data/dialogues";
import type { DialogueChoice, DialogueTree } from "../src/game/data/dialogues";
import type { Effects } from "../src/game/data/effects";
import { ENCOUNTERS } from "../src/game/data/encounters";
import { ENEMIES } from "../src/game/data/enemies";
import { ITEMS } from "../src/game/data/items";
import { LANDMARKS } from "../src/game/data/landmarks";
import { LORE } from "../src/game/data/lore";
import { NPC_ROSTER } from "../src/game/data/npcs";
import type { NpcDef } from "../src/game/data/npcs";
import { QUESTS } from "../src/game/data/quests";
import { SPELLS } from "../src/game/data/spells";
import { SPOTS } from "../src/game/data/spots";
import { WEAPONS } from "../src/game/data/weapons";
import { GameState, HOUSE_IDS } from "../src/game/state/GameState";
import type { HouseId } from "../src/game/state/GameState";
import { DialogueSystem } from "../src/game/systems/DialogueSystem";
import { createOutbox, EffectRunner } from "../src/game/systems/EffectRunner";
import { GameEvents } from "../src/game/systems/GameEvents";
import type { GameEvent } from "../src/game/systems/GameEvents";
import { InventorySystem } from "../src/game/systems/InventorySystem";
import { QuestSystem } from "../src/game/systems/QuestSystem";
import { StoryDirector } from "../src/game/systems/StoryDirector";

// ------------------------------------------------- ids owned elsewhere

const EXTERNAL_ITEMS = ["wardens_lantern", "ninefold_key", "silent_bell", "keeper_page"];
const EXTERNAL_LANDMARKS = [
  "barrow_entrance",
  "reliquary_entrance",
  "academy_interior",
  "undercroft",
  "thornroot_barrow",
  "skyfall_reliquary",
  "undercroft_heart",
  "barrow_heart",
  "reliquary_heart",
];
const EXTERNAL_SPOTS = [
  "academy_gate",
  "hall_dais",
  "hall_lamp",
  "hall_east",
  "hall_west",
  "library_desk",
  "library_stacks",
  "restricted_shelf",
  "undercroft_ghost",
  "barrow_mouth",
  "barrow_heart_spot",
  "reliquary_steps",
  "reliquary_heart_spot",
];
const PUZZLES = ["undercroft_floodgate", "barrow_roots", "reliquary_bells", "reliquary_escape"];
const BIOMES = ["ocean", "shallows", "beach", "marsh", "meadow", "forest", "highland", "peak", "scar", "crypt"];
/** Flags other systems set, which the story may read without setting. */
/** `duel_won_<npc>` / `duel_lost_<npc>` are set by systems/CivilianSystem.ts after a civilian challenge. */
const EXTERNAL_FLAG_PREFIXES = ["battle_reward_", "said_", "checkpoint_", "lamp_suggests_", "house_", "duel_won_", "duel_lost_"];
/** Shared flags (DESIGN.md §6) the story sets for other workstreams to read. */
const SHARED_FLAGS = [
  "sorted",
  "restricted_pass",
  "undercroft_open",
  "barrow_unsealed",
  "reliquary_unsealed",
  "seren_ally",
  "seren_rival",
  "relics_gathered",
  "vale_heard",
  "act1_complete",
  "act2_started",
  "ilse_done",
  "game_complete",
  "ending_redeemed",
  "ending_defeated",
  "ending_bound",
];
const MAX_CHOICES = 6;

const errors: string[] = [];
const warnings: string[] = [];
const fail = (msg: string) => errors.push(msg);
const warn = (msg: string) => warnings.push(msg);

const has = <T extends object>(table: T, id: string) => Object.prototype.hasOwnProperty.call(table, id);
const itemExists = (id: string) => has(ITEMS, id) || EXTERNAL_ITEMS.includes(id);
const landmarkExists = (id: string) => LANDMARKS.some((l) => l.id === id) || EXTERNAL_LANDMARKS.includes(id);
const npcExists = (id: string) => NPC_ROSTER.some((n) => n.id === id);
const list = <T>(v: T | T[] | undefined): T[] => (v === undefined ? [] : Array.isArray(v) ? v : [v]);

const flagsSet = new Set<string>();
const flagsRead = new Set<string>();
const loreUnlocked = new Set<string>();
const questsStarted = new Set<string>(["the_choosing"]);
const itemsGiven = new Set<string>();
const cutscenesUsed = new Set<string>(["opening"]);

// ======================================================== 1. static

function checkEffects(e: Effects | undefined, where: string): void {
  if (!e) return;
  for (const q of [e.startQuest, e.advanceQuest, e.completeStage, e.completeQuest]) {
    if (q && !has(QUESTS, q)) fail(`${where}: unknown quest "${q}"`);
  }
  if (e.startQuest) questsStarted.add(e.startQuest);
  if (e.completeQuest) questsStarted.add(e.completeQuest);
  for (const id of [e.giveItem, e.takeItem, ...(e.giveItems ?? []), ...(e.takeItems ?? [])]) {
    if (id && !itemExists(id)) fail(`${where}: unknown item "${id}"`);
  }
  for (const id of [e.giveItem, ...(e.giveItems ?? [])]) if (id) itemsGiven.add(id);
  if (e.learnSpell && !has(SPELLS, e.learnSpell)) fail(`${where}: unknown spell "${e.learnSpell}"`);
  if (e.equipWeapon && !has(WEAPONS, e.equipWeapon)) fail(`${where}: unknown weapon "${e.equipWeapon}"`);
  if (e.lore) {
    if (!has(LORE, e.lore)) fail(`${where}: unknown lore "${e.lore}"`);
    loreUnlocked.add(e.lore);
  }
  if (e.battle && !has(ENCOUNTERS, e.battle)) fail(`${where}: unknown encounter "${e.battle}"`);
  if (e.cutscene) {
    if (!has(CUTSCENES, e.cutscene)) fail(`${where}: unknown cutscene "${e.cutscene}"`);
    cutscenesUsed.add(e.cutscene);
  }
  if (e.checkpoint && !landmarkExists(e.checkpoint)) fail(`${where}: unknown checkpoint "${e.checkpoint}"`);
  for (const npc of Object.keys(e.affinityWith ?? {})) {
    if (!npcExists(npc)) fail(`${where}: affinityWith unknown npc "${npc}"`);
  }
  if (e.setHouse && !HOUSE_IDS.includes(e.setHouse)) fail(`${where}: unknown house "${e.setHouse}"`);
  for (const f of [e.setFlag, ...(e.setFlags ?? [])]) if (f) flagsSet.add(f);
  if (e.setHouse) flagsSet.add("sorted");
}

function checkConditions(c: Conditions, where: string): void {
  for (const f of [...list(c.requiresFlag), ...list(c.requiresNotFlag), ...(c.requiresAnyFlag ?? [])]) {
    flagsRead.add(f);
  }
  for (const q of [c.requiresQuest, c.requiresActiveQuest, c.requiresNotCompleteQuest, c.requiresNotQuest, ...list(c.requiresCompleteQuest)]) {
    if (q && !has(QUESTS, q)) fail(`${where}: condition names unknown quest "${q}"`);
  }
  if (c.requiresStage) {
    const quest = QUESTS[c.requiresStage.quest];
    if (!quest) fail(`${where}: requiresStage unknown quest "${c.requiresStage.quest}"`);
    for (const s of list(c.requiresStage.stage)) {
      if (quest && !quest.stages.some((st) => st.id === s)) {
        fail(`${where}: requiresStage "${c.requiresStage.quest}" has no stage "${s}"`);
      }
    }
  }
  for (const id of [...list(c.requiresItem), ...list(c.requiresNotItem), c.requiresItemCount?.id]) {
    if (id && !itemExists(id)) fail(`${where}: condition names unknown item "${id}"`);
  }
  if (c.requiresAffinity?.npc && !npcExists(c.requiresAffinity.npc)) {
    fail(`${where}: requiresAffinity unknown npc "${c.requiresAffinity.npc}"`);
  }
  for (const h of list(c.requiresHouse)) if (!HOUSE_IDS.includes(h)) fail(`${where}: unknown house "${h}"`);
}

/** Could applying these effects queue a cutscene? Follows quest chains conservatively. */
function mayPlayCutscene(e: Effects, seen = new Set<string>()): string | null {
  if (e.cutscene) return e.cutscene;
  const viaQuest = (id: string | undefined, kind: "start" | "advance" | "complete"): string | null => {
    if (!id || seen.has(`${kind}:${id}`)) return null;
    seen.add(`${kind}:${id}`);
    const q = QUESTS[id];
    if (!q) return null;
    if (kind === "start" && q.stages[0]?.onEnter) {
      const hit = mayPlayCutscene(q.stages[0].onEnter, seen);
      if (hit) return hit;
    }
    if (kind === "advance") {
      // Any stage entered by dialogue (its predecessor has no trigger).
      for (let i = 1; i < q.stages.length; i++) {
        if (q.stages[i - 1]!.trigger) continue;
        const onEnter = q.stages[i]!.onEnter;
        const hit = onEnter && mayPlayCutscene(onEnter, seen);
        if (hit) return hit;
      }
      const last = q.stages[q.stages.length - 1];
      if (last && !last.trigger && q.onComplete) return mayPlayCutscene(q.onComplete, seen);
      return null;
    }
    if (kind === "complete" && q.onComplete) return mayPlayCutscene(q.onComplete, seen);
    return null;
  };
  return (
    viaQuest(e.startQuest, "start") ??
    viaQuest(e.advanceQuest, "advance") ??
    viaQuest(e.completeStage, "advance") ??
    viaQuest(e.completeQuest, "complete")
  );
}

function checkDialogue(tree: DialogueTree): void {
  if (!tree.nodes[tree.start]) fail(`dialogue ${tree.id}: start node "${tree.start}" missing`);
  const reachable = new Set<string>();
  const stack = [tree.start];
  while (stack.length) {
    const id = stack.pop()!;
    if (reachable.has(id)) continue;
    reachable.add(id);
    const node = tree.nodes[id];
    if (!node) continue;
    const targets = [node.next, ...(node.redirect ?? []).map((r) => r.next), ...(node.choices ?? []).map((c) => c.next)];
    for (const t of targets) if (t) stack.push(t);
  }

  for (const [nodeId, node] of Object.entries(tree.nodes)) {
    const where = `dialogue ${tree.id}/${nodeId}`;
    if (!reachable.has(nodeId)) warn(`${where}: unreachable node`);
    if (node.next && !tree.nodes[node.next]) fail(`${where}: next "${node.next}" missing`);
    if (node.text.length > 420) warn(`${where}: text is ${node.text.length} chars (may crowd the dialogue box)`);
    for (const r of node.redirect ?? []) {
      if (!tree.nodes[r.next]) fail(`${where}: redirect to missing node "${r.next}"`);
      checkConditions(r, `${where} redirect`);
    }
    for (const v of node.variants ?? []) {
      checkConditions(v, `${where} variant`);
      if (v.text.length > 420) warn(`${where}: variant text is ${v.text.length} chars`);
    }
    checkEffects(node.onEnter, `${where} onEnter`);
    if (node.onEnter && mayPlayCutscene(node.onEnter)) fail(`${where}: onEnter may play a cutscene mid-conversation`);

    const choices = node.choices ?? [];
    if (choices.length > MAX_CHOICES) {
      // Not necessarily wrong - gated choices may be exclusive - but worth a look.
      const ungated = choices.filter((c) => !CONDITION_KEYS.some((k) => c[k] !== undefined) && !c.once).length;
      if (ungated > MAX_CHOICES) fail(`${where}: ${ungated} ungated choices (max ${MAX_CHOICES})`);
      else warn(`${where}: ${choices.length} choices; relies on gating to show at most ${MAX_CHOICES}`);
    }
    choices.forEach((c: DialogueChoice, i) => {
      const cw = `${where} choice ${i} "${c.text.slice(0, 32)}"`;
      if (c.next && !tree.nodes[c.next]) fail(`${cw}: next "${c.next}" missing`);
      checkConditions(c, cw);
      checkEffects(c, cw);
      const cut = mayPlayCutscene(c);
      if (cut && c.next) fail(`${cw}: may play cutscene "${cut}" but continues to "${c.next}"`);
      if (c.battle && c.next) warn(`${cw}: battle choices end the conversation; next is ignored`);
    });
    if (!node.next && choices.length > 0 && choices.every((c) => c.next === nodeId)) {
      fail(`${where}: every choice loops back to itself`);
    }
  }
}

function checkQuests(): void {
  for (const q of Object.values(QUESTS)) {
    const where = `quest ${q.id}`;
    if (q.stages.length === 0) fail(`${where}: no stages`);
    if (!npcExists(q.giver)) fail(`${where}: unknown giver "${q.giver}"`);
    for (const id of q.rewardItems) if (!itemExists(id)) fail(`${where}: unknown reward item "${id}"`);
    for (const id of q.rewardItems) itemsGiven.add(id);
    if (q.rewardSpell && !has(SPELLS, q.rewardSpell)) fail(`${where}: unknown reward spell "${q.rewardSpell}"`);
    checkEffects(q.onComplete, `${where} onComplete`);
    const ids = new Set<string>();
    q.stages.forEach((s, i) => {
      const sw = `${where}/${s.id}`;
      if (ids.has(s.id)) fail(`${sw}: duplicate stage id`);
      ids.add(s.id);
      if (s.target && !landmarkExists(s.target)) fail(`${sw}: unknown target landmark "${s.target}"`);
      checkEffects(s.onEnter, `${sw} onEnter`);
      (s.onProgress ?? []).forEach((e, k) => checkEffects(e, `${sw} onProgress[${k}]`));
      const prev = q.stages[i - 1];
      if (prev?.trigger?.kind === "npc_talked" && s.onEnter && mayPlayCutscene(s.onEnter)) {
        fail(`${sw}: onEnter plays a cutscene right after an npc_talked stage (would open over the conversation)`);
      }
      const t = s.trigger;
      if (!t) return;
      for (const id of [t.id, ...(t.ids ?? [])]) {
        if (!id) continue;
        const ok =
          t.kind === "item_gained" || t.kind === "item_used"
            ? itemExists(id)
            : t.kind === "landmark_reached"
              ? landmarkExists(id)
              : t.kind === "enemy_defeated"
                ? has(ENEMIES, id)
                : t.kind === "battle_won" || t.kind === "boss_defeated" || t.kind === "battle_lost"
                  ? has(ENCOUNTERS, id)
                  : t.kind === "puzzle_solved"
                    ? PUZZLES.includes(id)
                    : t.kind === "npc_talked"
                      ? npcExists(id)
                      : t.kind === "biome_entered"
                        ? BIOMES.includes(id)
                        : t.kind === "spell_cast"
                          ? has(SPELLS, id)
                          : true;
        if (!ok) fail(`${sw}: trigger ${t.kind} names unknown id "${id}"`);
      }
    });
  }
}

function checkNpcs(): void {
  for (const n of NPC_ROSTER) {
    const where = `npc ${n.id}/${n.dialogueId}`;
    if (!has(DIALOGUES, n.dialogueId)) fail(`${where}: unknown dialogue`);
    if (n.home.kind === "spot" && !has(SPOTS, n.home.id) && !EXTERNAL_SPOTS.includes(n.home.id)) {
      fail(`${where}: unknown spot "${n.home.id}"`);
    }
    if (n.home.kind === "landmark" && !landmarkExists(n.home.id)) fail(`${where}: unknown landmark "${n.home.id}"`);
    if (n.requiresFlag) flagsRead.add(n.requiresFlag);
    for (const f of list(n.hiddenByFlag)) flagsRead.add(f);
  }
}

function checkCutscenes(): void {
  for (const [key, def] of Object.entries(CUTSCENES)) {
    const where = `cutscene ${key}`;
    if (def.id !== key) fail(`${where}: id "${def.id}" does not match its key`);
    if (def.lines.length === 0) fail(`${where}: no lines`);
    if (!def.lines.some((l) => !CONDITION_KEYS.some((k) => l[k] !== undefined))) {
      fail(`${where}: every line is conditional - it could play empty`);
    }
    for (const l of def.lines) {
      checkConditions(l, where);
      if (l.text.length > 300) warn(`${where}: a line is ${l.text.length} chars`);
    }
    for (const b of def.branches ?? []) {
      if (!has(CUTSCENES, b.id)) fail(`${where}: branch to unknown cutscene "${b.id}"`);
      cutscenesUsed.add(b.id);
      checkConditions(b, `${where} branch`);
    }
    checkEffects(def.onEnd, `${where} onEnd`);
  }
}

function checkEncounters(): void {
  for (const e of Object.values(ENCOUNTERS)) {
    if (e.rewardItem && !itemExists(e.rewardItem)) fail(`encounter ${e.id}: unknown reward item "${e.rewardItem}"`);
    if (e.lore && !has(LORE, e.lore)) fail(`encounter ${e.id}: unknown lore "${e.lore}"`);
    if (e.lore) loreUnlocked.add(e.lore);
    if (e.rewardItem) {
      itemsGiven.add(e.rewardItem);
      flagsSet.add(`battle_reward_${e.id}`);
    }
  }
  for (const l of LANDMARKS) if (l.lore) loreUnlocked.add(l.lore);
}

function staticChecks(): void {
  for (const tree of Object.values(DIALOGUES)) {
    checkDialogue(tree);
    if (tree.id !== Object.keys(DIALOGUES).find((k) => DIALOGUES[k] === tree)) fail(`dialogue ${tree.id}: id/key mismatch`);
  }
  checkQuests();
  checkNpcs();
  checkCutscenes();
  checkEncounters();

  for (const id of Object.keys(LORE)) {
    if (!loreUnlocked.has(id)) warn(`lore ${id}: never unlocked`);
    if (LORE[id]!.body.length > 900) warn(`lore ${id}: body is ${LORE[id]!.body.length} chars`);
  }
  for (const id of Object.keys(QUESTS)) if (!questsStarted.has(id)) fail(`quest ${id}: never started by anything`);
  for (const id of Object.keys(CUTSCENES)) if (!cutscenesUsed.has(id)) warn(`cutscene ${id}: never played`);
  for (const f of flagsRead) {
    if (flagsSet.has(f) || EXTERNAL_FLAG_PREFIXES.some((p) => f.startsWith(p))) continue;
    if (f === "opening_seen") continue;
    fail(`flag "${f}" is read but never set`);
  }
  for (const f of SHARED_FLAGS) if (!flagsSet.has(f)) fail(`shared flag "${f}" is never set`);
}

// ======================================================= 2. dynamic

// The levels workstream defines the relics and pages; stand them in so the
// inventory accepts them during the simulated playthrough.
for (const id of EXTERNAL_ITEMS) {
  if (!ITEMS[id]) {
    ITEMS[id] = { id, name: id, description: "stub", kind: "relic", value: 0, stackable: id === "keeper_page" };
  }
}

class Playthrough {
  readonly label: string;
  readonly state = new GameState();
  readonly events = new GameEvents();
  readonly inventory = new InventorySystem(this.state);
  readonly quests = new QuestSystem(this.state, this.inventory);
  readonly outbox = createOutbox();
  readonly runner = new EffectRunner(this.state, this.quests, this.inventory, this.events);
  readonly story = new StoryDirector(this.quests, this.runner, this.events, this.outbox);
  readonly dialogue = new DialogueSystem(this.state, this.quests, this.runner, this.outbox);
  readonly played: string[] = [];
  readonly completedOrder: string[] = [];
  private announced = new Set<string>();

  constructor(label: string) {
    this.label = label;
    this.events.on((e) => {
      if (e.kind === "quest_completed" && e.id) this.completedOrder.push(e.id);
    });
  }

  fail(msg: string): never {
    throw new Error(`[${this.label}] ${msg}`);
  }

  begin(): void {
    this.runner.run({ cutscene: "opening" }, this.outbox);
    this.pump();
  }

  /** Mimics WorldScene.drainOutbox: plays cutscenes (applying onEnd) and wins battles. */
  pump(): void {
    for (let guard = 0; guard < 64; guard++) {
      this.outbox.messages.length = 0;
      if (this.outbox.cutscenes.length > 0) {
        if (this.dialogue.active) this.fail(`cutscene ${this.outbox.cutscenes.join(",")} queued while a conversation is open`);
        const id = this.outbox.cutscenes.shift()!;
        const def = CUTSCENES[id];
        if (!def) this.fail(`unknown cutscene "${id}"`);
        if (def.lines.length === 0) this.fail(`cutscene "${id}" resolved to no lines`);
        this.played.push(id);
        this.runner.run(def.onEnd, this.outbox);
        continue;
      }
      if (this.outbox.battle) {
        const id = this.outbox.battle;
        this.outbox.battle = null;
        this.winBattle(id);
        continue;
      }
      if (this.outbox.checkpoint) this.outbox.checkpoint = null;
      return;
    }
    this.fail("outbox did not settle");
  }

  /** What BattleScene.grantVictory does. */
  winBattle(id: string): void {
    const enc = ENCOUNTERS[id];
    if (!enc) this.fail(`unknown encounter "${id}"`);
    if (enc.rewardItem && !this.state.flag(`battle_reward_${id}`) && this.inventory.add(enc.rewardItem)) {
      this.state.setFlag(`battle_reward_${id}`);
    }
    if (enc.lore) this.state.unlockLore(enc.lore);
    this.emit({ kind: "battle_won", id });
    if (enc.boss) this.emit({ kind: "boss_defeated", id });
  }

  emit(event: GameEvent): void {
    this.story.report(event);
    this.pump();
  }

  gain(id: string, qty = 1): void {
    for (let i = 0; i < qty; i++) {
      if (!this.inventory.add(id, 1)) this.fail(`could not add item ${id}`);
      this.emit({ kind: "item_gained", id, amount: 1 });
    }
  }

  reach(landmark: string): void {
    this.emit({ kind: "landmark_reached", id: landmark });
  }

  present(def: NpcDef): boolean {
    if (def.requiresFlag && !this.state.flag(def.requiresFlag)) return false;
    return !list(def.hiddenByFlag).some((f) => this.state.flag(f));
  }

  /** Opens a conversation and picks choices by substring, auto-advancing choiceless nodes. */
  talk(npcId: string, ...picks: string[]): void {
    const here = NPC_ROSTER.filter((n) => n.id === npcId && this.present(n));
    if (here.length === 0) this.fail(`${npcId} is not present to talk to`);
    if (here.length > 1) this.fail(`${npcId} is present twice: ${here.map((h) => h.dialogueId).join(", ")}`);
    const def = here[0]!;
    if (!this.dialogue.start(def.id, def.name, def.dialogueId)) this.fail(`could not start ${def.dialogueId}`);
    this.story.report({ kind: "npc_talked", id: def.id });
    // npc_talked can move a stage on; flush, but the conversation is open.
    this.outbox.messages.length = 0;
    if (this.outbox.cutscenes.length > 0) this.fail(`cutscene queued by talking to ${npcId}: ${this.outbox.cutscenes}`);

    for (const pick of picks) {
      this.skipToChoices();
      if (!this.dialogue.active) this.fail(`conversation with ${npcId} ended before "${pick}"`);
      const choices = this.dialogue.choices();
      if (choices.length > MAX_CHOICES) {
        this.fail(`${def.dialogueId}/${this.dialogue.currentNodeId} shows ${choices.length} choices`);
      }
      const index = choices.findIndex((c) => c.text.includes(pick));
      if (index < 0) {
        this.fail(
          `${def.dialogueId}/${this.dialogue.currentNodeId}: no choice matching "${pick}". Visible: ${choices
            .map((c) => `"${c.text}"`)
            .join(" | ")}`,
        );
      }
      this.dialogue.choose(index);
      if (this.dialogue.active && this.outbox.cutscenes.length > 0) {
        this.fail(`${def.dialogueId}: cutscene queued mid-conversation after "${pick}"`);
      }
      this.pump();
    }
    this.skipToChoices();
    if (this.dialogue.active) this.dialogue.end();
    this.pump();
  }

  private skipToChoices(): void {
    for (let guard = 0; guard < 40 && this.dialogue.active; guard++) {
      if (this.dialogue.choices().length > 0) return;
      this.dialogue.advance();
    }
  }

  expectFlag(flag: string, value = true): void {
    if (this.state.flag(flag) !== value) this.fail(`expected flag ${flag}=${value}`);
  }

  expectComplete(quest: string): void {
    if (!this.quests.isComplete(quest)) {
      const stage = this.quests.currentStage(quest);
      this.fail(`expected ${quest} complete (at stage ${stage?.id ?? "not started"})`);
    }
  }

  expectStage(quest: string, stage: string): void {
    const s = this.quests.currentStage(quest);
    if (s?.id !== stage) this.fail(`expected ${quest} at stage ${stage}, found ${s?.id ?? "none"}`);
  }
}

interface Route {
  label: string;
  house: HouseId;
  /** Which Choosing answers to give, in order, then whether to argue. */
  answers: [string, string, string, string];
  argueFor?: string;
  seren: "ally" | "rival";
  listen: boolean;
  ending: "redeemed" | "defeated" | "bound" | "seren_bell";
}

function play(route: Route): Playthrough {
  const p = new Playthrough(route.label);

  // ---------------------------------------------------------------- Act I
  p.begin();
  p.expectStage("the_choosing", "arrive");
  p.talk("professor_alden", "Who are you?");
  p.expectStage("the_choosing", "vey");
  p.talk("headmistress_vey", "I am so sorry", "I'm ready.");
  p.expectStage("the_choosing", "lamp");
  const accept = route.argueFor ? ["I'd like to argue.", route.argueFor, "Then I choose"] : [". Yes."];
  p.talk("choosing_lamp", "I'm ready to be chosen.", ...route.answers, ...accept);
  p.expectComplete("the_choosing");
  p.expectFlag("sorted");
  if (p.state.house !== route.house) p.fail(`expected house ${route.house}, got ${p.state.house}`);
  for (const h of HOUSE_IDS) if (h !== route.house) p.expectFlag(`house_${h}`, false);

  // The Choosing hands the first lesson straight over.
  if (!p.state.quest("first_lesson")) p.fail("the Choosing should start first_lesson");
  p.emit({ kind: "spell_cast", id: "arcane_dart" });
  p.talk("professor_alden", "I have cast a spell", "surprisingly good advice");
  p.expectComplete("first_lesson");

  p.talk("professor_wick", "Can you teach me", "I'll read it tonight.");
  p.emit({ kind: "item_used", id: "primer_of_wards" });
  p.talk("professor_wick", "I have read the Primer.", "A ward is not a wall", "I'll remember.");
  p.expectComplete("wards_reading");

  p.talk("student_amelia", "Are you all right?", "What's her name?", "Of course I'll look.");
  p.reach("treeline");
  p.gain("quillfeather", 3);
  p.talk("owl_pip", "Hoot at her.", "Go home, Pip.");
  p.talk("student_amelia", "I found Pip", "She missed you.");
  p.expectComplete("missing_owl");
  p.talk("student_amelia", "Nobody takes me seriously", "Three times. Fine.");
  for (let i = 0; i < 3; i++) p.winBattle("sparring");
  p.talk("student_amelia", "I've won three.");
  p.expectComplete("proving_ground");
  p.talk("student_amelia", "Let's talk.", "Tell me about Corvin.", "You're always so brave", "Of course.", "That's the bravest", "I'll bring it back.", "I should go.");
  p.expectFlag("amelia_fear_told");

  p.talk("student_corvin", "Nothing at all.", "I'll bring you three.");
  p.gain("moonwell_shard", 3);
  p.talk("student_corvin", "I have your three splinters.", "The same side?");
  p.expectComplete("moonwell_shards");

  // --------------------------------------------------------------- Act II
  p.talk("student_corvin", "The splinters all point north.", "The last one?", "I'll go and see Fennick.");
  p.expectFlag("act1_complete");
  p.expectFlag("act2_started");
  p.talk("librarian_fennick", "I need a pass", "Ask.", "Because Corvin asked me to.", "Let me try again.", "Because something is coming apart", "Close it, put it back", "Being quiet in.", "Which books?", "Why have they kept them");
  p.expectStage("restricted_section", "books");
  p.talk("professor_alden", "Fennick wants", "Using it for what?", "That isn't your fault.", "I'll tell her.");
  p.talk("professor_wick", "Fennick says you have", "Full of what?", "Who?", "If I go north");
  p.talk("student_corvin", "Fennick wants his copy", "Why have you kept it?", "You miss him.", "If I see him");
  p.expectStage("restricted_section", "return");
  p.talk("librarian_fennick", "I have your three books.", "Two different hands?", "Thank you, Master Fennick.", "I'll keep my eyes open.");
  p.expectFlag("restricted_pass");
  p.expectStage("restricted_section", "read");
  p.emit({ kind: "item_used", id: "keepers_vigil" });
  p.expectComplete("restricted_section");
  p.expectFlag("undercroft_open");

  p.talk("ghost_hollis", "Who are you?", "Why?", "How do I reach her?", "Anything else");
  p.expectStage("the_undercroft", "floodgate");
  p.emit({ kind: "puzzle_solved", id: "undercroft_floodgate" });
  p.gain("keeper_page", 3);
  p.gain("wardens_lantern");
  p.expectStage("the_undercroft", "vey");
  p.expectFlag("vale_glimpsed");
  p.talk("ghost_hollis", "Is there anything I can do", "Tell me.", "I'll do it now.", "Hollis Wenlow", "You can rest now", "Goodbye, Brother Hollis.");
  p.expectComplete("hollis_rest");
  p.expectFlag("hollis_released");

  if (route.listen) {
    p.talk("vale", "Are you all right?", "Tell me.", "That's monstrous.", "Whose voice", "I'm so sorry.", "Get a better coat.");
    p.expectFlag("vale_listened_1");
  } else {
    p.talk("vale", "Give back the splinters.", "I don't need to listen to a thief.", "Goodbye, Vale.");
  }
  p.expectComplete("the_splinter_thief");

  p.talk("headmistress_vey", "You knew it was down there.", "Tell me.", "And the Academy?", "You were trying to save them.", "What do you need me to do?", "Why me?", "I'll bring back the Key.");
  p.expectComplete("the_undercroft");
  p.expectFlag("barrow_unsealed");

  // -------------------------------------------------------------- Act III
  p.reach("barrow_entrance");
  p.expectStage("the_barrow", "roots");
  if (route.seren === "ally") p.talk("seren_ashdown", "Nice rope.", "Together. But");
  else p.talk("seren_ashdown", "You're the one Vey expelled.", "I'll race you");
  p.expectFlag(`seren_${route.seren}`);
  p.emit({ kind: "puzzle_solved", id: "barrow_roots" });
  p.gain("keeper_page", 3);
  p.gain("ninefold_key");
  p.expectStage("the_barrow", "report");
  p.talk("headmistress_vey", "The Keymaker seemed glad", "Understood.", "I'll put it in her hands.");
  p.expectComplete("the_barrow");
  p.expectFlag("reliquary_unsealed");

  if (route.listen) {
    p.talk("vale", "You said you'd listen", "Why do you think opening it", "Or you could finish the watch", "Then let's find them.");
    p.expectFlag("vale_heard");
    p.talk("student_corvin", "I've heard him too.", "So let's find the other half", "I'll tell him.");
  } else {
    p.talk("vale", "Draw your wand.", "Then I'll see you there.");
    p.talk("student_corvin", "Amelia's frightened for you.", "She brings you toast", "I'll tell him.");
  }
  p.expectComplete("corvins_folly");

  p.reach("reliquary_entrance");
  p.talk("seren_ashdown", "Shall we go in?");
  p.emit({ kind: "puzzle_solved", id: "reliquary_bells" });
  p.gain("keeper_page", 3);
  p.gain("silent_bell");
  p.emit({ kind: "puzzle_solved", id: "reliquary_escape" });
  p.expectStage("the_reliquary", "report");
  if (route.seren === "ally") {
    p.talk("seren_ashdown", "Of course.", "Come north with me.", "I'll see you in the Scar.");
    p.expectFlag("seren_to_camp");
  } else if (route.ending === "seren_bell") {
    p.talk("seren_ashdown", "Here. Take it.", "Do something good with it.");
    p.expectFlag("seren_has_bell");
  } else {
    p.talk("seren_ashdown", "Fight me for it");
    p.talk("seren_ashdown", "Go home, Seren.");
  }
  p.expectComplete("seren_bargain");

  p.talk("professor_alden", "I have them.", "What happens now?", "I'm ready.");
  p.expectComplete("the_reliquary");
  p.expectFlag("relics_gathered");
  p.expectStage("the_north_road", "waystone");
  p.talk("librarian_fennick", "I have all nine", "I read them.", "Thank you.");
  p.expectComplete("the_nine_pages");

  // --------------------------------------------------------------- Act IV
  p.reach("waystone_north");
  p.emit({ kind: "biome_entered", id: "scar" });
  p.reach("keeper_camp");
  p.expectComplete("the_north_road");
  p.talk("keeper_ilse", "The Choosing Lamp", "Alone? For four years?", "Six. I'll be back.");
  p.talk("keeper_ilse", "The Headmistress sent you a letter.", "Read it.", "Will you write back?", "Did you know Tobin", "His sister", "I'll give it to her.");
  if (route.seren === "ally") {
    p.talk("seren_ashdown", "Ilse gave me something", "S. - I stayed", "You did come.");
    p.expectComplete("tobins_token");
  }
  for (let i = 0; i < 6; i++) p.emit({ kind: "enemy_defeated", id: "wraith" });
  p.talk("keeper_ilse", "Six singers.", "Tell me about Vale.", "His mother", "Is she trapped", "Then I'll go.");
  p.expectFlag("ilse_done");
  p.expectStage("the_hollow_choir", "reach");

  // ---------------------------------------------------------------- Act V
  p.reach("wellhead");
  p.expectStage("the_hollow_choir", "confront");
  if (route.seren === "ally" || route.seren === "rival") p.expectFlag("seren_at_wellhead");

  switch (route.ending) {
    case "redeemed":
      p.talk("vale", "I know about your mother.", "What if she doesn't want", "I can. I have the Lantern.", "Your mother isn't trapped", "Help me shut it", "Turn it together. And ring");
      p.expectFlag("ending_redeemed");
      break;
    case "bound":
      p.talk("vale", "You're feeding it", "Then there's nothing", "Ring the Silent Bell.", "I know. I'm sorry.", "Ring the Bell.");
      p.expectFlag("ending_bound");
      break;
    case "defeated":
      p.talk("vale", "You're feeding it", "Then there's nothing", "I will hold it.");
      p.expectStage("the_hollow_choir", "aftermath");
      p.talk("vale", "Turn the Key.");
      p.expectFlag("ending_defeated");
      break;
    case "seren_bell":
      p.talk("vale");
      p.talk("seren_ashdown", "...Do it, then.", "Ring it.");
      p.expectFlag("ending_bound");
      p.expectFlag("seren_rang_bell");
      break;
  }
  p.expectComplete("the_hollow_choir");
  p.expectFlag("game_complete");
  if (!p.played.some((id) => id.startsWith("epilogue"))) p.fail("epilogue never played");
  const endings = ["ending_redeemed", "ending_defeated", "ending_bound"].filter((f) => p.state.flag(f));
  if (endings.length !== 1) p.fail(`expected exactly one ending flag, got ${endings.join(", ") || "none"}`);

  // Everyone has something to say afterwards.
  for (const npc of ["headmistress_vey", "choosing_lamp", "professor_alden", "professor_wick", "librarian_fennick", "student_amelia", "student_corvin", "keeper_ilse"]) {
    p.talk(npc);
  }
  return p;
}

const ROUTES: Route[] = [
  {
    label: "ally / listened / redeemed / Emberhart",
    house: "emberhart",
    answers: ["Open it.", "The person still inside.", "Tell them to own up", "A fire."],
    seren: "ally",
    listen: true,
    ending: "redeemed",
  },
  {
    label: "ally / listened / bound / argued into Stillwater",
    house: "stillwater",
    answers: ["Open it.", "The person still inside.", "Ask them what really happened", "A key."],
    argueFor: "Stillwater.",
    seren: "ally",
    listen: true,
    ending: "bound",
  },
  {
    label: "rival / unheard / defeated / Thornwick",
    house: "thornwick",
    answers: ["Sit down by the door", "The librarian's cat", "Keep it, and help them", "A hand to hold."],
    seren: "rival",
    listen: false,
    ending: "defeated",
  },
  {
    label: "rival gives the Bell / Seren rings it / Ravelle",
    house: "ravelle",
    answers: ["Listen a while longer", "The oldest book.", "Say nothing yet.", "To not be alone."],
    argueFor: "Ravelle.",
    seren: "rival",
    listen: false,
    ending: "seren_bell",
  },
];

// ============================================================ run

staticChecks();

const results: string[] = [];
for (const route of ROUTES) {
  try {
    const p = play(route);
    results.push(`  ok  ${route.label}  (${p.completedOrder.length} quests, ${p.played.length} cutscenes)`);
    // STORY_VERBOSE=1 prints the endings as each route actually saw them.
    if (process.env.STORY_VERBOSE) {
      for (const id of p.played.filter((c) => c.startsWith("ending") || c.startsWith("epilogue"))) {
        console.log(`\n--- ${route.label}: ${id}`);
        for (const line of CUTSCENES[id]!.lines) console.log(`  ${line.speaker ? `${line.speaker}: ` : ""}${line.text}`);
      }
    }
  } catch (err) {
    fail(String(err instanceof Error ? err.message : err));
    results.push(`  FAIL ${route.label}`);
  }
}

const words = (s: string) => s.split(/\s+/).filter(Boolean).length;
let wordCount = 0;
for (const t of Object.values(DIALOGUES)) {
  for (const n of Object.values(t.nodes)) {
    wordCount += words(n.text) + (n.variants ?? []).reduce((a, v) => a + words(v.text), 0);
    wordCount += (n.choices ?? []).reduce((a, c) => a + words(c.text), 0);
  }
}
for (const c of Object.values(CUTSCENES)) if (!c.id.includes("~")) wordCount += c.lines.reduce((a, l) => a + words(l.text), 0);
for (const l of Object.values(LORE)) wordCount += words(l.body);

console.log("Playthroughs:");
console.log(results.join("\n"));
console.log(
  `\n${Object.keys(QUESTS).length} quests, ${Object.keys(DIALOGUES).length} dialogue trees (${Object.values(DIALOGUES).reduce((a, t) => a + Object.keys(t.nodes).length, 0)} nodes), ` +
    `${Object.keys(CUTSCENES).filter((k) => !k.includes("~")).length} cutscenes, ${Object.keys(LORE).length} lore entries, ~${wordCount} words.`,
);
if (warnings.length) console.log(`\n${warnings.length} warning(s):\n  ${warnings.join("\n  ")}`);
if (errors.length) {
  console.log(`\n${errors.length} error(s):\n  ${errors.join("\n  ")}`);
  process.exit(1);
}
console.log("\nStory checks passed.");
