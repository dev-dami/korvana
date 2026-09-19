import type Phaser from "phaser";

import { SPELLS } from "../data/spells";
import { weaponById } from "../data/weapons";
import { UiComponent } from "./UiComponent";
import {
  bar,
  COLOR_BRIGHT,
  COLOR_DIM,
  COLOR_TEXT,
  heading,
  label,
  panel,
  PANEL_EDGE,
} from "./theme";

const SLOT_W = 124;
const SLOT_H = 46;
const SLOT_GAP = 8;

/**
 * The weapon plate, the two melee swings with their cooldowns, and the spell
 * bar.
 *
 * Spell slots are created once for as many spells as the player can ever learn,
 * rather than for the six the bar used to assume, so learning a seventh does
 * not silently drop it.
 */
export class AbilityBar extends UiComponent {
  private bars!: Phaser.GameObjects.Graphics;
  private weaponName!: Phaser.GameObjects.Text;
  private attackKeys: Phaser.GameObjects.Text[] = [];
  private attackLabels: Phaser.GameObjects.Text[] = [];
  private slotBoxes!: Phaser.GameObjects.Graphics;
  private slotLabels: Phaser.GameObjects.Text[] = [];
  /** The spell ids the labels were last written for, so text is only reset on change. */
  private slotSignature = "";

  create(): void {
    this.bars = this.track(this.scene.add.graphics().setDepth(1));
    this.slotBoxes = this.track(this.scene.add.graphics().setDepth(2));

    this.weaponName = this.track(
      heading(this.scene, "", { size: 20, color: "#ecdcae", align: "left" })
        .setOrigin(0, 0)
        .setDepth(2),
    );

    for (let i = 0; i < 2; i++) {
      this.attackKeys.push(
        this.track(
          label(this.scene, "", { size: 13, color: "#0d0e14", align: "center", bold: true })
            .setOrigin(0.5, 0.5)
            .setDepth(3),
        ),
      );
      this.attackLabels.push(
        this.track(
          label(this.scene, "", { size: 15, color: COLOR_TEXT, align: "left" })
            .setOrigin(0, 0)
            .setDepth(3),
        ),
      );
    }

    for (let i = 0; i < AbilityBar.MAX_SPELL_SLOTS; i++) {
      this.slotLabels.push(
        this.track(
          label(this.scene, "", { size: 14, color: "#f0e6d2", align: "center" })
            .setOrigin(0.5, 0.5)
            .setDepth(3),
        ),
      );
    }
  }

  update(width: number, height: number): void {
    this.drawWeaponPanel(width, height);
    this.drawSpellBar(width, height);
  }

  private drawWeaponPanel(width: number, height: number): void {
    const weapon = weaponById(this.world.state.player.weapon);
    const g = this.bars;
    const compact = width < 620;
    const panelWidth = compact ? 206 : 256;
    const panelHeight = compact ? 112 : 116;
    const panelGap = compact ? 10 : 18;
    const panelBottom = height - 130;
    const x = width - panelWidth - (compact ? 12 : 24);
    const y = Math.max(12, panelBottom - panelHeight - panelGap);

    g.clear();
    panel(g, x, y, panelWidth, panelHeight);
    this.weaponName
      .setFontSize(compact ? 17 : 20)
      .setPosition(x + 14, y + 10)
      .setText(weapon.name);

    const rows: Array<{ key: string; name: string; kind: "light" | "heavy" }> = [
      { key: "Z", name: "Light", kind: "light" },
      { key: "X", name: "Heavy", kind: "heavy" },
    ];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const text = this.attackLabels[i];
      if (!row || !text) continue;

      const fraction = this.world.combat.cooldownFraction(row.kind, weapon.id);
      const ready = fraction <= 0;
      const damage = row.kind === "light" ? weapon.light.damage : weapon.heavy.damage;
      const rowY = y + 43 + i * 27;
      const key = this.attackKeys[i];

      g.fillStyle(ready ? 0xd9b44a : 0x777064, 1);
      g.fillRoundedRect(x + 14, rowY - 2, 27, 20, 4);
      g.lineStyle(1, 0xf0dca0, 0.7);
      g.strokeRoundedRect(x + 14, rowY - 2, 27, 20, 4);

      key
        ?.setPosition(x + 27.5, rowY + 8)
        .setText(row.key)
        .setColor(ready ? "#0d0e14" : "#1b1a18")
        .setFontSize(compact ? 12 : 13);
      text
        .setFontSize(compact ? 13 : 15)
        .setPosition(x + 50, rowY)
        .setText(`${row.name}    ${damage} dmg`)
        .setColor(ready ? COLOR_TEXT : "#8a8375");

      bar(
        g,
        x + 14,
        rowY + 23,
        panelWidth - 28,
        5,
        1 - fraction,
        ready ? 0x77b85a : 0xd9b44a,
        0x24262e,
      );
    }
  }

  private drawSpellBar(width: number, height: number): void {
    const learned = this.world.state.player.learnedSpells;
    const selected = this.world.state.player.selectedSpell;
    const shown = learned.slice(0, AbilityBar.MAX_SPELL_SLOTS);
    const y = height - 130;

    const signature = shown.join("|");
    if (signature !== this.slotSignature) {
      this.slotSignature = signature;
      for (let i = 0; i < this.slotLabels.length; i++) {
        const spell = shown[i] ? SPELLS[shown[i] as string] : undefined;
        this.slotLabels[i]?.setText(spell ? `${spell.name}\n${spell.manaCost} mp` : "");
      }
    }

    const totalW = shown.length * SLOT_W + Math.max(0, shown.length - 1) * SLOT_GAP;
    const startX = (width - totalW) / 2;

    this.slotBoxes.clear();
    for (let i = 0; i < this.slotLabels.length; i++) {
      const text = this.slotLabels[i];
      if (!text) continue;
      const id = shown[i];
      if (!id) {
        text.setVisible(false);
        continue;
      }

      const spell = SPELLS[id];
      const x = startX + i * (SLOT_W + SLOT_GAP);
      const isSelected = id === selected;
      const fraction = this.world.spells.cooldownFraction(id);
      const affordable = this.world.state.player.mana >= (spell?.manaCost ?? 0);

      this.slotBoxes.fillStyle(0x0d0e14, 0.92);
      this.slotBoxes.fillRoundedRect(x, y, SLOT_W, SLOT_H, 5);
      if (fraction > 0) {
        this.slotBoxes.fillStyle(0x000000, 0.55);
        this.slotBoxes.fillRect(x, y, Math.round(SLOT_W * fraction), SLOT_H);
      }
      this.slotBoxes.lineStyle(isSelected ? 2 : 1, isSelected ? 0xd9b44a : PANEL_EDGE, 1);
      this.slotBoxes.strokeRoundedRect(x, y, SLOT_W, SLOT_H, 5);

      text
        .setPosition(x + SLOT_W / 2, y + SLOT_H / 2)
        .setVisible(true)
        .setColor(affordable ? (isSelected ? COLOR_BRIGHT : "#c2bcab") : "#7a7264");
    }

    if (shown.length === 0) {
      this.slotLabels[0]
        ?.setVisible(true)
        .setPosition(width / 2, y + SLOT_H / 2)
        .setText("no spells learned")
        .setColor(COLOR_DIM);
    }
  }

  /** More than any character can learn in the current story. */
  static readonly MAX_SPELL_SLOTS = 10;
}
