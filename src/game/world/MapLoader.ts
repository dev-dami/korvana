import Phaser from "phaser";

import { CHUNK_PX, CHUNK_TILES, DEPTH, TILE } from "../config";
import { canvasTex } from "../gfx/canvas";
import {
  EDGE_OFFSETS,
  EDGE_VARIANTS,
  GROUND_DEFS,
  edgePiece,
  foamPiece,
  groundPriority,
  isWaterKind,
  waterColor,
} from "../gfx/ground";
import type { EdgeDir } from "../gfx/ground";
import { groundKey } from "../gfx/tiles";
import type { GroundTile } from "../types";
import { fbm, hash2 } from "./noise";
import { RING } from "./TerrainGenerator";
import type { Chunk } from "./TerrainGenerator";

const SIDES: EdgeDir[] = ["n", "s", "e", "w"];
const CORNERS: EdgeDir[] = ["ne", "nw", "se", "sw"];
/**
 * Pixels per tile in the water depth texture. Canvas textures are sampled
 * NEAREST in a pixel-art game (and Phaser re-uploads stale pixels if the
 * filter is changed afterwards), so the gradient is baked at half resolution
 * rather than relying on linear filtering of a tiny texture.
 */
const WATER_RES = 16;
const CORNER_SIDE = CHUNK_TILES + 1;
const NEIGHBOURS: ReadonlyArray<readonly [number, number]> = [
  [-1, 0],
  [1, 0],
  [0, -1],
  [0, 1],
];
/** Ring offsets of the four tiles that meet at a corner. */
const SHELF: ReadonlyArray<readonly [number, number]> = [
  [0, 0],
  [1, 0],
  [0, 1],
  [1, 1],
];

/** Scenes that already have the water-layer listeners installed. */
const wired = new WeakSet<Phaser.Scene>();

interface Piece {
  kind: GroundTile;
  dir: EdgeDir;
}

/**
 * Turns a generated chunk into baked textures, which is why an endless world
 * stays cheap to draw: one image of land per chunk, plus - only where there is
 * water - a tiny smooth depth gradient drawn beneath it.
 *
 * The land image is transparent over water. That gap is what lets the water
 * layer (and WorldFx's animated shimmer, which sits between the two) show
 * through, while the coast pieces baked into the land image - wet sand, foam,
 * a fringe of shallows - lie on top of it.
 */
export class MapLoader {
  static textureKey(cx: number, cy: number): string {
    return `chunk_${cx}_${cy}`;
  }

  static waterKey(cx: number, cy: number): string {
    return `chunkw_${cx}_${cy}`;
  }

  static source(scene: Phaser.Scene, key: string): CanvasImageSource {
    return scene.textures.get(key).getSourceImage() as CanvasImageSource;
  }

