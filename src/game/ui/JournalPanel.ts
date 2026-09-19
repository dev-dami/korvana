import { loreById } from "../data/lore";
import { ACT_TITLES } from "../data/quests";
import { UiComponent } from "./UiComponent";
import { COLOR_DIM, COLOR_GOLD, COLOR_TEXT, heading, label, panel } from "./theme";

const PANEL_W = 900;
const PANEL_H = 520;
const LIST_W = 340;
const ROW_H = 28;
const VISIBLE_ROWS = 12;

type EntryKind = "quest" | "done" | "lore";

interface JournalEntry {
  kind: EntryKind;
  section: string;
  title: string;
  body: string;
}

/**
 * The journal: what you are doing, what you have done, and what you have
 * worked out about Korvana.
 *
 * The lore half is the reason the story survives being put down for a week -
 * everything the player has been told stays readable in their own words.
 */
export class JournalPanel extends UiComponent {
  private dim!: Phaser.GameObjects.Graphics;
  private frame!: Phaser.GameObjects.Graphics;
  private title!: Phaser.GameObjects.Text;
  private rows: Phaser.GameObjects.Text[] = [];
  private moreAbove!: Phaser.GameObjects.Text;
  private moreBelow!: Phaser.GameObjects.Text;
  private detailTitle!: Phaser.GameObjects.Text;
  private detailBody!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;

  create(): void {
    this.dim = this.track(this.scene.add.graphics().setDepth(300));
    this.frame = this.track(this.scene.add.graphics().setDepth(301));

    this.title = this.track(
      heading(this.scene, "Journal", { size: 32, color: "#e9d9a6", align: "left" }).setDepth(302),
    );

    for (let i = 0; i < VISIBLE_ROWS; i++) {
      this.rows.push(this.track(label(this.scene, "", { size: 15, color: COLOR_TEXT }).setDepth(302)));
    }

    this.moreAbove = this.track(label(this.scene, "", { size: 13, color: COLOR_DIM }).setDepth(302));
    this.moreBelow = this.track(label(this.scene, "", { size: 13, color: COLOR_DIM }).setDepth(302));

    this.detailTitle = this.track(
      heading(this.scene, "", { size: 22, color: COLOR_GOLD, align: "left" }).setDepth(302),
    );
    this.detailBody = this.track(
      label(this.scene, "", {
        size: 15,
        color: "#d9d2c0",
        wrap: PANEL_W - LIST_W - 72,
        lineSpacing: 9,
      }).setDepth(302),
    );
    this.hint = this.track(label(this.scene, "", { size: 13, color: COLOR_DIM }).setDepth(302));
  }

