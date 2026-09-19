import { CHUNK_TILES, TILE } from "../config";
import { TerrainGenerator } from "./TerrainGenerator";
import type { Chunk } from "./TerrainGenerator";
import type { WorldModel } from "./WorldModel";

/**
 * Owns chunk data. Chunks are pure functions of the seed, so this is really
 * just a bounded cache with collision helpers on top.
 */
export class ChunkManager {
  readonly generator: TerrainGenerator;
  readonly model: WorldModel;

  private readonly cache = new Map<string, Chunk>();
  private readonly maxCached: number;
  private centreCx = 0;
  private centreCy = 0;

  constructor(model: WorldModel, maxCached = 320) {
    this.model = model;
    this.generator = new TerrainGenerator(model);
    this.maxCached = maxCached;
  }

  static key(cx: number, cy: number): string {
    return `${cx},${cy}`;
  }

  get(cx: number, cy: number): Chunk {
    const key = ChunkManager.key(cx, cy);
    let chunk = this.cache.get(key);
    if (!chunk) {
      chunk = this.generator.build(cx, cy);
      this.cache.set(key, chunk);
      if (this.cache.size > this.maxCached) this.evict();
    }
    return chunk;
  }

  /** Tells the cache where "here" is so eviction drops the right chunks. */
  setCentre(cx: number, cy: number): void {
    this.centreCx = cx;
    this.centreCy = cy;
  }

  chunkAtTile(wx: number, wy: number): Chunk {
    const cx = Math.floor(wx / CHUNK_TILES);
    const cy = Math.floor(wy / CHUNK_TILES);
    return this.get(cx, cy);
  }

  tileSolid(wx: number, wy: number): boolean {
    const cx = Math.floor(wx / CHUNK_TILES);
    const cy = Math.floor(wy / CHUNK_TILES);
    const chunk = this.get(cx, cy);
    const lx = wx - cx * CHUNK_TILES;
    const ly = wy - cy * CHUNK_TILES;
    return chunk.solid[ly * CHUNK_TILES + lx] === 1;
  }

  /** Solid test in world pixels. */
  solidAtPixel(x: number, y: number): boolean {
    return this.tileSolid(Math.floor(x / TILE), Math.floor(y / TILE));
  }

  /**
   * Axis-aligned solid test. `x`/`y` is the top-left of the box; the box is
   * inset by `inset` on every side so characters can slip through doorways.
   */
  boxSolid(x: number, y: number, w: number, h: number): boolean {
    const x0 = Math.floor(x / TILE);
    const y0 = Math.floor(y / TILE);
    const x1 = Math.floor((x + w - 1) / TILE);
    const y1 = Math.floor((y + h - 1) / TILE);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (this.tileSolid(tx, ty)) return true;
      }
    }
    return false;
  }

  private evict(): void {
    let worstKey: string | null = null;
    let worstDist = -1;
    for (const [key, chunk] of this.cache) {
      const d =
        Math.abs(chunk.cx - this.centreCx) + Math.abs(chunk.cy - this.centreCy);
      if (d > worstDist) {
        worstDist = d;
        worstKey = key;
      }
    }
    if (worstKey) this.cache.delete(worstKey);
  }
}