  static bake(scene: Phaser.Scene, chunk: Chunk): string {
    MapLoader.wire(scene);
    const key = MapLoader.textureKey(chunk.cx, chunk.cy);
    const { tex, ctx } = canvasTex(scene, key, CHUNK_PX, CHUNK_PX);

    const kinds = MapLoader.visualKinds(chunk);
    const kindAt = (lx: number, ly: number): GroundTile => kinds[(ly + 1) * RING + (lx + 1)] as GroundTile;

    // 1. Base ground. Water tiles stay transparent.
    for (let ly = 0; ly < CHUNK_TILES; ly++) {
      for (let lx = 0; lx < CHUNK_TILES; lx++) {
        const kind = kindAt(lx, ly);
        if (isWaterKind(kind)) continue;
        const variant = chunk.groundVariant[ly * CHUNK_TILES + lx] ?? 0;
        ctx.drawImage(MapLoader.source(scene, groundKey(kind, variant)), lx * TILE, ly * TILE);
      }
    }

    // 2. Transitions: higher terrain spills over lower, land over water.
    const pieces: Piece[] = [];
    for (let ly = 0; ly < CHUNK_TILES; ly++) {
      for (let lx = 0; lx < CHUNK_TILES; lx++) {
        const here = kindAt(lx, ly);
        const prio = groundPriority(here);
        if (prio < 0) continue;
        pieces.length = 0;

        for (const dir of SIDES) {
          const [ox, oy] = EDGE_OFFSETS[dir];
          const other = kindAt(lx + ox, ly + oy);
          if (MapLoader.overhangs(other, prio)) pieces.push({ kind: other, dir });
        }
        for (const dir of CORNERS) {
          const [ox, oy] = EDGE_OFFSETS[dir];
          const other = kindAt(lx + ox, ly + oy);
          if (!MapLoader.overhangs(other, prio)) continue;
          // A corner is only needed when neither side already brings that terrain in.
          if (kindAt(lx + ox, ly) === other || kindAt(lx, ly + oy) === other) continue;
          pieces.push({ kind: other, dir });
        }
        if (pieces.length === 0) continue;
        pieces.sort((a, b) => groundPriority(a.kind) - groundPriority(b.kind));

        const wx = chunk.cx * CHUNK_TILES + lx;
        const wy = chunk.cy * CHUNK_TILES + ly;
        const px = lx * TILE;
        const py = ly * TILE;
        const coast = isWaterKind(here);
        // Foam first for every coast piece, then all the land on top, so one
        // piece's foam never lands on another piece's sand.
        if (coast) {
          for (const piece of pieces) {
            ctx.drawImage(foamPiece(piece.dir, MapLoader.edgeVariant(wx, wy, piece.dir)), px, py);
          }
        }
        for (const piece of pieces) {
          const variant = MapLoader.edgeVariant(wx, wy, piece.dir);
          ctx.drawImage(edgePiece(piece.kind, piece.dir, variant, coast), px, py);
        }
      }
    }

    // 3. Large-scale tonal drift, so the tile grid never reads as a grid.
    MapLoader.drawTone(ctx, chunk, kinds);

    // 4. Structure floors, doors and decals. Tall overlays (doors) stand on
    // their tile's bottom edge like walls do.
    for (let ly = 0; ly < CHUNK_TILES; ly++) {
      for (let lx = 0; lx < CHUNK_TILES; lx++) {
        const i = ly * CHUNK_TILES + lx;
        const overlay = chunk.overlay[i] ?? MapLoader.floorUnder(chunk, lx, ly);
        if (!overlay || overlay.startsWith("g_") || !scene.textures.exists(overlay)) continue;
        const img = MapLoader.source(scene, overlay) as HTMLCanvasElement;
        ctx.drawImage(img, lx * TILE, ly * TILE + TILE - (img.height || TILE));
      }
    }

    // 5. Ambient occlusion: walls shade the ground just south of them.
    MapLoader.drawWallShadows(ctx, chunk);

    tex.refresh();

    if (chunk.waterElevation) MapLoader.bakeWater(scene, chunk, chunk.waterElevation, kinds);
    else if (scene.textures.exists(MapLoader.waterKey(chunk.cx, chunk.cy))) {
      scene.textures.remove(MapLoader.waterKey(chunk.cx, chunk.cy));
    }
    return key;
  }

  /**
   * Ground kinds as they should *look*: the generated ground, except where a
   * structure lays a ground texture (a dirt camp floor) - that counts as that
   * ground, so the grass around a camp can fringe over it.
   */
  private static visualKinds(chunk: Chunk): GroundTile[] {
    const kinds = chunk.ring.slice();
    for (let ly = 0; ly < CHUNK_TILES; ly++) {
      for (let lx = 0; lx < CHUNK_TILES; lx++) {
        const overlay = chunk.overlay[ly * CHUNK_TILES + lx];
        if (!overlay || !overlay.startsWith("g_")) continue;
        const kind = overlay.slice(2, overlay.lastIndexOf("_")) as GroundTile;
        if (GROUND_DEFS[kind]) kinds[(ly + 1) * RING + (lx + 1)] = kind;
      }
    }
    return kinds;
  }

