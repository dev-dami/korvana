import Phaser from "phaser";

import { UiComponent } from "./UiComponent";
import { bar, COLOR_DIM, HEALTH, MANA, heading, label, panel } from "./theme";

/** The player's name plate, vitals, clock, purse and the control reminder. */
export class Hud extends UiComponent {
  private tint!: Phaser.GameObjects.Graphics;
  private bars!: Phaser.GameObjects.Graphics;
  private nameText!: Phaser.GameObjects.Text;
  private healthText!: Phaser.GameObjects.Text;
  private manaText!: Phaser.GameObjects.Text;
  private clockText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;

  create(): void {
    this.tint = this.track(this.scene.add.graphics().setDepth(-100));
    this.bars = this.track(this.scene.add.graphics().setDepth(1));

    this.nameText = this.track(
      heading(this.scene, "", { size: 24, color: "#ecdcae", align: "left" }).setDepth(2),
    );
    this.healthText = this.track(
      label(this.scene, "", { size: 14, color: "#ddd6c6" }).setDepth(2),
    );
    this.manaText = this.track(
      label(this.scene, "", { size: 14, color: "#ddd6c6", align: "right" })
        .setOrigin(1, 0)
        .setDepth(2),
    );
    this.clockText = this.track(
      label(this.scene, "", { size: 16, color: "#d6cdb8", align: "right" })
        .setOrigin(1, 0)
        .setDepth(2),
    );
    this.hintText = this.track(
      label(this.scene, Hud.HINTS, { size: 13, color: COLOR_DIM, align: "center" })
        .setOrigin(0.5, 1)
        .setDepth(2),
    );
  }

  update(width: number, height: number): void {
    this.drawDayNight(width, height);
    this.drawVitals(width);
    this.layout(width, height);

    const { world } = this.world.state;
    this.clockText.setText(
      `Day ${world.day}    ${this.world.state.timeLabel()}    ${this.world.state.player.gold} gold`,
    );
  }

  private layout(width: number, height: number): void {
    this.clockText.setPosition(width - 24, 22);
    const compact = width < 620;
    this.hintText
      .setPosition(width / 2, height - 10)
      .setFontSize(compact ? 12 : 13)
      .setText(compact ? Hud.COMPACT_HINTS : Hud.HINTS);
    this.clockText.setVisible(!compact);
  }

  private drawDayNight(width: number, height: number): void {
    const fraction = this.world.state.dayFraction;
    const daylight = Math.max(0, Math.sin((fraction - 0.25) * Math.PI * 2) * 0.5 + 0.5);
    // The Scar keeps its own weather: it is always dimmer than it should be.
    const scarred = this.world.world.biomeNameAtPixel(this.world.player.x, this.world.player.y) === "scar";
    const ceiling = scarred ? 0.5 : 0.36;
    const alpha = Math.min(ceiling, (1 - daylight) * ceiling + (scarred ? 0.16 : 0));

    this.tint.clear();
    if (alpha <= 0.01) return;

    const tone = Phaser.Display.Color.Interpolate.ColorWithColor(
      new Phaser.Display.Color(22, 30, 68),
      new Phaser.Display.Color(46, 38, 82),
      100,
      Math.round(daylight * 100),
    );
    this.tint.fillStyle(Phaser.Display.Color.GetColor(tone.r, tone.g, tone.b), alpha);
    this.tint.fillRect(0, 0, width, height);
  }

  private drawVitals(width: number): void {
    const { player } = this.world.state;
    const g = this.bars;
    g.clear();
    const compact = width < 620;
    const panelWidth = compact ? 182 : 296;
    const panelHeight = compact ? 90 : 100;
    const panelRight = 16 + panelWidth;

    panel(g, 16, 14, panelWidth, panelHeight);
    this.nameText.setFontSize(compact ? 19 : 24).setText(player.name).setPosition(30, 20);

    const barWidth = panelWidth - 28;
    const healthY = compact ? 67 : 78;
    const manaY = compact ? 83 : 98;
    bar(g, 30, healthY, barWidth, compact ? 11 : 16, player.health / player.maxHealth, HEALTH, 0x4d1916);
    bar(g, 30, manaY, barWidth, compact ? 7 : 11, player.mana / player.maxMana, MANA, 0x16324f);

    this.healthText.setPosition(30, compact ? 47 : 52).setText(`Health  ${Math.round(player.health)} / ${player.maxHealth}`);
    this.manaText
      .setPosition(panelRight - 14, compact ? 47 : 52)
      .setText(`Mana  ${Math.round(player.mana)} / ${player.maxMana}`);

    if (this.world.state.wardActive) {
      g.lineStyle(2, 0xd9b44a, 0.95);
      g.strokeRoundedRect(16, 14, panelWidth, panelHeight, 6);
    }
  }

  /** The control reminder, kept in one place for the title card and docs. */
  static readonly HINTS =
    "WASD move   SHIFT sprint   C dash   Z light   X heavy   SPACE cast   1-6 choose   M spellbook   E talk   I satchel   J journal   T weapon   Q tonic   F8/F9 save   P pause";
  static readonly COMPACT_HINTS = "SHIFT sprint   C dash   SPACE cast   M spellbook   P pause";
}
