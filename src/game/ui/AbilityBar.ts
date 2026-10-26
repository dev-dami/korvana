import Phaser from "phaser";

import { SPELLS } from "../data/spells";
import { weaponById } from "../data/weapons";
import { UiComponent } from "./UiComponent";
import { emblemScale, GLYPH, spellGlyphKey } from "./icons";
import { Hud } from "./Hud";
import {
  BRASS,
  capsuleBar,
  COLOR_BRIGHT,
  COLOR_DIM,
  COLOR_GOLD,
  COLOR_TEXT,
  heading,
  keyBadge,
  label,
} from "./theme";
import type { Frame } from "./theme";

const SLOT = 56;
const SLOT_GAP = 10;
const WEAPON_W = 232;
const WEAPON_H = 112;

interface Slot {
  frame: Frame;
  active: Frame;
  glyph: Phaser.GameObjects.Image;
  key: Phaser.GameObjects.Text;
  cost: Phaser.GameObjects.Text;
}

/**
 * The spell bar (bottom centre), the weapon plaque (bottom right) and the
 * control reminder.
 *
 * Spell slots are created once for as many spells as the player can ever learn,
 * rather than for the six the bar used to assume, so learning a seventh does
 * not silently drop it. Only the first six have number keys; the rest show a
 * dot and are reached through the spellbook.
 */
export class AbilityBar extends UiComponent {
  private g!: Phaser.GameObjects.Graphics;
  private slots: Slot[] = [];
  private spellName!: Phaser.GameObjects.Text;
  private empty!: Phaser.GameObjects.Text;

  private weaponPlate!: Frame;
  private weaponName!: Phaser.GameObjects.Text;
  private rowKeys: Phaser.GameObjects.Text[] = [];
  private rowLabels: Phaser.GameObjects.Text[] = [];
  private hints!: Phaser.GameObjects.Text;

  create(): void {
    this.slots = [];
    this.rowKeys = [];
    this.rowLabels = [];
    this.g = this.track(this.scene.add.graphics().setDepth(3));

    for (let i = 0; i < AbilityBar.MAX_SPELL_SLOTS; i++) {
      this.slots.push({
        frame: this.frame("slot", 1),
        active: this.frame("slotActive", 1),
        glyph: this.track(this.scene.add.image(0, 0, "__DEFAULT").setDepth(2)),
        key: this.track(label(this.scene, "", { size: 12, color: "#1a1208", bold: true, align: "center" }).setOrigin(0.5).setDepth(5)),
        cost: this.track(label(this.scene, "", { size: 12, color: "#bcd8ff", bold: true }).setOrigin(1, 1).setDepth(5)),
      });
      this.slots[i]!.cost.setStroke("#05060a", 3);
    }
    this.spellName = this.track(heading(this.scene, "", { size: 15, color: COLOR_GOLD }).setOrigin(0.5, 1).setDepth(5));
    this.spellName.setShadow(0, 1, "#000000", 3, false, true);
    this.empty = this.track(label(this.scene, "No workings learned yet", { size: 15, color: COLOR_DIM, align: "center" }).setOrigin(0.5).setDepth(5));

    this.weaponPlate = this.frame("ink", 1);
    this.weaponName = this.track(heading(this.scene, "", { size: 17, color: "#f0deaa", align: "left" }).setDepth(5));
    for (let i = 0; i < 3; i++) {
      this.rowKeys.push(this.track(label(this.scene, "", { size: 12, color: "#1a1208", bold: true }).setOrigin(0.5).setDepth(6)));
      this.rowLabels.push(this.track(label(this.scene, "", { size: 14, color: COLOR_TEXT }).setOrigin(0, 0.5).setDepth(5)));
    }

    this.hints = this.track(label(this.scene, "", { size: 13, color: "#c8bfa8", align: "center" }).setOrigin(0.5, 1).setDepth(5));
    this.hints.setStroke("#05060a", 3);
  }

  update(width: number, height: number, time: number): void {
    this.g.clear();
    const compact = width < 900;
    this.hints.setPosition(width / 2, height - 6).setText(compact ? Hud.COMPACT_HINTS : Hud.HINTS);
    const barBottom = height - 30;
    this.drawSpells(width, barBottom, time);
    this.drawWeapon(width, barBottom, compact);
  }

