import { CHUNK_TILES, TILE } from "../config";
import { hash2, makeRng } from "./noise";
import type { WorldModel } from "./WorldModel";
import { defsForBiome, maxWidth, resolveTile, structureById } from "../data/structures";
import type { ResolvedTile, StructureDef } from "../data/structures";
import { LANDMARKS } from "../data/landmarks";
import { GROUND_VARIANTS } from "../gfx/tiles";
import type { Biome, GroundTile } from "../types";
import { COVER_DENSITY, EXTRA_DECALS, coverFor, decalFor, propVariety } from "./scatter";

export interface ChunkSprite {
  texture: string;
  /** World-space pixel position of the sprite's bottom-centre. */
  wx: number;
  wy: number;
  bias: number;
}

export interface Chunk {
  cx: number;
  cy: number;
  ground: GroundTile[];
  groundVariant: Uint8Array;
  /** Extra baked textures drawn over the ground (structure floors, flowers). */
  overlay: (string | null)[];
  solid: Uint8Array;
  tiles: (ResolvedTile | null)[];
  sprites: ChunkSprite[];
  /**
   * Tiles owned by a landmark. Scatter is suppressed here so the treeline camp
   * does not get an oak tree dropped through its middle, and random structures
   * refuse to generate in a chunk that holds one.
   */
  reserved: Uint8Array;
  /**
   * Ground kinds for this chunk plus a one-tile ring of its neighbours
   * (RING x RING, row-major, starting at local tile -1,-1). Purely visual:
   * the baker uses it to blend biome borders and coasts across chunk seams.
   */
  ring: GroundTile[];
  /**
   * Terrain elevation at every tile corner (CHUNK_TILES+1 squared), or null
   * when the chunk and its ring hold no water. Shades water by depth.
   */
  waterElevation: Float32Array | null;
}

/** Side of the ground ring: the chunk plus one tile all round. */
export const RING = CHUNK_TILES + 2;

const PROP_DENSITY: Record<Biome, { oak: number; pine: number; bush: number; rock: number; dead: number }> = {
  ocean: { oak: 0, pine: 0, bush: 0, rock: 0, dead: 0 },
  shallows: { oak: 0, pine: 0, bush: 0, rock: 0, dead: 0 },
  beach: { oak: 0.004, pine: 0, bush: 0.012, rock: 0.022, dead: 0 },
  marsh: { oak: 0.07, pine: 0, bush: 0.09, rock: 0.02, dead: 0.01 },
  meadow: { oak: 0.05, pine: 0.006, bush: 0.03, rock: 0.014, dead: 0 },
  forest: { oak: 0.17, pine: 0.09, bush: 0.05, rock: 0.01, dead: 0 },
  highland: { oak: 0.02, pine: 0.09, bush: 0.02, rock: 0.07, dead: 0.01 },
  peak: { oak: 0, pine: 0.02, bush: 0, rock: 0.1, dead: 0.02 },
  // Nothing grows in the ash. What stands there is dead and grey.
  scar: { oak: 0, pine: 0, bush: 0.008, rock: 0.07, dead: 0.05 },
  crypt: { oak: 0, pine: 0, bush: 0, rock: 0, dead: 0 },
};

const DECAL_DENSITY: Partial<Record<Biome, number>> = {
  meadow: 0.16,
  forest: 0.07,
  marsh: 0.09,
  beach: 0.03,
  highland: 0.03,
};

const DECALS = [
  "decal_flowers_rose",
  "decal_flowers_gold",
  "decal_flowers_violet",
  "decal_flowers_white",
];

function idx(x: number, y: number): number {
  return y * CHUNK_TILES + x;
}

export function chunkSeed(cx: number, cy: number, worldSeed: number): number {
  return (hash2(cx, cy, worldSeed ^ 0x51ed270b) * 0xffffffff) >>> 0;
}

export class TerrainGenerator {
  private readonly model: WorldModel;
  private readonly worldSeed: number;

  constructor(model: WorldModel) {
    this.model = model;
    this.worldSeed = model.seed;
  }

  worldToChunk(tx: number, ty: number): { cx: number; cy: number } {
    return {
      cx: Math.floor(tx / CHUNK_TILES),
      cy: Math.floor(ty / CHUNK_TILES),
    };
  }

