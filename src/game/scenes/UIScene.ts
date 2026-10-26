import Phaser from "phaser";

import { viewHeight, viewWidth } from "../display";
import { AbilityBar } from "../ui/AbilityBar";
import { Compass } from "../ui/Compass";
import { CutsceneOverlay } from "../ui/CutsceneOverlay";
import { DialogueBox } from "../ui/DialogueBox";
import { Hud } from "../ui/Hud";
import { InventoryPanel } from "../ui/InventoryPanel";
import { JournalPanel } from "../ui/JournalPanel";
import { PauseOverlay } from "../ui/PauseOverlay";
import { QuestLog } from "../ui/QuestLog";
import { SpellbookPanel } from "../ui/SpellbookPanel";
import { ToastStack } from "../ui/ToastStack";
import { TYPING_FLAG } from "../ui/Typewriter";
import { uiCamera, UI_DEPTH } from "../ui/theme";
import type { UiComponent } from "../ui/UiComponent";
import type { WorldScene } from "./WorldScene";

/** How quickly the HUD fades in and out, per second. */
const FADE_RATE = 5;

/**
 * The HUD, assembled from components.
 *
 * It only ever reads from WorldScene - all state changes happen in the systems,
 * which keeps the display dumb and easy to reason about.
 *
 * Components live in layers, and the scene decides what each layer shows:
 *
 *   hudTop     - vitals, clock, compass, quest tracker
 *   hudBottom  - spell bar, weapon plate, control hints
 *   toasts     - above the HUD, below anything modal
 *   modal      - conversation, satchel, journal, spellbook, pause
 *   cinema     - the cutscene overlay, over everything
 *
 * During a cutscene or a duel the whole HUD fades away (it used to show
 * through the letterbox); during a conversation or a menu only the bottom
 * row goes, since the panel sits where it would be.
 *
 * All layout is in logical (CSS) pixels; the camera zoom turns that into
 * device pixels. Positions are recomputed every frame, so a window resize
 * needs no special handling.
 *
 * Each panel owns its own game objects (see UiComponent), which is what makes
 * this scene safe to relaunch: WorldScene re-launches it on every restart, and
 * Phaser re-runs create() for an already-running scene.
 */
export class UIScene extends Phaser.Scene {
  private world!: WorldScene;
  private components: UiComponent[] = [];
  private toasts!: ToastStack;
  private hudTop!: Phaser.GameObjects.Layer;
  private hudBottom!: Phaser.GameObjects.Layer;
  private toastLayer!: Phaser.GameObjects.Layer;
  private layers: Phaser.GameObjects.Layer[] = [];
  private topAlpha = 1;
  private bottomAlpha = 1;

  constructor() {
    super("ui");
  }

  create(): void {
    this.world = this.scene.get("world") as WorldScene;
    uiCamera(this);
    this.registry.set(TYPING_FLAG, false);

    this.destroyComponents();
    this.topAlpha = 1;
    this.bottomAlpha = 1;

    const layer = (depth: number): Phaser.GameObjects.Layer => {
      const created = this.add.layer().setDepth(depth);
      this.layers.push(created);
      return created;
    };
    this.hudTop = layer(UI_DEPTH.hud);
    this.hudBottom = layer(UI_DEPTH.hud);
    this.toastLayer = layer(UI_DEPTH.toast);
    const dialogue = layer(UI_DEPTH.dialogue);
    const modal = layer(UI_DEPTH.modal);
    const pause = layer(UI_DEPTH.pause);
    const cinema = layer(UI_DEPTH.cutscene);

    this.toasts = new ToastStack(this, this.world).inLayer(this.toastLayer);
    this.components = [
      new Hud(this, this.world).inLayer(this.hudTop),
      new Compass(this, this.world).inLayer(this.hudTop),
      new QuestLog(this, this.world).inLayer(this.hudTop),
      new AbilityBar(this, this.world).inLayer(this.hudBottom),
      this.toasts,
      new DialogueBox(this, this.world).inLayer(dialogue),
      new InventoryPanel(this, this.world).inLayer(modal),
      new JournalPanel(this, this.world).inLayer(modal),
      new SpellbookPanel(this, this.world).inLayer(modal),
      new PauseOverlay(this, this.world).inLayer(pause),
      new CutsceneOverlay(this, this.world).inLayer(cinema),
    ];

    for (const component of this.components) component.create();

    this.game.events.on("korvana:toast", this.onToast, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off("korvana:toast", this.onToast, this);
      this.registry.set(TYPING_FLAG, false);
      this.destroyComponents();
    });
  }

  update(time: number, delta: number): void {
    if (!this.world?.state) return;

    const width = viewWidth(this);
    const height = viewHeight(this);

    this.fadeLayers(delta / 1000);
    for (const component of this.components) component.update(width, height, time);
  }

  /** Eases the HUD layers toward what the moment calls for. */
  private fadeLayers(dt: number): void {
    const world = this.world;
    const cinematic = world.cutscenes.active || this.scene.isActive("battle");
    const busy = world.dialogue.active || world.inventoryOpen || world.journalOpen || world.spellbookOpen;

    const topTarget = cinematic ? 0 : 1;
    const bottomTarget = cinematic || busy ? 0 : 1;
    const step = dt * FADE_RATE;
    this.topAlpha += Phaser.Math.Clamp(topTarget - this.topAlpha, -step, step);
    this.bottomAlpha += Phaser.Math.Clamp(bottomTarget - this.bottomAlpha, -step, step);

    this.hudTop.setAlpha(this.topAlpha).setVisible(this.topAlpha > 0.01);
    this.hudBottom.setAlpha(this.bottomAlpha).setVisible(this.bottomAlpha > 0.01);
    this.toastLayer.setVisible(!cinematic);
  }

  /** Anything the story wants to say to the player. */
  private onToast(message: string): void {
    this.toasts.push(message);
  }

  private destroyComponents(): void {
    for (const component of this.components) component.destroy();
    this.components = [];
    for (const layer of this.layers) layer.destroy();
    this.layers = [];
  }
}
