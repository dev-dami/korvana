import type Phaser from "phaser";

import { SPELLS } from "../data/spells";
import { UiComponent } from "./UiComponent";
import { COLOR_DIM, COLOR_GOLD, COLOR_TEXT, heading, label, panel } from "./theme";

const PANEL_W = 760;
const PANEL_H = 470;
const LIST_W = 290;
const ROW_H = 44;
const VISIBLE_ROWS = 7;

/** The player's learned spells and the one currently held ready to cast. */
export class SpellbookPanel extends UiComponent {
  private dim!: Phaser.GameObjects.Graphics;
  private frame!: Phaser.GameObjects.Graphics;
  private title!: Phaser.GameObjects.Text;
  private subtitle!: Phaser.GameObjects.Text;
  private rows: Phaser.GameObjects.Text[] = [];
  private detailTitle!: Phaser.GameObjects.Text;
  private detailBody!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;

  create(): void {
    this.dim = this.track(this.scene.add.graphics().setDepth(300));
    this.frame = this.track(this.scene.add.graphics().setDepth(301));
    this.title = this.track(
      heading(this.scene, "Spellbook", { size: 32, color: "#e9d9a6", align: "left" }).setDepth(302),
    );
    this.subtitle = this.track(
      label(this.scene, "", { size: 14, color: COLOR_DIM }).setDepth(302),
    );

    for (let i = 0; i < VISIBLE_ROWS; i++) {
      this.rows.push(this.track(label(this.scene, "", { size: 15, color: COLOR_TEXT, lineSpacing: 3 }).setDepth(302)));
    }

    this.detailTitle = this.track(
      heading(this.scene, "", { size: 23, color: COLOR_GOLD, align: "left" }).setDepth(302),
    );
    this.detailBody = this.track(
      label(this.scene, "", { size: 15, color: "#d9d2c0", wrap: PANEL_W - LIST_W - 76, lineSpacing: 8 }).setDepth(302),
    );
    this.hint = this.track(label(this.scene, "", { size: 13, color: COLOR_DIM }).setDepth(302));
  }

  update(width: number, height: number): void {
    const open = this.world.spellbookOpen;
    this.setVisible(open);
    if (!open) return;

    const spells = this.spells();
    const x = Math.round((width - PANEL_W) / 2);
    const y = Math.round((height - PANEL_H) / 2);
    const selected = Math.min(this.world.spellbookIndex, Math.max(0, spells.length - 1));
    this.world.spellbookIndex = selected;

    this.dim.clear();
    this.dim.fillStyle(0x05060a, 0.78);
    this.dim.fillRect(0, 0, width, height);

    this.frame.clear();
    panel(this.frame, x, y, PANEL_W, PANEL_H, 12);
    this.frame.lineStyle(1, 0x3f4350, 1);
    this.frame.lineBetween(x + LIST_W, y + 70, x + LIST_W, y + PANEL_H - 46);

    this.title.setPosition(x + 30, y + 18);
    this.subtitle.setPosition(x + 30, y + 60).setText(
      spells.length > 0 ? "Known workings" : "No workings learned",
    );

    for (let i = 0; i < this.rows.length; i++) {
      const row = this.rows[i];
      const spell = spells[i];
      if (!row || !spell) {
        row?.setVisible(false);
        continue;
      }
      const isSelected = i === selected;
      if (isSelected) {
        this.frame.fillStyle(0x1f2333, 1);
        this.frame.fillRoundedRect(x + 18, y + 86 + i * ROW_H - 5, LIST_W - 30, ROW_H - 2, 5);
      }
      row
        .setVisible(true)
        .setPosition(x + 32, y + 86 + i * ROW_H)
        .setText(`${isSelected ? ">" : " "}  ${spell.name}`)
        .setColor(isSelected ? "#ffe08a" : COLOR_TEXT);
    }

    const spell = spells[selected];
    if (!spell) {
      this.detailTitle.setText("");
      this.detailBody
        .setPosition(x + LIST_W + 28, y + 100)
        .setText("Your grimoire is blank.\n\nBegin your first lesson with Professor Alden.");
    } else {
      this.detailTitle
        .setPosition(x + LIST_W + 28, y + 88)
        .setText(`${spell.name}${spell.id === this.world.state.player.selectedSpell ? "  • attuned" : ""}`);
      this.detailBody
        .setPosition(x + LIST_W + 28, y + 130)
        .setText(
          `${spell.school}\n\n${spell.description}\n\nMana ${spell.manaCost}   Cooldown ${(spell.cooldown / 1000).toFixed(1)}s`,
        );
    }

    this.detailTitle.setVisible(Boolean(spell));
    this.detailBody.setVisible(true);
    this.hint
      .setPosition(x + 30, y + PANEL_H - 34)
      .setText("UP / DOWN  choose        ENTER  attune        M / ESC  close");
  }

  private spells() {
    return this.world.state.player.learnedSpells
      .map((id) => SPELLS[id])
      .filter((spell) => spell !== undefined);
  }

  private setVisible(visible: boolean): void {
    this.dim.setVisible(visible);
    this.frame.setVisible(visible);
    this.title.setVisible(visible);
    this.subtitle.setVisible(visible);
    this.detailTitle.setVisible(visible);
    this.detailBody.setVisible(visible);
    this.hint.setVisible(visible);
    for (const row of this.rows) row.setVisible(visible);
  }
}