  /**
   * Finds a walkable spawn tile near the origin.
   *
   * Terrain noise alone is not enough to decide this: structures and scattered
   * props are added later in `build`, so a tile that `isTerrainSolid` calls dry
   * land can still be the inside of a cottage wall. The caller supplies
   * `isClear`, which tests the *generated* chunk (structures included) against
   * the same foot box actors collide with, and we use the cheap biome test only
   * to skip candidates before paying for it.
   *
   * `isClear` receives the feet position, matching how actors are placed:
   * centred in the tile, standing on its bottom edge.
   */
  findSpawn(
    isClear: (x: number, y: number) => boolean,
    radiusChunks = 24,
  ): { tx: number; ty: number } {
    for (let r = 0; r < radiusChunks; r++) {
      for (let dy = -r; dy <= r; dy++) {
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const tx = dx * CHUNK_TILES + Math.floor(CHUNK_TILES / 2);
          const ty = dy * CHUNK_TILES + Math.floor(CHUNK_TILES / 2);
          if (this.model.isTerrainSolid(tx, ty)) continue;

          let dryNeighbourhood = true;
          for (let oy = -1; oy <= 1 && dryNeighbourhood; oy++) {
            for (let ox = -1; ox <= 1; ox++) {
              if (this.model.isTerrainSolid(tx + ox, ty + oy)) {
                dryNeighbourhood = false;
                break;
              }
            }
          }
          if (!dryNeighbourhood) continue;

          const feet = { x: tx * TILE + TILE / 2, y: ty * TILE + TILE };
          if (isClear(feet.x, feet.y)) return { tx, ty };
        }
      }
    }