  /**
   * Furniture and torches stand on the room's floor, but templates only give
   * them their own glyph. Borrow the floor from a neighbouring floor tile so
   * a torch inside a hall is not standing on a square of lawn.
   */
  private static floorUnder(chunk: Chunk, lx: number, ly: number): string | null {
    const role = chunk.tiles[ly * CHUNK_TILES + lx]?.role;
    if (role !== "prop" && role !== "torch") return null;
    for (const [ox, oy] of NEIGHBOURS) {
      const x = lx + ox;
      const y = ly + oy;
      if (x < 0 || y < 0 || x >= CHUNK_TILES || y >= CHUNK_TILES) continue;
      const tile = chunk.tiles[y * CHUNK_TILES + x];
      if (tile?.role === "floor") return tile.texture;
    }
    return null;
  }

  private static overhangs(other: GroundTile, prio: number): boolean {
    return !isWaterKind(other) && groundPriority(other) > prio;
  }

  private static edgeVariant(wx: number, wy: number, dir: EdgeDir): number {
    return Math.floor(hash2(wx, wy, dir.charCodeAt(0) * 31 + (dir.charCodeAt(1) || 7)) * EDGE_VARIANTS);
  }

  private static drawTone(ctx: CanvasRenderingContext2D, chunk: Chunk, kinds: GroundTile[]): void {
    const corners = MapLoader.cornerCanvas();
    const cctx = corners.getContext("2d");
    if (!cctx) return;
    const img = cctx.createImageData(CORNER_SIDE, CORNER_SIDE);
    const hue = cctx.createImageData(CORNER_SIDE, CORNER_SIDE);
    const baseX = chunk.cx * CHUNK_TILES;
    const baseY = chunk.cy * CHUNK_TILES;

    for (let y = 0; y < CORNER_SIDE; y++) {
      for (let x = 0; x < CORNER_SIDE; x++) {
        const wx = baseX + x;
        const wy = baseY + y;
        const i = (y * CORNER_SIDE + x) * 4;
        const light = fbm(wx * 0.07, wy * 0.07, 9137, 3) - 0.5;
        const k = Math.min(1, Math.abs(light) * 2.2);
        const shade = light > 0 ? 255 : 0;
        img.data[i] = shade;
        img.data[i + 1] = shade;
        img.data[i + 2] = shade;
        img.data[i + 3] = Math.round(k * (light > 0 ? 34 : 52));

        // Vegetation drifts between sun-dried gold and deep, lush green.
        const kind = kinds[Math.min(RING - 1, y + 1) * RING + Math.min(RING - 1, x + 1)] as GroundTile;
        if (GROUND_DEFS[kind]?.family === "grass") {
          const drift = fbm(wx * 0.045, wy * 0.045, 5311, 2) - 0.5;
          const strength = Math.min(1, Math.abs(drift) * 2.6);
          const warm = drift > 0;
          hue.data[i] = warm ? 196 : 20;
          hue.data[i + 1] = warm ? 178 : 70;
          hue.data[i + 2] = warm ? 70 : 52;
          hue.data[i + 3] = Math.round(strength * (warm ? 46 : 40));
        }
      }
    }

    ctx.save();
    ctx.globalCompositeOperation = "source-atop";
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    for (const layer of [hue, img]) {
      cctx.putImageData(layer, 0, 0);
      // Sample between corner centres so neighbouring chunks agree at the seam.
      ctx.drawImage(corners, 0.5, 0.5, CHUNK_TILES, CHUNK_TILES, 0, 0, CHUNK_PX, CHUNK_PX);
    }
    ctx.restore();
  }

