import type Phaser from "phaser";

import { DEPTH } from "../config";
import { animKey, attackKey, castKey, idleKey, sheetKey } from "../gfx/characters";
import type { Direction } from "../types";
import type { WorldManager } from "../world/WorldManager";

export interface FootBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface StepResult {
  /** Pixels actually travelled this step. */
  moved: number;
  /** True when the actor could not find any way forward. */
  blocked: boolean;
}

const PERSONAL_SPACE = 30;

/**
 * Height above an actor's feet of the point attacks are aimed at.
 *
 * Sprites are 32x48 frames with their feet at `y`; a student's robe reads from
 * about `y-20` to `y-3` and an adult's a little higher, so this lands on the
 * torso. Melee arcs and spell bolts both use it so their hit boxes cannot
 * drift apart.
 */
export const ACTOR_BODY_OFFSET = 14;

/** Which held pose an actor can strike. See gfx/characters.ts. */
export type ActorPose = "cast" | "attack";

/**
 * Anything that walks around with its feet on the ground: a sprite, a shadow,
 * 4-way facing, tile collision, and steering that keeps it out of walls and
 * out of its neighbours' way.
 */
export class Actor {
  readonly scene: Phaser.Scene;
  readonly sprite: Phaser.GameObjects.Sprite;
  readonly shadow: Phaser.GameObjects.Image;
  /** The costume being worn. Change it with setLook(). */
  lookKey: string;

  /** Feet position in world pixels - the anchor everything else uses. */
  x: number;
  y: number;

  direction: Direction = "down";
  moving = false;
  speed = 150;

  protected footW = 22;
  protected footH = 14;
  private destroyed = false;
  /** Scene time until which a struck pose (cast, attack) holds the sprite. */
  private poseUntil = 0;

  constructor(scene: Phaser.Scene, lookKey: string, x: number, y: number) {
    this.scene = scene;
    // A look that was never drawn falls back to a plain student rather than
    // crashing the scene on a missing animation.
    this.lookKey = scene.textures.exists(sheetKey(lookKey)) ? lookKey : "student";
    this.x = x;
    this.y = y;

    this.shadow = scene.add
      .image(x, y, "fx_shadow")
      .setOrigin(0.5, 0.5)
      .setDepth(DEPTH.shadow)
      .setAlpha(0.55);

    this.sprite = scene.add
      .sprite(x, y, sheetKey(this.lookKey), 0)
      .setOrigin(0.5, 1)
      .setDepth(y);

    this.playIdle("down");
  }

  get alive(): boolean {
    return !this.destroyed;
  }

  setPosition(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.sync();
  }

  // --- geometry ----------------------------------------------------------

  protected footBox(x: number, y: number): FootBox {
    return {
      x: x - this.footW / 2,
      y: y - this.footH,
      w: this.footW,
      h: this.footH,
    };
  }

  /** Can this actor physically stand with its feet at (x, y)? */
  canStand(world: WorldManager, x: number, y: number): boolean {
    const box = this.footBox(x, y);
    return !world.chunks.boxSolid(box.x, box.y, box.w, box.h);
  }

  // --- animation ---------------------------------------------------------

  protected playIdle(dir: Direction): void {
    this.direction = dir;
    if (this.posing) return;
    this.sprite.anims.play(idleKey(this.lookKey, dir), true);
  }

  protected playWalk(dir: Direction): void {
    this.direction = dir;
    if (this.posing) return;
    this.sprite.anims.play(animKey(this.lookKey, dir), true);
  }

  private get posing(): boolean {
    return this.poseUntil > this.scene.time.now;
  }

  /**
   * Changes costume without losing place: the same facing and the same
   * walk-or-stand state carry over. Unknown looks are ignored rather than
   * leaving the actor invisible.
   */
  setLook(lookKey: string): void {
    if (lookKey === this.lookKey || !this.scene.textures.exists(sheetKey(lookKey))) return;
    this.lookKey = lookKey;
    this.poseUntil = 0;
    if (this.moving) this.playWalk(this.direction);
    else this.playIdle(this.direction);
  }

  /**
   * Holds a cast or attack pose for a moment - wand raised, or lunging - then
   * drops back into walking or standing on the next update.
   */
  strikePose(pose: ActorPose, durationMs = 220): void {
    const key = pose === "cast" ? castKey(this.lookKey, this.direction) : attackKey(this.lookKey, this.direction);
    if (!this.scene.anims.exists(key)) return;
    this.poseUntil = this.scene.time.now + durationMs;
    this.sprite.anims.play(key, true);
  }

  /** Stand still, but keep looking a particular way. */
  setIdleFacing(dir: Direction): void {
    if (!this.moving) this.playIdle(dir);
  }

  /** Stands still and ignores movement input, for cutscenes and pauses. */
  holdStill(): void {
    this.moving = false;
    this.playIdle(this.direction);
    this.sync();
  }

  /** Push the logical position into the game objects. */
  sync(): void {
    const px = Math.round(this.x);
    const py = Math.round(this.y);
    this.sprite.setPosition(px, py);
    if (this.sprite.depth !== py) this.sprite.setDepth(py);
    this.shadow.setPosition(px, py - 1);
  }

  // --- movement ----------------------------------------------------------

