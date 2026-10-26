import type Phaser from "phaser";

import { NPC_ROSTER } from "../data/npcs";
import { portraitKey } from "../gfx/portraits";
import { lookForSpeaker } from "./speakers";
import { Typewriter } from "./Typewriter";
import { UiComponent } from "./UiComponent";
import {
  COLOR_GOLD,
  COLOR_INK,
  COLOR_INK_SOFT,
  COLOR_RUBRIC,
  divider,
  heading,
  keyBadge,
  label,
} from "./theme";
import type { Frame } from "./theme";

const MAX_W = 1000;
const PORTRAIT = 148;
const PAD = 30;
const CHOICE_GAP = 8;
const BODY_SIZE = 19;

/**
 * The conversation panel: a parchment page with the speaker's portrait rising
 * out of its top-left corner, a name ribbon, the line typed out letter by
 * letter, and numbered choices.
 *
 * Pressing E (or a number) while a line is still typing finishes it rather
 * than skipping it - see Typewriter and the "ui:typing" registry flag that
 * WorldScene checks before acting on input.
 */
export class DialogueBox extends UiComponent {
  private page!: Frame;
  private portraitFrame!: Frame;
  private ribbon!: Frame;
  private g!: Phaser.GameObjects.Graphics;
  private portrait!: Phaser.GameObjects.Image;
  private nameText!: Phaser.GameObjects.Text;
  private titleText!: Phaser.GameObjects.Text;
  private bodyText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private promptText!: Phaser.GameObjects.Text;
  private choiceTexts: Phaser.GameObjects.Text[] = [];
  private choiceKeys: Phaser.GameObjects.Text[] = [];
  private typer!: Typewriter;
  private shownAt = 0;
  private wasOpen = false;
  private compact = false;

  create(): void {
    this.choiceTexts = [];
    this.choiceKeys = [];
    this.wasOpen = false;
    this.compact = false;
    this.page = this.frame("parchment", 1);
    this.portraitFrame = this.frame("portrait", 3);
    this.ribbon = this.frame("ribbon", 5);
    this.g = this.track(this.scene.add.graphics().setDepth(2));
    this.portrait = this.track(this.scene.add.image(0, 0, "__DEFAULT").setOrigin(0.5, 1).setDepth(4));

    this.nameText = this.track(heading(this.scene, "", { size: 21, color: COLOR_GOLD, align: "left" }).setOrigin(0, 0.5).setDepth(6));
    this.nameText.setShadow(0, 1, "#000000", 2, false, true);
    this.titleText = this.track(label(this.scene, "", { size: 15, color: COLOR_INK_SOFT }).setDepth(6));
    this.titleText.setFontStyle("italic");
    this.bodyText = this.track(label(this.scene, "", { size: BODY_SIZE, color: COLOR_INK, lineSpacing: 7 }).setDepth(6));
    this.hintText = this.track(label(this.scene, "", { size: 13, color: COLOR_INK_SOFT, align: "right" }).setOrigin(1, 0).setDepth(6));
    this.promptText = this.track(label(this.scene, "", { size: 15, color: COLOR_RUBRIC, align: "right", bold: true }).setOrigin(1, 1).setDepth(6));

    for (let i = 0; i < DialogueBox.MAX_CHOICES; i++) {
      this.choiceTexts.push(this.track(label(this.scene, "", { size: 17, color: COLOR_INK, lineSpacing: 3 }).setDepth(6)));
      this.choiceKeys.push(
        this.track(label(this.scene, "", { size: 13, color: "#1a1208", bold: true, align: "center" }).setOrigin(0.5).setDepth(7)),
      );
    }

    this.typer = new Typewriter(this.scene, this.bodyText);
  }

