import Phaser from "phaser";

import { DPR } from "../display";
import { HOUSE_COLOURS, heroLook } from "../gfx/looks";
import { portraitKey } from "../gfx/portraits";
import { UiComponent } from "./UiComponent";
import { CREST_W, crestKey, emblemScale, medallionKey } from "./icons";
import {
  BRASS,
  capsuleBar,
  COLOR_GOLD,
  HEALTH,
  HEALTH_DARK,
  heading,
  label,
  MANA,
  MANA_DARK,
  WARD,
} from "./theme";
import type { Frame } from "./theme";

const MEDALLION = 84;
const LEFT = 18;
const TOP = 14;

/**
 * Wren's plate: a portrait medallion (with the House crest once sorted), the
 * name, health and mana, plus the clock and purse at top right.
 *
 * Health drains with a pale trail, so a hit reads as a chunk falling away; at
 * low health the screen edges pulse red.
 */
export class Hud extends UiComponent {
  private wound!: Phaser.GameObjects.Graphics;
  private plate!: Frame;
  private clockPlate!: Frame;
  private bars!: Phaser.GameObjects.Graphics;
  private portrait!: Phaser.GameObjects.Image;
  private medallion!: Phaser.GameObjects.Image;
  private crest!: Phaser.GameObjects.Image;
  private nameText!: Phaser.GameObjects.Text;
  private houseText!: Phaser.GameObjects.Text;
  private healthText!: Phaser.GameObjects.Text;
  private manaText!: Phaser.GameObjects.Text;
  private clockText!: Phaser.GameObjects.Text;
  private goldText!: Phaser.GameObjects.Text;
  private sky!: Phaser.GameObjects.Graphics;

  private portraitLook = "";
  private healthTrail = 1;
  private manaTrail = 1;
  private lastTime = 0;

  create(): void {
    this.portraitLook = "";
    this.healthTrail = 1;
    this.manaTrail = 1;
    this.wound = this.track(this.scene.add.graphics().setDepth(0));

    this.plate = this.frame("ink", 1);
    this.clockPlate = this.frame("plaque", 1);
    this.bars = this.track(this.scene.add.graphics().setDepth(2));
    this.sky = this.track(this.scene.add.graphics().setDepth(3));

    this.portrait = this.track(this.scene.add.image(0, 0, "__DEFAULT").setDepth(4));
    this.medallion = this.track(
      this.scene.add.image(0, 0, medallionKey(this.scene, MEDALLION)).setScale(1 / DPR).setDepth(5),
    );
    this.crest = this.track(this.scene.add.image(0, 0, "__DEFAULT").setDepth(6).setVisible(false));

    this.nameText = this.track(heading(this.scene, "", { size: 24, color: "#f0deaa", align: "left" }).setDepth(4));
    this.nameText.setShadow(0, 2, "#000000", 3, false, true);
    this.houseText = this.track(label(this.scene, "", { size: 14, color: COLOR_GOLD }).setDepth(4).setLetterSpacing(1));
    this.healthText = this.track(
      label(this.scene, "", { size: 13, color: "#fff4e6", bold: true }).setOrigin(1, 0.5).setDepth(4),
    );
    this.healthText.setStroke("#2a0808", 3);
    this.manaText = this.track(
      label(this.scene, "", { size: 12, color: "#e6f0ff", bold: true }).setOrigin(1, 0.5).setDepth(4),
    );
    this.manaText.setStroke("#081428", 3);

    this.clockText = this.track(label(this.scene, "", { size: 16, color: "#efe4c8" }).setOrigin(0, 0.5).setDepth(4));
    this.goldText = this.track(label(this.scene, "", { size: 16, color: COLOR_GOLD, bold: true }).setOrigin(1, 0.5).setDepth(4));
  }

  update(width: number, height: number, time: number): void {
    const dt = this.lastTime ? Math.min(0.1, (time - this.lastTime) / 1000) : 0;
    this.lastTime = time;
    this.drawWound(width, height, time);
    this.drawPlate(width, dt, time);
    this.drawClock(width);
  }

