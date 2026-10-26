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

const SIDES = ["n", "s", "e", "w"] as const;
type Side = (typeof SIDES)[number];
const SIDE_BIT: Record<Side, number> = { n: 1, s: 2, e: 4, w: 8 };
/** Adjacent side pairs and the inner-corner piece that covers both. */
const INNER: ReadonlyArray<readonly [Side, Side, EdgeDir]> = [
  ["n", "e", "ine"],
  ["n", "w", "inw"],
  ["s", "e", "ise"],
  ["s", "w", "isw"],
];
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

/** Off-screen chunk painting allowed per frame. */
const PAINT_BUDGET_MS = 4;
/** How far beyond the camera a chunk still counts as possibly visible. */
const VISIBLE_MARGIN = 96;

interface Job {
  chunk: Chunk;
  tex: Phaser.Textures.CanvasTexture;
  water: Phaser.Textures.CanvasTexture | null;
}

/** Per scene: chunks created but not yet painted. Also marks the scene as wired. */
const queues = new WeakMap<Phaser.Scene, Map<string, Job>>();

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

  /**
   * Creates the chunk's textures and paints them - now if the chunk could be
   * on screen, otherwise over the next few frames within a time budget.
   * Chunks stream in two chunks beyond the view, so crossing a chunk border
   * no longer paints a whole row of them in one frame.
   */
  static bake(scene: Phaser.Scene, chunk: Chunk): string {
    const queue = MapLoader.wire(scene);
    const key = MapLoader.textureKey(chunk.cx, chunk.cy);
    const { tex } = canvasTex(scene, key, CHUNK_PX, CHUNK_PX);

    const waterKey = MapLoader.waterKey(chunk.cx, chunk.cy);
    let water: Phaser.Textures.CanvasTexture | null = null;
    if (chunk.waterElevation) {
      water = canvasTex(scene, waterKey, CHUNK_TILES * WATER_RES, CHUNK_TILES * WATER_RES).tex;
    } else if (scene.textures.exists(waterKey)) {
      scene.textures.remove(waterKey);
    }

    const job: Job = { chunk, tex, water };
    if (MapLoader.mightBeVisible(scene, chunk)) MapLoader.paint(scene, job);
    else queue.set(key, job);
    return key;
  }

  /** Paints queued chunks: anything that might be on screen, then more within budget. */
  private static pump(scene: Phaser.Scene, queue: Map<string, Job>): void {
    if (queue.size === 0) return;
    const start = performance.now();
    for (const [key, job] of queue) {
      if (scene.textures.get(key) !== job.tex) {
        queue.delete(key);
        continue;
      }
      if (!MapLoader.mightBeVisible(scene, job.chunk) && performance.now() - start > PAINT_BUDGET_MS) continue;
      queue.delete(key);
      MapLoader.paint(scene, job);
    }
  }

  /**
   * True when a chunk is within reach of the camera or the player. The player
   * test matters after a teleport, when the camera is still on its way.
   */
  private static mightBeVisible(scene: Phaser.Scene, chunk: Chunk): boolean {
    const camera = scene.cameras.main;
    const halfW = camera.width / camera.zoom / 2 + VISIBLE_MARGIN;
    const halfH = camera.height / camera.zoom / 2 + VISIBLE_MARGIN;
    const left = chunk.cx * CHUNK_PX;
    const top = chunk.cy * CHUNK_PX;
    const near = (x: number, y: number) =>
      left < x + halfW && left + CHUNK_PX > x - halfW && top < y + halfH && top + CHUNK_PX > y - halfH;
    const player = (scene as Phaser.Scene & { player?: { x: number; y: number } }).player;
    return near(camera.midPoint.x, camera.midPoint.y) || (!!player && near(player.x, player.y));
  }

  private static paint(scene: Phaser.Scene, job: Job): void {
    const { chunk, tex } = job;
    const ctx = tex.getContext();
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

        // Sides first; where the same terrain wraps two adjacent sides, one
        // diagonal inner-corner piece replaces both.
        let used = 0;
        for (const [a, b, inner] of INNER) {
          const ka = kindAt(lx + EDGE_OFFSETS[a][0], ly + EDGE_OFFSETS[a][1]);
          if (!MapLoader.overhangs(ka, prio)) continue;
          if (kindAt(lx + EDGE_OFFSETS[b][0], ly + EDGE_OFFSETS[b][1]) !== ka) continue;
          pieces.push({ kind: ka, dir: inner });
          used |= SIDE_BIT[a] | SIDE_BIT[b];
        }
        for (const dir of SIDES) {
          if (used & SIDE_BIT[dir]) continue;
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

    if (job.water && chunk.waterElevation) MapLoader.paintWater(job.water, chunk, chunk.waterElevation, kinds);
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

  /**
   * Low-frequency light and hue drift, composited onto the land only
   * (source-atop) so water stays clear. Brightness and the vegetation's warm
   * or lush cast are folded into one RGBA value per tile corner, then
   * stretched over the chunk with smoothing - one draw per chunk.
   */
  private static drawTone(ctx: CanvasRenderingContext2D, chunk: Chunk, kinds: GroundTile[]): void {
    const corners = MapLoader.cornerCanvas();
    const cctx = corners.getContext("2d");
    if (!cctx) return;
    const img = cctx.createImageData(CORNER_SIDE, CORNER_SIDE);
    const baseX = chunk.cx * CHUNK_TILES;
    const baseY = chunk.cy * CHUNK_TILES;

    for (let y = 0; y < CORNER_SIDE; y++) {
      for (let x = 0; x < CORNER_SIDE; x++) {
        const wx = baseX + x;
        const wy = baseY + y;
        const i = (y * CORNER_SIDE + x) * 4;
        const light = fbm(wx * 0.07, wy * 0.07, 9137, 3) - 0.5;
        const k = Math.min(1, Math.abs(light) * 2.2);
        // Light layer: white to brighten, black to darken.
        let r = light > 0 ? 255 : 0;
        let g = r;
        let b = r;
        let a = (k * (light > 0 ? 34 : 52)) / 255;

        // Vegetation drifts between sun-dried gold and deep, lush green.
        const kind = kinds[Math.min(RING - 1, y + 1) * RING + Math.min(RING - 1, x + 1)] as GroundTile;
        if (GROUND_DEFS[kind]?.family === "grass") {
          const drift = fbm(wx * 0.045, wy * 0.045, 5311, 2) - 0.5;
          const warm = drift > 0;
          const ha = (Math.min(1, Math.abs(drift) * 2.6) * (warm ? 46 : 40)) / 255;
          // Composite the hue under the light layer ("light over hue").
          const outA = a + ha * (1 - a);
          if (outA > 0) {
            r = (r * a + (warm ? 196 : 20) * ha * (1 - a)) / outA;
            g = (g * a + (warm ? 178 : 70) * ha * (1 - a)) / outA;
            b = (b * a + (warm ? 70 : 52) * ha * (1 - a)) / outA;
          }
          a = outA;
        }
        img.data[i] = r;
        img.data[i + 1] = g;
        img.data[i + 2] = b;
        img.data[i + 3] = Math.round(a * 255);
      }
    }

    cctx.putImageData(img, 0, 0);
    ctx.save();
    ctx.globalCompositeOperation = "source-atop";
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    // Sample between corner centres so neighbouring chunks agree at the seam.
    ctx.drawImage(corners, 0.5, 0.5, CHUNK_TILES, CHUNK_TILES, 0, 0, CHUNK_PX, CHUNK_PX);
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
  private static paintWater(
    tex: Phaser.Textures.CanvasTexture,
    chunk: Chunk,
    elevation: Float32Array,
    kinds: GroundTile[],
  ): void {
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
    const ctx = tex.getContext();
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
  private static wire(scene: Phaser.Scene): Map<string, Job> {
    const existing = queues.get(scene);
    if (existing) return existing;
    const queue = new Map<string, Job>();
    queues.set(scene, queue);
    const waters = new Map<Phaser.GameObjects.GameObject, Phaser.GameObjects.Image>();

    scene.sys.events.on(Phaser.Scenes.Events.POST_UPDATE, () => MapLoader.pump(scene, queue));

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
    return queue;
  }
}
