import type Phaser from "phaser";

import { TILE } from "../config";
import { landmarkById } from "../data/landmarks";
import { UiComponent } from "./UiComponent";
import { compassDialKey, DIAL, emblemScale } from "./icons";
import { COLOR_DIM, COLOR_GOLD, label } from "./theme";
import type { Frame } from "./theme";

interface Objective {
  x: number;
  y: number;
  label: string;
  quest: string;
}

const SIZE = 58;

/**
 * Points at wherever the current objective is.
 *
 * An endless generated world gives the player no way to reason about direction,
 * which makes "find the north waystone" an unreasonable instruction. The
 * compass resolves the active quest's stage `target` to a landmark and reports
 * bearing and distance: a brass dial, a needle that eases toward the bearing,
 * and a plaque naming the place.
 */
export class Compass extends UiComponent {
  private dial!: Phaser.GameObjects.Image;
  private needle!: Phaser.GameObjects.Graphics;
  private plate!: Frame;
  private placeText!: Phaser.GameObjects.Text;
  private distText!: Phaser.GameObjects.Text;
  private angle = -Math.PI / 2;

  create(): void {
    this.dial = this.track(this.scene.add.image(0, 0, compassDialKey(this.scene)).setScale(emblemScale(DIAL, SIZE)).setDepth(3));
    this.needle = this.track(this.scene.add.graphics().setDepth(4));
    this.plate = this.frame("plaque", 2);
    this.placeText = this.track(label(this.scene, "", { size: 15, color: COLOR_GOLD, align: "center" }).setOrigin(0.5, 0.5).setDepth(5));
    this.distText = this.track(label(this.scene, "", { size: 13, color: COLOR_DIM, align: "center" }).setOrigin(0.5, 0.5).setDepth(5));
    this.drawNeedle();
  }

  /** Drawn once pointing right; rotation does the rest. */
  private drawNeedle(): void {
    const g = this.needle;
    g.clear();
    g.fillStyle(0x000000, 0.35);
    g.fillTriangle(-9, 2, 19, 1, -9, -2);
    g.fillStyle(0xf0c24a, 1);
    g.fillTriangle(0, -4, 20, 0, 0, 0);
    g.fillStyle(0xb8862a, 1);
    g.fillTriangle(0, 4, 20, 0, 0, 0);
    g.fillStyle(0x6a7088, 1);
    g.fillTriangle(0, -4, -14, 0, 0, 0);
    g.fillStyle(0x3a3f52, 1);
    g.fillTriangle(0, 4, -14, 0, 0, 0);
    g.fillStyle(0xf6e2a0, 1);
    g.fillCircle(0, 0, 2.6);
    g.fillStyle(0x6e5222, 1);
    g.fillCircle(0, 0, 1.2);
  }

  update(width: number, _height: number, time: number): void {
    const target = this.objective();
    const visible = target !== null;
    this.dial.setVisible(visible);
    this.needle.setVisible(visible);
    this.placeText.setVisible(visible);
    this.distText.setVisible(visible);
    if (!target) {
      this.plate.setVisible(false);
      return;
    }

    const player = this.world.player;
    const dx = target.x - player.x;
    const dy = target.y - player.y;
    const distance = Math.hypot(dx, dy);
    const cx = Math.round(width / 2);
    const cy = 14 + SIZE / 2;

    // Ease the needle round the short way, with a faint tremble when close.
    const want = Math.atan2(dy, dx);
    let delta = want - this.angle;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    this.angle += delta * 0.18;
    const tremble = distance < 6 * TILE ? Math.sin(time / 60) * 0.08 : 0;

    this.dial.setPosition(cx, cy);
    this.needle.setPosition(cx, cy).setRotation(this.angle + tremble);

    const paces = Math.round(distance / TILE);
    this.placeText.setText(target.label);
    this.distText.setText(paces <= 3 ? "here" : `${paces} paces`);
    const plateW = Math.max(150, this.placeText.width + 40);
    const py = cy + SIZE / 2 + 2;
    this.plate.draw(cx - plateW / 2, py, plateW, 44);
    this.placeText.setPosition(cx, py + 15);
    this.distText.setPosition(cx, py + 31);
  }

  /** Bottom edge of everything the compass draws, for whoever stacks below it. */
  static readonly BOTTOM = 14 + SIZE + 48;

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
