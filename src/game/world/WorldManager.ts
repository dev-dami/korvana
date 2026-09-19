import type Phaser from "phaser";

import { CHUNK_PX, DEPTH, LOAD_RADIUS, TILE } from "../config";
import { ChunkManager } from "./ChunkManager";
import { MapLoader } from "./MapLoader";
import type { Biome } from "../types";
import type { WorldModel } from "./WorldModel";

interface LoadedChunk {
  cx: number;
  cy: number;
  ground: Phaser.GameObjects.Image;
  sprites: Phaser.GameObjects.Image[];
}

/**
 * Streams chunks in and out around the camera. Ground is baked into one canvas
 * texture per chunk (cheap to draw, one game object); anything with height is a
 * real sprite so it can depth-sort against the player.
 */
export class WorldManager {
  readonly chunks: ChunkManager;

  private readonly scene: Phaser.Scene;
  private readonly loaded = new Map<string, LoadedChunk>();
  private readonly model: WorldModel;

  constructor(scene: Phaser.Scene, model: WorldModel) {
    this.scene = scene;
    this.model = model;
    this.chunks = new ChunkManager(model);
  }

  /** Call once per frame with the camera centre. */
  update(centreX: number, centreY: number): void {
    const ccx = Math.floor(centreX / CHUNK_PX);
    const ccy = Math.floor(centreY / CHUNK_PX);

    this.chunks.setCentre(ccx, ccy);

    for (const [key, lc] of this.loaded) {
      if (Math.abs(lc.cx - ccx) > LOAD_RADIUS || Math.abs(lc.cy - ccy) > LOAD_RADIUS) {
        this.unload(key, lc);
      }
    }

    // Load outward from the player so the ground appears under their feet first.
    for (let r = 0; r <= LOAD_RADIUS; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const cx = ccx + dx;
          const cy = ccy + dy;
          const key = ChunkManager.key(cx, cy);
          if (this.loaded.has(key)) continue;
          this.load(cx, cy, key);
        }
      }
    }
  }

  /** Number of chunks currently resident - surfaced in the debug HUD. */
  get loadedCount(): number {
    return this.loaded.size;
  }

  isSolidPixel(x: number, y: number): boolean {
    return this.chunks.solidAtPixel(x, y);
  }

  /**
   * Foot-box shaped walkability test, matching how Actors collide. A single
   * pixel test is not enough - an actor's feet can span up to three tiles, so
   * pixel checks happily place people inside walls.
   */
  canStandAt(x: number, y: number, w = 22, h = 14): boolean {
    return !this.chunks.boxSolid(x - w / 2, y - h, w, h);
  }

  biomeNameAtPixel(x: number, y: number): Biome {
    return this.model.biomeAt(Math.floor(x / TILE), Math.floor(y / TILE));
  }

  destroy(): void {
    for (const [key, lc] of this.loaded) this.unload(key, lc);
    this.loaded.clear();
  }

  private load(cx: number, cy: number, key: string): void {
    const chunk = this.chunks.get(cx, cy);
    const texKey = MapLoader.bake(this.scene, chunk);

    const ground = this.scene.add
      .image(cx * CHUNK_PX, cy * CHUNK_PX, texKey)
      .setOrigin(0, 0)
      .setDepth(DEPTH.ground);

    const sprites = chunk.sprites.map((s) =>
      this.scene.add
        .image(s.wx, s.wy, s.texture)
        .setOrigin(0.5, 1)
        .setDepth(s.wy + s.bias),
    );

    this.loaded.set(key, { cx, cy, ground, sprites });
  }

  private unload(key: string, lc: LoadedChunk): void {
    lc.ground.destroy();
    for (const sprite of lc.sprites) sprite.destroy();
    const texKey = MapLoader.textureKey(lc.cx, lc.cy);
    if (this.scene.textures.exists(texKey)) this.scene.textures.remove(texKey);
    this.loaded.delete(key);
  }
}
