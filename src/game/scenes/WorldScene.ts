import Phaser from "phaser";

import { TILE } from "../config";
import type { ItemDef } from "../data/items";
import { SPELLS } from "../data/spells";
import { biomeHasEnemies, rollBiomeEnemy } from "../data/enemies";
import type { EnemyArchetype } from "../data/enemies";
import { LANDMARKS, START_LANDMARK, landmarkById } from "../data/landmarks";
import type { NpcDef } from "../data/npcs";
import { NPC_ROSTER } from "../data/npcs";
import { spotById } from "../data/spots";
import { STARTING_WEAPON, WEAPONS, WEAPON_ORDER, weaponById } from "../data/weapons";
import type { SwingKind } from "../data/weapons";
import type { CutsceneDef } from "../data/cutscenes";
import { applyCameraZoom, TEXT_RES } from "../display";
import { Enemy } from "../entities/Enemy";
import { NPC } from "../entities/NPC";
import { Player } from "../entities/Player";
import type { Actor } from "../entities/Actor";
import { calloutText, floatText } from "../gfx/FloatingText";
import { CombatSystem } from "../systems/CombatSystem";
import { CutsceneSystem } from "../systems/CutsceneSystem";
import { DialogueSystem } from "../systems/DialogueSystem";
import { createOutbox, EffectRunner } from "../systems/EffectRunner";
import type { StoryOutbox } from "../systems/EffectRunner";
import { GameEvents } from "../systems/GameEvents";
import { InteractionSystem } from "../systems/InteractionSystem";
import { InventorySystem } from "../systems/InventorySystem";
import { PickupSystem } from "../systems/PickupSystem";
import { QuestSystem } from "../systems/QuestSystem";
import { SaveSystem } from "../systems/SaveSystem";
import { SpellSystem } from "../systems/SpellSystem";
import { StoryDirector } from "../systems/StoryDirector";
import { AudioSystem } from "../systems/AudioSystem";
import { zoneForBiome } from "../audio/zones";
import { LightRegistry } from "../gfx/lights";
import { WorldFx } from "../gfx/WorldFx";
import type { GameState } from "../state/GameState";
import { TransitionManager } from "../world/TransitionManager";
import { WorldManager } from "../world/WorldManager";
import { WorldModel } from "../world/WorldModel";

const MAX_ENEMIES = 7;
const SPAWN_INTERVAL = 2.2;
const SPAWN_MIN = 620;
const SPAWN_MAX = 1080;
const DESPAWN_RANGE = 2000;
const MOVE_SPEED_WHILE_SWINGING = 0.35;
/** How close the player must come to a landmark for it to count as reached. */
const LANDMARK_RADIUS = 190;
/** Safe pocket for landmarks that do not declare one. */
const DEFAULT_SAFE_RADIUS = 360;
/** Within this many pixels of the Academy, the music is the Academy's. */
const ACADEMY_MUSIC_RADIUS = 900;

/** Shared empty set for frames where nothing was pressed. */
const NO_INPUT: ReadonlySet<string> = new Set<string>();

export class WorldScene extends Phaser.Scene {
  state!: GameState;
  world!: WorldManager;
  gameEvents!: GameEvents;
  spells!: SpellSystem;
  audio!: AudioSystem;
  combat!: CombatSystem;
  dialogue!: DialogueSystem;
  quests!: QuestSystem;
  inventory!: InventorySystem;
  story!: StoryDirector;
  cutscenes!: CutsceneSystem;
  pickups!: PickupSystem;
  transition!: TransitionManager;
  player!: Player;
  npcs: NPC[] = [];
  enemies: Enemy[] = [];
  /** Runtime light sources (braziers, spells, lanterns). See gfx/lights.ts. */
  readonly lightRegistry = new LightRegistry();
  /** Lighting, weather, water and combat effects. See gfx/WorldFx.ts. */
  fx!: WorldFx;

  private interaction!: InteractionSystem;
  private effectRunner!: EffectRunner;
  private readonly outbox: StoryOutbox = createOutbox();
  private spellKeys: Phaser.Input.Keyboard.Key[] = [];
  /**
   * Action names pressed since the last frame. Filled from key events rather
   * than polled, so a tap that begins and ends between two frames still lands.
   */
  private readonly pressed = new Set<string>();
  private spawnTimer = 0;
  private debugText!: Phaser.GameObjects.Text;
  private debugVisible = false;
  private paused = false;
  /** Inventory panel state. The item logic itself lives in InventorySystem. */
  inventoryOpen = false;
  inventoryIndex = 0;
  /** Journal panel state. */
  journalOpen = false;
  journalIndex = 0;
  /** Spellbook panel state. */
  spellbookOpen = false;
  spellbookIndex = 0;
  private homeX = 0;
  private homeY = 0;
  /** Everything NPCs should keep a polite distance from. */
  private npcObstacles: Actor[] = [];

