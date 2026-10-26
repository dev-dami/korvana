import type Phaser from "phaser";

import type { ItemDef } from "../data/items";
import { weaponById } from "../data/weapons";
import { itemIconKey } from "../gfx/tiles";
import { bookTitle } from "./Book";
import { UiComponent } from "./UiComponent";
import { BRASS, COLOR_DIM, COLOR_GOLD, COLOR_TEXT, divider, heading, label, veil } from "./theme";
import type { Frame } from "./theme";

const ROW_H = 40;
const MAX_ROWS = 11;

interface Row {
  icon: Phaser.GameObjects.Image;
  name: Phaser.GameObjects.Text;
  qty: Phaser.GameObjects.Text;
}

const KIND_LABEL: Record<string, string> = {
  potion: "Tonic",
  wand: "Wand",
  key: "Key",
  relic: "Relic",
  material: "Material",
  book: "Book",
  weapon: "Weapon",
};

/**
 * The satchel: a leather-dark case with the contents listed down the left and
 * the chosen thing laid out on the right.
 *
 * The list scrolls: an eleventh item used to be invisible while still
 * selectable, leaving the detail pane describing something not on screen.
 */
export class InventoryPanel extends UiComponent {
  private veil!: Phaser.GameObjects.Graphics;
  private panel!: Frame;
  private ribbon!: Frame;
  private card!: Frame;
  private g!: Phaser.GameObjects.Graphics;
  private title!: Phaser.GameObjects.Text;
  private purse!: Phaser.GameObjects.Text;
  private rows: Row[] = [];
  private moreAbove!: Phaser.GameObjects.Text;
  private moreBelow!: Phaser.GameObjects.Text;
  private bigIcon!: Phaser.GameObjects.Image;
  private detailName!: Phaser.GameObjects.Text;
  private detailKind!: Phaser.GameObjects.Text;
  private detailBody!: Phaser.GameObjects.Text;
  private detailAction!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;

  create(): void {
    this.rows = [];
    this.veil = this.track(this.scene.add.graphics().setDepth(0));
    this.panel = this.frame("ink", 1);
    this.card = this.frame("plaque", 2);
    this.g = this.track(this.scene.add.graphics().setDepth(3));
    this.ribbon = this.frame("ribbon", 4);
    this.title = this.track(bookTitle(this.scene, "Satchel").setDepth(5));
    this.purse = this.track(label(this.scene, "", { size: 15, color: COLOR_GOLD }).setDepth(5));
    for (let i = 0; i < MAX_ROWS; i++) {
      this.rows.push({
        icon: this.track(this.scene.add.image(0, 0, "__DEFAULT").setDepth(5)),
        name: this.track(label(this.scene, "", { size: 16, color: COLOR_TEXT }).setOrigin(0, 0.5).setDepth(5)),
        qty: this.track(label(this.scene, "", { size: 15, color: COLOR_DIM }).setOrigin(1, 0.5).setDepth(5)),
      });
    }
    this.moreAbove = this.track(label(this.scene, "", { size: 13, color: COLOR_DIM }).setDepth(5));
    this.moreBelow = this.track(label(this.scene, "", { size: 13, color: COLOR_DIM }).setDepth(5));
    this.bigIcon = this.track(this.scene.add.image(0, 0, "__DEFAULT").setDepth(5));
    this.detailName = this.track(heading(this.scene, "", { size: 21, color: "#f0deaa", align: "left" }).setDepth(5));
    this.detailKind = this.track(label(this.scene, "", { size: 14, color: COLOR_GOLD }).setDepth(5).setLetterSpacing(2));
    this.detailBody = this.track(label(this.scene, "", { size: 16, color: "#ddd4c0", lineSpacing: 7 }).setDepth(5));
    this.detailAction = this.track(label(this.scene, "", { size: 15, color: "#bcd8ff" }).setDepth(5));
    this.hint = this.track(label(this.scene, "", { size: 14, color: COLOR_DIM, align: "center" }).setOrigin(0.5, 1).setDepth(5));
  }

