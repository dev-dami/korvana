import type Phaser from "phaser";

import type { WorldScene } from "../scenes/WorldScene";
import { Frame } from "./theme";
import type { PanelStyle } from "./theme";

/**
 * A panel of the HUD.
 *
 * Each component owns the game objects it creates and destroys them on
 * `destroy()`. That is the structural fix for the bug this HUD used to have:
 * Phaser re-runs `create()` when a running scene is launched again, and the old
 * implementation pushed fresh objects into field-initialised arrays, so after
 * the first restart every panel drew into a destroyed text object and silently
 * rendered nothing.
 *
 * A component may be given a Layer. Everything it tracks goes into that layer,
 * which is how UIScene fades whole groups (the HUD during a cutscene) without
 * every panel having to know about cutscenes.
 */
export abstract class UiComponent {
  protected readonly scene: Phaser.Scene;
  protected readonly world: WorldScene;
  private readonly owned: Phaser.GameObjects.GameObject[] = [];
  private readonly frames: Frame[] = [];
  private layer: Phaser.GameObjects.Layer | null = null;

  constructor(scene: Phaser.Scene, world: WorldScene) {
    this.scene = scene;
    this.world = world;
  }

  /** Puts everything this component creates into a layer. Call before create(). */
  inLayer(layer: Phaser.GameObjects.Layer): this {
    this.layer = layer;
    return this;
  }

  /** Builds the component's game objects. Called once per scene create. */
  abstract create(): void;

  /**
   * Positions and redraws. Called every frame with the logical (CSS pixel)
   * viewport size, so panel layout survives a window resize without any
   * dedicated handling.
   */
  abstract update(width: number, height: number, time: number): void;

  /**
   * Registers an object for automatic teardown. `layered: false` keeps it out
   * of the component's layer, for things that must stay when the layer hides.
   */
  protected track<T extends Phaser.GameObjects.GameObject>(object: T, layered = true): T {
    this.owned.push(object);
    if (this.layer && layered) this.layer.add(object);
    return object;
  }

  /** A baked ink or parchment panel, owned like any other object. */
  protected frame(style: PanelStyle, depth = 0): Frame {
    const frame = new Frame(this.scene, style).setDepth(depth);
    if (this.layer) this.layer.add(frame.image);
    this.frames.push(frame);
    return frame;
  }

  /** Destroys one tracked object early (a toast that has faded). */
  protected release(object: Phaser.GameObjects.GameObject): void {
    const i = this.owned.indexOf(object);
    if (i >= 0) this.owned.splice(i, 1);
    object.destroy();
  }

  /** Destroys one frame early. */
  protected releaseFrame(frame: Frame): void {
    const i = this.frames.indexOf(frame);
    if (i >= 0) this.frames.splice(i, 1);
    frame.destroy();
  }

  destroy(): void {
    for (const object of this.owned) object.destroy();
    for (const frame of this.frames) frame.destroy();
    this.owned.length = 0;
    this.frames.length = 0;
  }
}
