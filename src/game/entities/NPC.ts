import type Phaser from "phaser";

import { Actor } from "./Actor";
import { Roamer } from "./Roamer";
import type { WorldManager } from "../world/WorldManager";

export interface NpcConfig {
  id: string;
  name: string;
  look: string;
  dialogueId: string;
  /** How far from the spawn point the NPC is willing to wander. */
  roam?: number;
}

/**
 * A named villager. They keep to a home patch, idle facing a steady direction,
 * and only ever walk paths they can actually see the end of.
 */
export class NPC extends Actor {
  readonly id: string;
  readonly name: string;
  readonly dialogueId: string;

  private readonly roamer: Roamer;

  constructor(scene: Phaser.Scene, config: NpcConfig, x: number, y: number) {
    super(scene, config.look, x, y);
    this.id = config.id;
    this.name = config.name;
    this.dialogueId = config.dialogueId;
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

  update(world: WorldManager, dt: number, others: Actor[]): void {
    this.roamer.update(this, world, dt, others);
  }
}
