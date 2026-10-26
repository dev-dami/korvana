import type Phaser from "phaser";

import { UiComponent } from "./UiComponent";
import { Compass } from "./Compass";
import { COLOR_BRIGHT, COLOR_GOLD, label } from "./theme";
import type { Frame } from "./theme";

interface Toast {
  frame: Frame;
  text: Phaser.GameObjects.Text;
  born: number;
  expires: number;
  /** Where the stack wants it; it glides there. */
  y: number;
}

const LIFETIME = 3600;
const MAX_VISIBLE = 5;
const FADE_MS = 600;
const ENTER_MS = 260;
const GAP = 6;

/**
 * Transient messages: pickups, rewards, quest updates, save confirmations.
 * Each arrives on a small ink plaque that drops in under the compass, glides
 * up as older ones expire, and fades out. Story news is set in gold.
 */
export class ToastStack extends UiComponent {
  private toasts: Toast[] = [];
  private lastWidth = 0;

  create(): void {
    this.toasts = [];
    this.lastWidth = 0;
  }

  update(width: number, _height: number, time: number): void {
    this.lastWidth = width;
    for (let i = this.toasts.length - 1; i >= 0; i--) {
      const toast = this.toasts[i]!;
      if (time >= toast.expires) {
        this.drop(toast);
        this.toasts.splice(i, 1);
      }
    }
    this.layout(width);

    for (const toast of this.toasts) {
      const age = time - toast.born;
      const remaining = toast.expires - time;
      const enter = Math.min(1, age / ENTER_MS);
      const alpha = Math.min(enter, remaining < FADE_MS ? remaining / FADE_MS : 1);
      const eased = 1 - Math.pow(1 - enter, 3);
      const y = toast.y - (1 - eased) * 14;
      const w = toast.text.width + 40;
      const h = toast.text.height + 16;
      toast.frame.draw(width / 2 - w / 2, y, w, h).setAlpha(alpha);
      toast.text.setPosition(Math.round(width / 2), Math.round(y + h / 2)).setAlpha(alpha);
    }
  }

  push(message: string): void {
    const now = this.scene.time.now;
    const story = /^(Quest|Journal|Received|Learned|Checkpoint|Act |House)/.test(message) || message.includes("affinity");
    const text = this.track(
      label(this.scene, message, { size: 16, color: story ? COLOR_GOLD : COLOR_BRIGHT, align: "center", wrap: 560 })
        .setOrigin(0.5, 0.5)
        .setDepth(201),
    );
    text.setShadow(0, 1, "#000000", 2, false, true);
    const frame = this.frame("plaque", 200);
    this.toasts.push({ frame, text, born: now, expires: now + LIFETIME, y: 0 });
    while (this.toasts.length > MAX_VISIBLE) {
      const oldest = this.toasts.shift();
      if (oldest) this.drop(oldest);
    }
    this.layout(this.lastWidth);
  }

  private drop(toast: Toast): void {
    this.release(toast.text);
    this.releaseFrame(toast.frame);
  }

  /** Targets for each toast; they ease toward them in update. */
  private layout(_width: number): void {
    let y = Compass.BOTTOM + 10;
    for (const toast of this.toasts) {
      toast.y = toast.y === 0 ? y : toast.y + (y - toast.y) * 0.25;
      y += toast.text.height + 16 + GAP;
    }
  }
}