  private drawPlate(width: number, dt: number, time: number): void {
    const state = this.world.state;
    const { player } = state;
    const compact = width < 760;
    const plateW = compact ? 236 : 300;
    const mx = LEFT + MEDALLION / 2;
    const my = TOP + MEDALLION / 2;

    this.plate.draw(LEFT + MEDALLION / 2, TOP + 6, plateW, 78);

    // Portrait: Wren's bust, cropped to the face, inside the ring.
    const look = heroLook(state.house);
    if (look !== this.portraitLook) {
      this.portraitLook = look;
      this.portrait.setTexture(roundPortraitKey(this.scene, look, MEDALLION - 8)).setScale(1 / DPR);
    }
    this.portrait.setPosition(mx, my);
    this.medallion.setPosition(mx, my);

    const house = state.house;
    if (house) {
      this.crest
        .setTexture(crestKey(this.scene, house))
        .setScale(emblemScale(CREST_W, 30))
        .setPosition(mx + MEDALLION * 0.36, my + MEDALLION * 0.34)
        .setVisible(true);
    } else {
      this.crest.setVisible(false);
    }

    const tx = LEFT + MEDALLION + 8;
    this.nameText.setPosition(tx, TOP + 10).setText(player.name);
    this.houseText
      .setPosition(tx + this.nameText.width + 10, TOP + 19)
      .setText(house ? `House ${HOUSE_COLOURS[house]?.name ?? house}` : "First-year, unsorted");

    // Bars, with a pale trail that catches up.
    const hf = player.health / player.maxHealth;
    const mf = player.mana / player.maxMana;
    this.healthTrail = hf < this.healthTrail ? Math.max(hf, this.healthTrail - dt * 0.35) : hf;
    this.manaTrail = mf < this.manaTrail ? Math.max(mf, this.manaTrail - dt * 0.5) : mf;

    const barW = LEFT + MEDALLION / 2 + plateW - tx - 16;
    const g = this.bars;
    g.clear();
    capsuleBar(g, tx, TOP + 46, barW, 15, hf, HEALTH, HEALTH_DARK, this.healthTrail);
    capsuleBar(g, tx, TOP + 67, barW * 0.86, 10, mf, MANA, MANA_DARK, this.manaTrail);
    this.healthText.setPosition(tx + barW - 8, TOP + 53.5).setText(`${Math.ceil(player.health)} / ${player.maxHealth}`);
    this.manaText.setPosition(tx + barW * 0.86 - 6, TOP + 72).setText(`${Math.round(player.mana)}`);

    // A ward shows as a pulsing gold halo round the medallion.
    if (state.wardActive) {
      const pulse = 0.55 + Math.sin(time / 160) * 0.25;
      g.lineStyle(3, WARD, pulse);
      g.strokeCircle(mx, my, MEDALLION / 2 + 2);
      g.lineStyle(1.5, 0xfff4c8, pulse);
      g.strokeCircle(mx, my, MEDALLION / 2 + 5);
    }
    // Low health: the medallion's ring beats.
    if (hf < 0.3 && hf > 0) {
      const beat = Math.max(0, Math.sin(time / 180)) * 0.7;
      g.lineStyle(3, HEALTH, beat);
      g.strokeCircle(mx, my, MEDALLION / 2 + 1);
    }
  }

  private drawClock(width: number): void {
    const state = this.world.state;
    const w = 188;
    const h = 40;
    const x = width - w - 18;
    const y = TOP + 4;
    this.clockPlate.draw(x, y, w, h);

    // Sun by day, a crescent by night.
    const fraction = state.dayFraction;
    const day = fraction > 0.25 && fraction < 0.77;
    const g = this.sky;
    g.clear();
    const sx = x + 22;
    const sy = y + h / 2;
    if (day) {
      g.fillStyle(0xf6cf5a, 1);
      g.fillCircle(sx, sy, 6);
      g.lineStyle(1.4, 0xf6cf5a, 0.9);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        g.lineBetween(sx + Math.cos(a) * 8, sy + Math.sin(a) * 8, sx + Math.cos(a) * 10.5, sy + Math.sin(a) * 10.5);
      }
    } else {
      g.fillStyle(0xe6ecff, 1);
      g.fillCircle(sx, sy, 7);
      g.fillStyle(0x1a1b2a, 1);
      g.fillCircle(sx + 3.5, sy - 2, 6);
    }
    // Coin.
    const cx = x + w - 20;
    g.fillStyle(0x8a6a2c, 1);
    g.fillCircle(cx, sy + 1, 6.5);
    g.fillStyle(BRASS, 1);
    g.fillCircle(cx, sy, 6.5);
    g.fillStyle(0xf8e6a0, 1);
    g.fillCircle(cx - 2, sy - 2, 2);

