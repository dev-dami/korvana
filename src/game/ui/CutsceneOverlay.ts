import type Phaser from "phaser";

import { portraitKey } from "../gfx/portraits";
import { lookForSpeaker } from "./speakers";
import { Typewriter } from "./Typewriter";
import { UiComponent } from "./UiComponent";
import { BRASS, BRASS_LIGHT, COLOR_DIM, COLOR_GOLD, divider, heading, label } from "./theme";
import type { Frame } from "./theme";

const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
const PORTRAIT = 104;

/**
 * The cinematic overlay.
 *
 * Letterbox bars slide in, the world dims behind a vignette (UIScene hides
 * the HUD at the same time), and lines are typed into the lower bar with the
 * speaker's portrait beside them. A chapter opens on a title card - "Act I",
 * the title in display type between brass flourishes - that fades up over
 * the first line.
 */
export class CutsceneOverlay extends UiComponent {
  private dim!: Phaser.GameObjects.Graphics;
  private bars!: Phaser.GameObjects.Graphics;
  private ornament!: Phaser.GameObjects.Graphics;
  private portraitFrame!: Frame;
  private portrait!: Phaser.GameObjects.Image;
  private actNumber!: Phaser.GameObjects.Text;
  private actTitle!: Phaser.GameObjects.Text;
  private speakerText!: Phaser.GameObjects.Text;
  private bodyText!: Phaser.GameObjects.Text;
  private promptText!: Phaser.GameObjects.Text;
  private typer!: Typewriter;

  private openedAt = 0;
  private cardAt = 0;
  private wasOpen = false;
  private lastCard = "";
  private closing = 0;

  create(): void {
    this.wasOpen = false;
    this.lastCard = "";
    this.dim = this.track(this.scene.add.graphics().setDepth(0));
    this.bars = this.track(this.scene.add.graphics().setDepth(1));
    this.ornament = this.track(this.scene.add.graphics().setDepth(2));
    this.portraitFrame = this.frame("portrait", 3);
    this.portrait = this.track(this.scene.add.image(0, 0, "__DEFAULT").setOrigin(0.5, 1).setDepth(4));

    this.actNumber = this.track(heading(this.scene, "", { size: 20, color: "#c9b27a" }).setOrigin(0.5).setDepth(5).setLetterSpacing(8));
    this.actTitle = this.track(heading(this.scene, "", { size: 54, color: "#f2d98e", padding: 12 }).setOrigin(0.5).setDepth(5));
    this.actTitle.setShadow(0, 0, "#e0a040", 18, false, true);
    this.speakerText = this.track(heading(this.scene, "", { size: 20, color: COLOR_GOLD, align: "left" }).setDepth(5));
    this.bodyText = this.track(label(this.scene, "", { size: 21, color: "#f4ecd8", lineSpacing: 9 }).setDepth(5));
    this.bodyText.setShadow(0, 2, "#000000", 4, false, true);
    this.promptText = this.track(label(this.scene, "", { size: 14, color: COLOR_DIM, align: "right" }).setOrigin(1, 1).setDepth(5));
    this.typer = new Typewriter(this.scene, this.bodyText);
  }

