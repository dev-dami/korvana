import type Phaser from "phaser";

import { TILE } from "../config";
import { ITEMS } from "../data/items";
import { LANDMARKS } from "../data/landmarks";
import { itemTintHex } from "../gfx/tiles";
import { Pickup } from "../entities/Pickup";
import type { GameState } from "../state/GameState";
import type { WorldManager } from "../world/WorldManager";
import type { GameEvents } from "./GameEvents";

/** Beyond this, a pickup is not even considered - the chunks under it are not loaded. */
const ACTIVE_RANGE = 2400;

/**
 * The items lying about the world.
 *
 * Positions are authored per landmark, and whether a given one has already been
 * collected is stored as a flag on the save, so a shard you picked up on
 * Tuesday is still gone on Thursday. Without that, gathering quests would be
 * farmable by walking in and out of a chunk.
 */
export class PickupSystem {
  private readonly scene: Phaser.Scene;
  private readonly state: GameState;
  private readonly world: WorldManager;
  private readonly events: GameEvents;

  private pickups: Pickup[] = [];
  /** Which landmark slot each live pickup came from, so it can be flagged as taken. */
  private readonly slots = new Map<Pickup, string>();

  /** Set by the scene to surface a "picked up" message. */
  onCollected: ((name: string, qty: number) => void) | null = null;

  constructor(
    scene: Phaser.Scene,
    state: GameState,
    world: WorldManager,
    events: GameEvents,
  ) {
    this.scene = scene;
    this.state = state;
    this.world = world;
    this.events = events;
  }

  build(): void {
    this.clear();

    for (const landmark of LANDMARKS) {
      const spots = landmark.pickups ?? [];
      for (let i = 0; i < spots.length; i++) {
        const spot = spots[i];
        if (!spot) continue;

        const flag = PickupSystem.flagFor(landmark.id, i);
        if (this.state.flag(flag)) continue;

        const def = ITEMS[spot.id];
        if (!def) continue;

        const placed = this.findOpenGround(
          (landmark.tx + spot.dx + 0.5) * TILE,
          (landmark.ty + spot.dy + 1) * TILE,
        );
        if (!placed) continue;

        const pickup = new Pickup(
          this.scene,
          spot.id,
          def.kind,
          itemTintHex(def.kind),
          spot.qty ?? 1,
          placed.x,
          placed.y,
        );
        this.pickups.push(pickup);
        this.slots.set(pickup, flag);
      }
    }
  }

  update(dt: number, playerX: number, playerY: number): void {
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const pickup = this.pickups[i];
      if (!pickup) continue;

      const near =
        Math.abs(pickup.x - playerX) <= ACTIVE_RANGE &&
        Math.abs(pickup.y - playerY) <= ACTIVE_RANGE;
      if (!near) continue;

      pickup.update(dt, playerX, playerY);

      if (pickup.inRange(playerX, playerY)) {
        this.collect(pickup);
        this.pickups.splice(i, 1);
      }
    }
  }

  clear(): void {
    for (const pickup of this.pickups) pickup.destroy();
    this.pickups = [];
    this.slots.clear();
  }

  get active(): number {
    return this.pickups.length;
  }

  static flagFor(landmarkId: string, index: number): string {
    return `pickup_${landmarkId}_${index}`;
  }

  /**
   * Nudges a pickup off a wall tile so it can actually be reached - a shard
   * authored one tile too far into a ruin is invisible progress.
   */
  private findOpenGround(x: number, y: number): { x: number; y: number } | null {
    if (this.world.canStandAt(x, y)) return { x, y };

    for (let r = 1; r <= 4; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const nx = x + dx * TILE;
          const ny = y + dy * TILE;
          if (this.world.canStandAt(nx, ny)) return { x: nx, y: ny };
        }
      }
    }
    return null;
  }

  private collect(pickup: Pickup): void {
    const flag = this.slots.get(pickup);
    if (flag) this.state.setFlag(flag);
    this.slots.delete(pickup);

    const def = ITEMS[pickup.id];
    pickup.collect();

    this.events.emit({ kind: "item_gained", id: pickup.id, amount: pickup.qty });
    if (def) this.onCollected?.(def.name, pickup.qty);
  }
}