    this.clockText.setPosition(sx + 16, sy).setText(`Day ${state.world.day}  ${state.timeLabel()}`);
    this.goldText.setPosition(cx - 12, sy).setText(`${state.player.gold}`);
  }

  /**
   * Wounded: the edges of the screen close in and pulse red. (Day and night
   * belong to the world camera's lighting layer, not the HUD.)
   */
  private drawWound(width: number, height: number, time: number): void {
    const g = this.wound;
    g.clear();
    const player = this.world.state.player;
    const hf = player.health / player.maxHealth;
    if (hf >= 0.35 || hf <= 0) return;
    const strength = (0.35 - hf) / 0.35;
    const beat = 0.55 + Math.max(0, Math.sin(time / 180)) * 0.45;
    const a = Math.min(0.55, strength * 0.6 * beat);
    const band = Math.min(width, height) * 0.16;
    const red = 0x6a0a0a;
    g.fillGradientStyle(red, red, red, red, a, a, 0, 0);
    g.fillRect(0, 0, width, band);
    g.fillGradientStyle(red, red, red, red, 0, 0, a, a);
    g.fillRect(0, height - band, width, band);
    g.fillGradientStyle(red, red, red, red, a, 0, a, 0);
    g.fillRect(0, 0, band, height);
    g.fillGradientStyle(red, red, red, red, 0, a, 0, a);
    g.fillRect(width - band, 0, band, height);
  }

  /** The control reminder, kept in one place for the pause menu and docs. */
  static readonly HINTS =
    "WASD move   SHIFT sprint   C dash   Z light   X heavy   SPACE cast   1-6 spell   E talk   I satchel   J journal   M spellbook   T weapon   Q tonic   P pause";
  static readonly COMPACT_HINTS = "SHIFT sprint   C dash   SPACE cast   E talk   P pause";
}

/**
 * Bakes a portrait cropped to a circle, for medallions. The pixel art is
 * scaled with nearest-neighbour so it stays crisp; the circle edge is smooth.
 */
export function roundPortraitKey(scene: Phaser.Scene, look: string, size: number): string {
  const key = `ui_round_${look}_${size}_${DPR}`;
  if (scene.textures.exists(key)) return key;
  const src = scene.textures.exists(portraitKey(look)) ? scene.textures.get(portraitKey(look)).getSourceImage() : null;
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(size * DPR);
  canvas.height = Math.round(size * DPR);
  const ctx = canvas.getContext("2d")!;
  ctx.scale(DPR, DPR);
  const r = size / 2;
  ctx.beginPath();
  ctx.arc(r, r, r, 0, Math.PI * 2);
  ctx.clip();
  const bg = ctx.createRadialGradient(r * 0.8, r * 0.6, 2, r, r, r);
  bg.addColorStop(0, "#3c3f5c");
  bg.addColorStop(1, "#14151f");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);
  if (src) {
    ctx.imageSmoothingEnabled = false;
    // Head and shoulders: the middle of the bust, a little above centre.
    ctx.drawImage(src as CanvasImageSource, 10, 8, 44, 44, 0, 2, size, size);
  }
  const shade = ctx.createRadialGradient(r, r, r * 0.6, r, r, r);
  shade.addColorStop(0, "rgba(0,0,0,0)");
  shade.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, size, size);
  scene.textures.addCanvas(key, canvas)?.setFilter(Phaser.Textures.FilterMode.NEAREST);
  return key;
}

