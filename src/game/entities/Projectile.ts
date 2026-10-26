import Phaser from "phaser";

import { ACTOR_BODY_OFFSET } from "./Actor";
import type { Actor } from "./Actor";
import type { LightRegistry, LightSource } from "../gfx/lights";
import type { WorldManager } from "../world/WorldManager";

/**
 * Hit radius for a bolt whose spell does not declare one. Spell radii are
 * authored in data/spells.ts; this is only the fallback.
 */
export const DEFAULT_PROJECTILE_RADIUS = 14;

/** Bolt colour when the caster does not choose one: the Academy's arcane blue. */
const DEFAULT_COLOR = 0x8fd4ff;

export interface ProjectileOptions {
  damage: number;
  speed: number;
  /** Lifetime in seconds. */
  life: number;
  radius?: number;
  scale?: number;
  /** 0xRRGGBB tint for the bolt, its trail and the light it casts. */
  color?: number;
}

/** The scene's light registry, if it has one (WorldScene does; battles do not). */
function registryOf(scene: Phaser.Scene): LightRegistry | null {
  return (scene as Phaser.Scene & { lightRegistry?: LightRegistry }).lightRegistry ?? null;
}

/**
 * A spell bolt. Travels until it hits a wall, a target, or runs out of time.
 *
 * Visually it is a white-hot orb at the head of a coloured comet streak,
 * wrapped in a pulsing halo, shedding sparks, and carrying its own light -
 * at night a bolt lights up the ground it flies over.
 */
export class Projectile {
  readonly sprite: Phaser.GameObjects.Image;
  readonly glow: Phaser.GameObjects.Image;

  x: number;
  y: number;
  damage: number;
  radius: number;
  alive = true;

  private readonly scene: Phaser.Scene;
  private readonly streak: Phaser.GameObjects.Image;
  private readonly vx: number;
  private readonly vy: number;
  private readonly color: number;
  private readonly scale: number;
  private readonly light: LightSource | null;
  private life: number;
  private age = 0;
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
    this.color = options.color ?? DEFAULT_COLOR;

    // Bigger hit box, bigger bolt - the two are authored together in spell data.
    const scale = options.scale ?? this.radius / DEFAULT_PROJECTILE_RADIUS;
    this.scale = scale;
    this.glow = scene.add
      .image(x, y, "fx_halo")
      .setScale(0.9 * scale)
      .setTint(this.color)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(y + 40);
    this.streak = scene.add
      .image(x, y, "fx_bolt")
      .setOrigin(0.86, 0.5)
      .setRotation(angle)
      .setScale(0.9 * scale, 0.75 * scale)
      .setTint(this.color)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(y + 40);
    this.sprite = scene.add
      .image(x, y, "fx_orb")
      .setScale(0.8 * scale)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(y + 41);

    const registry = registryOf(scene);
    this.light = registry
      ? registry.add({ x, y, radius: 96 * scale, color: this.color, intensity: 0.85, flicker: 0.15 })
      : null;
  }

  /**
   * Advances the bolt. Returns the actor it hit, or `null` if it is still
   * flying. Dead projectiles are destroyed by the caller.
   */
  update(dt: number, world: WorldManager, targets: Actor[]): Actor | null {
    if (!this.alive) return null;

    this.life -= dt;
    this.age += dt;
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

    const pulse = 1 + Math.sin(this.age * 30) * 0.12;
    this.sprite.setPosition(this.x, this.y).setDepth(this.y + 41);
    this.streak.setPosition(this.x, this.y).setDepth(this.y + 40);
    this.glow.setPosition(this.x, this.y).setDepth(this.y + 40).setScale(0.9 * this.scale * pulse);
    if (this.light) {
      this.light.x = this.x;
      this.light.y = this.y + 10;
    }

    this.trailTimer -= dt;
    if (this.trailTimer <= 0) {
      this.trailTimer = 0.03;
      this.shed();
    }

    return null;
  }

  /** A spark left behind in the bolt's wake, drifting and fading. */
  private shed(): void {
    const spark = this.scene.add
      .image(this.x + (Math.random() - 0.5) * 6, this.y + (Math.random() - 0.5) * 6, "fx_soft")
      .setScale(0.22 * this.scale)
      .setTint(Math.random() > 0.5 ? this.color : 0xffffff)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(this.y + 39);
    this.scene.tweens.add({
      targets: spark,
      alpha: 0,
      scale: 0.04,
      x: spark.x + (Math.random() - 0.5) * 14,
      y: spark.y + (Math.random() - 0.5) * 14 - 4,
      duration: 260 + Math.random() * 160,
      onComplete: () => spark.destroy(),
    });
  }

  private explode(hitSomething: boolean): void {
    this.alive = false;
    const scene = this.scene;
    const x = this.x;
    const y = this.y;
    const power = hitSomething ? 1 : 0.6;

    const burst = scene.add
      .image(x, y, "fx_halo")
      .setScale(0.4)
      .setTint(this.color)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(y + 60);
    scene.tweens.add({
      targets: burst,
      scale: 1.6 * power,
      alpha: 0,
      duration: 260,
      ease: "Cubic.easeOut",
      onComplete: () => burst.destroy(),
    });

    const ring = scene.add
      .image(x, y, "fx_ring")
      .setScale(0.12)
      .setTint(this.color)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setDepth(y + 61);
    scene.tweens.add({
      targets: ring,
      scale: 0.9 * power,
      alpha: 0,
      duration: 300,
      ease: "Cubic.easeOut",
      onComplete: () => ring.destroy(),
    });

    const sparks = hitSomething ? 9 : 5;
    for (let i = 0; i < sparks; i++) {
      const a = (i / sparks) * Math.PI * 2 + Math.random() * 0.6;
      const d = 18 + Math.random() * 22;
      const spark = scene.add
        .image(x, y, "fx_spark")
        .setTint(i % 2 === 0 ? 0xffffff : this.color)
        .setBlendMode(Phaser.BlendModes.ADD)
        .setDepth(y + 62);
      scene.tweens.add({
        targets: spark,
        x: x + Math.cos(a) * d,
        y: y + Math.sin(a) * d,
        alpha: 0,
        scale: 0.3,
        duration: 240 + Math.random() * 120,
        ease: "Quad.easeOut",
        onComplete: () => spark.destroy(),
      });
    }

    // The flash of the impact lights the surroundings for a moment.
    const registry = registryOf(scene);
    if (registry) {
      const flash = registry.add({ x, y: y + 8, radius: 150 * power, color: this.color, intensity: 1 });
      scene.tweens.add({
        targets: flash,
        intensity: 0,
        duration: 300,
        ease: "Quad.easeOut",
        onComplete: () => registry.remove(flash),
      });
    }

    this.release();
  }

  destroy(): void {
    this.alive = false;
    this.release();
  }

  private release(): void {
    if (this.sprite.active) this.sprite.destroy();
    if (this.glow.active) this.glow.destroy();
    if (this.streak.active) this.streak.destroy();
    if (this.light) registryOf(this.scene)?.remove(this.light);
  }
}
