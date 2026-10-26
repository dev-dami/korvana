import type Phaser from "phaser";

import { DEPTH } from "../config";
import type { EnemyArchetype } from "../data/enemies";
import { Actor } from "./Actor";
import { Roamer } from "./Roamer";
import type { WorldManager } from "../world/WorldManager";

type Mode = "idle" | "chase" | "return";

const BAR_WIDTH = 26;
const BAR_HEIGHT = 3;
/** How far above the feet the health bar floats. Clears the tallest 48px frame. */
const BAR_OFFSET = 50;

/**
 * A hostile that keeps to the area it spawned in. It only chases while the
 * player is close *and* it is still near home, and it steers around walls
 * rather than pushing into them.
 *
 * Stats come from an archetype in data/enemies.ts, so a new enemy is a data
 * entry plus a palette rather than a subclass.
 */
export class Enemy extends Actor {
  readonly archetype: EnemyArchetype;
  health: number;
  readonly maxHealth: number;

  private readonly homeX: number;
  private readonly homeY: number;
  private readonly roamer: Roamer;

  private readonly barBack: Phaser.GameObjects.Image;
  private readonly barFront: Phaser.GameObjects.Image;

  private mode: Mode = "idle";
  private attackCooldown = 0;
  private stuckFor = 0;

  constructor(scene: Phaser.Scene, archetype: EnemyArchetype, x: number, y: number) {
    super(scene, archetype.look, x, y);
    this.archetype = archetype;
    this.health = archetype.health;
    this.maxHealth = archetype.health;
    this.speed = archetype.speed;
    this.shadow.setAlpha(0.45);

    // Two stretched pixels rather than a Graphics: a graphics object per enemy
    // is a lot of canvas churn for three pixels of red.
    this.barBack = scene.add
      .image(x, y - BAR_OFFSET, "fx_pixel")
      .setDisplaySize(BAR_WIDTH, BAR_HEIGHT)
      .setTint(0x1a1c22)
      .setDepth(DEPTH.weather + 1)
      .setVisible(false);
    this.barFront = scene.add
      .image(x - BAR_WIDTH / 2, y - BAR_OFFSET, "fx_pixel")
      .setOrigin(0, 0.5)
      .setDisplaySize(BAR_WIDTH, BAR_HEIGHT)
      .setTint(0xc0392b)
      .setDepth(DEPTH.weather + 2)
      .setVisible(false);

    this.homeX = x;
    this.homeY = y;
    this.roamer = new Roamer({
      homeX: x,
      homeY: y,
      radius: 110,
      idleMin: 1.2,
      idleMax: 3.4,
      speed: archetype.speed * 0.45,
    });
  }

  get distanceHome(): number {
    return Math.hypot(this.homeX - this.x, this.homeY - this.y);
  }

  get damaged(): boolean {
    return this.health < this.maxHealth;
  }

  update(
    world: WorldManager,
    dt: number,
    target: Actor | null,
    others: Actor[],
    onHitPlayer: (damage: number) => void,
  ): void {
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);

    const playerDistance = target ? target.distanceTo(this) : Number.POSITIVE_INFINITY;
    const tooFarFromHome = this.distanceHome > this.archetype.leash;

    if (tooFarFromHome || (this.mode === "return" && this.distanceHome > 28)) {
      this.mode = "return";
      const step = this.walkTowards(world, this.homeX, this.homeY, this.speed * 0.8, dt, others);
      if (step.blocked) this.giveUp(step.moved, dt);
      else this.stuckFor = 0;
      if (this.distanceHome <= 28) this.mode = "idle";
      return;
    }

    if (!target || playerDistance > this.archetype.aggroRange) {
      this.mode = "idle";
      this.roamer.update(this, world, dt, others);
      return;
    }

    this.mode = "chase";

    if (playerDistance <= this.archetype.attackRange) {
      this.faceTowards(target);
      this.setIdleFacing(this.direction);
      if (this.attackCooldown <= 0) {
        this.attackCooldown = 1.1;
        onHitPlayer(this.archetype.damage);
        // A killing blow makes the world clear the field (collapse() destroys
        // every enemy), so this one may no longer exist to finish its swing.
        if (!this.alive) return;
        this.lunge(this.direction, 5, world);
        this.strikePose("attack", 240);
        this.scene.tweens.add({
          targets: this.sprite,
          scaleX: 1.12,
          scaleY: 1.12,
          duration: 90,
          yoyo: true,
        });
      }
      return;
    }

    const step = this.walkTowards(world, target.x, target.y, this.speed, dt, others);
    if (step.blocked) this.giveUp(step.moved, dt);
    else this.stuckFor = 0;
  }

  /** If we cannot reach the player, fall back to guarding home rather than jittering. */
  private giveUp(moved: number, dt: number): void {
    this.stuckFor += dt;
    if (this.stuckFor > 0.8 || moved < 0.1) {
      this.mode = "return";
    }
  }

  takeDamage(amount: number): boolean {
    this.health -= amount;
    this.flash();
    this.updateBar();
    if (this.health <= 0) {
      this.destroy();
      return true;
    }
    return false;
  }

  sync(): void {
    super.sync();
    this.updateBar();
  }

  private updateBar(): void {
    if (!this.alive) return;

    const show = this.damaged && this.health > 0;
    this.barBack.setVisible(show);
    this.barFront.setVisible(show);
    if (!show) return;

    const fraction = Math.max(0, Math.min(1, this.health / this.maxHealth));
    const x = Math.round(this.x);
    const y = Math.round(this.y - BAR_OFFSET);
    this.barBack.setPosition(x, y);

    const filled = Math.max(1, Math.round(BAR_WIDTH * fraction));
    this.barFront.setPosition(x - BAR_WIDTH / 2, y).setDisplaySize(filled, BAR_HEIGHT);
    this.barFront.setTint(fraction > 0.5 ? 0xc0392b : 0xe0663a);
  }

  destroy(): void {
    if (!this.alive) return;
    this.barBack.destroy();
    this.barFront.destroy();
    super.destroy();
  }
}
