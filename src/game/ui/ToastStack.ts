import type Phaser from "phaser";

import { TEXT_RES } from "../display";
import { bodyText } from "../gfx/fonts";
import { UiComponent } from "./UiComponent";
import { COLOR_BRIGHT } from "./theme";

interface Toast {
  text: Phaser.GameObjects.Text;
  expires: number;
}

const LIFETIME = 3400;
const MAX_VISIBLE = 6;
const FADE_MS = 700;

/** Transient messages: pickups, rewards, quest updates, save confirmations. */
export class ToastStack extends UiComponent {
  private toasts: Toast[] = [];
  /** Last logical width seen in update, so a push between frames still lands centred. */
  private lastWidth = 0;

  create(): void {
    this.toasts = [];
    this.lastWidth = 0;
  }

  update(width: number, _height: number, time: number): void {
    this.lastWidth = width;
    let removed = false;

    for (let i = this.toasts.length - 1; i >= 0; i--) {
      const toast = this.toasts[i];
      if (!toast) continue;

      const remaining = toast.expires - time;
      if (remaining <= 0) {
        toast.text.destroy();
        this.toasts.splice(i, 1);
        removed = true;
      } else if (remaining < FADE_MS) {
        toast.text.setAlpha(remaining / FADE_MS);
      }
    }

    if (removed) this.layout(width);
    else for (const toast of this.toasts) toast.text.setX(width / 2);
  }

  push(message: string): void {
    const text = this.track(
      this.scene.add
        .text(0, 0, message, {
          ...bodyText({ size: 16, color: COLOR_BRIGHT, align: "center", padding: 9 }),
          backgroundColor: "#0d0e14f2",
        })
        .setOrigin(0.5, 0)
        .setResolution(TEXT_RES)
        .setDepth(200),
    );
    text.setStroke("#000000", 3);

    this.toasts.push({ text, expires: this.scene.time.now + LIFETIME });
    while (this.toasts.length > MAX_VISIBLE) {
      const oldest = this.toasts.shift();
      oldest?.text.destroy();
    }
    this.layout(this.lastWidth);
  }

  private layout(width: number): void {
    const center = width / 2;
    let y = 96;
    for (const toast of this.toasts) {
      toast.text.setPosition(center, y);
      y += toast.text.height + 6;
    }
  }
}
