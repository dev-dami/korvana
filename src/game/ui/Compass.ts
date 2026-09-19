import type Phaser from "phaser";

import { TILE } from "../config";
import { landmarkById } from "../data/landmarks";
import { UiComponent } from "./UiComponent";
import { COLOR_DIM, COLOR_GOLD, label } from "./theme";

interface Objective {
  x: number;
  y: number;
  label: string;
  quest: string;
}

/**
 * Points at wherever the current objective is.
 *
 * An endless generated world gives the player no way to reason about direction,
 * which makes "find the north waystone" an unreasonable instruction. The
 * compass resolves the active quest's stage `target` to a landmark and reports
 * bearing and distance.
 */
export class Compass extends UiComponent {
  private arrow!: Phaser.GameObjects.Graphics;
  private labelText!: Phaser.GameObjects.Text;
  private subText!: Phaser.GameObjects.Text;

  create(): void {
    this.arrow = this.track(this.scene.add.graphics().setDepth(2));
    this.labelText = this.track(
      label(this.scene, "", { size: 15, color: COLOR_GOLD, align: "center" })
        .setOrigin(0.5, 0)
        .setDepth(2),
    );
    this.subText = this.track(
      label(this.scene, "", { size: 13, color: COLOR_DIM, align: "center" })
        .setOrigin(0.5, 0)
        .setDepth(2),
    );
  }

  update(width: number, _height: number, _time: number): void {
    const target = this.objective();
    this.arrow.clear();

    if (!target) {
      this.labelText.setVisible(false).setText("");
      this.subText.setVisible(false).setText("");
      return;
    }

    const player = this.world.player;
    const dx = target.x - player.x;
    const dy = target.y - player.y;
    const distance = Math.hypot(dx, dy);

    const cx = width / 2;
    const cy = 34;

    // Triangle pointing right at rotation 0, so the bearing can drive rotation.
    const angle = Math.atan2(dy, dx);
    const size = 9;
    this.arrow.fillStyle(0xe0ba4e, 0.95);
    this.arrow.beginPath();
    this.arrow.moveTo(size, 0);
    this.arrow.lineTo(-size * 0.7, -size * 0.62);
    this.arrow.lineTo(-size * 0.7, size * 0.62);
    this.arrow.closePath();
    this.arrow.fillPath();
    this.arrow.setPosition(cx - 92, cy);
    this.arrow.setRotation(angle);

    this.labelText.setVisible(true).setPosition(cx, cy - 14).setText(target.quest);

    const paces = Math.round(distance / TILE);
    this.subText
      .setVisible(true)
      .setPosition(cx, cy + 6)
      .setText(`${target.label} - ${paces} paces`);
  }

  /** The nearest objective in the earliest unfinished act that names a place. */
  private objective(): Objective | null {
    for (const { def, stage } of this.world.quests.activeQuests()) {
      if (!stage.target) continue;
      const landmark = landmarkById(stage.target);
      if (!landmark) continue;
      return {
        // Landmark origins are the structure's top-left, so aim at its middle.
        x: (landmark.tx + 2) * TILE,
        y: (landmark.ty + 2) * TILE,
        label: landmark.name,
        quest: def.name,
      };
    }
    return null;
  }
}
