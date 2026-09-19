import type Phaser from "phaser";

import { UiComponent } from "./UiComponent";
import { COLOR_DIM, heading, label } from "./theme";

const PANEL_W = 880;
const PANEL_X_PAD = 28;
/** Height of one choice row, and the gap between the last choice and the edge. */
const CHOICE_ROW = 26;
const CHOICE_BOTTOM_PAD = 14;
/** Space the body text needs above the choices. */
const BODY_BLOCK = 74;

/**
 * The conversation panel.
 *
 * It sizes itself to the number of choices instead of assuming at most four, so
 * a node with six options no longer overlaps the line being spoken.
 */
export class DialogueBox extends UiComponent {
  private panel!: Phaser.GameObjects.Graphics;
  private nameText!: Phaser.GameObjects.Text;
  private bodyText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private choiceTexts: Phaser.GameObjects.Text[] = [];

  create(): void {
    this.panel = this.track(this.scene.add.graphics().setDepth(100));
    this.nameText = this.track(
      heading(this.scene, "", { size: 26, color: "#eecb68", align: "left" }).setDepth(101),
    );
    this.bodyText = this.track(
      label(this.scene, "", {
        size: 17,
        color: "#f6efdd",
        wrap: PANEL_W - PANEL_X_PAD * 2,
        lineSpacing: 9,
      }).setDepth(101),
    );
    this.hintText = this.track(
      label(this.scene, "", { size: 13, color: COLOR_DIM, align: "right" })
        .setOrigin(1, 0)
        .setDepth(101),
    );

    for (let i = 0; i < DialogueBox.MAX_CHOICES; i++) {
      this.choiceTexts.push(
        this.track(label(this.scene, "", { size: 16, color: "#b6d0ff" }).setDepth(101)),
      );
    }
  }

  update(width: number, height: number, _time: number): void {
    const dialogue = this.world.dialogue;
    const node = dialogue.node();
    const open = dialogue.active && node !== null;

    this.panel.setVisible(open);
    this.nameText.setVisible(open);
    this.bodyText.setVisible(open);
    this.hintText.setVisible(open);

    if (!open || !node) {
      for (const choice of this.choiceTexts) choice.setVisible(false);
      return;
    }

    const choices = dialogue.choices().slice(0, DialogueBox.MAX_CHOICES);

    // Grow the panel for the choices first, then place the text, so the spoken
    // line is always above them rather than behind them.
    const choicesHeight = choices.length * CHOICE_ROW + CHOICE_BOTTOM_PAD;
    const bodyHeight = Math.max(BODY_BLOCK, this.bodyText.height + 18);
    const panelH = bodyHeight + choicesHeight;

    const x = (width - PANEL_W) / 2;
    const y = height - panelH - 150;

    this.panel.clear();
    this.panel.fillStyle(0x0a0b11, 0.96);
    this.panel.fillRoundedRect(x, y, PANEL_W, panelH, 10);
    this.panel.lineStyle(2, 0xd9b44a, 0.6);
    this.panel.strokeRoundedRect(x, y, PANEL_W, panelH, 10);

    this.nameText.setPosition(x + PANEL_X_PAD, y + 16).setText(dialogue.speakerName);
    this.bodyText.setPosition(x + PANEL_X_PAD, y + 58).setText(node.text);
    this.hintText
      .setPosition(x + PANEL_W - PANEL_X_PAD, y + 20)
      .setText(choices.length > 0 ? "1-6 choose   ESC leave" : "E continue   ESC leave");

    const choicesTop = y + panelH - CHOICE_BOTTOM_PAD - choices.length * CHOICE_ROW;
    for (let i = 0; i < this.choiceTexts.length; i++) {
      const text = this.choiceTexts[i];
      if (!text) continue;
      const choice = choices[i];
      if (!choice) {
        text.setVisible(false);
        continue;
      }
      text
        .setVisible(true)
        .setPosition(x + PANEL_X_PAD, choicesTop + i * CHOICE_ROW)
        .setText(`[${i + 1}]    ${choice.text}`);
    }
  }

  /** Matches the number keys the scene binds to dialogue choices. */
  static readonly MAX_CHOICES = 6;
}
