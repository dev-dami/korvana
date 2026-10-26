import type Phaser from "phaser";

import { loreById } from "../data/lore";
import { ACT_TITLES } from "../data/quests";
import { bookTitle, drawBook, setBookVisible } from "./Book";
import type { BookParts } from "./Book";
import { UiComponent } from "./UiComponent";
import { COLOR_INK, COLOR_INK_SOFT, COLOR_RUBRIC, divider, heading, label } from "./theme";

const ROW_H = 28;
const MAX_ROWS = 16;

type EntryKind = "quest" | "done" | "lore";

interface JournalEntry {
  kind: EntryKind;
  heading: boolean;
  title: string;
  /** Small italic line under the title on the reading page. */
  subtitle: string;
  body: string;
  /** Objective progress, for quests in hand. */
  progress?: { done: number; of: number; objective: string };
}

/**
 * The journal: what you are doing, what you have done, and what you have
 * worked out about Korvana.
 *
 * The lore half is the reason the story survives being put down for a week -
 * everything the player has been told stays readable in their own words.
 *
 * Section headings are drawn in the list but can never be selected:
 * WorldScene's journalIndex counts entries only, and is mapped onto them here.
 * (It used to index the list *including* headings, so the first entry shown
 * was always an empty heading page and the last entry was unreachable.)
 */
export class JournalPanel extends UiComponent {
  private book!: BookParts;
  private rows: Phaser.GameObjects.Text[] = [];
  private moreAbove!: Phaser.GameObjects.Text;
  private moreBelow!: Phaser.GameObjects.Text;
  private detailTitle!: Phaser.GameObjects.Text;
  private detailSub!: Phaser.GameObjects.Text;
  private detailBody!: Phaser.GameObjects.Text;
  private detailObjective!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private g!: Phaser.GameObjects.Graphics;

  create(): void {
    this.rows = [];
    this.book = {
      veil: this.track(this.scene.add.graphics().setDepth(0)),
      page: this.frame("parchment", 1),
      g: this.track(this.scene.add.graphics().setDepth(2)),
      ribbon: this.frame("ribbon", 4),
      title: this.track(bookTitle(this.scene, "Journal").setDepth(5)),
    };
    this.g = this.track(this.scene.add.graphics().setDepth(3));
    for (let i = 0; i < MAX_ROWS; i++) {
      this.rows.push(this.track(label(this.scene, "", { size: 16, color: COLOR_INK }).setDepth(5)));
    }
    this.moreAbove = this.track(label(this.scene, "", { size: 13, color: COLOR_INK_SOFT }).setDepth(5));
    this.moreBelow = this.track(label(this.scene, "", { size: 13, color: COLOR_INK_SOFT }).setDepth(5));
    this.detailTitle = this.track(heading(this.scene, "", { size: 22, color: "#3a2412", align: "left" }).setDepth(5));
    this.detailSub = this.track(label(this.scene, "", { size: 15, color: COLOR_RUBRIC }).setDepth(5));
    this.detailSub.setFontStyle("italic");
    this.detailBody = this.track(label(this.scene, "", { size: 17, color: COLOR_INK, lineSpacing: 8 }).setDepth(5));
    this.detailObjective = this.track(label(this.scene, "", { size: 16, color: "#4a2c14", lineSpacing: 4 }).setDepth(5));
    this.hint = this.track(label(this.scene, "", { size: 14, color: COLOR_INK_SOFT, align: "center" }).setOrigin(0.5, 1).setDepth(5));
  }

