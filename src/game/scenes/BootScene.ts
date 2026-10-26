import Phaser from "phaser";

import { applyCameraZoom, TEXT_RES, viewHeight, viewWidth } from "../display";
import { buildCharacters } from "../gfx/characters";
import { bodyText, displayText, waitForDisplayFont } from "../gfx/fonts";
import { buildTiles } from "../gfx/tiles";
import { buildDungeonTiles } from "../gfx/dungeonTiles";
import { GameState } from "../state/GameState";
import { SaveSystem } from "../systems/SaveSystem";

/**
 * Generates the procedural textures the game needs, waits for the display
 * font, then shows the title card.
 */
export class BootScene extends Phaser.Scene {
  private started = false;

  constructor() {
    super("boot");
  }

  async create(): Promise<void> {
    applyCameraZoom(this);
    buildTiles(this);
    buildDungeonTiles(this);
    buildCharacters(this);

    const saved = SaveSystem.load();
    this.registry.set("state", new GameState(saved ?? undefined));
    this.registry.set("resume", saved?.position ?? null);

    // Canvas text measured before the webfont arrives would be laid out against
    // the fallback, so wait for it before building the title.
    await waitForDisplayFont();
    if (!this.started && !this.scene.isActive()) return;

    this.buildTitle();
  }

  private buildTitle(): void {
    const W = viewWidth(this);
    const H = viewHeight(this);
    const cx = W / 2;
    const cy = H / 2;

    this.cameras.main.setBackgroundColor("#0b0d12");

    const rng = Phaser.Math.RND;
    for (let i = 0; i < 140; i++) {
      const tile = rng.pick(["g_grass_0", "g_grass_1", "g_meadow_2", "g_forest_floor_0"]);
      this.add
        .image(rng.between(0, W), rng.between(0, H), tile)
        .setAlpha(0.16);
    }

    this.add.rectangle(0, 0, W, H, 0x07080b, 0.5).setOrigin(0, 0);

    this.add
      .text(cx, cy - 132, "THE ENDLESS GROUNDS", bodyText({ size: 13, color: "#75a7b4" }))
      .setOrigin(0.5)
      .setLetterSpacing(4)
      .setResolution(TEXT_RES);

    const title = this.add
      .text(cx, cy - 60, "Korvana", {
        ...displayText({ size: 92, color: "#e9d9a6" }),
        padding: { x: 24, y: 24 },
      })
      .setOrigin(0.5)
      .setResolution(TEXT_RES);
    title.setStroke("#1a1206", 7);
    title.setShadow(0, 6, "#00000088", 12, false, true);

    this.add
      .text(
        cx,
        cy + 40,
        "The endless grounds go on further than anyone has mapped.",
        bodyText({ size: 19, color: "#d2cab6" }),
      )
      .setOrigin(0.5)
      .setResolution(TEXT_RES);

    const hint = this.add
      .text(cx, cy + 118, "press any key to begin", bodyText({ size: 17, color: "#e0ba4e" }))
      .setOrigin(0.5)
      .setResolution(TEXT_RES);

    this.tweens.add({ targets: hint, alpha: 0.3, duration: 900, yoyo: true, repeat: -1 });

    this.input.keyboard?.once("keydown", () => this.begin());
    this.input.once("pointerdown", () => this.begin());
  }

  private begin(): void {
    if (this.started) return;
    this.started = true;
    this.cameras.main.fadeOut(220, 6, 6, 10);
    this.cameras.main.once("camerafadeoutcomplete", () => this.scene.start("world"));
  }
}
