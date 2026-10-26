import type Phaser from "phaser";

import { UiComponent } from "./UiComponent";
import { BRASS, COLOR_DIM, COLOR_GOLD, divider, heading, label } from "./theme";
import type { Frame } from "./theme";

/** How many quests the tracker shows before it starts summarising. */
const MAX_SHOWN = 3;
const WIDTH = 300;

/**
 * The objective tracker, pinned under the clock.
 *
 * It shows the first few active quests with their current step and counts the
 * rest, so a player with six things to do can see that there are six. The
 * full list lives in the journal.
 */
export class QuestLog extends UiComponent {
  private plate!: Frame;
  private g!: Phaser.GameObjects.Graphics;
  private title!: Phaser.GameObjects.Text;
  private names: Phaser.GameObjects.Text[] = [];
  private steps: Phaser.GameObjects.Text[] = [];
  private more!: Phaser.GameObjects.Text;

  create(): void {
    this.names = [];
    this.steps = [];
    this.plate = this.frame("plaque", 1);
    this.g = this.track(this.scene.add.graphics().setDepth(2));
    this.title = this.track(heading(this.scene, "Objectives", { size: 15, color: COLOR_GOLD, align: "left" }).setDepth(3));
    for (let i = 0; i < MAX_SHOWN; i++) {
      this.names.push(this.track(label(this.scene, "", { size: 15, color: "#f2e6c8", bold: true, wrap: WIDTH - 44 }).setDepth(3)));
      this.steps.push(
        this.track(label(this.scene, "", { size: 14, color: "#cfc6b0", wrap: WIDTH - 44, lineSpacing: 2 }).setDepth(3)),
      );
    }
    this.more = this.track(label(this.scene, "", { size: 13, color: COLOR_DIM }).setDepth(3));
  }

  update(width: number, height: number): void {
    const active = this.world.quests.activeQuests();
    const visible = active.length > 0 && width >= 760 && height >= 520;
    this.g.clear();
    this.title.setVisible(visible);
    this.more.setVisible(false);
    if (!visible) {
      this.plate.setVisible(false);
      for (const t of [...this.names, ...this.steps]) t.setVisible(false);
      return;
    }

    const x = width - WIDTH - 18;
    const top = 70;
    let y = top + 12;
    this.title.setPosition(x + 16, y);
    y += 24;
    divider(this.g, x + 16, y, WIDTH - 32, BRASS, 0.6);
    y += 10;

    for (let i = 0; i < MAX_SHOWN; i++) {
      const name = this.names[i]!;
      const step = this.steps[i]!;
      const entry = active[i];
      if (!entry) {
        name.setVisible(false);
        step.setVisible(false);
        continue;
      }
      const { def, stage, progress } = entry;
      // A diamond bullet, filled in proportion to progress.
      const bx = x + 20;
      const by = y + 10;
      this.g.lineStyle(1.2, BRASS, 0.9);
      this.g.strokeTriangle(bx - 5, by, bx, by - 5, bx + 5, by);
      this.g.strokeTriangle(bx - 5, by, bx, by + 5, bx + 5, by);
      if (progress > 0) {
        this.g.fillStyle(BRASS, 0.9);
        this.g.fillTriangle(bx - 3, by, bx, by - 3, bx + 3, by);
        this.g.fillTriangle(bx - 3, by, bx, by + 3, bx + 3, by);
      }
      name.setVisible(true).setPosition(x + 32, y).setText(def.name);
      y += name.height + 1;
      const count = stage.count > 1 ? `  (${progress}/${stage.count})` : "";
      step.setVisible(true).setPosition(x + 32, y).setText(`${stage.objective}${count}`);
      y += step.height + 9;
    }

    const hidden = active.length - MAX_SHOWN;
    if (hidden > 0) {
      this.more.setVisible(true).setPosition(x + 32, y - 2).setText(`and ${hidden} more in the journal (J)`);
      y += 20;
    }
    this.plate.draw(x, top, WIDTH, y - top + 6);
  }
}
