import type Phaser from "phaser";

import { DEPTH } from "../config";
import type { ItemKind } from "../data/items";
import { itemIconKey } from "../gfx/tiles";

/** How close the player's feet must come before an item is picked up. */
export const PICKUP_RADIUS = 26;

/**
 * An item lying on the ground, waiting to be walked over.
 *
 * Bobs and glows so it reads as interactive against the tiles underneath, which
 * is the only affordance an item on the floor gets.
 */
export class Pickup {
  readonly id: string;
  readonly qty: number;
  readonly x: number;
  readonly y: number;
  taken = false;

  private readonly scene: Phaser.Scene;
  private readonly sprite: Phaser.GameObjects.Image;
  private readonly glow: Phaser.GameObjects.Image;
  private bobPhase: number;

  constructor(
    scene: Phaser.Scene,
    id: string,
    kind: ItemKind,
    tint: number,
    qty: number,
    x: number,
    y: number,
  ) {
    this.scene = scene;
    this.id = id;
    this.qty = qty;
    this.x = x;
    this.y = y;
    this.bobPhase = Math.random() * Math.PI * 2;

    this.glow = scene.add
      .image(x, y, "fx_glow_cool")
      .setBlendMode("ADD")
      .setScale(0.14)
      .setTint(tint)
      .setDepth(DEPTH.decal);

    this.sprite = scene.add
      .image(x, y, itemIconKey(kind))
      .setOrigin(0.5, 0.9)
      .setDepth(DEPTH.decal + 1);
  }

  /** True when the player is standing close enough to take it. */
  inRange(playerX: number, playerY: number): boolean {
    return Math.hypot(this.x - playerX, this.y - playerY) <= PICKUP_RADIUS;
  }

  update(dt: number, playerX: number, playerY: number): void {
    this.bobPhase += dt * 2.6;
    const bob = Math.sin(this.bobPhase) * 2.5;
    const near = Math.hypot(this.x - playerX, this.y - playerY) < 1100;

    this.sprite.setVisible(near).setPosition(this.x, this.y + bob);
    this.glow
      .setVisible(near)
      .setPosition(this.x, this.y + bob)
      .setAlpha(0.65 + Math.sin(this.bobPhase * 0.8) * 0.25);
  }

  /** Plays the collect flourish and removes the item. */
  collect(): void {
    this.taken = true;
    this.scene.tweens.add({
      targets: [this.sprite, this.glow],
      y: this.y - 26,
      alpha: 0,
      scaleX: 0.2,
      scaleY: 0.2,
      duration: 260,
      onComplete: () => this.destroy(),
    });
  }

  destroy(): void {
    this.sprite.destroy();
    this.glow.destroy();
  }
}