    return { tx: Math.floor(CHUNK_TILES / 2), ty: Math.floor(CHUNK_TILES / 2) };
  }

  build(cx: number, cy: number): Chunk {
    const size = CHUNK_TILES * CHUNK_TILES;
    const chunk: Chunk = {
      cx,
      cy,
      ground: new Array<GroundTile>(size),
      groundVariant: new Uint8Array(size),
      overlay: new Array<string | null>(size).fill(null),
      solid: new Uint8Array(size),
      tiles: new Array<ResolvedTile | null>(size).fill(null),
      sprites: [],
      reserved: new Uint8Array(size),
      ring: new Array<GroundTile>(RING * RING),
      waterElevation: null,
    };

    const baseX = cx * CHUNK_TILES;
    const baseY = cy * CHUNK_TILES;

    // --- 1. terrain ---
    for (let ly = 0; ly < CHUNK_TILES; ly++) {
      for (let lx = 0; lx < CHUNK_TILES; lx++) {
        const wx = baseX + lx;
        const wy = baseY + ly;
        const i = idx(lx, ly);
        chunk.ground[i] = this.model.groundTile(wx, wy);
        chunk.groundVariant[i] = Math.floor(hash2(wx, wy, this.worldSeed + 77) * GROUND_VARIANTS);
        if (this.model.isTerrainSolid(wx, wy)) chunk.solid[i] = 1;
      }
    }

    this.fillRing(chunk);

    // --- 2. fixed landmarks ---
    // Stamped before anything random so a story location always wins the space
    // it was authored for.
    this.stampLandmarks(chunk);

    const rng = makeRng(chunkSeed(cx, cy, this.worldSeed));

    // --- 3. a random landmark, sometimes ---
    const centreX = baseX + CHUNK_TILES / 2;
    const centreY = baseY + CHUNK_TILES / 2;
    const weight = this.model.structureWeight(centreX, centreY);
    if (weight > 0 && !this.hasReservedTile(chunk) && rng() < weight) {
      this.placeStructure(chunk, rng);
    }

    // --- 4. scattering ---
    // Purely decorative choices (which species, extra ground cover) draw from
    // their own stream, so the solid layout below stays exactly what the
    // original single stream produced.
    const decor = makeRng(chunkSeed(cx, cy, this.worldSeed) ^ 0x0dec0de5);
    const occupied = new Uint8Array(size);
    for (let ly = 0; ly < CHUNK_TILES; ly++) {
      for (let lx = 0; lx < CHUNK_TILES; lx++) {
        const wx = baseX + lx;
        const wy = baseY + ly;
        const i = idx(lx, ly);
        if (chunk.solid[i] === 1) continue;
        if (chunk.tiles[i]) continue;
        if (chunk.reserved[i] === 1) continue;

        const biome = this.model.biomeAt(wx, wy);
        const density = PROP_DENSITY[biome];

        const roll = rng();
        let texture: string | null = null;
        let solid = false;

        if (roll < density.dead) {
          texture = "prop_deadtree";
          solid = true;
        } else if (roll < density.dead + density.oak) {
          const big = rng() < 0.6;
          texture = big ? "prop_oak" : "prop_oak_small";
          solid = true;
        } else if (roll < density.dead + density.oak + density.pine) {
          const big = rng() < 0.5;
          texture = big ? "prop_pine" : "prop_pine_small";
          solid = true;
        } else if (roll < density.dead + density.oak + density.pine + density.bush) {
          texture = rng() < 0.5 ? "prop_bush" : "prop_bush_small";
        } else if (
          roll <
          density.dead + density.oak + density.pine + density.bush + density.rock
        ) {
          texture = rng() < 0.55 ? "prop_rock" : "prop_rock_small";
          solid = true;
        }

        if (texture) {
          texture = propVariety(texture, biome, decor());
          occupied[i] = 1;
          chunk.sprites.push({
            texture,
            wx: wx * TILE + TILE / 2,
            wy: wy * TILE + TILE - 2,
            bias: rng() * 6,
          });
          if (solid) chunk.solid[i] = 1;
          continue;
        }

        const decalChance = DECAL_DENSITY[biome] ?? 0;
        if (decalChance > 0 && rng() < decalChance) {
          const legacy = DECALS[Math.floor(rng() * DECALS.length)] ?? null;
          chunk.overlay[i] = decalFor(biome, decor()) ?? legacy;
        }
      }
    }

    this.scatterCover(chunk, occupied, decor);
    return chunk;
  }

  /**
   * Non-solid ground cover - tall grass, ferns, reeds - and extra flat decals.
   * Nothing here changes what is walkable.
   */
  private scatterCover(chunk: Chunk, occupied: Uint8Array, rng: () => number): void {
    const baseX = chunk.cx * CHUNK_TILES;
    const baseY = chunk.cy * CHUNK_TILES;
    for (let ly = 0; ly < CHUNK_TILES; ly++) {
      for (let lx = 0; lx < CHUNK_TILES; lx++) {
        const i = idx(lx, ly);
        const roll = rng();
        const pick = rng();
        const jx = rng();
        const jy = rng();
        if (chunk.solid[i] === 1 || chunk.tiles[i] || chunk.reserved[i] === 1 || occupied[i] === 1) continue;

        const wx = baseX + lx;
        const wy = baseY + ly;
        const biome = this.model.biomeAt(wx, wy);
        const cover = COVER_DENSITY[biome] ?? 0;
        if (roll < cover) {
          const texture = coverFor(biome, pick);
          if (texture) {
            const py = wy * TILE + 10 + Math.floor(jy * (TILE - 10));
            chunk.sprites.push({
              texture,
              wx: wx * TILE + 6 + Math.floor(jx * (TILE - 12)),
              wy: py,
              bias: -2,
            });
            continue;
          }
        }
        const extra = EXTRA_DECALS[biome] ?? 0;
        if (!chunk.overlay[i] && roll > 1 - extra) {
          chunk.overlay[i] = decalFor(biome, pick);
        }
      }
    }
  }

  /** Ground kinds of the chunk and its one-tile ring, plus water depth if needed. */
  private fillRing(chunk: Chunk): void {
    const baseX = chunk.cx * CHUNK_TILES;
    const baseY = chunk.cy * CHUNK_TILES;
    let water = false;
    for (let ry = 0; ry < RING; ry++) {
      for (let rx = 0; rx < RING; rx++) {
        const lx = rx - 1;
        const ly = ry - 1;
        const inside = lx >= 0 && ly >= 0 && lx < CHUNK_TILES && ly < CHUNK_TILES;
        const ground = inside
          ? (chunk.ground[idx(lx, ly)] as GroundTile)
          : this.model.groundTile(baseX + lx, baseY + ly);
        chunk.ring[ry * RING + rx] = ground;
        if (ground === "water" || ground === "deep_water") water = true;
      }
    }
    if (!water) return;

    const side = CHUNK_TILES + 1;
    const elevation = new Float32Array(side * side);
    for (let y = 0; y < side; y++) {
      for (let x = 0; x < side; x++) {
        elevation[y * side + x] = this.model.elevation(baseX + x, baseY + y);
      }
    }
    chunk.waterElevation = elevation;
  }

  private hasReservedTile(chunk: Chunk): boolean {
    for (let i = 0; i < chunk.reserved.length; i++) {
      if (chunk.reserved[i] === 1) return true;
    }
    return false;
  }

  /**
   * Writes every authored landmark that overlaps this chunk.
   *
   * Landmarks are pinned to absolute tile coordinates, so a chunk only ever
   * holds a slice of one; the intersection is what gets stamped.
   */
  private stampLandmarks(chunk: Chunk): void {
    const baseX = chunk.cx * CHUNK_TILES;
    const baseY = chunk.cy * CHUNK_TILES;

    for (const landmark of LANDMARKS) {
      if (!landmark.structure) continue;
      const def = structureById(landmark.structure);
      if (!def) continue;

      const width = maxWidth(def);
      const height = def.rows.length;

      const startX = Math.max(landmark.tx, baseX);
      const endX = Math.min(landmark.tx + width - 1, baseX + CHUNK_TILES - 1);
      const startY = Math.max(landmark.ty, baseY);
      const endY = Math.min(landmark.ty + height - 1, baseY + CHUNK_TILES - 1);
      if (startX > endX || startY > endY) continue;

      for (let wy = startY; wy <= endY; wy++) {
        for (let wx = startX; wx <= endX; wx++) {
          const i = idx(wx - baseX, wy - baseY);
          chunk.reserved[i] = 1;

          const row = def.rows[wy - landmark.ty];
          const glyph = row?.[wx - landmark.tx];
          if (!glyph) continue;

          const resolved = resolveTile(def, glyph);
          if (!resolved) continue;

          chunk.tiles[i] = resolved;
          chunk.solid[i] = resolved.solid ? 1 : 0;

          const px = wx * TILE + TILE / 2;
          const py = wy * TILE + TILE;

          if (resolved.role === "floor" || resolved.role === "door") {
            chunk.overlay[i] = resolved.texture;
          } else {
            chunk.sprites.push({ texture: resolved.texture, wx: px, wy: py, bias: 0 });
          }
        }
      }
    }
  }

  private placeStructure(chunk: Chunk, rng: () => number): void {
    const baseX = chunk.cx * CHUNK_TILES;
    const baseY = chunk.cy * CHUNK_TILES;

    // Find a spot whose whole footprint is dry land.
    for (let attempt = 0; attempt < 6; attempt++) {
      const ox = 1 + Math.floor(rng() * (CHUNK_TILES - 2));
      const oy = 1 + Math.floor(rng() * (CHUNK_TILES - 2));

      const biome = this.model.biomeAt(baseX + ox + 2, baseY + oy + 2);
      const candidates = defsForBiome(biome);
      if (candidates.length === 0) return;

      const def = this.pickWeighted(candidates, rng);
      const w = maxWidth(def);
      const h = def.rows.length;
      if (ox + w > CHUNK_TILES - 1 || oy + h > CHUNK_TILES - 1) continue;

      let ok = true;
      for (let y = 0; y < h && ok; y++) {
        for (let x = 0; x < w; x++) {
          if (this.model.isTerrainSolid(baseX + ox + x, baseY + oy + y)) {
            ok = false;
            break;
          }
        }
      }
      if (!ok) continue;

      for (let y = 0; y < h; y++) {
        const row = def.rows[y];
        if (!row) continue;
        for (let x = 0; x < row.length; x++) {
          const glyph = row[x];
          if (!glyph) continue;
          const resolved = resolveTile(def, glyph);
          if (!resolved) continue;

          const lx = ox + x;
          const ly = oy + y;
          if (lx < 0 || ly < 0 || lx >= CHUNK_TILES || ly >= CHUNK_TILES) continue;

          const i = idx(lx, ly);
          chunk.tiles[i] = resolved;
          chunk.solid[i] = resolved.solid ? 1 : 0;

          const px = (baseX + lx) * TILE + TILE / 2;
          const py = (baseY + ly) * TILE + TILE;

          if (resolved.role === "floor" || resolved.role === "door") {
            chunk.overlay[i] = resolved.texture;
          } else {
            chunk.sprites.push({ texture: resolved.texture, wx: px, wy: py, bias: 0 });
          }
        }
      }
      return;
    }
  }

  private pickWeighted(candidates: StructureDef[], rng: () => number): StructureDef {
    const total = candidates.reduce((sum, def) => sum + def.weight, 0);
    let pick = rng() * total;
    for (const def of candidates) {
      pick -= def.weight;
      if (pick <= 0) return def;
    }
    return candidates[candidates.length - 1]!;
  }
}
