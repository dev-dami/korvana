import type Phaser from "phaser";

import { BRASS, COLOR_GOLD, heading, veil } from "./theme";
import type { Frame } from "./theme";

/**
 * The open-book layout shared by the journal and the spellbook: a parchment
 * spread with a shaded spine, and a ribbon title across the top.
 */
export interface BookParts {
  page: Frame;
  ribbon: Frame;
  title: Phaser.GameObjects.Text;
  g: Phaser.GameObjects.Graphics;
  veil: Phaser.GameObjects.Graphics;
}

export interface BookRect {
  x: number;
  y: number;
  w: number;
  h: number;
  /** x of the spine. */
  spine: number;
}

export function bookTitle(scene: Phaser.Scene, text: string): Phaser.GameObjects.Text {
  const t = heading(scene, text, { size: 24, color: COLOR_GOLD }).setOrigin(0.5);
  t.setShadow(0, 1, "#000000", 3, false, true);
  return t;
}

/** Lays out and draws the book. Returns where its pages are. */
export function drawBook(parts: BookParts, width: number, height: number, maxW = 1000, maxH = 580, split = 0.42): BookRect {
  const w = Math.min(maxW, width - 48);
  const h = Math.min(maxH, height - 70);
  const x = Math.round((width - w) / 2);
  const y = Math.round((height - h) / 2 + 14);
  const spine = Math.round(x + w * split);

  parts.veil.clear();
  veil(parts.veil, width, height, 0.72);
  parts.page.draw(x, y, w, h);

  const g = parts.g;
  g.clear();
  // The gutter: shadow either side of the spine, a crease down the middle.
  g.fillGradientStyle(0x3a2810, 0x3a2810, 0x3a2810, 0x3a2810, 0, 0.28, 0, 0.28);
  g.fillRect(spine - 26, y + 8, 26, h - 16);
  g.fillGradientStyle(0x3a2810, 0x3a2810, 0x3a2810, 0x3a2810, 0.28, 0, 0.28, 0);
  g.fillRect(spine, y + 8, 18, h - 16);
  g.lineStyle(1, 0x5a3e1e, 0.5);
  g.lineBetween(spine, y + 10, spine, y + h - 10);
  // Stitching at the head and tail of the spine.
  g.lineStyle(1, BRASS, 0.6);
  g.lineBetween(spine - 3, y + 8, spine + 3, y + 8);
  g.lineBetween(spine - 3, y + h - 8, spine + 3, y + h - 8);

  const ribbonW = Math.max(220, parts.title.width + 90);
  parts.ribbon.draw(x + w / 2 - ribbonW / 2, y - 22, ribbonW, 44);
  parts.title.setPosition(x + w / 2, y);
  return { x, y, w, h, spine };
}

export function setBookVisible(parts: BookParts, visible: boolean): void {
  parts.page.setVisible(visible);
  parts.ribbon.setVisible(visible);
  parts.title.setVisible(visible);
  parts.g.setVisible(visible);
  parts.veil.setVisible(visible);
}