  /** Axis-separated movement so sliding along walls feels natural. */
  protected moveAndCollide(world: WorldManager, dx: number, dy: number): void {
    if (dx !== 0) {
      const box = this.footBox(this.x + dx, this.y);
      if (!world.chunks.boxSolid(box.x, box.y, box.w, box.h)) this.x += dx;
    }
    if (dy !== 0) {
      const box = this.footBox(this.x, this.y + dy);
      if (!world.chunks.boxSolid(box.x, box.y, box.w, box.h)) this.y += dy;
    }
  }

  /** Applies a movement vector, picking the dominant axis for facing. */
  protected applyVelocity(world: WorldManager, vx: number, vy: number, dt: number): void {
    this.moving = vx !== 0 || vy !== 0;
    if (!this.moving) {
      this.playIdle(this.direction);
      this.sync();
      return;
    }

    if (Math.abs(vx) > Math.abs(vy)) {
      this.playWalk(vx < 0 ? "left" : "right");
    } else {
      this.playWalk(vy < 0 ? "up" : "down");
    }

    this.moveAndCollide(world, vx * dt, vy * dt);
    this.sync();
  }

  /**
   * Walks toward a point, steering around walls and keeping a polite distance
   * from `others`. Returns how far it actually got, so callers can notice when
   * they are stuck instead of grinding against a wall forever.
   */
  walkTowards(
    world: WorldManager,
    targetX: number,
    targetY: number,
    speed: number,
    dt: number,
    others: Actor[] = [],
  ): StepResult {
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 2) {
      this.applyVelocity(world, 0, 0, dt);
      return { moved: 0, blocked: false };
    }

    let vx = dx / distance;
    let vy = dy / distance;

    // Personal space: push away from anyone we are about to walk into.
    let pushX = 0;
    let pushY = 0;
    for (const other of others) {
      if (other === this || !other.alive) continue;
      const ox = this.x - other.x;
      const oy = this.y - other.y;
      const d = Math.hypot(ox, oy);
      if (d > 0.001 && d < PERSONAL_SPACE) {
        const weight = (PERSONAL_SPACE - d) / PERSONAL_SPACE;
        pushX += (ox / d) * weight;
        pushY += (oy / d) * weight;
      }
    }
    vx += pushX;
    vy += pushY;
    const norm = Math.hypot(vx, vy);
    if (norm < 0.0001) {
      this.applyVelocity(world, 0, 0, dt);
      return { moved: 0, blocked: true };
    }
    vx /= norm;
    vy /= norm;

    // Look before you leap: probe a little way ahead.
    const probe = 22;
    if (!this.canStand(world, this.x + vx * probe, this.y + vy * probe)) {
      const perpX = -vy;
      const perpY = vx;
      if (!this.canStand(world, this.x + vx * probe, this.y + vy * probe * 0.15)) {
        vy = 0;
        vx = Math.sign(vx) || perpX;
      } else if (!this.canStand(world, this.x + vx * probe * 0.15, this.y + vy * probe)) {
        vx = 0;
        vy = Math.sign(vy) || perpY;
      } else if (this.canStand(world, this.x + perpX * probe, this.y + perpY * probe)) {
        vx = perpX;
        vy = perpY;
      } else if (this.canStand(world, this.x - perpX * probe, this.y - perpY * probe)) {
        vx = -perpX;
        vy = -perpY;
      } else {
        this.applyVelocity(world, 0, 0, dt);
        return { moved: 0, blocked: true };
      }
    }

    const beforeX = this.x;
    const beforeY = this.y;
    this.applyVelocity(world, vx * speed, vy * speed, dt);
    const moved = Math.hypot(this.x - beforeX, this.y - beforeY);
    return { moved, blocked: moved < 0.15 };
  }

  // --- misc --------------------------------------------------------------

  distanceTo(other: { x: number; y: number }): number {
    return Math.hypot(other.x - this.x, other.y - this.y);
  }

  faceTowards(other: { x: number; y: number }): void {
    const dx = other.x - this.x;
    const dy = other.y - this.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      this.direction = dx < 0 ? "left" : "right";
    } else {
      this.direction = dy < 0 ? "up" : "down";
    }
  }

  /** Faces a point and updates the sprite immediately (used when attacking). */
  turnTo(point: { x: number; y: number }): void {
    this.faceTowards(point);
    this.playIdle(this.direction);
  }

  setTint(color: number): void {
    this.sprite.setTint(color);
  }

  clearTint(): void {
    this.sprite.clearTint();
  }

  /** Brief red flash used when something takes a hit. */
  flash(color = 0xff6b6b): void {
    this.setTint(color);
    this.scene.time.delayedCall(130, () => {
      if (!this.destroyed) this.clearTint();
    });
  }

  /** Lunge a step in a direction, used by melee swings. */
  lunge(dir: Direction, distance: number, world: WorldManager): void {
    const vec = dirVector(dir);
    const targetX = this.x + vec.x * distance;
    const targetY = this.y + vec.y * distance;
    if (this.canStand(world, targetX, targetY)) {
      this.x = targetX;
      this.y = targetY;
      this.sync();
    }
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.sprite.destroy();
    this.shadow.destroy();
  }
}

export function dirVector(dir: Direction): { x: number; y: number } {
  switch (dir) {
    case "up":
      return { x: 0, y: -1 };
    case "down":
      return { x: 0, y: 1 };
    case "left":
      return { x: -1, y: 0 };
    case "right":
      return { x: 1, y: 0 };
  }
}
