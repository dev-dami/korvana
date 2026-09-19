import type Phaser from "phaser";

import { UiComponent } from "./UiComponent";
import { COLOR_DIM, COLOR_TEXT, heading, label, panel } from "./theme";

/** Keeps the world readable while making it clear that simulation is stopped. */
export class PauseOverlay extends UiComponent {
  private dim!: Phaser.GameObjects.Graphics;
  private frame!: Phaser.GameObjects.Graphics;
  private title!: Phaser.GameObjects.Text;
  private body!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;

  create(): void {
    this.dim = this.track(this.scene.add.graphics().setDepth(400));
    this.frame = this.track(this.scene.add.graphics().setDepth(401));
    this.title = this.track(
      heading(this.scene, "Paused", { size: 38, color: "#e9d9a6" }).setDepth(402),
    );
    this.body = this.track(
      label(this.scene, "", { size: 17, color: COLOR_TEXT, align: "center", lineSpacing: 10 }).setDepth(402),
    );
    this.hint = this.track(
      label(this.scene, "", { size: 14, color: COLOR_DIM, align: "center" }).setDepth(402),
    );
  }

  update(width: number, height: number): void {
    const open = this.world.isPaused;
    this.setVisible(open);
    if (!open) return;

    const panelWidth = Math.min(460, width - 40);
    const panelHeight = 250;
    const x = Math.round((width - panelWidth) / 2);
    const y = Math.round((height - panelHeight) / 2);

    this.dim.clear();
    this.dim.fillStyle(0x05060a, 0.72);
    this.dim.fillRect(0, 0, width, height);

    this.frame.clear();
    panel(this.frame, x, y, panelWidth, panelHeight, 10);

    this.title.setPosition(width / 2, y + 24).setOrigin(0.5, 0);
    this.body
      .setPosition(width / 2, y + 88)
      .setOrigin(0.5, 0)
      .setText("The world is waiting.\n\nF8  save    F9  load\nI  satchel    J  journal");
    this.hint
      .setPosition(width / 2, y + panelHeight - 24)
      .setOrigin(0.5, 1)
      .setText("P or ESC  resume");
  }

  private setVisible(visible: boolean): void {
    this.dim.setVisible(visible);
    this.frame.setVisible(visible);
    this.title.setVisible(visible);
    this.body.setVisible(visible);
    this.hint.setVisible(visible);
  }
}
