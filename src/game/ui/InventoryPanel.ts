import type { ItemDef } from "../data/items";
import { weaponById } from "../data/weapons";
import { UiComponent } from "./UiComponent";
import { COLOR_DIM, COLOR_TEXT, heading, label, panel } from "./theme";

const PANEL_W = 680;
const PANEL_H = 470;
const ROW_H = 30;
/** Rows the list can draw. More items than this scroll. */
const VISIBLE_ROWS = 9;

/**
 * The satchel.
 *
 * The list scrolls, which it previously did not: the old panel drew ten fixed
 * rows, so an eleventh item was invisible while still being selectable, leaving
 * the detail pane describing something not on screen.
 */
export class InventoryPanel extends UiComponent {
  private dim!: Phaser.GameObjects.Graphics;
  private frame!: Phaser.GameObjects.Graphics;
  private title!: Phaser.GameObjects.Text;
  private subtitle!: Phaser.GameObjects.Text;
  private rows: Phaser.GameObjects.Text[] = [];
  private moreAbove!: Phaser.GameObjects.Text;
  private moreBelow!: Phaser.GameObjects.Text;
  private detail!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;

  create(): void {
    this.dim = this.track(this.scene.add.graphics().setDepth(300));
    this.frame = this.track(this.scene.add.graphics().setDepth(301));

    this.title = this.track(
      heading(this.scene, "Satchel", { size: 32, color: "#e9d9a6", align: "left" }).setDepth(302),
    );
    this.subtitle = this.track(
      label(this.scene, "", { size: 15, color: "#d6cdb8" }).setDepth(302),
    );

    for (let i = 0; i < VISIBLE_ROWS; i++) {
      this.rows.push(this.track(label(this.scene, "", { size: 16, color: COLOR_TEXT }).setDepth(302)));
    }

    this.moreAbove = this.track(
      label(this.scene, "", { size: 13, color: COLOR_DIM }).setDepth(302),
    );
    this.moreBelow = this.track(
      label(this.scene, "", { size: 13, color: COLOR_DIM }).setDepth(302),
    );

    this.detail = this.track(
      label(this.scene, "", { size: 15, color: "#cbc2ab", wrap: PANEL_W - 64, lineSpacing: 7 }).setDepth(302),
    );
    this.hint = this.track(label(this.scene, "", { size: 13, color: COLOR_DIM }).setDepth(302));
  }

  update(width: number, height: number, _time: number): void {
    const open = this.world.inventoryOpen;
    this.setVisible(open);
    if (!open) return;

    const items = this.world.inventoryItems;
    const { player } = this.world.state;
    const x = Math.round((width - PANEL_W) / 2);
    const y = Math.round((height - PANEL_H) / 2);

    this.dim.clear();
    this.dim.fillStyle(0x05060a, 0.74);
    this.dim.fillRect(0, 0, width, height);

    this.frame.clear();
    panel(this.frame, x, y, PANEL_W, PANEL_H, 12);

    this.title.setPosition(x + 30, y + 18);
    this.subtitle
      .setPosition(x + 30, y + 60)
      .setText(`${player.gold} gold        wielding: ${weaponById(player.weapon).name}`);

    const listTop = y + 100;
    const selected = Math.min(this.world.inventoryIndex, Math.max(0, items.length - 1));
    const offset = this.windowOffset(selected, items.length);

    if (items.length === 0) {
      this.rows[0]?.setVisible(true).setPosition(x + 30, listTop).setText("Your satchel is empty.").setColor(COLOR_DIM);
      for (let i = 1; i < this.rows.length; i++) this.rows[i]?.setVisible(false);
    } else {
      for (let i = 0; i < this.rows.length; i++) {
        const row = this.rows[i];
        if (!row) continue;
        const entry = items[offset + i];
        if (!entry) {
          row.setVisible(false);
          continue;
        }

        const isSelected = offset + i === selected;
        if (isSelected) {
          this.frame.fillStyle(0x1f2333, 1);
          this.frame.fillRoundedRect(x + 18, listTop + i * ROW_H - 5, PANEL_W - 36, ROW_H - 2, 5);
        }

        row
          .setVisible(true)
          .setPosition(x + 34, listTop + i * ROW_H)
          .setText(`${isSelected ? ">" : " "}  ${entry.def.name}${entry.qty > 1 ? `   x${entry.qty}` : ""}`)
          .setColor(isSelected ? "#ffe08a" : COLOR_TEXT);
      }
    }

    this.moreAbove
      .setVisible(offset > 0)
      .setPosition(x + 34, y + 82)
      .setText(`^ ${offset} more`);
    const below = Math.max(0, items.length - offset - VISIBLE_ROWS);
    this.moreBelow
      .setVisible(below > 0)
      .setPosition(x + 34, listTop + VISIBLE_ROWS * ROW_H - 2)
      .setText(`v ${below} more`);

    const entry = items[selected];
    if (entry) {
      this.detail
        .setPosition(x + 30, y + PANEL_H - 140)
        .setText(`${entry.def.description}\n${this.actionHint(entry.def)}   -   worth ${entry.def.value}g`);
    } else {
      this.detail.setText("");
    }

    this.hint
      .setPosition(x + 30, y + PANEL_H - 34)
      .setText("UP / DOWN  choose        ENTER  use or equip        I / ESC  close");
  }

  /** Keeps the selected row inside the visible window. */
  private windowOffset(selected: number, count: number): number {
    if (count <= VISIBLE_ROWS) return 0;
    const centred = selected - Math.floor(VISIBLE_ROWS / 2);
    return Math.min(Math.max(0, centred), count - VISIBLE_ROWS);
  }

  private actionHint(def: ItemDef): string {
    if (def.kind === "weapon") return "Press ENTER to equip.";
    if (def.kind === "potion" || def.kind === "book") return "Press ENTER to use.";
    return "Kept for now.";
  }

  private setVisible(visible: boolean): void {
    this.dim.setVisible(visible);
    this.frame.setVisible(visible);
    this.title.setVisible(visible);
    this.subtitle.setVisible(visible);
    this.detail.setVisible(visible);
    this.hint.setVisible(visible);
    this.moreAbove.setVisible(visible);
    this.moreBelow.setVisible(visible);
    for (const row of this.rows) row.setVisible(visible);
  }
}
