import type Phaser from "phaser";

import { CHUNK_PX, CHUNK_TILES, TILE } from "../config";
import { canvasTex } from "../gfx/canvas";
import { groundKey } from "../gfx/tiles";
import type { Chunk } from "./TerrainGenerator";

/**
 * Turns a generated chunk into a single baked texture. Ground, structure
 * floors and flower decals all collapse into one image, which is why an
 * endless world stays cheap to draw.
 */
export class MapLoader {
  static textureKey(cx: number, cy: number): string {
    return `chunk_${cx}_${cy}`;
  }

  static source(scene: Phaser.Scene, key: string): CanvasImageSource {
    return scene.textures.get(key).getSourceImage() as CanvasImageSource;
  }

  static bake(scene: Phaser.Scene, chunk: Chunk): string {
    const key = MapLoader.textureKey(chunk.cx, chunk.cy);
    const { tex, ctx } = canvasTex(scene, key, CHUNK_PX, CHUNK_PX);

    for (let ly = 0; ly < CHUNK_TILES; ly++) {
      for (let lx = 0; lx < CHUNK_TILES; lx++) {
        const i = ly * CHUNK_TILES + lx;
        const ground = chunk.ground[i];
        if (!ground) continue;

        const px = lx * TILE;
        const py = ly * TILE;
        const variant = chunk.groundVariant[i] ?? 0;
        ctx.drawImage(MapLoader.source(scene, groundKey(ground, variant)), px, py);

        const overlay = chunk.overlay[i];
        if (overlay && scene.textures.exists(overlay)) {
          ctx.drawImage(MapLoader.source(scene, overlay), px, py);
        }
      }
    }

    tex.refresh();
    return key;
  }
}
