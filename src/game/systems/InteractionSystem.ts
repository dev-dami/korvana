import type Phaser from "phaser";

import { DEPTH } from "../config";
import { TEXT_RES } from "../display";
import { bodyText } from "../gfx/fonts";
import type { NPC } from "../entities/NPC";
import type { Player } from "../entities/Player";

/**
 * Finds the NPC the player is standing next to and floats a prompt over them.
 * Keeps the "who can I talk to" question in one place.
 */
export class InteractionSystem {
  target: NPC | null = null;

  private readonly label: Phaser.GameObjects.Text;
  private readonly range: number;
  private readonly player: Player;

  constructor(scene: Phaser.Scene, player: Player, range = 74) {
    this.player = player;
    this.range = range;

    this.label = scene.add
      .text(
        0,
        0,
        "",
        bodyText({ size: 14, color: "#f8f1e2", align: "center", background: "#0d0e14f2", padding: 7 }),
      )
      .setOrigin(0.5, 1)
      .setResolution(TEXT_RES)
      .setDepth(DEPTH.ui)
      .setVisible(false);
    this.label.setStroke("#000000", 3);
  }

  update(npcs: NPC[]): void {
    let best: NPC | null = null;
    let bestDistance = this.range;

    for (const npc of npcs) {
      if (!npc.alive || !npc.approachable) continue;
      const distance = npc.distanceTo(this.player);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = npc;
      }
    }

    this.target = best;

    if (best) {
      this.label
        .setText(`${best.name}\n[E] talk`)
        .setPosition(Math.round(best.x), Math.round(best.y) - 58)
        .setVisible(true);
    } else {
      this.label.setVisible(false);
    }
  }

  hide(): void {
    this.label.setVisible(false);
  }

  destroy(): void {
    this.label.destroy();
  }
}