  /** Story NPCs whose gating flag was not set yet, retried as the story moves. */
  private pendingNpcs: NpcDef[] = [];
  private npcPollTimer = 0;
  /** Where the player was last frame, for biome and landmark detection. */
  private lastBiome = "";
  private announcedLandmarks = new Set<string>();

  constructor() {
    super("world");
  }

  create(): void {
    this.state = this.registry.get("state") as GameState;

    // `create` runs again every time the scene restarts (loading a save does
    // exactly that), but field initialisers only run once per instance. Without
    // this reset the actors and key presses from the previous run survive
    // alongside the new ones, and their sprites were destroyed on shutdown.
    this.npcs = [];
    this.enemies = [];
    this.npcObstacles = [];
    this.pendingNpcs = [];
    this.announcedLandmarks = new Set();
    this.lastBiome = "";
    this.pressed.clear();
    this.lightRegistry.clear();
    this.spawnTimer = 0;
    this.inventoryOpen = false;
    this.inventoryIndex = 0;
    this.journalOpen = false;
    this.journalIndex = 0;
    this.spellbookOpen = false;
    this.spellbookIndex = 0;
    this.debugVisible = false;
    this.paused = false;

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.teardown());

    const model = new WorldModel(this.state.data.seed);
    this.world = new WorldManager(this, model);
    this.transition = new TransitionManager(this);
    this.fx = new WorldFx(this);

    // Story systems. Order matters: the effect runner needs the quests and the
    // inventory, and the director needs the runner.
    this.gameEvents = new GameEvents();
    this.inventory = new InventorySystem(this.state);
    this.quests = new QuestSystem(this.state, this.inventory);
    this.effectRunner = new EffectRunner(this.state, this.quests, this.inventory, this.gameEvents);
    this.story = new StoryDirector(this.quests, this.effectRunner, this.gameEvents, this.outbox);
    this.dialogue = new DialogueSystem(this.state, this.quests, this.effectRunner, this.outbox);
    this.cutscenes = new CutsceneSystem();
    this.cutscenes.onEnd = (def) => this.finishCutscene(def);

    this.spells = new SpellSystem(this, this.state, this.world);
    this.audio = AudioSystem.shared();
    this.combat = new CombatSystem(this);

    this.pickups = new PickupSystem(this, this.state, this.world, this.gameEvents);
    this.pickups.onCollected = (name, qty) => {
      this.audio.playPickup();
      this.toast(qty > 1 ? `${name} x${qty}` : name);
    };
    // Pickup flags are read at build time, so a save restored mid-session needs
    // the world rebuilt to reflect items already taken.
    this.pickups.build();

    this.placePlayer();
    this.placeNpcs();
    this.npcObstacles = [...this.npcs, this.player];

    this.interaction = new InteractionSystem(this, this.player);
    this.bindInput();

    const camera = this.cameras.main;
    applyCameraZoom(this);
    camera.startFollow(this.player.sprite, true, 0.14, 0.14);
    camera.setBackgroundColor("#0b0d12");
    camera.fadeIn(420, 6, 6, 10);

    this.world.update(this.player.x, this.player.y);

    this.debugText = this.add
      .text(8, 8, "", {
        fontFamily: "monospace",
        fontSize: "12px",
        color: "#8ff0a0",
        backgroundColor: "#00000088",
        padding: { x: 6, y: 4 },
      })
      .setScrollFactor(0)
      .setResolution(TEXT_RES)
      .setDepth(100000)
      .setVisible(false);

    // A brand new game opens on the arrival, once the camera has settled.
    if (!this.state.flag("opening_seen")) {
      this.state.setFlag("opening_seen");
      this.time.delayedCall(600, () => this.queueCutscene("opening"));
    }
    this.registry.set("resume", { x: this.player.x, y: this.player.y });

