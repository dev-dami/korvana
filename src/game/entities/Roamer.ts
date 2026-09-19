import type { Actor } from "./Actor";
import type { Direction } from "../types";
import type { WorldManager } from "../world/WorldManager";

export interface RoamOptions {
  homeX: number;
  homeY: number;
  /** How far from home the actor is willing to go. */
  radius: number;
  idleMin: number;
  idleMax: number;
  speed: number;
}

const DIRECTIONS: Direction[] = ["down", "left", "right", "up"];

/**
 * Deliberate, unhurried wandering.
 *
 * The old behaviour picked a random offset every few seconds and walked
 * straight at it, which meant NPCs jittered against walls and changed their
 * minds constantly. This instead:
 *
 *   - idles for a while, holding a steady facing
 *   - picks a destination it can actually see a clear path to
 *   - walks there properly, steering around obstacles and other actors
 *   - if it gets stuck, gives up gracefully rather than grinding
 */
export class Roamer {
  private phase: "idle" | "walk" = "idle";
  private timer: number;
  private destX: number;
  private destY: number;
  private stuckFor = 0;
  private facing: Direction;

  private readonly homeX: number;
  private readonly homeY: number;
  private readonly radius: number;
  private readonly idleMin: number;
  private readonly idleMax: number;
  private readonly speed: number;

  constructor(options: RoamOptions) {
    this.homeX = options.homeX;
    this.homeY = options.homeY;
    this.radius = options.radius;
    this.idleMin = options.idleMin;
    this.idleMax = options.idleMax;
    this.speed = options.speed;
    this.destX = options.homeX;
    this.destY = options.homeY;
    this.facing = DIRECTIONS[Math.floor(Math.random() * DIRECTIONS.length)] ?? "down";
    this.timer = this.roll();
  }

  get isWalking(): boolean {
    return this.phase === "walk";
  }

  update(actor: Actor, world: WorldManager, dt: number, others: Actor[]): void {
    if (this.phase === "idle") {
      actor.setIdleFacing(this.facing);
      this.timer -= dt;
      if (this.timer <= 0) this.chooseDestination(actor, world);
      return;
    }

    const result = actor.walkTowards(world, this.destX, this.destY, this.speed, dt, others);
    this.facing = actor.direction;

    if (Math.hypot(this.destX - actor.x, this.destY - actor.y) < 4) {
      this.rest();
      return;
    }

    if (result.blocked) {
      this.stuckFor += dt;
      if (this.stuckFor > 0.7) this.rest();
    } else {
      this.stuckFor = 0;
    }
  }

  /** Called when an NPC is shoved somewhere; they will wander from the new spot. */
  rebase(x: number, y: number): void {
    this.destX = x;
    this.destY = y;
    this.rest();
  }

  private rest(): void {
    this.phase = "idle";
    this.stuckFor = 0;
    this.timer = this.roll();
  }

  private roll(): number {
    return this.idleMin + Math.random() * (this.idleMax - this.idleMin);
  }

  private chooseDestination(actor: Actor, world: WorldManager): void {
    for (let attempt = 0; attempt < 16; attempt++) {
      const angle = Math.random() * Math.PI * 2;
      const distance = 24 + Math.random() * this.radius;
      const x = this.homeX + Math.cos(angle) * distance;
      const y = this.homeY + Math.sin(angle) * distance;

      if (!actor.canStand(world, x, y)) continue;
      // Later attempts drop the line-of-sight requirement, so an actor that has
      // ended up boxed in can still pick somewhere and let steering work it out
      // rather than standing still forever.
      if (attempt < 10 && !this.hasClearPath(actor, world, x, y)) continue;

      this.destX = x;
      this.destY = y;
      this.phase = "walk";
      this.stuckFor = 0;
      return;
    }
    // Nowhere sensible to go: stand and look around for a while longer.
    this.rest();
  }

  /** Samples the straight line to the destination so we never aim through a wall. */
  private hasClearPath(actor: Actor, world: WorldManager, targetX: number, targetY: number): boolean {
    const dx = targetX - actor.x;
    const dy = targetY - actor.y;
    const steps = Math.max(2, Math.ceil(Math.hypot(dx, dy) / 16));
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      if (!actor.canStand(world, actor.x + dx * t, actor.y + dy * t)) return false;
    }
    return true;
  }
}