  private static drawWallShadows(ctx: CanvasRenderingContext2D, chunk: Chunk): void {
    let grad: CanvasGradient | null = null;
    for (let ly = 1; ly < CHUNK_TILES; ly++) {
      for (let lx = 0; lx < CHUNK_TILES; lx++) {
        const above = chunk.tiles[(ly - 1) * CHUNK_TILES + lx];
        const here = chunk.tiles[ly * CHUNK_TILES + lx];
        if (above?.role !== "wall" || here?.role === "wall") continue;
        if (!grad) {
          grad = ctx.createLinearGradient(0, 0, 0, 12);
          grad.addColorStop(0, "rgba(6,8,12,0.42)");
          grad.addColorStop(1, "rgba(6,8,12,0)");
        }
        ctx.save();
        ctx.translate(lx * TILE, ly * TILE);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, TILE, 12);
        ctx.restore();
      }
    }
  }

  private static scratch: HTMLCanvasElement | null = null;

  private static cornerCanvas(): HTMLCanvasElement {
    if (!MapLoader.scratch) {
      MapLoader.scratch = document.createElement("canvas");
      MapLoader.scratch.width = CORNER_SIDE;
      MapLoader.scratch.height = CORNER_SIDE;
    }
    return MapLoader.scratch;
  }

  /** The depth gradient under a chunk's water: pale over sandbars, inky offshore. */
  private static bakeWater(scene: Phaser.Scene, chunk: Chunk, elevation: Float32Array, kinds: GroundTile[]): void {
    const corners = MapLoader.cornerCanvas();
    const cctx = corners.getContext("2d");
    if (!cctx) return;
    const img = cctx.createImageData(CORNER_SIDE, CORNER_SIDE);
    const baseX = chunk.cx * CHUNK_TILES;
    const baseY = chunk.cy * CHUNK_TILES;
    for (let i = 0; i < CORNER_SIDE * CORNER_SIDE; i++) {
      const x = i % CORNER_SIDE;
      const y = Math.floor(i / CORNER_SIDE);
      const ripple = (hash2(baseX + x, baseY + y, 4049) - 0.5) * 0.012;
      // Water touching land is shallow whatever the noise says - this is what
      // gives every coast its pale shelf, even a landmark pushed out to sea.
      let e = (elevation[i] ?? 0) + ripple;
      for (const [ox, oy] of SHELF) {
        if (!isWaterKind(kinds[(y + oy) * RING + (x + ox)] as GroundTile)) {
          e = Math.max(e, 0.37);
          break;
        }
      }
      const c = waterColor(e);
      img.data[i * 4] = (c >> 16) & 255;
      img.data[i * 4 + 1] = (c >> 8) & 255;
      img.data[i * 4 + 2] = c & 255;
      img.data[i * 4 + 3] = 255;
    }
    cctx.putImageData(img, 0, 0);

    const size = CHUNK_TILES * WATER_RES;
    const { tex, ctx } = canvasTex(scene, MapLoader.waterKey(chunk.cx, chunk.cy), size, size);
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(corners, 0.5, 0.5, CHUNK_TILES, CHUNK_TILES, 0, 0, size, size);
    tex.refresh();
  }

  /**
   * Gives each baked land image its water layer. WorldManager owns the land
   * image's lifetime; we follow it through the scene's add/remove events
   * rather than asking WorldManager to know about water at all.
   */
  private static wire(scene: Phaser.Scene): void {
    if (wired.has(scene)) return;
    wired.add(scene);
    const waters = new Map<Phaser.GameObjects.GameObject, Phaser.GameObjects.Image>();

    scene.sys.events.on(Phaser.Scenes.Events.ADDED_TO_SCENE, (obj: Phaser.GameObjects.GameObject) => {
      if (!(obj instanceof Phaser.GameObjects.Image)) return;
      const key = obj.texture?.key ?? "";
      if (!key.startsWith("chunk_")) return;
      const waterKey = `chunkw_${key.slice(6)}`;
      if (!scene.textures.exists(waterKey)) return;
      const [cx, cy] = key.slice(6).split("_").map(Number);
      const water = scene.add
        .image((cx ?? 0) * CHUNK_PX, (cy ?? 0) * CHUNK_PX, waterKey)
        .setOrigin(0, 0)
        .setScale(TILE / WATER_RES)
        .setDepth(DEPTH.ground - 2);
      waters.set(obj, water);
    });

    scene.sys.events.on(Phaser.Scenes.Events.REMOVED_FROM_SCENE, (obj: Phaser.GameObjects.GameObject) => {
      const water = waters.get(obj);
      if (!water) return;
      waters.delete(obj);
      const key = water.texture.key;
      water.destroy();
      if (scene.textures.exists(key)) scene.textures.remove(key);
    });
  }
}