  update(width: number, height: number, _time: number): void {
    const open = this.world.journalOpen;
    this.setVisible(open);
    if (!open) return;

    const entries = this.entries();
    const x = Math.round((width - PANEL_W) / 2);
    const y = Math.round((height - PANEL_H) / 2);

    this.dim.clear();
    this.dim.fillStyle(0x05060a, 0.78);
    this.dim.fillRect(0, 0, width, height);

    this.frame.clear();
    panel(this.frame, x, y, PANEL_W, PANEL_H, 12);
    // Divider between the list and the reading pane.
    this.frame.lineStyle(1, 0x3f4350, 1);
    this.frame.lineBetween(x + LIST_W, y + 70, x + LIST_W, y + PANEL_H - 46);

    this.title.setPosition(x + 30, y + 18);

    if (entries.length === 0) {
      this.rows[0]?.setVisible(true).setPosition(x + 30, y + 92).setText("Nothing written down yet.").setColor(COLOR_DIM);
      for (let i = 1; i < this.rows.length; i++) this.rows[i]?.setVisible(false);
      this.moreAbove.setVisible(false);
      this.moreBelow.setVisible(false);
      this.detailTitle.setText("");
      this.detailBody.setText("");
    } else {
      const selected = Math.min(this.world.journalIndex, entries.length - 1);
      const offset = this.windowOffset(selected, entries.length);

      for (let i = 0; i < this.rows.length; i++) {
        const row = this.rows[i];
        if (!row) continue;
        const entry = entries[offset + i];
        if (!entry) {
          row.setVisible(false);
          continue;
        }

        const isSelected = offset + i === selected;
        if (isSelected) {
          this.frame.fillStyle(0x1f2333, 1);
          this.frame.fillRoundedRect(x + 18, y + 90 + i * ROW_H - 5, LIST_W - 24, ROW_H - 2, 5);
        }

        // Section headings are drawn as part of the list, in the dim colour.
        const isHeading = entry.title === entry.section;
        row
          .setVisible(true)
          .setPosition(x + 32, y + 90 + i * ROW_H)
          .setText(isHeading ? entry.section : `  ${entry.title}`)
          .setColor(isSelected ? "#ffe08a" : isHeading ? COLOR_DIM : COLOR_TEXT);
      }

      this.moreAbove.setVisible(offset > 0).setPosition(x + 32, y + 74).setText(`^ ${offset} more`);
      const below = Math.max(0, entries.length - offset - VISIBLE_ROWS);
      this.moreBelow.setVisible(below > 0).setPosition(x + 32, y + 74 + VISIBLE_ROWS * ROW_H).setText(`v ${below} more`);

      const entry = entries[selected];
      this.detailTitle.setVisible(true).setPosition(x + LIST_W + 28, y + 88).setText(entry?.title ?? "");
      this.detailBody.setVisible(true).setPosition(x + LIST_W + 28, y + 126).setText(entry?.body ?? "");
    }

    this.hint
      .setPosition(x + 30, y + PANEL_H - 34)
      .setText("UP / DOWN  choose        J / ESC  close");
  }

  /** Flattens quests and lore into one scrollable list, in story order. */
  private entries(): JournalEntry[] {
    const out: JournalEntry[] = [];

    const active = this.world.quests.activeQuests();
    if (active.length > 0) {
      const header = "Objectives";
      out.push({ kind: "quest", section: header, title: header, body: "" });
      for (const { def, stage, progress } of active) {
        out.push({
          kind: "quest",
          section: header,
          title: def.name,
          body: `${ACT_TITLES[def.act] ?? `Act ${def.act}`}\n\n${def.summary}\n\nCurrent objective: ${stage.objective} (${progress}/${stage.count})`,
        });
      }
    }

    const done = this.world.quests.completedQuests();
    if (done.length > 0) {
      const header = "Finished";
      out.push({ kind: "done", section: header, title: header, body: "" });
      for (const def of done) {
        out.push({ kind: "done", section: header, title: def.name, body: `${def.summary}\n\nDone.` });
      }
    }

    const lore = this.world.state.lore;
    if (lore.length > 0) {
      const header = "What I know";
      out.push({ kind: "lore", section: header, title: header, body: "" });
      for (const id of lore) {
        const entry = loreById(id);
        if (!entry) continue;
        out.push({ kind: "lore", section: header, title: entry.title, body: entry.body });
      }
    }

    return out;
  }

  private windowOffset(selected: number, count: number): number {
    if (count <= VISIBLE_ROWS) return 0;
    const centred = selected - Math.floor(VISIBLE_ROWS / 2);
    return Math.min(Math.max(0, centred), count - VISIBLE_ROWS);
  }

  private setVisible(visible: boolean): void {
    this.dim.setVisible(visible);
    this.frame.setVisible(visible);
    this.title.setVisible(visible);
    this.detailTitle.setVisible(visible);
    this.detailBody.setVisible(visible);
    this.hint.setVisible(visible);
    this.moreAbove.setVisible(visible);
    this.moreBelow.setVisible(visible);
    for (const row of this.rows) row.setVisible(visible);
  }
}