  update(width: number, height: number, time: number): void {
    const cutscenes = this.world.cutscenes;
    const line = cutscenes.line;
    const open = cutscenes.active && line !== null;

    if (open && !this.wasOpen) this.openedAt = time;
    if (!open && this.wasOpen) {
      this.closing = time;
      this.typer.stop();
    }
    this.wasOpen = open;

    // Bars ease in on open and out on close.
    const t = open ? Math.min(1, (time - this.openedAt) / 450) : Math.max(0, 1 - (time - this.closing) / 350);
    const ease = 1 - Math.pow(1 - t, 3);
    this.dim.clear();
    this.bars.clear();
    this.ornament.clear();
    if (ease <= 0.001) {
      this.hideText();
      return;
    }

    const topH = Math.round(Math.max(56, height * 0.11) * ease);
    const bottomH = Math.round(Math.max(170, height * 0.27) * ease);

    // World dimmed, heavier at the edges.
    this.dim.fillStyle(0x05060a, 0.42 * ease);
    this.dim.fillRect(0, 0, width, height);
    const band = width * 0.18;
    this.dim.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.5 * ease, 0, 0.5 * ease, 0);
    this.dim.fillRect(0, 0, band, height);
    this.dim.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0.5 * ease, 0, 0.5 * ease);
    this.dim.fillRect(width - band, 0, band, height);

    this.bars.fillStyle(0x040408, 1);
    this.bars.fillRect(0, 0, width, topH);
    this.bars.fillRect(0, height - bottomH, width, bottomH);
    // Fine brass rules along the inner edges of the letterbox.
    this.bars.lineStyle(1, BRASS, 0.45 * ease);
    this.bars.lineBetween(0, topH - 0.5, width, topH - 0.5);
    this.bars.lineBetween(0, height - bottomH + 0.5, width, height - bottomH + 0.5);

    if (!open || !line) {
      this.hideText();
      return;
    }

    // --- title card ---------------------------------------------------------
    const card = cutscenes.actCard;
    const cardId = card ? `${cutscenes.def?.id}:${card.number}` : "";
    if (cardId !== this.lastCard) {
      this.lastCard = cardId;
      this.cardAt = time;
    }
    if (card) {
      const k = Math.min(1, (time - this.cardAt - 250) / 1100);
      const a = Math.max(0, k);
      const midY = topH + (height - topH - bottomH) * 0.46;
      this.actNumber
        .setVisible(true)
        .setText(`ACT ${ROMAN[card.number] ?? card.number}`)
        .setPosition(width / 2, midY - 46)
        .setAlpha(a);
      this.actTitle
        .setVisible(true)
        .setText(card.title)
        .setPosition(width / 2, midY + 6)
        .setAlpha(a)
        .setScale(0.94 + 0.06 * a);
      this.flourish(width / 2, midY - 46, this.actNumber.width / 2 + 18, a * 0.9);
      divider(this.ornament, width / 2 - 150, midY + 48, 300, BRASS, a * 0.85);
    } else {
      this.actNumber.setVisible(false);
      this.actTitle.setVisible(false);
    }

    // --- the line -------------------------------------------------------------
    const look = this.lookFor(line.speaker);
    const textW = Math.min(860, width - 120 - (look ? PORTRAIT + 30 : 0));
    const blockW = textW + (look ? PORTRAIT + 30 : 0);
    const left = Math.round((width - blockW) / 2);
    const barTop = height - bottomH;
    const textX = left + (look ? PORTRAIT + 30 : 0);

    if (look) {
      const py = barTop + 26;
      this.portraitFrame.draw(left, py, PORTRAIT, PORTRAIT).setAlpha(ease);
      this.portrait
        .setTexture(portraitKey(look))
        .setScale(1.5)
        .setPosition(left + PORTRAIT / 2, py + PORTRAIT - 6)
        .setAlpha(ease)
        .setVisible(true);
    } else {
      this.portraitFrame.setVisible(false);
      this.portrait.setVisible(false);
    }

    const narration = !line.speaker;
    this.speakerText
      .setVisible(!narration)
      .setText(line.speaker ?? "")
      .setPosition(textX, barTop + 24)
      .setAlpha(ease);
    this.bodyText.setFontStyle(narration ? "italic" : "normal").setWordWrapWidth(textW);
    this.typer.show(line.text, time);
    this.bodyText
      .setVisible(true)
      .setPosition(textX, barTop + (narration ? 30 : 56))
      .setAlpha(ease);

    // Progress pips and the prompt.
    const count = cutscenes.lineCount;
    const pipX = width - 40 - count * 12;
    for (let i = 0; i < count; i++) {
      const done = i < cutscenes.lineNumber;
      this.ornament.fillStyle(done ? BRASS_LIGHT : 0x4a4636, done ? 0.9 : 0.8);
      this.ornament.fillCircle(pipX + i * 12, height - 22, i === cutscenes.lineNumber - 1 ? 3.2 : 2.4);
    }
    const blink = Math.floor(time / 450) % 2 === 0;
    this.promptText
      .setVisible(this.typer.complete)
      .setText(`${cutscenes.isLastLine ? "E  finish" : "E  continue"} ${blink ? "▸" : " "}    ESC skip`)
      .setPosition(pipX - 18, height - 13)
      .setAlpha(ease);
  }

  /** Curling brass lines either side of a heading. */
  private flourish(cx: number, cy: number, gap: number, alpha: number): void {
    const g = this.ornament;
    g.lineStyle(1.2, BRASS, alpha);
    for (const s of [-1, 1]) {
      const x0 = cx + s * gap;
      g.beginPath();
      g.moveTo(x0, cy);
      g.lineTo(x0 + s * 70, cy);
      g.strokePath();
      g.beginPath();
      g.arc(x0 + s * 78, cy, 8, s > 0 ? Math.PI : 0, s > 0 ? Math.PI * 2.5 : Math.PI * 1.5, s < 0);
      g.strokePath();
      g.fillStyle(BRASS_LIGHT, alpha);
      g.fillCircle(x0 + s * 4, cy, 2);
    }
  }

  /** A portrait for a named speaker; narration (no speaker) gets none. */
  private lookFor(speaker: string | undefined): string | null {
    if (!speaker) return null;
    const lower = speaker.toLowerCase();
    if (lower === "wren" || lower === "you") return this.world.player.lookKey;
    const look = lookForSpeaker(speaker);
    return look && this.scene.textures.exists(portraitKey(look)) ? look : null;
  }

  private hideText(): void {
    for (const o of [this.portrait, this.actNumber, this.actTitle, this.speakerText, this.bodyText, this.promptText]) o.setVisible(false);
    this.portraitFrame.setVisible(false);
  }

  destroy(): void {
    this.typer?.destroy();
    super.destroy();
  }
}
