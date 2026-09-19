import type Phaser from "phaser";

import type { WorldScene } from "../scenes/WorldScene";

/**
 * A panel of the HUD.
 *
 * Each component owns the game objects it creates and destroys them on
 * `destroy()`. That is the structural fix for the bug this HUD used to have:
 * Phaser re-runs `create()` when a running scene is launched again, and the old
 * implementation pushed fresh objects into field-initialised arrays, so after
 * the first restart every panel drew into a destroyed text object and silently
 * rendered nothing.
 */
export abstract class UiComponent {
  protected readonly scene: Phaser.Scene;
  protected readonly world: WorldScene;
  private readonly owned: Phaser.GameObjects.GameObject[] = [];

  constructor(scene: Phaser.Scene, world: WorldScene) {
    this.scene = scene;
    this.world = world;
  }

  /** Builds the component's game objects. Called once per scene create. */
  abstract create(): void;

  /**
   * Positions and redraws. Called every frame with the logical (CSS pixel)
   * viewport size, so panel layout survives a window resize without any
   * dedicated handling.
   */
  abstract update(width: number, height: number, time: number): void;

  /** Registers an object for automatic teardown. */
  protected track<T extends Phaser.GameObjects.GameObject>(object: T): T {
    this.owned.push(object);
    return object;
  }

  destroy(): void {
    for (const object of this.owned) object.destroy();
    this.owned.length = 0;
  }
}