  update(width: number, height: number): void {
    const open = this.world.inventoryOpen;
    this.setVisible(open);
    if (!open) return;

    const items = this.world.inventoryItems;
    const { player } = this.world.state;
    const w = Math.min(900, width - 48);
    const h = Math.min(560, height - 70);
    const x = Math.round((width - w) / 2);
    const y = Math.round((height - h) / 2 + 14);

    this.veil.clear();
    veil(this.veil, width, height, 0.72);
    this.panel.draw(x, y, w, h);
    const ribbonW = 240;
    this.ribbon.draw(x + w / 2 - ribbonW / 2, y - 22, ribbonW, 44);
    this.title.setPosition(x + w / 2, y);

    const g = this.g;
    g.clear();
    this.purse.setPosition(x + 32, y + 34).setText(`${player.gold} gold        Wielding the ${weaponById(player.weapon).name}`);
    divider(g, x + 30, y + 62, w - 60, BRASS, 0.5);

    const listX = x + 30;
    const listW = Math.round(w * 0.5);
    const listTop = y + 78;
    const rowsFit = Math.max(3, Math.min(MAX_ROWS, Math.floor((h - 130) / ROW_H)));
    const selected = Math.min(this.world.inventoryIndex, Math.max(0, items.length - 1));
    const offset = items.length > rowsFit ? Math.min(Math.max(0, selected - Math.floor(rowsFit / 2)), items.length - rowsFit) : 0;

    for (let i = 0; i < this.rows.length; i++) {
      const row = this.rows[i]!;
      const entry = i < rowsFit ? items[offset + i] : undefined;
      if (!entry) {
        row.icon.setVisible(false);
        row.name.setVisible(false);
        row.qty.setVisible(false);
        continue;
      }
      const ry = listTop + i * ROW_H;
      const isSelected = offset + i === selected;
      // An inset well per row, brass-lit when chosen.
      g.fillStyle(isSelected ? 0x2e2a1e : 0x0a0b10, isSelected ? 0.95 : 0.6);
      g.fillRoundedRect(listX, ry, listW, ROW_H - 6, 5);
      if (isSelected) {
        g.lineStyle(1.2, BRASS, 0.9);
        g.strokeRoundedRect(listX, ry, listW, ROW_H - 6, 5);
      }
      g.fillStyle(0x000000, 0.4);
      g.fillCircle(listX + 20, ry + (ROW_H - 6) / 2, 13);
      row.icon
        .setTexture(itemIconKey(entry.def.kind))
        .setScale(1.25)
        .setPosition(listX + 20, ry + (ROW_H - 6) / 2)
        .setVisible(true);
      row.name
        .setVisible(true)
        .setPosition(listX + 42, ry + (ROW_H - 6) / 2)
        .setText(entry.def.name)
        .setColor(isSelected ? "#ffe9a8" : COLOR_TEXT);
      row.qty
        .setVisible(entry.qty > 1)
        .setPosition(listX + listW - 12, ry + (ROW_H - 6) / 2)
        .setText(`×${entry.qty}`);
    }

    if (items.length === 0) {
      this.rows[0]!.name.setVisible(true).setPosition(listX + 4, listTop + 16).setText("Your satchel is empty.").setColor(COLOR_DIM);
    }
    this.moreAbove.setVisible(offset > 0).setPosition(listX + listW - 70, y + 66).setText(`▴ ${offset} more`);
    const below = Math.max(0, items.length - offset - rowsFit);
    this.moreBelow.setVisible(below > 0).setPosition(listX + listW - 70, listTop + rowsFit * ROW_H - 4).setText(`▾ ${below} more`);

    // The detail card.
    const cx = listX + listW + 24;
    const cw = x + w - 30 - cx;
    const ch = h - 130;
    this.card.draw(cx, listTop, cw, ch);
    const entry = items[selected];
    if (entry) {
      g.fillStyle(0x000000, 0.35);
      g.fillCircle(cx + cw / 2, listTop + 62, 40);
      g.lineStyle(1.5, BRASS, 0.7);
      g.strokeCircle(cx + cw / 2, listTop + 62, 40);
      this.bigIcon.setTexture(itemIconKey(entry.def.kind)).setScale(3).setPosition(cx + cw / 2, listTop + 62).setVisible(true);
      this.detailName.setPosition(cx + 20, listTop + 116).setWordWrapWidth(cw - 40).setText(entry.def.name);
      this.detailKind
        .setPosition(cx + 20, listTop + 120 + this.detailName.height)
        .setText(`${(KIND_LABEL[entry.def.kind] ?? entry.def.kind).toUpperCase()}   ·   worth ${entry.def.value}g`);
      const by = listTop + 148 + this.detailName.height;
      this.detailBody.setPosition(cx + 20, by).setWordWrapWidth(cw - 40).setText(entry.def.description);
      this.detailAction.setPosition(cx + 20, Math.min(listTop + ch - 34, by + this.detailBody.height + 14)).setText(this.actionHint(entry.def));
    } else {
      this.bigIcon.setVisible(false);
      this.detailName.setText("");
      this.detailKind.setText("");
      this.detailBody.setText("");
      this.detailAction.setText("");
    }

    this.hint.setPosition(x + w / 2, y + h - 16).setText("UP / DOWN  choose        ENTER  use or equip        I or ESC  close");
  }

  private actionHint(def: ItemDef): string {
    if (def.kind === "weapon") return "ENTER  to equip";
    if (def.kind === "potion" || def.kind === "book") return "ENTER  to use";
    return "Kept safe for now.";
  }

  private setVisible(visible: boolean): void {
    this.veil.setVisible(visible);
    this.panel.setVisible(visible);
    this.ribbon.setVisible(visible);
    this.card.setVisible(visible);
    this.g.setVisible(visible);
    for (const o of [this.title, this.purse, this.moreAbove, this.moreBelow, this.detailName, this.detailKind, this.detailBody, this.detailAction, this.hint]) {
      o.setVisible(visible);
    }
    if (!visible) {
      this.bigIcon.setVisible(false);
      for (const row of this.rows) {
        row.icon.setVisible(false);
        row.name.setVisible(false);
        row.qty.setVisible(false);
      }
    }
  }
}
