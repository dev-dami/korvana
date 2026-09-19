import Phaser from "phaser";

import { applyCameraZoom, viewHeight, viewWidth } from "../display";
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
import type { UiComponent } from "../ui/UiComponent";
import type { WorldScene } from "./WorldScene";

/**
 * The HUD, assembled from components.
 *
 * It only ever reads from WorldScene - all state changes happen in the systems,
 * which keeps the display dumb and easy to reason about.
 *
 * All layout is in logical (CSS) pixels; the camera zoom from display.ts turns
 * that into device pixels. Positions are recomputed every frame, so a window
 * resize needs no special handling.
 *
 * Each panel owns its own game objects (see UiComponent), which is what makes
 * this scene safe to relaunch: WorldScene re-launches it on every restart, and
 * Phaser re-runs create() for an already-running scene. Tearing the components
 * down and rebuilding them leaves nothing pointing at a destroyed object.
 */
export class UIScene extends Phaser.Scene {
  private world!: WorldScene;
  private components: UiComponent[] = [];
  private toasts!: ToastStack;

  constructor() {
    super("ui");
  }

  create(): void {
    this.world = this.scene.get("world") as WorldScene;
    applyCameraZoom(this);

    this.destroyComponents();

    this.toasts = new ToastStack(this, this.world);
    this.components = [
      new Hud(this, this.world),
      new AbilityBar(this, this.world),
      new QuestLog(this, this.world),
      new Compass(this, this.world),
      // Toasts sit above the readouts but below anything modal.
      this.toasts,
      new DialogueBox(this, this.world),
      new InventoryPanel(this, this.world),
      new JournalPanel(this, this.world),
      new SpellbookPanel(this, this.world),
      new PauseOverlay(this, this.world),
      new CutsceneOverlay(this, this.world),
    ];

    for (const component of this.components) component.create();

    this.game.events.on("korvana:toast", this.onToast, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off("korvana:toast", this.onToast, this);
      this.destroyComponents();
    });
  }

  update(time: number): void {
    if (!this.world?.state) return;

    const width = viewWidth(this);
    const height = viewHeight(this);

    for (const component of this.components) component.update(width, height, time);
  }

  /** Anything the story wants to say to the player. */
  private onToast(message: string): void {
    this.toasts.push(message);
  }

  private destroyComponents(): void {
    for (const component of this.components) component.destroy();
    this.components = [];
  }
}
