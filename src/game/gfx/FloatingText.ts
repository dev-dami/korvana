import Phaser from "phaser";

import { DEPTH } from "../config";
import { TEXT_RES } from "../display";
import { FONT_BODY, FONT_DISPLAY } from "./fonts";

export interface FloatOptions {
  size?: number;
  color?: string;
  /** Use the display face (names, callouts) rather than body copy (numbers). */
  display?: boolean;
  rise?: number;
  duration?: number;
  drift?: number;
  stroke?: number;
}

/**
 * Floating text sits above the light map and the glow effects: a damage
 * number has to stay readable at midnight in a crypt.
 */
const TEXT_DEPTH = DEPTH.weather - 10;

/**
 * Rising, fading text - damage numbers, "Miss", quest pings. Outlined so it
 * stays readable over grass, water and stone alike.
 */
export function floatText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  message: string,
  options: FloatOptions = {},
): Phaser.GameObjects.Text {
  const stroke = options.stroke ?? 4;
  // A Phaser Text canvas is sized to the glyph bounds, so a stroke or shadow
  // drawn outside them gets cropped. Pad by the stroke width plus the shadow.
  const padX = stroke + 3;
  const padY = stroke + 6;

  const text = scene.add
    .text(x, y, message, {
      fontFamily: options.display ? FONT_DISPLAY : FONT_BODY,
      fontSize: `${options.size ?? 16}px`,
      color: options.color ?? "#ffffff",
      fontStyle: options.display ? "normal" : "bold",
      align: "center",
      padding: { x: padX, y: padY },
    })
    .setOrigin(0.5, 1)
    .setResolution(TEXT_RES)
    .setDepth(TEXT_DEPTH);

  text.setStroke("#0a0b10", stroke);
  text.setShadow(0, 2, "#000000", 2, false, true);

  const rise = options.rise ?? 34;
  const drift = options.drift ?? 0;

  scene.tweens.add({
    targets: text,
    y: y - rise,
    x: x + drift,
    alpha: 0,
    duration: options.duration ?? 780,
    ease: "Cubic.easeOut",
    onComplete: () => text.destroy(),
  });

  return text;
}

/** A larger announcement used when an attack is thrown. */
export function calloutText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  message: string,
  color: string,
): Phaser.GameObjects.Text {
  const text = scene.add
    .text(x, y, message, {
      fontFamily: FONT_DISPLAY,
      fontSize: "22px",
      color,
      align: "center",
      padding: { x: 12, y: 10 },
    })
    .setOrigin(0.5, 1)
    .setResolution(TEXT_RES)
    .setDepth(TEXT_DEPTH + 1)
    .setScale(0.85);

  text.setStroke("#0a0b10", 5);

  scene.tweens.add({
    targets: text,
    scale: 1,
    duration: 130,
    ease: "Back.easeOut",
  });
  scene.tweens.add({
    targets: text,
    y: y - 30,
    alpha: 0,
    duration: 620,
    delay: 120,
    ease: "Cubic.easeOut",
    onComplete: () => text.destroy(),
  });

  return text;
}
