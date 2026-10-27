import type Phaser from "phaser";

import { DPR, TEXT_RES } from "../display";
import { displayText } from "../gfx/fonts";
import { roundPortraitKey } from "../ui/Hud";
import { medallionKey } from "../ui/icons";
import {
  capsuleBar,
  COLOR_GOLD,
  COLOR_INK,
  Frame,
  heading,
  HEALTH,
  HEALTH_DARK,
  label,
  MANA,
  MANA_DARK,
  WARD,
} from "../ui/theme";
import type { Fighter } from "./DuelSim";

const PLATE_W = 372;
const PLATE_H = 104;
const PORTRAIT = 70;
const STAMINA = 0xd9b44a;
const STAMINA_DARK = 0x3a2c10;

export interface HudOptions {
  playerName: string;
  playerLook: string;
  enemyName: string;
  enemyLook: string;
  boss: boolean;
  friendly: boolean;
}

/**
 * The duel's overlay, drawn crisp on its own camera above the pixelated arena:
 * a plate for each side (portrait, health, stamina, mana), a parchment caption
 * for what people say mid-fight, a banner for the big moments, the spell-lock
 * meter, and the control strip.
 */
export class DuelHud {
  private readonly scene: Phaser.Scene;
  private readonly bars: Phaser.GameObjects.Graphics;
  private readonly frames: Frame[] = [];
  private readonly pStats: Phaser.GameObjects.Text;
  private readonly eStats: Phaser.GameObjects.Text;
  private readonly spellText: Phaser.GameObjects.Text;
  private readonly captionFrame: Frame;
  private readonly captionName: Phaser.GameObjects.Text;
  private readonly captionText: Phaser.GameObjects.Text;
  private readonly lockText: Phaser.GameObjects.Text;
  private readonly hint: Phaser.GameObjects.Text;
  private readonly w: number;
  private readonly h: number;
  private captionTime = 0;
  private pGhost = 1;
  private eGhost = 1;
  private lockBalance: number | null = null;
  private lockPulse = 0;

