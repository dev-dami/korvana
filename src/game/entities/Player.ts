import Phaser from "phaser";

import { PLAYER_DASH_COOLDOWN, PLAYER_DASH_DISTANCE, PLAYER_SPEED, PLAYER_SPRINT } from "../config";
import { Actor, dirVector } from "./Actor";
import type { WorldManager } from "../world/WorldManager";

/** Every physical key that can drive one direction. */
interface MoveKeys {
  up: Phaser.Input.Keyboard.Key[];
  down: Phaser.Input.Keyboard.Key[];
  left: Phaser.Input.Keyboard.Key[];
  right: Phaser.Input.Keyboard.Key[];
}

export class Player extends Actor {
  /** Multiplier applied while committed to a swing, so heavy attacks cost you. */
  speedScale = 1;

  private readonly move: MoveKeys;
  private readonly sprintKey: Phaser.Input.Keyboard.Key;
  private dashCooldownMs = 0;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, "hero", x, y);
    this.speed = PLAYER_SPEED;

    const kb = scene.input.keyboard;
    if (!kb) throw new Error("Keyboard input is unavailable");

    const cursors = kb.createCursorKeys();
    const K = Phaser.Input.Keyboard.KeyCodes;

    this.move = {
      up: [cursors.up, kb.addKey(K.W)],
      down: [cursors.down, kb.addKey(K.S)],
      left: [cursors.left, kb.addKey(K.A)],
      right: [cursors.right, kb.addKey(K.D)],
    };
    this.sprintKey = kb.addKey(K.SHIFT);
  }

  update(world: WorldManager, dt: number): void {
    this.dashCooldownMs = Math.max(0, this.dashCooldownMs - dt * 1000);

    let vx = 0;
    let vy = 0;

    if (this.anyDown(this.move.left)) vx -= 1;
    if (this.anyDown(this.move.right)) vx += 1;
    if (this.anyDown(this.move.up)) vy -= 1;
    if (this.anyDown(this.move.down)) vy += 1;

    if (vx !== 0 && vy !== 0) {
      const inv = Math.SQRT1_2;
      vx *= inv;
      vy *= inv;
    }

    const speed = (this.sprintKey.isDown ? PLAYER_SPRINT : this.speed) * this.speedScale;
    this.applyVelocity(world, vx * speed, vy * speed, dt);
  }

  get sprinting(): boolean {
    return this.sprintKey.isDown;
  }

  get dashCooldownFraction(): number {
    return this.dashCooldownMs / PLAYER_DASH_COOLDOWN;
  }

  dash(world: WorldManager): boolean {
    if (this.dashCooldownMs > 0) return false;

    const vector = dirVector(this.direction);
    const step = 6;
    let travelled = 0;

    while (travelled < PLAYER_DASH_DISTANCE) {
      const nextX = this.x + vector.x * step;
      const nextY = this.y + vector.y * step;
      if (!this.canStand(world, nextX, nextY)) break;
      this.x = nextX;
      this.y = nextY;
      travelled += step;
    }

    if (travelled === 0) return false;
    this.dashCooldownMs = PLAYER_DASH_COOLDOWN;
    this.moving = false;
    this.sync();
    return true;
  }

  private anyDown(keys: Phaser.Input.Keyboard.Key[]): boolean {
    for (const key of keys) {
      if (key.isDown) return true;
    }
    return false;
  }
}
