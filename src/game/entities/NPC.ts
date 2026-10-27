import type Phaser from "phaser";

import type { NpcRole } from "../data/npcs";
import { Actor } from "./Actor";
import type { NpcReaction } from "./Reactions";
import { Roamer } from "./Roamer";
import type { WorldManager } from "../world/WorldManager";

export interface NpcConfig {
  id: string;
  name: string;
  look: string;
  dialogueId: string;
  /** How far from the spawn point the NPC is willing to wander. */
  roam?: number;
  role?: NpcRole;
}

/**
 * A named villager. They keep to a home patch, idle facing a steady direction,
 * and only ever walk paths they can actually see the end of.
 */
export class NPC extends Actor {
  readonly id: string;
  readonly name: string;
  readonly dialogueId: string;
  readonly role: NpcRole | undefined;
  /** Where they were placed, which is where they go back to after a fright. */
  readonly home: { readonly x: number; readonly y: number };
  /**
   * Something that has taken them over for a while - running from a blow,
   * squaring up to a spell. See systems/CivilianSystem.ts.
   */
  reaction: NpcReaction | null = null;

  private readonly roamer: Roamer;

  constructor(scene: Phaser.Scene, config: NpcConfig, x: number, y: number) {
    super(scene, config.look, x, y);
    this.id = config.id;
    this.name = config.name;
    this.dialogueId = config.dialogueId;
    this.role = config.role;
    this.home = { x, y };
    this.speed = 54;

    this.roamer = new Roamer({
      homeX: x,
      homeY: y,
      radius: config.roam ?? 96,
      idleMin: 1.8,
      idleMax: 5.5,
      speed: 54,
    });
  }

  /** Nobody stops for a chat while running away or squaring up to a duel. */
  get approachable(): boolean {
    return this.reaction === null;
  }

  update(world: WorldManager, dt: number, others: Actor[]): void {
    if (this.reaction) {
      if (this.reaction.update(this, world, dt, others)) this.settle();
      return;
    }
    this.roamer.update(this, world, dt, others);
  }

  /** Ends any reaction; they wander on from wherever they ended up. */
  settle(): void {
    this.reaction = null;
    this.moving = false;
    this.roamer.rebase(this.x, this.y);
  }
}