  update(width: number, height: number, time: number): void {
    const dialogue = this.world.dialogue;
    const node = dialogue.node();
    const open = dialogue.active && node !== null && !this.world.cutscenes.active;

    if (!open || !node) {
      if (this.wasOpen) this.hideAll();
      this.wasOpen = false;
      this.typer.stop();
      return;
    }
    if (!this.wasOpen) this.shownAt = time;
    this.wasOpen = true;

    // A node may speak for someone other than the person you walked up to
    // (the Lamp, in the middle of the Headmistress's tree). Its name decides
    // the portrait; otherwise it is whoever you are talking to.
    const override = (node as { speaker?: string }).speaker;
    const npc = NPC_ROSTER.find((def) => def.id === dialogue.speakerId);
    const name = override ?? dialogue.speakerName;
    const look = override
      ? lookForSpeaker(override)
      : (npc?.look ?? lookForSpeaker(name, this.world.npcs.find((n) => n.id === dialogue.speakerId)?.lookKey));
    const title = override ? "" : (npc?.title ?? "");
    const hasPortrait = !!look && this.scene.textures.exists(portraitKey(look));

    // Short windows set the page a size smaller so six long choices and a
    // four-line speech still fit above the bottom edge.
    const compact = height < 800;
    if (compact !== this.compact) {
      this.compact = compact;
      this.bodyText.setFontSize(compact ? BODY_SIZE - 1 : BODY_SIZE).setLineSpacing(compact ? 5 : 7);
      for (const text of this.choiceTexts) text.setFontSize(compact ? 16 : 17).setLineSpacing(compact ? 1 : 3);
      this.typer.invalidate();
    }
    const choiceGap = compact ? 5 : CHOICE_GAP;

    const bw = Math.min(MAX_W, width - 32);
    const textX = hasPortrait ? PORTRAIT + 44 : PAD + 6;
    const textW = bw - textX - PAD;

    // Body first: its wrapped height decides the size of everything else.
    this.bodyText.setWordWrapWidth(textW);
    this.typer.show(node.text, time);
    const complete = this.typer.complete;

    const choices = dialogue.choices().slice(0, DialogueBox.MAX_CHOICES);
    let choicesH = 0;
    for (let i = 0; i < this.choiceTexts.length; i++) {
      const text = this.choiceTexts[i]!;
      const choice = choices[i];
      if (!choice) continue;
      text.setWordWrapWidth(textW - 34).setText(choice.text);
      choicesH += text.height + choiceGap;
    }

    const bodyH = Math.max(this.typer.fullHeight, BODY_SIZE * 2 + 8);
    const headerH = compact ? 44 : 50;
    const bh = Math.max(hasPortrait ? PORTRAIT - 20 : 120, headerH + bodyH + (choices.length ? choicesH + 22 : 36) + 18);
    const x = Math.round((width - bw) / 2);
    const y = Math.round(height - bh - 18);

    // Rise in.
    const enter = Math.min(1, (time - this.shownAt) / 220);
    const rise = (1 - enter) * 16;
    const by = y + rise;

    this.page.draw(x, by, bw, bh).setAlpha(enter);
    this.g.clear();
    this.g.setAlpha(enter);

    if (hasPortrait && look) {
      const px = x + 18;
      const py = by - 34;
      this.portraitFrame.draw(px, py, PORTRAIT, PORTRAIT).setAlpha(enter);
      // A slight bob while the line is being spoken.
      const talking = !complete && Math.floor(time / 110) % 2 === 0 ? -1 : 0;
      this.portrait
        .setTexture(portraitKey(look))
        .setScale(2)
        .setPosition(px + PORTRAIT / 2, py + PORTRAIT - 10 + talking)
        .setAlpha(enter)
        .setVisible(true);
    } else {
      this.portraitFrame.setVisible(false);
      this.portrait.setVisible(false);
    }

    // Name ribbon breaking the top edge of the page.
    this.nameText.setText(name);
    const ribbonW = this.nameText.width + 64;
    const rx = x + textX - 22;
    const ry = by - 18;
    this.ribbon.draw(rx, ry, ribbonW, 38).setAlpha(enter);
    this.nameText.setPosition(rx + 32, ry + 19).setAlpha(enter).setVisible(true);

    this.titleText
      .setText(title)
      .setPosition(rx + ribbonW + 10, by + 10)
      .setAlpha(enter)
      .setVisible(Boolean(title) && rx + ribbonW + 10 + this.titleText.width < x + bw - 130);
    this.hintText
      .setText(choices.length > 0 ? "1-6 choose    ESC leave" : "ESC leave")
      .setPosition(x + bw - PAD, by + 12)
      .setAlpha(enter)
      .setVisible(true);

    this.bodyText.setPosition(x + textX, by + headerH).setAlpha(enter).setVisible(true);

    // Choices appear once the line has finished, so nobody picks blind.
    let cy = by + headerH + bodyH + 14;
    if (choices.length > 0) {
      divider(this.g, x + textX, cy - 4, Math.min(textW, 420), 0x8c6a3a, 0.7);
      cy += 8;
    }
    const choiceAlpha = complete ? Math.min(1, (time - this.typer.completedAt) / 200) : 0;
    for (let i = 0; i < this.choiceTexts.length; i++) {
      const text = this.choiceTexts[i]!;
      const key = this.choiceKeys[i]!;
      const choice = choices[i];
      if (!choice) {
        text.setVisible(false);
        key.setVisible(false);
        continue;
      }
      const tx = x + textX + 30;
      keyBadge(this.g, tx - 16, cy + 11, 10, true);
      key.setVisible(true).setText(`${i + 1}`).setPosition(tx - 16, cy + 11).setAlpha(choiceAlpha);
      text.setVisible(true).setPosition(tx, cy).setAlpha(choiceAlpha);
      cy += text.height + choiceGap;
    }
    this.g.setAlpha(enter * choiceAlpha);

    const blink = Math.floor(time / 450) % 2 === 0;
    this.promptText
      .setVisible(complete && choices.length === 0)
      .setText(`E  continue ${blink ? "▸" : " "}`)
      .setPosition(x + bw - PAD, by + bh - 16)
      .setAlpha(enter);
  }

  private hideAll(): void {
    this.page.setVisible(false);
    this.portraitFrame.setVisible(false);
    this.ribbon.setVisible(false);
    this.g.clear();
    for (const o of [this.portrait, this.nameText, this.titleText, this.bodyText, this.hintText, this.promptText]) o.setVisible(false);
    for (const o of [...this.choiceTexts, ...this.choiceKeys]) o.setVisible(false);
  }

  destroy(): void {
    this.typer?.destroy();
    super.destroy();
  }

  /** Matches the number keys the scene binds to dialogue choices. */
  static readonly MAX_CHOICES = 6;
}
