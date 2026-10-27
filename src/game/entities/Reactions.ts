import type { Actor } from "./Actor";
import type { WorldManager } from "../world/WorldManager";

/** Anything with a position worth running from, or facing up to. */
export interface Point {
  readonly x: number;
  readonly y: number;
}

/**
 * Something that takes over an NPC for a while instead of its usual wandering:
 * running from a blow, squaring up to a spell. `update` returns true once it
 * has finished and the NPC may go back to its own business.
 */
export interface NpcReaction {
  update(actor: Actor, world: WorldManager, dt: number, others: Actor[]): boolean;
}

/** How fast a frightened person runs, as a multiple of their walk. */
export const FLEE_SPEED_SCALE = 2.2;
/** How far ahead a flight is planned. Short, so it bends round corners rather than into them. */
const LOOKAHEAD = 84;
/** How often the way out is reconsidered. */
const REPLAN = 0.32;
/**
 * Headings tried in order, as offsets from straight away. Wider angles come
 * later: running sideways past the threat is better than into a wall, but not
 * better than running away.
 */
const HEADINGS = [0, 0.45, -0.45, 0.9, -0.9, 1.35, -1.35, 1.9, -1.9];

/**
 * Turning tail.
 *
 *   run    - away from the threat at a sprint, picking whichever heading has
 *            clear ground ahead, re-planned a few times a second so a wall
 *            bends the flight rather than ending it
 *   cower  - catch their breath, peeking back over their shoulder
 *   return - walk home at an ordinary pace, sheepishly
 *
 * A cornered NPC skips straight to cowering instead of grinding into the wall.
 */
export class Flee implements NpcReaction {
  private phase: "run" | "cower" | "return" = "run";
  private timer: number;
  private replan = 0;
  private goalX = 0;
  private goalY = 0;
  private stuckFor = 0;
  private peek = 0;

  private readonly threat: Point;
  private readonly home: Point;
  private readonly walkSpeed: number;

  constructor(threat: Point, home: Point, walkSpeed: number, duration = 4 + Math.random() * 2) {
    this.threat = threat;
    this.home = home;
    this.walkSpeed = walkSpeed;
    this.timer = duration;
  }

  get running(): boolean {
    return this.phase === "run";
  }

  update(actor: Actor, world: WorldManager, dt: number, others: Actor[]): boolean {
    this.timer -= dt;
    switch (this.phase) {
      case "run":
        return this.run(actor, world, dt, others);
      case "cower":
        return this.cower(actor, dt);
      case "return":
        return this.goHome(actor, world, dt, others);
    }
  }

  private run(actor: Actor, world: WorldManager, dt: number, others: Actor[]): boolean {
    this.replan -= dt;
    if (this.replan <= 0 || Math.hypot(this.goalX - actor.x, this.goalY - actor.y) < 10) {
      this.replan = REPLAN;
      if (!this.plan(actor, world)) {
        this.startCowering();
        return false;
      }
    }

    const step = actor.walkTowards(world, this.goalX, this.goalY, this.walkSpeed * FLEE_SPEED_SCALE, dt, others);
    this.stuckFor = step.blocked ? this.stuckFor + dt : 0;
    if (this.stuckFor > 0.25) this.replan = 0;
    if (this.stuckFor > 0.9 || this.timer <= 0) this.startCowering();
    return false;
  }

  /** Picks the most "away" heading with clear ground ahead. False when cornered. */
  private plan(actor: Actor, world: WorldManager): boolean {
    const away = Math.atan2(actor.y - this.threat.y, actor.x - this.threat.x);
    for (const offset of HEADINGS) {
      const angle = away + offset;
      const x = actor.x + Math.cos(angle) * LOOKAHEAD;
      const y = actor.y + Math.sin(angle) * LOOKAHEAD;
      if (!clearLine(actor, world, x, y)) continue;
      this.goalX = x;
      this.goalY = y;
      return true;
    }
    return false;
  }

  private startCowering(): void {
    this.phase = "cower";
    this.timer = 1.4 + Math.random() * 1.2;
    this.peek = 0;
  }

  /** Stands still, glancing back at the threat and away again. */
  private cower(actor: Actor, dt: number): boolean {
    this.peek -= dt;
    if (this.peek <= 0) {
      this.peek = 0.4 + Math.random() * 0.35;
      const looking = Math.random() < 0.6;
      const dx = this.threat.x - actor.x;
      const dy = this.threat.y - actor.y;
      actor.moving = false;
      actor.turnTo({ x: actor.x + (looking ? dx : -dx), y: actor.y + (looking ? dy : -dy) });
    }
    if (this.timer <= 0) {
      this.phase = "return";
      this.timer = 14;
      this.stuckFor = 0;
    }
    return false;
  }

  /**
   * Back to where they came from. If the way is blocked they stop trying and
   * let ordinary wandering, which steers round obstacles from wherever they
   * are, bring them back in its own time.
   */
  private goHome(actor: Actor, world: WorldManager, dt: number, others: Actor[]): boolean {
    if (Math.hypot(this.home.x - actor.x, this.home.y - actor.y) < 24) return true;
    const step = actor.walkTowards(world, this.home.x, this.home.y, this.walkSpeed, dt, others);
    this.stuckFor = step.blocked ? this.stuckFor + dt : 0;
    return this.stuckFor > 1.5 || this.timer <= 0;
  }
}

/**
 * Squaring up: stand still, face the challenger, wand raised. Never finishes
 * on its own - the duel decides when it is over.
 */
export class Standoff implements NpcReaction {
  private readonly opponent: Point;

  constructor(opponent: Point) {
    this.opponent = opponent;
  }

  update(actor: Actor): boolean {
    actor.moving = false;
    actor.turnTo(this.opponent);
    actor.sync();
    return false;
  }
}

/** Samples the straight line to a point so a flight never aims through a wall. */
function clearLine(actor: Actor, world: WorldManager, x: number, y: number): boolean {
  const dx = x - actor.x;
  const dy = y - actor.y;
  const steps = Math.max(2, Math.ceil(Math.hypot(dx, dy) / 14));
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    if (!actor.canStand(world, actor.x + dx * t, actor.y + dy * t)) return false;
  }
  return true;
}
