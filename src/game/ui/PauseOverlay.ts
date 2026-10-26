import type Phaser from "phaser";

import { UiComponent } from "./UiComponent";
import { BRASS, COLOR_DIM, COLOR_GOLD, COLOR_TEXT, divider, heading, keyBadge, label, veil } from "./theme";
import type { Frame } from "./theme";

const CONTROLS: Array<[string, string]> = [
  ["WASD", "Walk"],
  ["SHIFT", "Sprint"],
  ["C", "Dash"],
  ["Z / X", "Light / heavy swing"],
  ["SPACE", "Cast attuned spell"],
  ["1-6", "Attune spell, or choose"],
  ["E", "Talk, continue"],
  ["Q", "Drink a tonic"],
  ["T", "Change weapon"],
  ["I", "Satchel"],
  ["J", "Journal"],
  ["M", "Spellbook"],
  ["F8 / F9", "Save / load"],
  ["P", "Pause"],
];

/** Keeps the world readable while making it clear that simulation is stopped. */
export class PauseOverlay extends UiComponent {
  private veil!: Phaser.GameObjects.Graphics;
  private panel!: Frame;
  private g!: Phaser.GameObjects.Graphics;
  private title!: Phaser.GameObjects.Text;
  private subtitle!: Phaser.GameObjects.Text;
  private keys: Phaser.GameObjects.Text[] = [];
  private actions: Phaser.GameObjects.Text[] = [];
  private hint!: Phaser.GameObjects.Text;
  private openedAt = 0;
  private wasOpen = false;

  create(): void {
    this.keys = [];
    this.actions = [];
    this.wasOpen = false;
    this.veil = this.track(this.scene.add.graphics().setDepth(0));
    this.panel = this.frame("ink", 1);
    this.g = this.track(this.scene.add.graphics().setDepth(2));
    this.title = this.track(heading(this.scene, "Paused", { size: 40, color: "#f0d98e" }).setOrigin(0.5, 0).setDepth(3));
    this.title.setShadow(0, 0, "#c08030", 14, false, true);
    this.subtitle = this.track(label(this.scene, "The grounds wait for you.", { size: 17, color: COLOR_DIM, align: "center" }).setOrigin(0.5, 0).setDepth(3));
    this.subtitle.setFontStyle("italic");
    for (const [key, action] of CONTROLS) {
      this.keys.push(this.track(label(this.scene, key, { size: 14, color: COLOR_GOLD, bold: true, align: "right" }).setOrigin(1, 0.5).setDepth(3)));
      this.actions.push(this.track(label(this.scene, action, { size: 16, color: COLOR_TEXT }).setOrigin(0, 0.5).setDepth(3)));
    }
    this.hint = this.track(label(this.scene, "P or ESC  resume", { size: 15, color: COLOR_GOLD, align: "center" }).setOrigin(0.5, 1).setDepth(3));
  }

  update(width: number, height: number, time: number): void {
    const open = this.world.isPaused;
    if (open && !this.wasOpen) this.openedAt = time;
    this.wasOpen = open;
    this.setVisible(open);
    if (!open) return;

    const a = Math.min(1, (time - this.openedAt) / 180);
    const w = Math.min(620, width - 40);
    const twoCols = w >= 560;
    const rows = twoCols ? Math.ceil(CONTROLS.length / 2) : CONTROLS.length;
    const h = Math.min(height - 40, 140 + rows * 28 + 52);
    const x = Math.round((width - w) / 2);
    const y = Math.round((height - h) / 2);

    this.veil.clear();
    veil(this.veil, width, height, 0.66 * a);
    this.panel.draw(x, y, w, h).setAlpha(a);
    this.g.clear();
    this.g.setAlpha(a);
    this.title.setPosition(width / 2, y + 26).setAlpha(a);
    this.subtitle.setPosition(width / 2, y + 78).setAlpha(a);
    divider(this.g, x + 60, y + 114, w - 120, BRASS, 0.7);

    const colW = twoCols ? (w - 60) / 2 : w - 60;
    for (let i = 0; i < CONTROLS.length; i++) {
      const col = twoCols ? Math.floor(i / rows) : 0;
      const row = twoCols ? i % rows : i;
      const cx = x + 30 + col * colW;
      const cy = y + 140 + row * 28;
      const visible = cy < y + h - 50;
      const keyX = cx + 96;
      this.keys[i]!.setPosition(keyX, cy).setAlpha(a).setVisible(visible);
      this.actions[i]!.setPosition(keyX + 16, cy).setAlpha(a).setVisible(visible);
      if (visible) keyBadge(this.g, keyX + 7, cy, 2.5, true);
    }
    this.hint.setPosition(width / 2, y + h - 18).setAlpha(a * (0.7 + Math.sin(time / 400) * 0.3));
  }

  private setVisible(visible: boolean): void {
    this.veil.setVisible(visible);
    this.panel.setVisible(visible);
    this.g.setVisible(visible);
    this.title.setVisible(visible);
    this.subtitle.setVisible(visible);
    this.hint.setVisible(visible);
    if (!visible) for (const t of [...this.keys, ...this.actions]) t.setVisible(false);
  }
}
