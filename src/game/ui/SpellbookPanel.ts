import type Phaser from "phaser";

import { SPELLS } from "../data/spells";
import type { Spell } from "../data/spells";
import { bookTitle, drawBook, setBookVisible } from "./Book";
import type { BookParts } from "./Book";
import { emblemScale, GLYPH, spellGlyphKey } from "./icons";
import { UiComponent } from "./UiComponent";
import { COLOR_INK, COLOR_INK_SOFT, COLOR_RUBRIC, divider, heading, label } from "./theme";

const ROW_H = 50;
const MAX_ROWS = 10;

interface Row {
  glyph: Phaser.GameObjects.Image;
  name: Phaser.GameObjects.Text;
  school: Phaser.GameObjects.Text;
}

/**
 * The grimoire: learned workings down the left page, the selected one
 * illuminated on the right - its glyph large in its own colour, its school,
 * what it does, and what it costs.
 */
export class SpellbookPanel extends UiComponent {
  private book!: BookParts;
  private g!: Phaser.GameObjects.Graphics;
  private rows: Row[] = [];
  private bigGlyph!: Phaser.GameObjects.Image;
  private detailTitle!: Phaser.GameObjects.Text;
  private detailSchool!: Phaser.GameObjects.Text;
  private detailBody!: Phaser.GameObjects.Text;
  private stats!: Phaser.GameObjects.Text;
  private attuned!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;

  create(): void {
    this.rows = [];
    this.book = {
      veil: this.track(this.scene.add.graphics().setDepth(0)),
      page: this.frame("parchment", 1),
      g: this.track(this.scene.add.graphics().setDepth(2)),
      ribbon: this.frame("ribbon", 4),
      title: this.track(bookTitle(this.scene, "Spellbook").setDepth(5)),
    };
    this.g = this.track(this.scene.add.graphics().setDepth(3));
    for (let i = 0; i < MAX_ROWS; i++) {
      this.rows.push({
        glyph: this.track(this.scene.add.image(0, 0, "__DEFAULT").setDepth(5)),
        name: this.track(label(this.scene, "", { size: 17, color: COLOR_INK }).setDepth(5)),
        school: this.track(label(this.scene, "", { size: 13, color: COLOR_INK_SOFT }).setDepth(5)),
      });
    }
    this.bigGlyph = this.track(this.scene.add.image(0, 0, "__DEFAULT").setDepth(5));
    this.detailTitle = this.track(heading(this.scene, "", { size: 24, color: "#3a2412", align: "left" }).setDepth(5));
    this.detailSchool = this.track(label(this.scene, "", { size: 15, color: COLOR_RUBRIC }).setDepth(5));
    this.detailSchool.setFontStyle("italic");
    this.detailBody = this.track(label(this.scene, "", { size: 17, color: COLOR_INK, lineSpacing: 8 }).setDepth(5));
    this.stats = this.track(label(this.scene, "", { size: 16, color: "#4a2c14", lineSpacing: 6 }).setDepth(5));
    this.attuned = this.track(heading(this.scene, "Attuned", { size: 16, color: COLOR_RUBRIC }).setOrigin(0.5).setDepth(6));
    this.hint = this.track(label(this.scene, "", { size: 14, color: COLOR_INK_SOFT, align: "center" }).setOrigin(0.5, 1).setDepth(5));
  }