  private drawSpells(width: number, bottom: number, time: number): void {
    const state = this.world.state;
    const learned = state.player.learnedSpells.slice(0, AbilityBar.MAX_SPELL_SLOTS);
    const selected = state.player.selectedSpell;
    const totalW = learned.length * SLOT + Math.max(0, learned.length - 1) * SLOT_GAP;
    // Keep clear of the weapon plaque on narrow windows.
    const startX = Math.max(16, Math.min((width - totalW) / 2, width - WEAPON_W - 40 - totalW));
    const y = bottom - SLOT;

    this.empty.setVisible(learned.length === 0).setPosition(width / 2, bottom - SLOT / 2);

    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i]!;
      const id = learned[i];
      const spell = id ? SPELLS[id] : undefined;
      if (!spell || !id) {
        slot.frame.setVisible(false);
        slot.active.setVisible(false);
        slot.glyph.setVisible(false);
        slot.key.setVisible(false);
        slot.cost.setVisible(false);
        continue;
      }
      const x = startX + i * (SLOT + SLOT_GAP);
      const isSelected = id === selected;
      const lift = isSelected ? -4 : 0;
      const fraction = this.world.spells.cooldownFraction(id);
      const affordable = state.player.mana >= spell.manaCost;

      (isSelected ? slot.active : slot.frame).draw(x, y + lift, SLOT, SLOT);
      (isSelected ? slot.frame : slot.active).setVisible(false);

      const pulse = isSelected ? 1 + Math.sin(time / 300) * 0.04 : 1;
      slot.glyph
        .setTexture(spellGlyphKey(this.scene, spell.kind))
        .setScale(emblemScale(GLYPH, 34) * pulse)
        .setPosition(x + SLOT / 2, y + SLOT / 2 + lift)
        .setTint(spell.color)
        .setAlpha(affordable ? 1 : 0.35)
        .setVisible(true);

      // Cooldown: a dark pie that unwinds clockwise.
      if (fraction > 0) {
        this.g.fillStyle(0x05060a, 0.62);
        this.g.slice(x + SLOT / 2, y + SLOT / 2 + lift, SLOT * 0.42, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * fraction, false);
        this.g.fillPath();
      }
      if (!affordable) {
        this.g.lineStyle(1.5, 0x8a2a2a, 0.9);
        this.g.strokeRoundedRect(x + 4, y + 4 + lift, SLOT - 8, SLOT - 8, 5);
      }

      // Number key badge, top left.
      const hasKey = i < 6;
      keyBadge(this.g, x + 6, y + 6 + lift, 8, hasKey);
      slot.key
        .setText(hasKey ? `${i + 1}` : "")
        .setPosition(x + 6, y + 6 + lift)
        .setVisible(true);
      slot.cost
        .setText(`${spell.manaCost}`)
        .setPosition(x + SLOT - 6, y + SLOT - 3 + lift)
        .setColor(affordable ? "#bcd8ff" : "#e08a7a")
        .setVisible(true);
    }

    const current = SPELLS[selected];
    if (current && learned.includes(selected)) {
      const index = learned.indexOf(selected);
      const cx = startX + index * (SLOT + SLOT_GAP) + SLOT / 2;
      this.spellName.setVisible(true).setText(current.name).setPosition(Math.max(80, Math.min(width - 80, cx)), y - 8);
    } else {
      this.spellName.setVisible(false);
    }
  }

  private drawWeapon(width: number, bottom: number, compact: boolean): void {
    const weapon = weaponById(this.world.state.player.weapon);
    const w = compact ? 200 : WEAPON_W;
    const x = width - w - 18;
    const y = bottom - WEAPON_H;
    this.weaponPlate.draw(x, y, w, WEAPON_H);
    this.weaponName.setPosition(x + 18, y + 12).setText(weapon.name);

    const rows: Array<{ key: string; name: string; fraction: number; detail: string }> = [
      {
        key: "Z",
        name: "Light",
        fraction: this.world.combat.cooldownFraction("light", weapon.id),
        detail: `${weapon.light.damage}`,
      },
      {
        key: "X",
        name: "Heavy",
        fraction: this.world.combat.cooldownFraction("heavy", weapon.id),
        detail: `${weapon.heavy.damage}`,
      },
      {
        key: "C",
        name: "Dash",
        fraction: this.world.player.dashCooldownFraction,
        detail: "",
      },
    ];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]!;
      const ry = y + 46 + i * 22;
      const ready = row.fraction <= 0;
      keyBadge(this.g, x + 26, ry, 9, ready);
      this.rowKeys[i]!.setText(row.key).setPosition(x + 26, ry);
      this.rowLabels[i]!
        .setPosition(x + 42, ry)
        .setText(row.detail ? `${row.name}  ${row.detail}` : row.name)
        .setColor(ready ? COLOR_TEXT : "#8a8375");
      capsuleBar(this.g, x + 112, ry - 3, w - 132, 6, 1 - row.fraction, ready ? 0x7fbf5a : BRASS, 0x1a1c24);
    }
    // Readiness glow on the plate's name when both swings are available.
    this.weaponName.setColor(rows[0]!.fraction <= 0 && rows[1]!.fraction <= 0 ? "#f0deaa" : COLOR_BRIGHT);
  }

  /** More than any character can learn in the current story. */
  static readonly MAX_SPELL_SLOTS = 10;
}