  constructor(scene: Phaser.Scene, w: number, h: number, o: HudOptions) {
    this.scene = scene;
    this.w = w;
    this.h = h;
    const y = 18;

    this.frames.push(new Frame(scene, "ink").draw(20, y, PLATE_W, PLATE_H).setDepth(10));
    this.frames.push(new Frame(scene, "ink").draw(w - 20 - PLATE_W, y, PLATE_W, PLATE_H).setDepth(10));
    const medal = medallionKey(scene, PORTRAIT + 10);
    const pcx = 20 + 14 + PORTRAIT / 2;
    const ecx = w - 20 - 14 - PORTRAIT / 2;
    const cy = y + PLATE_H / 2;
    scene.add.image(pcx, cy, roundPortraitKey(scene, o.playerLook, PORTRAIT)).setScale(1 / DPR).setDepth(21);
    scene.add.image(pcx, cy, medal).setScale(1 / DPR).setDepth(22);
    scene.add.image(ecx, cy, roundPortraitKey(scene, o.enemyLook, PORTRAIT)).setScale(1 / DPR).setDepth(21).setFlipX(true);
    scene.add.image(ecx, cy, medal).setScale(1 / DPR).setDepth(22);

    heading(scene, o.playerName, { size: 20, color: "#f0deaa", align: "left" })
      .setPosition(pcx + PORTRAIT / 2 + 14, y + 10)
      .setDepth(21);
    heading(scene, o.enemyName, { size: 18, color: o.boss ? "#a8f0c8" : "#f0deaa", align: "right" })
      .setOrigin(1, 0)
      .setPosition(ecx - PORTRAIT / 2 - 14, y + 11)
      .setDepth(21);
    this.pStats = label(scene, "", { size: 12, color: "#fff4e6", bold: true }).setOrigin(1, 0.5).setDepth(23);
    this.pStats.setStroke("#1a0808", 3);
    this.eStats = label(scene, "", { size: 12, color: "#fff4e6", bold: true }).setOrigin(0, 0.5).setDepth(23);
    this.eStats.setStroke("#1a0808", 3);
    this.bars = scene.add.graphics().setDepth(20);

    const title = o.boss ? "The Final Duel" : o.friendly ? "A Friendly Duel" : "A Duel";
    const t = scene.add
      .text(w / 2, y + 8, title, displayText({ size: 24, color: "#e9d9a6" }))
      .setOrigin(0.5, 0)
      .setResolution(TEXT_RES)
      .setDepth(21);
    t.setShadow(0, 2, "#000000", 6, false, true);

    this.spellText = label(scene, "", { size: 13, color: COLOR_GOLD })
      .setPosition(20 + 14 + PORTRAIT + 14, y + PLATE_H + 6)
      .setDepth(21);
    this.spellText.setStroke("#05060a", 3);

    this.captionFrame = new Frame(scene, "parchment").setDepth(30);
    this.captionFrame.setVisible(false);
    this.frames.push(this.captionFrame);
    this.captionName = heading(scene, "", { size: 15, color: "#7a2a1c", align: "left" }).setDepth(31).setVisible(false);
    this.captionText = label(scene, "", { size: 16, color: COLOR_INK, lineSpacing: 4 }).setDepth(31).setVisible(false);

    this.lockText = scene.add
      .text(w / 2, h * 0.2, "SPELL-LOCK", displayText({ size: 30, color: "#fff2c0" }))
      .setOrigin(0.5)
      .setResolution(TEXT_RES)
      .setDepth(32)
      .setVisible(false);
    this.lockText.setStroke("#1a1206", 6);

    this.hint = label(scene, "", { size: 12, color: "#cfc6b0" }).setOrigin(0.5, 1).setDepth(21);
    this.hint.setStroke("#05060a", 3);
    this.hint.setPosition(w / 2, h - 10);
    this.hint.setText(
      "A/D advance·retreat   W/S circle   C dodge   Z slash (×3 combo)   X heavy   SHIFT guard — tap as it lands to parry   SPACE cast   1-6 spell   Q tonic   ESC yield",
    );
  }

  destroy(): void {
    for (const f of this.frames) f.destroy();
  }

  update(player: Fighter, enemy: Fighter, dt: number, spell: string): void {
    const g = this.bars;
    g.clear();
    const y = 18;
    const px = 20 + 14 + PORTRAIT + 14;
    const barW = PLATE_W - (px - 20) - 18;
    const pf = player.hp / player.maxHp;
    const ef = enemy.hp / enemy.maxHp;
    this.pGhost = pf < this.pGhost ? Math.max(pf, this.pGhost - dt * 0.45) : pf;
    this.eGhost = ef < this.eGhost ? Math.max(ef, this.eGhost - dt * 0.45) : ef;

    capsuleBar(g, px, y + 42, barW, 15, pf, HEALTH, HEALTH_DARK, this.pGhost);
    capsuleBar(g, px, y + 63, barW * 0.86, 9, player.stamina / player.maxStamina, STAMINA, STAMINA_DARK);
    capsuleBar(g, px, y + 78, barW * 0.72, 8, player.mana / Math.max(1, player.maxMana), MANA, MANA_DARK);
    this.pStats.setPosition(px + barW - 8, y + 49.5).setText(`${Math.ceil(player.hp)} / ${player.maxHp}`);

    const ex = this.w - 20 - PLATE_W + 18;
    capsuleBar(g, ex, y + 42, barW, 15, ef, enemy.cfg.yields ? 0x4f86c6 : 0x8e44ad, 0x14102a, this.eGhost);
    capsuleBar(g, ex + barW * 0.14, y + 63, barW * 0.86, 9, enemy.stamina / enemy.maxStamina, STAMINA, STAMINA_DARK);
    this.eStats.setPosition(ex + 8, y + 49.5).setText(`${Math.max(0, Math.ceil(enemy.hp))} / ${enemy.maxHp}`);

    if (player.warded) {
      g.lineStyle(2, WARD, 0.9);
      g.strokeCircle(20 + 14 + PORTRAIT / 2, y + PLATE_H / 2, PORTRAIT / 2 + 4);
    }

    this.spellText.setText(spell);

    if (this.captionTime > 0) {
      this.captionTime -= dt;
      const a = Math.min(1, this.captionTime * 3);
      this.captionFrame.setAlpha(a);
      this.captionName.setAlpha(a);
      this.captionText.setAlpha(a);
      if (this.captionTime <= 0) {
        this.captionFrame.setVisible(false);
        this.captionName.setVisible(false);
        this.captionText.setVisible(false);
      }
    }

    this.drawLock(g, dt);
  }