    this.scene.launch("ui");
  }

  /**
   * Releases everything create() built. Phaser tears down the display list for
   * us; what it cannot know about is our own bookkeeping and the baked chunk
   * textures, which live in the game-wide texture manager and would otherwise
   * survive the restart.
   */
  private teardown(): void {
    for (const npc of this.npcs) npc.destroy();
    for (const enemy of this.enemies) enemy.destroy();
    this.npcs = [];
    this.enemies = [];
    this.npcObstacles = [];
    this.pendingNpcs = [];
    this.pressed.clear();
    this.spells.clear();
    this.pickups.clear();
    this.cutscenes.clear();
    this.gameEvents.clear();
    this.world.destroy();
    this.fx.destroy();
    // The audio engine is game-wide and outlives a scene restart, so the music
    // carries on through a save load rather than cutting out.
  }

  update(_time: number, delta: number): void {
    const dt = Math.min(delta, 50) / 1000;

    const pressed = this.takePressed();
    const wantsPause = pressed.has("pause") || pressed.has("escape");

    if (this.paused) {
      if (wantsPause) this.paused = false;
      this.player.holdStill();
      return;
    }

    const modalOpen =
      this.cutscenes.active ||
      this.dialogue.active ||
      this.inventoryOpen ||
      this.journalOpen ||
      this.spellbookOpen;
    if (!modalOpen && wantsPause) {
      this.paused = true;
      this.player.holdStill();
      return;
    }

    this.state.updateClock(delta);
    this.world.update(this.player.x, this.player.y);
    this.combat.update(dt);

    if (pressed.has("debug")) {
      this.debugVisible = !this.debugVisible;
      this.debugText.setVisible(this.debugVisible);
    }
    if (pressed.has("save")) {
      this.state.data.position = { x: this.player.x, y: this.player.y };
      this.toast(SaveSystem.save(this.state) ? "Game saved." : "Could not save.");
    }
    if (pressed.has("load")) this.loadGame();

    // Cutscenes take over completely: nothing else reads input while one plays.
    // The player is held still in every non-gameplay branch, otherwise the last
    // walk animation keeps cycling while they stand in a conversation.
    if (this.cutscenes.active) {
      if (pressed.has("interact") || pressed.has("cast") || pressed.has("confirm")) {
        this.cutscenes.advance();
      }
      if (pressed.has("escape")) this.cutscenes.clear();
      this.player.holdStill();
    } else if (this.dialogue.active) {
      this.handleDialogueInput(pressed);
      this.player.holdStill();
    } else if (this.inventoryOpen) {
      this.handleInventoryInput(pressed);
      this.player.holdStill();
    } else if (this.journalOpen) {
      this.handleJournalInput(pressed);
      this.player.holdStill();
    } else if (this.spellbookOpen) {
      this.handleSpellbookInput(pressed);
      this.player.holdStill();
    } else if (pressed.has("inventory")) {
      this.toggleInventory();
      this.player.holdStill();
    } else if (pressed.has("journal")) {
      this.journalOpen = true;
      this.player.holdStill();
    } else if (pressed.has("spellbook")) {
      this.openSpellbook();
      this.player.holdStill();
    } else {
      this.player.speedScale = this.combat.busy ? MOVE_SPEED_WHILE_SWINGING : 1;
      this.player.update(this.world, dt);
      this.handleGameplayInput(pressed);
    }

    for (const npc of this.npcs) npc.update(this.world, dt, this.npcObstacles);
    this.updateEnemies(dt);

    this.spells.update(dt, this.enemies, (target, amount) => this.damageEnemy(target, amount));
    this.pickups.update(dt, this.player.x, this.player.y);

    this.interaction.update(this.npcs);
    if (
      this.dialogue.active ||
      this.inventoryOpen ||
      this.journalOpen ||
      this.spellbookOpen ||
      this.cutscenes.active
    ) {
      this.interaction.hide();
    }

    this.maintainEnemyPopulation(dt);
    this.pollNpcs(dt);
    this.trackGeography();
    this.drainOutbox();
    this.fx.update(dt);

    if (this.debugVisible) this.refreshDebug();
  }

  // --- setup -------------------------------------------------------------

  private placePlayer(): void {
    const resume = this.registry.get("resume") as { x: number; y: number } | null;
    // A checkpoint is where you wake up after losing a fight; the arrival
    // grounds until the story sends you somewhere with a fire to sit by.
    const checkpoint = this.state.checkpoint;

    if (resume && this.world.canStandAt(resume.x, resume.y)) {
      this.homeX = resume.x;
      this.homeY = resume.y;
    } else if (checkpoint && this.world.canStandAt(checkpoint.x, checkpoint.y)) {
      this.homeX = checkpoint.x;
      this.homeY = checkpoint.y;
    } else {
      const fallback = this.startSpot();
      this.homeX = fallback.x;
      this.homeY = fallback.y;
    }

    // Keep the respawn point separate from the loaded position, so a save made
    // deep in the world does not silently move your home.
    const start = this.startSpot();
    this.state.setCheckpoint(start.x, start.y);

    this.state.data.position = { x: this.homeX, y: this.homeY };
    this.player = new Player(this, this.homeX, this.homeY);
  }

  /** The arrival grounds' courtyard, in front of the great hall door. */
  private startSpot(): { x: number; y: number } {
    const landmark = landmarkById(START_LANDMARK);
    const x = ((landmark?.tx ?? 4) + 5) * TILE;
    const y = ((landmark?.ty ?? 6) + 10) * TILE;
    return this.findFreeSpot(x, y, 6) ?? { x, y };
  }

  private placeNpcs(): void {
    for (const def of NPC_ROSTER) {
      if (def.requiresFlag && !this.state.flag(def.requiresFlag)) {
        this.pendingNpcs.push(def);
        continue;
      }
      this.spawnNpc(def);
    }
  }

  private spawnNpc(def: NpcDef): void {
    const anchor = this.npcAnchor(def);
    if (!anchor) return;

    const spot = this.findFreeSpot(anchor.x, anchor.y, 6);
    if (!spot) return;

    const npc = new NPC(this, def, spot.x, spot.y);
    this.npcs.push(npc);
    this.npcObstacles = [...this.npcs, this.player];
  }

  private npcAnchor(def: NpcDef): { x: number; y: number } | null {
    if (def.home.kind === "spot") {
      const spot = spotById(def.home.id);
      const host = spot ? landmarkById(spot.landmark) : undefined;
      if (!spot || !host) return null;
      return {
        x: (host.tx + spot.dx) * TILE + TILE / 2,
        y: (host.ty + spot.dy) * TILE + TILE,
      };
    }
    if (def.home.kind === "arrival") {
      // Authored relative to the arrival spot in front of the Academy - never
      // the player's position, or loading a save made in the Scar would bring
      // the whole faculty along with you.
      const start = this.startSpot();
      return { x: start.x + def.home.dx * TILE, y: start.y + def.home.dy * TILE };
    }
    const landmark = landmarkById(def.home.id);
    if (!landmark) return null;
    return {
      x: (landmark.tx + def.home.dx) * TILE,
      y: (landmark.ty + def.home.dy) * TILE,
    };
  }

  /** Brings in story characters whose gating flag has since been set. */
  private pollNpcs(dt: number): void {
    if (this.pendingNpcs.length === 0) return;
    this.npcPollTimer -= dt;
    if (this.npcPollTimer > 0) return;
    this.npcPollTimer = 1;

    const stillWaiting: NpcDef[] = [];
    for (const def of this.pendingNpcs) {
      if (def.requiresFlag && !this.state.flag(def.requiresFlag)) {
        stillWaiting.push(def);
        continue;
      }
      this.spawnNpc(def);
    }
    this.pendingNpcs = stillWaiting;
  }

  /** Spirals outward from a preferred spot until it finds ground an actor fits on. */
  private findFreeSpot(x: number, y: number, maxTiles: number): { x: number; y: number } | null {
    if (this.world.canStandAt(x, y)) return { x, y };
    for (let r = 1; r <= maxTiles; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const nx = x + dx * TILE;
          const ny = y + dy * TILE;
          if (this.world.canStandAt(nx, ny)) return { x: nx, y: ny };
        }
      }
    }
    return null;
  }

  private bindInput(): void {
    const kb = this.input.keyboard;
    if (!kb) throw new Error("Keyboard input is unavailable");

    kb.addCapture([
      Phaser.Input.Keyboard.KeyCodes.SPACE,
      Phaser.Input.Keyboard.KeyCodes.UP,
      Phaser.Input.Keyboard.KeyCodes.DOWN,
      Phaser.Input.Keyboard.KeyCodes.LEFT,
      Phaser.Input.Keyboard.KeyCodes.RIGHT,
      Phaser.Input.Keyboard.KeyCodes.BACKTICK,
    ]);

    const C = Phaser.Input.Keyboard.KeyCodes;
    const bind = (code: number, action: string): Phaser.Input.Keyboard.Key => {
      const key = kb.addKey(code);
      // Listen for the event instead of polling JustDown each frame. Phaser
      // clears the key's justDown flag on keyup, so a quick tap that starts and
      // ends between two frames would otherwise be dropped completely.
      key.on("down", () => {
        this.audio.unlock();
        this.pressed.add(action);
      });
      return key;
    };

    bind(C.E, "interact");
    bind(C.SPACE, "cast");
    bind(C.Z, "light");
    bind(C.X, "heavy");
    bind(C.T, "cycleWeapon");
    bind(C.Q, "quaff");
    bind(C.I, "inventory");
    bind(C.J, "journal");
    bind(C.M, "spellbook");
    bind(C.UP, "navUp");
    bind(C.DOWN, "navDown");
    bind(C.W, "navUp");
    bind(C.S, "navDown");
    bind(C.A, "moveLeft");
    bind(C.D, "moveRight");
    bind(C.SHIFT, "sprint");
    bind(C.ENTER, "confirm");
    bind(C.F8, "save");
    bind(C.F9, "load");
    bind(C.P, "pause");
    bind(C.C, "dash");
    bind(C.BACKTICK, "debug");
    bind(C.ESC, "escape");

    this.spellKeys = [C.ONE, C.TWO, C.THREE, C.FOUR, C.FIVE, C.SIX].map((code, index) =>
      bind(code, `spell${index}`),
    );
  }

  /** Takes this frame's key presses and clears the buffer. */
  private takePressed(): ReadonlySet<string> {
    if (this.pressed.size === 0) return NO_INPUT;
    const snapshot = new Set(this.pressed);
    this.pressed.clear();
    return snapshot;
  }

  // --- input -------------------------------------------------------------

  private handleGameplayInput(pressed: ReadonlySet<string>): void {
    for (let i = 0; i < this.spellKeys.length; i++) {
      if (pressed.has(`spell${i}`)) this.selectSpell(i);
    }

    if (pressed.has("light")) this.attack("light");
    if (pressed.has("heavy")) this.attack("heavy");
    if (pressed.has("cycleWeapon")) this.cycleWeapon();

    if (pressed.has("cast")) this.tryCast();
    if (pressed.has("quaff")) this.quaff();
    if (pressed.has("dash")) this.dash();

    if (pressed.has("interact")) {
      const target = this.interaction.target;
      if (target) this.talkTo(target);
    }
  }

  private talkTo(target: NPC): void {
    if (!this.dialogue.start(target.id, target.name, target.dialogueId)) return;
    this.audio.playUi("open");
    this.interaction.hide();
    // Reported the moment the conversation opens, so a stage that waits on
    // being told something reacts to the node the player is now looking at.
    this.story.report({ kind: "npc_talked", id: target.id });
  }

  private handleDialogueInput(pressed: ReadonlySet<string>): void {
    if (pressed.has("escape")) {
      this.dialogue.end();
      return;
    }

    const choices = this.dialogue.choices();
    if (choices.length === 0) {
      if (pressed.has("interact") || pressed.has("cast") || pressed.has("confirm")) {
        this.dialogue.advance();
      }
      return;
    }

    for (let i = 0; i < this.spellKeys.length && i < choices.length; i++) {
      if (!pressed.has(`spell${i}`)) continue;
      this.dialogue.choose(i);
      return;
    }
  }

  // --- inventory & journal ----------------------------------------------

  /** What the satchel currently holds, already sorted for display. */
  get inventoryItems(): Array<{ def: ItemDef; qty: number }> {
    return this.inventory.entries();
  }

  private toggleInventory(): void {
    this.inventoryOpen = !this.inventoryOpen;
    this.audio.playUi(this.inventoryOpen ? "open" : "close");
    if (this.inventoryOpen) {
      this.inventoryIndex = 0;
      this.dialogue.end();
    }
  }

  private handleInventoryInput(pressed: ReadonlySet<string>): void {
    if (pressed.has("inventory")) this.toggleInventory();
    if (pressed.has("escape")) {
      this.inventoryOpen = false;
      this.audio.playUi("close");
      return;
    }

    const items = this.inventoryItems;
    if (items.length === 0) return;

    if (pressed.has("navUp")) {
      this.inventoryIndex = (this.inventoryIndex - 1 + items.length) % items.length;
    }
    if (pressed.has("navDown")) {
      this.inventoryIndex = (this.inventoryIndex + 1) % items.length;
    }
    if (pressed.has("confirm") || pressed.has("interact")) {
      this.useInventoryItem(items);
    }
  }

  private useInventoryItem(items: Array<{ def: ItemDef; qty: number }>): void {
    const entry = items[this.inventoryIndex];
    if (!entry) return;

    const message = this.inventory.use(entry.def.id);
    if (message) this.toast(message);
    // Item use is a story-worthy fact: the ward quest waits on reading a book.
    this.gameEvents.emit({ kind: "item_used", id: entry.def.id });

    const remaining = this.inventoryItems;
    if (this.inventoryIndex >= remaining.length) {
      this.inventoryIndex = Math.max(0, remaining.length - 1);
    }
  }

  private handleJournalInput(pressed: ReadonlySet<string>): void {
    if (pressed.has("journal") || pressed.has("escape")) {
      this.journalOpen = false;
      this.audio.playUi("close");
      return;
    }
    const pages = this.journalPages;
    if (pages === 0) return;
    if (pressed.has("navUp")) this.journalIndex = (this.journalIndex - 1 + pages) % pages;
    if (pressed.has("navDown")) this.journalIndex = (this.journalIndex + 1) % pages;
  }

  private openSpellbook(): void {
    this.spellbookOpen = true;
    this.audio.playUi("open");
    this.dialogue.end();
    const selected = this.state.player.learnedSpells.indexOf(this.state.player.selectedSpell);
    this.spellbookIndex = Math.max(0, selected);
  }

  private handleSpellbookInput(pressed: ReadonlySet<string>): void {
    if (pressed.has("spellbook") || pressed.has("escape")) {
      this.spellbookOpen = false;
      this.audio.playUi("close");
      return;
    }

    const spells = this.state.player.learnedSpells;
    if (spells.length === 0) return;

    if (pressed.has("navUp")) {
      this.spellbookIndex = (this.spellbookIndex - 1 + spells.length) % spells.length;
    }
    if (pressed.has("navDown")) {
      this.spellbookIndex = (this.spellbookIndex + 1) % spells.length;
    }
    if (pressed.has("confirm") || pressed.has("interact")) {
      this.selectSpell(this.spellbookIndex);
      const id = spells[this.spellbookIndex];
      if (id) {
        this.audio.playUi("select");
        this.toast(`Attuned to ${SPELLS[id]?.name ?? id}.`);
      }
    }
  }

  get journalPages(): number {
    return this.quests.activeQuests().length + this.quests.completedQuests().length + this.state.lore.length;
  }

  private selectSpell(index: number): void {
    const learned = this.state.player.learnedSpells;
    const id = learned[index];
    if (!id) return;
    this.state.player.selectedSpell = id;
  }

  // --- combat ------------------------------------------------------------

  /**
   * Melee aims wherever the character is already facing. Deliberately no
   * pointer aiming: Phaser leaves activePointer.worldX/Y at (0,0) until the
   * mouse actually moves, which silently resolved to "up" and sent every swing
   * northwards.
   */
  private attack(kind: SwingKind): void {
    const weaponId = this.state.player.weapon;
    const outcome = this.combat.swing(this.player, kind, weaponId, this.enemies, (target, amount, crit) =>
      this.damageEnemy(target, amount, crit),
    );

    if (!outcome.ok) {
      this.audio.playUi("error");
      floatText(this, this.player.x, this.player.y - 46, outcome.reason ?? "", {
        size: 13,
        color: "#c9c1a8",
      });
      return;
    }

    const heavy = kind === "heavy";
    this.audio.playAttack(heavy, outcome.hits > 0);
    calloutText(
      this,
      this.player.x,
      this.player.y - 56,
      heavy ? "Heavy" : "Light",
      heavy ? "#ffcf6b" : "#e8eef7",
    );
    this.transition.shake(heavy ? 0.005 : 0.002, heavy ? 130 : 70);

    if (outcome.hits === 0) {
      floatText(this, this.player.x, this.player.y - 26, "miss", {
        size: 13,
        color: "#9aa0aa",
        stroke: 3,
      });
    }
  }

  /** Weapons the player actually has: equipped, owned as an item, or issued. */
  private ownedWeapons(): string[] {
    const owned = new Set<string>([STARTING_WEAPON, this.state.player.weapon]);
    for (const entry of this.state.player.inventory) {
      if (WEAPONS[entry.id]) owned.add(entry.id);
    }
    return WEAPON_ORDER.filter((id) => owned.has(id));
  }

  private cycleWeapon(): void {
    const owned = this.ownedWeapons();
    if (owned.length === 0) return;
    const current = owned.indexOf(this.state.player.weapon);
    const next = owned[(current + 1) % owned.length];
    if (!next) return;
    this.state.equipWeapon(next);
    this.audio.playUi("select");
    const def = weaponById(next);
    this.toast(`Wielding the ${def.name}.`);
    floatText(this, this.player.x, this.player.y - 52, def.name, {
      display: true,
      size: 18,
      color: "#e8d9a8",
    });
  }

  private damageEnemy(target: Actor, amount: number, crit = false): void {
    if (!(target instanceof Enemy)) return;

    const died = target.takeDamage(amount);
    if (died) this.audio.playDefeat();
    else this.audio.playHit();
    floatText(this, target.x, target.y - 34, crit ? `${amount}!` : `${amount}`, {
      size: crit ? 24 : 17,
      color: crit ? "#ffd166" : "#ffffff",
    });

    if (died) {
      const archetype = target.archetype;
      this.enemies = this.enemies.filter((enemy) => enemy !== target);
      floatText(this, target.x, target.y - 52, `+${archetype.gold} gold`, {
        size: 13,
        color: "#d9b44a",
      });
      this.awardKill(archetype);
    }
  }

  private awardKill(archetype: EnemyArchetype): void {
    this.state.player.gold += archetype.gold;
    this.gameEvents.emit({ kind: "enemy_defeated", id: archetype.id });

    if (archetype.drop && Math.random() < archetype.drop.chance) {
      if (this.inventory.add(archetype.drop.id)) {
        const name = archetype.drop.id.replace(/_/g, " ");
        this.toast(`Found: ${name}.`);
        this.gameEvents.emit({ kind: "item_gained", id: archetype.drop.id });
      }
    }
  }

  private hurtPlayer(amount: number): void {
    if (this.state.wardActive) {
      this.toast("Your ward turns the blow aside.");
      return;
    }
    if (this.cutscenes.active) return;

    this.state.damage(amount);
    this.audio.playHurt();
    this.gameEvents.emit({ kind: "damage_taken", amount });
    floatText(this, this.player.x, this.player.y - 40, `-${amount}`, {
      size: 18,
      color: "#ff8a8a",
    });
    this.transition.shake();
    if (this.state.player.health <= 0) this.collapse();
  }

  private collapse(): void {
    this.state.player.health = Math.round(this.state.player.maxHealth * 0.5);

    // Respawning on top of the thing that killed you is how a game becomes a
    // death loop, so clear the field before moving the player.
    for (const enemy of this.enemies) enemy.destroy();
    this.enemies = [];
    this.spells.clear();

    const checkpoint = this.state.checkpoint;
    const x = checkpoint?.x ?? this.homeX;
    const y = checkpoint?.y ?? this.homeY;
    this.player.setPosition(x, y);
    this.world.update(x, y);
    this.pickups.build();

    this.cameras.main.flash(420, 40, 10, 30);
    this.toast("You come to somewhere safe. Someone dragged you back.");
  }

  private updateEnemies(dt: number): void {
    const survivors: Enemy[] = [];

    for (const enemy of this.enemies) {
      if (!enemy.alive) continue;

      if (enemy.distanceTo(this.player) > DESPAWN_RANGE) {
        enemy.destroy();
        continue;
      }

      enemy.update(this.world, dt, this.player, this.enemies, (damage) => this.hurtPlayer(damage));
      survivors.push(enemy);
    }

    this.enemies = survivors;
  }

  private maintainEnemyPopulation(dt: number): void {
    this.spawnTimer -= dt;
    if (this.spawnTimer > 0 || this.enemies.length >= MAX_ENEMIES) return;
    this.spawnTimer = SPAWN_INTERVAL;

    // What is hunting you depends on where you are, not on a story flag.
    const biome = this.world.biomeNameAtPixel(this.player.x, this.player.y);
    if (!biomeHasEnemies(biome)) return;

    for (let attempt = 0; attempt < 8; attempt++) {
      const archetype = rollBiomeEnemy(biome, Math.random());
      if (!archetype) return;

      const angle = Math.random() * Math.PI * 2;
      const distance = SPAWN_MIN + Math.random() * (SPAWN_MAX - SPAWN_MIN);
      const x = this.player.x + Math.cos(angle) * distance;
      const y = this.player.y + Math.sin(angle) * distance;

      if (!this.world.canStandAt(x, y)) continue;
      // Never drop something on top of a story location: the arrival grounds
      // and the Keeper's camp should stay safe places to stand.
      if (this.nearSafePlace(x, y)) continue;

      this.enemies.push(new Enemy(this, archetype, x, y));
      return;
    }
  }

  /**
   * True inside a landmark's safe pocket.
   *
   * The radius is authored per landmark (data/landmarks.ts) rather than being a
   * blanket constant: the arrival grounds are a calm tutorial area, but the Scar
   * is the arena, and a one-size radius there would leave the wraith cull with
   * nothing to cull.
   */
  private nearSafePlace(x: number, y: number): boolean {
    for (const landmark of LANDMARKS) {
      const radius = landmark.safeRadius ?? DEFAULT_SAFE_RADIUS;
      if (radius <= 0) continue;
      const lx = (landmark.tx + 2) * TILE;
      const ly = (landmark.ty + 2) * TILE;
      if (Math.hypot(lx - x, ly - y) < radius) return true;
    }
    return false;
  }

  private tryCast(): void {
    const spellId = this.state.player.selectedSpell;

    const result = this.spells.cast(spellId, this.player, this.enemies, (target, amount) =>
      this.damageEnemy(target, amount),
    );

    if (!result.ok) {
      this.audio.playUi("error");
      this.toast(result.reason ?? "Nothing happens.");
      return;
    }

    this.audio.playSpell(SPELLS[spellId]?.kind);
    this.story.report({ kind: "spell_cast", id: spellId });
  }

  private dash(): void {
    if (!this.player.dash(this.world)) {
      this.audio.playUi("error");
      return;
    }
    this.audio.playDash();
    this.transition.shake(0.003, 90);
  }

  private quaff(): void {
    const message = this.inventory.use("lesser_tonic");
    if (!message) {
      this.audio.playUi("error");
      this.toast("You have nothing to drink.");
      return;
    }
    this.audio.playUi("select");
    this.toast(message);
    this.gameEvents.emit({ kind: "item_used", id: "lesser_tonic" });
  }

  private loadGame(): void {
    const saved = SaveSystem.load();
    if (!saved) {
      this.toast("No save found.");
      return;
    }
    this.state.restore(saved);
    this.registry.set("resume", saved.position);
    this.scene.restart();
  }

  // --- geography ---------------------------------------------------------

  /**
   * Notices where the player is and reports it once.
   *
   * Biome and landmark arrival are the triggers the story hangs on - "cross
   * into the Scar", "find the north waystone" - so the scene's job is only to
   * announce them.
   */
  private trackGeography(): void {
    const biome = this.world.biomeNameAtPixel(this.player.x, this.player.y);
    if (biome !== this.lastBiome) {
      this.lastBiome = biome;
      this.story.report({ kind: "biome_entered", id: biome });
    }

    const px = this.player.x;
    const py = this.player.y;

    const academy = landmarkById(START_LANDMARK);
    const nearAcademy =
      !!academy &&
      Math.hypot((academy.tx + 2) * TILE - px, (academy.ty + 2) * TILE - py) < ACADEMY_MUSIC_RADIUS;
    this.audio.setZone(zoneForBiome(biome, nearAcademy));
    for (const landmark of LANDMARKS) {
      if (this.announcedLandmarks.has(landmark.id)) continue;
      const lx = (landmark.tx + 2) * TILE;
      const ly = (landmark.ty + 2) * TILE;
      // A region is reached by entering it, so its forced radius doubles as the
      // arrival radius. A point landmark uses the default approach distance.
      const reach = Math.max(LANDMARK_RADIUS, (landmark.forceRadius ?? 0) * TILE);
      if (Math.hypot(lx - px, ly - py) > reach) continue;

      this.announcedLandmarks.add(landmark.id);
      this.story.report({ kind: "landmark_reached", id: landmark.id });
      if (landmark.lore && this.state.unlockLore(landmark.lore)) {
        this.toast(`Journal: ${landmark.name}`);
      }
    }
  }

  // --- story plumbing ----------------------------------------------------

  /** Queues a cutscene, saving off any that was already playing. */
  queueCutscene(id: string): void {
    this.cutscenes.enqueue(id);
  }

  private finishCutscene(def: CutsceneDef): void {
    if (def.onEnd) this.effectRunner.run(def.onEnd, this.outbox);
  }

  /**
   * Turns this frame's story requests into things the player can see. The
   * outbox is the boundary between data and the scene: nothing in data/ or
   * systems/ opens a scene or draws a panel itself.
   */
  private drainOutbox(): void {
    if (this.outbox.messages.length > 0 || this.outbox.checkpoint) this.audio.playReward();
    for (const message of this.outbox.messages) this.toast(message);
    if (this.outbox.messages.length > 0) this.outbox.messages.length = 0;

    if (this.outbox.checkpoint) {
      const landmark = landmarkById(this.outbox.checkpoint);
      this.state.data.position = { x: this.player.x, y: this.player.y };
      const saved = SaveSystem.save(this.state);
      if (landmark) {
        this.toast(`Checkpoint: ${landmark.name}${saved ? ". Game saved." : ". Save failed."}`);
      }
      this.outbox.checkpoint = null;
    }

    if (this.outbox.battle) {
      const encounter = this.outbox.battle;
      this.outbox.battle = null;
      this.dialogue.end();
      this.transition.openOverlay("battle", { encounter });
    }

    if (this.outbox.cutscenes.length > 0) {
      const queue = this.outbox.cutscenes;
      this.outbox.cutscenes = [];
      for (const id of queue) this.cutscenes.enqueue(id);
    }
  }

  // --- debug -------------------------------------------------------------

  private refreshDebug(): void {
    this.debugText.setText(
      [
        `fps      ${Math.round(this.game.loop.actualFps)}`,
        `pos      ${Math.round(this.player.x)}, ${Math.round(this.player.y)}`,
        `biome    ${this.world.biomeNameAtPixel(this.player.x, this.player.y)}`,
        `chunks   ${this.world.loadedCount}`,
        `enemies  ${this.enemies.length}`,
        `bolts    ${this.spells.activeProjectiles}`,
        `npcs     ${this.npcs.length}`,
        `pickups  ${this.pickups.active}`,
        `weapon   ${this.state.player.weapon}`,
        `face     ${this.player.direction}`,
        `quests   ${this.quests.activeQuests().length} active`,
        `clock    day ${this.state.world.day} ${this.state.timeLabel()}`,
      ].join("\n"),
    );
  }

  private toast(message: string): void {
    this.game.events.emit("korvana:toast", message);
  }

  get isPaused(): boolean {
    return this.paused;
  }
}