  update(width: number, height: number): void {
    const open = this.world.journalOpen;
    this.setVisible(open);
    if (!open) return;

    const r = drawBook(this.book, width, height);
    const g = this.g;
    g.clear();

    const entries = this.entries();
    const selectable = entries.filter((e) => !e.heading);
    const listX = r.x + 40;
    const listW = r.spine - listX - 28;
    const listTop = r.y + 50;
    const rowsFit = Math.max(4, Math.min(MAX_ROWS, Math.floor((r.h - 110) / ROW_H)));

    this.hint.setPosition((r.spine + r.x + r.w) / 2, r.y + r.h - 22).setText("UP / DOWN  turn the page        J or ESC  close");

    if (selectable.length === 0) {
      this.rows[0]?.setVisible(true).setPosition(listX, listTop).setText("Nothing written down yet.").setColor(COLOR_INK_SOFT);
      for (let i = 1; i < this.rows.length; i++) this.rows[i]?.setVisible(false);
      this.moreAbove.setVisible(false);
      this.moreBelow.setVisible(false);
      this.showDetail(null, r.spine + 36, r.y + 50, r.x + r.w - r.spine - 76);
      return;
    }

    const selected = selectable[Math.min(this.world.journalIndex, selectable.length - 1)]!;
    const selectedRow = entries.indexOf(selected);
    const offset = this.windowOffset(selectedRow, entries.length, rowsFit);

    for (let i = 0; i < this.rows.length; i++) {
      const row = this.rows[i]!;
      const entry = i < rowsFit ? entries[offset + i] : undefined;
      if (!entry) {
        row.setVisible(false);
        continue;
      }
      const y = listTop + i * ROW_H;
      if (entry.heading) {
        row
          .setVisible(true)
          .setPosition(listX, y + 4)
          .setText(entry.title.toUpperCase())
          .setColor(COLOR_RUBRIC)
          .setFontSize(13)
          .setLetterSpacing(2);
        divider(g, listX + row.width + 10, y + 13, Math.max(10, listW - row.width - 14), 0x8c2a22, 0.45);
        continue;
      }
      const isSelected = entry === selected;
      if (isSelected) {
        g.fillStyle(0xb8862e, 0.22);
        g.fillRoundedRect(listX - 10, y - 3, listW + 10, ROW_H - 2, 4);
        g.fillStyle(0x8c2a22, 0.9);
        g.fillTriangle(listX - 6, y + 5, listX - 6, y + 15, listX, y + 10);
      }
      const marker = entry.kind === "done" ? "✓ " : "";
      row
        .setVisible(true)
        .setPosition(listX + 8, y)
        .setText(`${marker}${entry.title}`)
        .setFontSize(16)
        .setLetterSpacing(0)
        .setColor(isSelected ? "#1a0e06" : entry.kind === "done" ? COLOR_INK_SOFT : COLOR_INK);
      row.setFontStyle(isSelected ? "bold" : "normal");
    }

    this.moreAbove.setVisible(offset > 0).setPosition(listX + 8, listTop - 22).setText(`▴ ${offset} more`);
    const below = Math.max(0, entries.length - offset - rowsFit);
    this.moreBelow.setVisible(below > 0).setPosition(listX + 8, listTop + rowsFit * ROW_H).setText(`▾ ${below} more`);

    this.showDetail(selected, r.spine + 36, r.y + 50, r.x + r.w - r.spine - 76);
  }

  private showDetail(entry: JournalEntry | null, x: number, y: number, w: number): void {
    if (!entry) {
      this.detailTitle.setText("");
      this.detailSub.setText("");
      this.detailObjective.setText("");
      this.detailBody.setPosition(x, y).setWordWrapWidth(w).setText("The pages are clean. Korvana has not happened to you yet.");
      return;
    }
    this.detailTitle.setPosition(x, y).setText(entry.title).setWordWrapWidth(w);
    let cy = y + this.detailTitle.height + 4;
    this.detailSub.setPosition(x, cy).setText(entry.subtitle);
    cy += this.detailSub.height + 10;
    divider(this.g, x, cy, Math.min(w, 260), 0x8c6a3a, 0.6);
    cy += 14;

    if (entry.progress) {
      const p = entry.progress;
      const pips = p.of > 1 ? "  " + "◆".repeat(p.done) + "◇".repeat(Math.max(0, p.of - p.done)) : "";
      this.detailObjective.setPosition(x, cy).setWordWrapWidth(w).setText(`Now: ${p.objective}${pips}`);
      cy += this.detailObjective.height + 12;
    } else {
      this.detailObjective.setText("");
    }
    this.detailBody.setPosition(x, cy).setWordWrapWidth(w).setText(entry.body);
  }

  /** Flattens quests and lore into one scrollable list, in story order. */
  private entries(): JournalEntry[] {
    const out: JournalEntry[] = [];

    const active = this.world.quests.activeQuests();
    if (active.length > 0) {
      out.push({ kind: "quest", heading: true, title: "In hand", subtitle: "", body: "" });
      for (const { def, stage, progress } of active) {
        out.push({
          kind: "quest",
          heading: false,
          title: def.name,
          subtitle: ACT_TITLES[def.act] ?? `Act ${def.act}`,
          body: def.summary,
          progress: { done: progress, of: stage.count, objective: stage.objective },
        });
      }
    }

    const done = this.world.quests.completedQuests();
    if (done.length > 0) {
      out.push({ kind: "done", heading: true, title: "Finished", subtitle: "", body: "" });
      for (const def of done) {
        out.push({
          kind: "done",
          heading: false,
          title: def.name,
          subtitle: `${ACT_TITLES[def.act] ?? `Act ${def.act}`} — done`,
          body: def.summary,
        });
      }
    }

    const lore = this.world.state.lore;
    if (lore.length > 0) {
      out.push({ kind: "lore", heading: true, title: "What I know", subtitle: "", body: "" });
      for (const id of lore) {
        const entry = loreById(id);
        if (!entry) continue;
        out.push({ kind: "lore", heading: false, title: entry.title, subtitle: "From my notes", body: entry.body });
      }
    }

    return out;
  }

  private windowOffset(selected: number, count: number, rows: number): number {
    if (count <= rows) return 0;
    const centred = selected - Math.floor(rows / 2);
    return Math.min(Math.max(0, centred), count - rows);
  }

  private setVisible(visible: boolean): void {
    setBookVisible(this.book, visible);
    this.g.setVisible(visible);
    for (const o of [this.detailTitle, this.detailSub, this.detailBody, this.detailObjective, this.hint, this.moreAbove, this.moreBelow]) {
      o.setVisible(visible);
    }
    if (!visible) for (const row of this.rows) row.setVisible(false);
  }
}
