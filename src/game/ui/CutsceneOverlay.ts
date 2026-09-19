import type Phaser from "phaser";

import { UiComponent } from "./UiComponent";
import { COLOR_DIM, COLOR_GOLD, heading, label } from "./theme";

/** Height of each black bar. Tall enough to read as a letterbox, not a mask. */
const BAR_H = 78;
const BODY_WRAP = 760;

/**
 * The letterboxed cutscene overlay.
 *
 * Deliberately minimal: bars, a chapter card, one line at a time, and a prompt.
 * Anything more elaborate would be a cutscene *engine*, and the story does not
 * need one to land a few sentences.
 */
export class CutsceneOverlay extends UiComponent {
  private dim!: Phaser.GameObjects.Graphics;
  private bars!: Phaser.GameObjects.Graphics;
  private actText!: Phaser.GameObjects.Text;
  private speakerText!: Phaser.GameObjects.Text;
  private bodyText!: Phaser.GameObjects.Text;
  private promptText!: Phaser.GameObjects.Text;

  create(): void {
    this.dim = this.track(this.scene.add.graphics().setDepth(500));
    this.bars = this.track(this.scene.add.graphics().setDepth(501));

    this.actText = this.track(
      heading(this.scene, "", { size: 40, color: COLOR_GOLD, align: "center" }).setDepth(502),
    );
    this.speakerText = this.track(
      heading(this.scene, "", { size: 24, color: "#eecb68", align: "center" }).setDepth(502),
    );
    this.bodyText = this.track(
      label(this.scene, "", {
        size: 19,
        color: "#f6efdd",
        align: "center",
        wrap: BODY_WRAP,
        lineSpacing: 11,
      })
        .setOrigin(0.5, 0.5)
        .setDepth(502),
    );
    this.promptText = this.track(
      label(this.scene, "", { size: 14, color: COLOR_DIM, align: "center" })
        .setOrigin(0.5, 1)
        .setDepth(502),
    );
  }

  update(width: number, height: number, _time: number): void {
    const cutscenes = this.world.cutscenes;
    const line = cutscenes.line;
    const open = cutscenes.active && line !== null;

    this.dim.setVisible(open);
    this.bars.setVisible(open);
    this.actText.setVisible(open);
    this.speakerText.setVisible(open);
    this.bodyText.setVisible(open);
    this.promptText.setVisible(open);

    if (!open || !line) return;

    this.dim.clear();
    this.dim.fillStyle(0x05060a, 0.86);
    this.dim.fillRect(0, 0, width, height);

    this.bars.clear();
    this.bars.fillStyle(0x05060a, 1);
    this.bars.fillRect(0, 0, width, BAR_H);
    this.bars.fillRect(0, height - BAR_H, width, BAR_H);

    const card = cutscenes.actCard;
    if (card) {
      this.actText
        .setVisible(true)
        .setPosition(width / 2, BAR_H + 54)
        .setText(`Act ${card.number} - ${card.title}`);
    } else {
      this.actText.setVisible(false);
    }

    const centerY = height / 2 + (card ? 26 : 0);
    this.speakerText
      .setVisible(Boolean(line.speaker))
      .setPosition(width / 2, centerY - 62)
      .setText(line.speaker ?? "");

    this.bodyText.setPosition(width / 2, centerY + 12).setText(line.text);

    this.promptText
      .setPosition(width / 2, height - BAR_H - 16)
      .setText(
        cutscenes.isLastLine
          ? `E to finish   ${cutscenes.lineNumber}/${cutscenes.lineCount}`
          : `E to continue   ${cutscenes.lineNumber}/${cutscenes.lineCount}`,
      );
  }
}
