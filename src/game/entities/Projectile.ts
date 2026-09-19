import type Phaser from "phaser";

import { ACTOR_BODY_OFFSET } from "./Actor";
import type { Actor } from "./Actor";
import type { WorldManager } from "../world/WorldManager";

/**
 * Hit radius for a bolt whose spell does not declare one. Spell radii are
 * authored in data/spells.ts; this is only the fallback.
 */
export const DEFAULT_PROJECTILE_RADIUS = 14;

export interface ProjectileOptions {
  damage: number;
  speed: number;
  /** Lifetime in seconds. */
  life: number;
  radius?: number;
  scale?: number;
}

/** A spell bolt. Travels until it hits a wall, a target, or runs out of time. */
export class Projectile {
  readonly sprite: Phaser.GameObjects.Image;
  readonly glow: Phaser.GameObjects.Image;

  x: number;
  y: number;
  damage: number;
  radius: number;
  alive = true;

  private readonly scene: Phaser.Scene;
  private readonly vx: number;
  private readonly vy: number;
  private life: number;
  private trailTimer = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    angle: number,
    options: ProjectileOptions,
  ) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.damage = options.damage;
    this.life = options.life;
    this.radius = options.radius ?? DEFAULT_PROJECTILE_RADIUS;
    this.vx = Math.cos(angle) * options.speed;
    this.vy = Math.sin(angle) * options.speed;

    // Bigger hit box, bigger bolt - the two are authored together in spell data.
    const scale = options.scale ?? this.radius / DEFAULT_PROJECTILE_RADIUS;
    this.glow = scene.add
      .image(x, y, "fx_glow_cool")
      .setScale(0.28 * scale)
      .setBlendMode("ADD")
      .setDepth(y + 40);
    this.sprite = scene.add
      .image(x, y, "fx_orb")
      .setScale(scale)
      .setBlendMode("ADD")
      .setDepth(y + 41);
  }

  /**
   * Advances the bolt. Returns the actor it hit, or `null` if it is still
   * flying. Dead projectiles are destroyed by the caller.
   */
  update(dt: number, world: WorldManager, targets: Actor[]): Actor | null {
    if (!this.alive) return null;

    this.life -= dt;
    if (this.life <= 0) {
      this.explode(false);
      return null;
    }

    const step = 6;
    const total = Math.hypot(this.vx, this.vy) * dt;
    const steps = Math.max(1, Math.ceil(total / step));

    for (let i = 0; i < steps; i++) {
      this.x += (this.vx * dt) / steps;
      this.y += (this.vy * dt) / steps;

      if (world.isSolidPixel(this.x, this.y)) {
        this.explode(true);
        return null;
      }

      for (const target of targets) {
        if (!target.alive) continue;
        if (
          Math.hypot(
            target.x - this.x,
            target.y - ACTOR_BODY_OFFSET - this.y,
          ) <= this.radius
        ) {
          this.explode(true);
          return target;
        }
      }
    }

    this.sprite.setPosition(this.x, this.y);
    this.sprite.setDepth(this.y + 41);
    this.glow.setPosition(this.x, this.y);
    this.glow.setDepth(this.y + 40);

    this.trailTimer -= dt;
    if (this.trailTimer <= 0) {
      this.trailTimer = 0.045;
      const trail = this.scene.add
        .image(this.x, this.y, "fx_orb")
        .setScale(0.55)
        .setBlendMode("ADD")
        .setDepth(this.y + 39);
      this.scene.tweens.add({
        targets: trail,
        alpha: 0,
        scale: 0.15,
        duration: 260,
        onComplete: () => trail.destroy(),
      });
    }

    return null;
  }

  private explode(hitSomething: boolean): void {
    this.alive = false;

    const burst = this.scene.add
      .image(this.x, this.y, "fx_glow_cool")
      .setScale(0.18)
      .setBlendMode("ADD")
      .setDepth(this.y + 60);
    this.scene.tweens.add({
      targets: burst,
      scale: hitSomething ? 0.75 : 0.45,
      alpha: 0,
      duration: 220,
      onComplete: () => burst.destroy(),
    });

    this.sprite.destroy();
    this.glow.destroy();
  }

  destroy(): void {
    this.alive = false;
    this.sprite.destroy();
    this.glow.destroy();
  }
}