  update(width: number, height: number, time: number): void {
    const open = this.world.spellbookOpen;
    this.setVisible(open);
    if (!open) return;

    const r = drawBook(this.book, width, height, 960, 560, 0.4);
    const g = this.g;
    g.clear();
    const spells = this.spells();
    const selected = Math.min(this.world.spellbookIndex, Math.max(0, spells.length - 1));
    this.world.spellbookIndex = selected;
    const listX = r.x + 40;
    const listW = r.spine - listX - 26;
    const listTop = r.y + 46;
    const rowsFit = Math.min(MAX_ROWS, Math.floor((r.h - 100) / ROW_H));
    const offset = spells.length > rowsFit ? Math.min(Math.max(0, selected - Math.floor(rowsFit / 2)), spells.length - rowsFit) : 0;

    for (let i = 0; i < this.rows.length; i++) {
      const row = this.rows[i]!;
      const spell = i < rowsFit ? spells[offset + i] : undefined;
      if (!spell) {
        row.glyph.setVisible(false);
        row.name.setVisible(false);
        row.school.setVisible(false);
        continue;
      }
      const y = listTop + i * ROW_H;
      const isSelected = offset + i === selected;
      if (isSelected) {
        g.fillStyle(0xb8862e, 0.22);
        g.fillRoundedRect(listX - 10, y - 4, listW + 10, ROW_H - 4, 5);
      }
      // A seal behind each glyph.
      g.fillStyle(0x2a1d12, isSelected ? 0.9 : 0.75);
      g.fillCircle(listX + 18, y + 20, 18);
      g.lineStyle(1.2, 0xc9a24e, 0.9);
      g.strokeCircle(listX + 18, y + 20, 18);
      row.glyph
        .setTexture(spellGlyphKey(this.scene, spell.kind))
        .setScale(emblemScale(GLYPH, 26))
        .setTint(spell.color)
        .setPosition(listX + 18, y + 20)
        .setVisible(true);
      row.name
        .setVisible(true)
        .setPosition(listX + 46, y + 2)
        .setText(spell.name)
        .setColor(isSelected ? "#1a0e06" : COLOR_INK);
      row.name.setFontStyle(isSelected ? "bold" : "normal");
      row.school.setVisible(true).setPosition(listX + 46, y + 23).setText(`${spell.school}  ·  ${spell.manaCost} mana`);
    }

    const spell = spells[selected];
    const dx = r.spine + 40;
    const dw = r.x + r.w - dx - 40;
    if (!spell) {
      this.bigGlyph.setVisible(false);
      this.attuned.setVisible(false);
      this.detailTitle.setText("");
      this.detailSchool.setText("");
      this.stats.setText("");
      this.detailBody
        .setPosition(dx, r.y + 60)
        .setWordWrapWidth(dw)
        .setText("Your grimoire is blank.\n\nBegin your first lesson with Professor Alden.");
    } else {
      this.drawDetail(spell, dx, r.y + 44, dw, time);
    }
    this.hint.setPosition((r.spine + r.x + r.w) / 2, r.y + r.h - 22).setText("UP / DOWN  choose        ENTER  attune        M or ESC  close");
  }

  private drawDetail(spell: Spell, x: number, y: number, w: number, time: number): void {
    const g = this.g;
    const cx = x + 52;
    const cy = y + 54;
    // An illuminated roundel: a glow in the spell's colour behind its glyph.
    g.fillStyle(spell.color, 0.16 + Math.sin(time / 500) * 0.04);
    g.fillCircle(cx, cy, 50);
    g.fillStyle(0x2a1d12, 0.92);
    g.fillCircle(cx, cy, 40);
    g.lineStyle(2, 0xc9a24e, 1);
    g.strokeCircle(cx, cy, 40);
    g.lineStyle(1, 0xc9a24e, 0.5);
    g.strokeCircle(cx, cy, 45);
    this.bigGlyph
      .setTexture(spellGlyphKey(this.scene, spell.kind))
      .setScale(emblemScale(GLYPH, 56))
      .setTint(spell.color)
      .setPosition(cx, cy)
      .setVisible(true);

    const tx = x + 118;
    this.detailTitle.setPosition(tx, y + 22).setText(spell.name).setWordWrapWidth(w - 118);
    this.detailSchool.setPosition(tx, y + 22 + this.detailTitle.height + 2).setText(`A working of ${spell.school}`);

    const attuned = spell.id === this.world.state.player.selectedSpell;
    this.attuned.setVisible(attuned).setPosition(x + w - 46, y + 8).setRotation(-0.12);
    if (attuned) {
      g.lineStyle(2, 0x8c2a22, 0.8);
      g.strokeRoundedRect(x + w - 96, y - 6, 100, 28, 6);
    }

    let ty = y + 124;
    divider(g, x, ty, w, 0x8c6a3a, 0.6);
    ty += 16;
    this.detailBody.setPosition(x, ty).setWordWrapWidth(w).setText(spell.description);
    ty += this.detailBody.height + 18;
    const lines = [`Mana  ${spell.manaCost}`, `Cooldown  ${(spell.cooldown / 1000).toFixed(1)}s`];
    if (spell.damage > 0) lines.push(`Strength  ${spell.damage}`);
    if (spell.range > 0) lines.push(`Reach  ${Math.round(spell.range / 32)} paces`);
    this.stats.setPosition(x, ty).setText(lines.join("        "));
  }

  private spells(): Spell[] {
    return this.world.state.player.learnedSpells
      .map((id) => SPELLS[id])
      .filter((spell): spell is Spell => spell !== undefined);
  }

  private setVisible(visible: boolean): void {
    setBookVisible(this.book, visible);
    this.g.setVisible(visible);
    for (const o of [this.bigGlyph, this.detailTitle, this.detailSchool, this.detailBody, this.stats, this.hint]) o.setVisible(visible);
    if (!visible) {
      this.attuned.setVisible(false);
      for (const row of this.rows) {
        row.glyph.setVisible(false);
        row.name.setVisible(false);
        row.school.setVisible(false);
      }
    }
  }
}