  /** Something said mid-fight, in parchment across the bottom of the screen. */
  caption(speaker: string, text: string, seconds = 3.4): void {
    const w = Math.min(720, this.w - 80);
    const x = (this.w - w) / 2;
    this.captionText.setWordWrapWidth(w - 48).setText(text);
    const h = Math.max(70, this.captionText.height + (speaker ? 46 : 28));
    const y = this.h - h - 34;
    this.captionFrame.draw(x, y, w, h).setVisible(true).setAlpha(1);
    this.captionName.setText(speaker).setPosition(x + 24, y + 12).setVisible(!!speaker).setAlpha(1);
    this.captionText.setPosition(x + 24, y + (speaker ? 34 : 16)).setVisible(true).setAlpha(1);
    this.captionTime = seconds;
  }

  banner(text: string, color = "#f6dc8c", glow = "#e09040", size = 64): void {
    const t = this.scene.add
      .text(this.w / 2, this.h * 0.36, text, displayText({ size, color, padding: 12 }))
      .setOrigin(0.5)
      .setResolution(TEXT_RES)
      .setDepth(40)
      .setAlpha(0)
      .setScale(0.85);
    t.setShadow(0, 0, glow, 22, false, true);
    this.scene.tweens.add({ targets: t, alpha: 1, scale: 1, duration: 360, ease: "Back.easeOut" });
    this.scene.tweens.add({ targets: t, alpha: 0, duration: 400, delay: 1300, onComplete: () => t.destroy() });
  }

  /** Words that jump off a duellist: damage numbers, PARRY, GUARD BROKEN. */
  pop(x: number, y: number, text: string, color: string, size = 28): void {
    const t = this.scene.add
      .text(x, y, text, displayText({ size, color }))
      .setOrigin(0.5)
      .setResolution(TEXT_RES)
      .setDepth(35)
      .setScale(0.6);
    t.setStroke("#140808", Math.max(4, size / 5));
    this.scene.tweens.add({ targets: t, scale: 1, y: y - 16, duration: 150, ease: "Back.easeOut" });
    this.scene.tweens.add({ targets: t, alpha: 0, y: y - 58, duration: 650, delay: 380, onComplete: () => t.destroy() });
  }

  setLock(balance: number | null): void {
    this.lockBalance = balance;
    this.lockText.setVisible(balance !== null);
  }

  private drawLock(g: Phaser.GameObjects.Graphics, dt: number): void {
    if (this.lockBalance === null) return;
    this.lockPulse += dt * 10;
    const w = Math.min(520, this.w * 0.5);
    const x = (this.w - w) / 2;
    const y = this.h * 0.2 + 30;
    const b = Math.max(-1, Math.min(1, this.lockBalance));
    g.fillStyle(0x05060a, 0.75);
    g.fillRoundedRect(x - 6, y - 6, w + 12, 26, 13);
    g.fillStyle(0x8e44ad, 0.9);
    g.fillRoundedRect(x, y, w, 14, 7);
    g.fillStyle(MANA, 1);
    g.fillRoundedRect(x, y, (w * (b + 1)) / 2, 14, 7);
    const mx = x + (w * (b + 1)) / 2;
    g.fillStyle(0xfff4c8, 1);
    g.fillCircle(mx, y + 7, 9 + Math.sin(this.lockPulse) * 2);
    this.lockText.setScale(1 + Math.sin(this.lockPulse * 0.7) * 0.04);
    this.lockText.setText("SPELL-LOCK — mash SPACE!");
  }
}
