import type Phaser from "phaser";

import { bodyText, displayText } from "../gfx/fonts";
import { TEXT_RES } from "../display";

/** Shared HUD styling, so every panel agrees on what a panel looks like. */
export const PANEL = 0x0d0e14;
export const PANEL_EDGE = 0x3f4350;
export const GOLD = 0xd9b44a;
export const HEALTH = 0xbb3f36;
export const MANA = 0x3f86dd;

export const COLOR_TEXT = "#e4ddcc";
export const COLOR_BRIGHT = "#f8f1e2";
export const COLOR_DIM = "#98917e";
export const COLOR_GOLD = "#e0ba4e";

export function panel(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  radius = 6,
): void {
  g.fillStyle(PANEL, 0.9);
  g.fillRoundedRect(x, y, w, h, radius);
  g.lineStyle(1, PANEL_EDGE, 1);
  g.strokeRoundedRect(x, y, w, h, radius);
}

export function bar(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  fraction: number,
  color: number,
  trough: number,
): void {
  const radius = Math.min(4, h / 2);
  g.fillStyle(trough, 1);
  g.fillRoundedRect(x, y, w, h, radius);

  const filled = Math.max(0, Math.round(w * Math.min(1, Math.max(0, fraction))));
  if (filled > 0) {
    g.fillStyle(color, 1);
    g.fillRoundedRect(x, y, filled, h, radius);
  }
}

export function label(
  scene: Phaser.Scene,
  text: string,
  opts: Parameters<typeof bodyText>[0] = {},
): Phaser.GameObjects.Text {
  return scene.add.text(0, 0, text, bodyText(opts)).setResolution(TEXT_RES);
}

export function heading(
  scene: Phaser.Scene,
  text: string,
  opts: Parameters<typeof displayText>[0] = {},
): Phaser.GameObjects.Text {
  return scene.add.text(0, 0, text, displayText(opts)).setResolution(TEXT_RES);
}

/** Rounds a world-pixel distance into the "paces" the HUD reports. */
export function paces(pixels: number, tile: number): number {
  return Math.max(0, Math.round(pixels / tile));
}
