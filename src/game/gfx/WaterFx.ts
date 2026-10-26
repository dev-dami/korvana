import Phaser from "phaser";

import { CHUNK_TILES, DEPTH, TILE } from "../config";
import type { WorldManager } from "../world/WorldManager";
import type { Look } from "./DayCycle";

/**
 * Moving water. Two seamless crest textures scroll across each other in
 * different directions between the water layer and the land layer, so the
 * land image (transparent only over water) masks them for free. Where crests
 * cross, the surface glitters; a handful of pooled glints add sun sparkle.
 */

const GLINTS = 22;
const MARGIN = 64;

interface Glint {
  img: Phaser.GameObjects.Image;
  life: number;
  max: number;
}

export class WaterFx {
  private readonly layers: Phaser.GameObjects.TileSprite[] = [];
  private readonly glints: Glint[] = [];
  private time = 0;
  private waterImages = 0;
  private glintTimer = 0;

  constructor(scene: Phaser.Scene) {
    const specs: Array<[string, number]> = [
      ["fx_wave_0", 0.2],
      ["fx_wave_1", 0.14],
    ];
    for (const [key, alpha] of specs) {
      this.layers.push(
        scene.add
          .tileSprite(0, 0, 64, 64, key)
          .setOrigin(0, 0)
          .setDepth(DEPTH.ground - 1)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setAlpha(alpha)
          .setVisible(false),
      );
    }
    for (let i = 0; i < GLINTS; i++) {
      this.glints.push({
        img: scene.add
          .image(0, 0, "fx_glint")
          .setDepth(DEPTH.ground - 1)
          .setBlendMode(Phaser.BlendModes.ADD)
          .setVisible(false),
        life: 0,
        max: 1,
      });
    }
  }

  /** Called as chunk water layers come and go, so we only draw when there is water. */
  waterAdded(delta: number): void {
    this.waterImages = Math.max(0, this.waterImages + delta);
  }

  update(dt: number, look: Look, view: Phaser.Geom.Rectangle, world: WorldManager): void {
    this.time += dt;
    const visible = this.waterImages > 0;
    const x = Math.floor((view.x - MARGIN) / 2) * 2;
    const y = Math.floor((view.y - MARGIN) / 2) * 2;
    const w = Math.ceil(view.width + MARGIN * 2);
    const h = Math.ceil(view.height + MARGIN * 2);

    for (let i = 0; i < this.layers.length; i++) {
      const layer = this.layers[i]!;
      layer.setVisible(visible);
      if (!visible) continue;
      if (layer.width !== w || layer.height !== h) layer.setSize(w, h);
      // Anchored to the world, not the screen: the crests stay put as you
      // walk, and the two layers drift in different directions.
      const dx = i === 0 ? this.time * 7 : -this.time * 5;
      const dy = i === 0 ? this.time * 2.5 : this.time * 4;
      layer.setPosition(x, y);
      layer.setTilePosition(Math.round(x + dx), Math.round(y + dy));
    }

    if (!visible) {
      for (const g of this.glints) if (g.img.visible) g.img.setVisible(false);
      return;
    }

    // Sun glints: most in daylight, a few silver ones by moonlight.
    const rate = 14 * (1 - look.darkness * 0.75);
    this.glintTimer -= dt * rate;
    while (this.glintTimer <= 0) {
      this.glintTimer += 1;
      this.spawnGlint(view, world, look);
    }
    for (const g of this.glints) {
      if (!g.img.visible) continue;
      g.life += dt;
      const t = g.life / g.max;
      if (t >= 1) {
        g.img.setVisible(false);
        continue;
      }
      const pulse = Math.sin(t * Math.PI);
      g.img.setAlpha(pulse * 0.85).setScale(0.6 + pulse * 0.5);
    }
  }

  private spawnGlint(view: Phaser.Geom.Rectangle, world: WorldManager, look: Look): void {
    const g = this.glints.find((q) => !q.img.visible);
    if (!g) return;
    const px = view.x + Math.random() * view.width;
    const py = view.y + Math.random() * view.height;
    const tx = Math.floor(px / TILE);
    const ty = Math.floor(py / TILE);
    const chunk = world.chunks.chunkAtTile(tx, ty);
    const lx = tx - chunk.cx * CHUNK_TILES;
    const ly = ty - chunk.cy * CHUNK_TILES;
    const ground = chunk.ground[ly * CHUNK_TILES + lx];
    if (ground !== "water" && ground !== "deep_water") return;
    // Keep glints off the foam fringe: only the middle of a water tile.
    const fx = px - tx * TILE;
    const fy = py - ty * TILE;
    if (fx < 6 || fx > TILE - 6 || fy < 6 || fy > TILE - 6) return;
    g.life = 0;
    g.max = 0.5 + Math.random() * 0.6;
    g.img
      .setPosition(Math.round(px), Math.round(py))
      .setTint(look.night > 0.5 ? 0xc8d8ff : 0xfff6dc)
      .setVisible(true)
      .setAlpha(0);
  }

  destroy(): void {
    for (const l of this.layers) l.destroy();
    for (const g of this.glints) g.img.destroy();
    this.layers.length = 0;
    this.glints.length = 0;
  }
}
