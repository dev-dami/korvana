import { TERRAIN_LANDMARKS } from "../data/landmarks";
import type { LandmarkDef } from "../data/landmarks";
import { fbm } from "./noise";
import type { Biome, GroundTile, WorldSample } from "../types";

const BIOME_GROUND: Record<Biome, GroundTile> = {
  ocean: "deep_water",
  shallows: "water",
  beach: "shore",
  marsh: "marsh",
  meadow: "meadow",
  forest: "forest_floor",
  highland: "stone",
  peak: "snow",
  scar: "ash",
  crypt: "void",
};

const SOLID_BIOMES: ReadonlySet<Biome> = new Set<Biome>(["ocean", "shallows", "crypt"]);

/**
 * The world model. Pure functions of (tileX, tileY) and the seed — no chunk
 * state is involved, which is what lets chunks stream in and out freely and
 * still be identical every time they come back.
 *
 * The one thing layered on top is the landmark geography: a handful of places
 * that override the generated biome over a radius. That is deliberately still
 * a pure function of position, so the Scar is in the same spot in every save.
 */
export class WorldModel {
  readonly seed: number;
  private readonly continentSeed: number;
  private readonly moistureSeed: number;
  private readonly detailSeed: number;
  private readonly edgeSeed: number;
  /** Landmarks that override terrain, resolved once so biomeAt stays cheap. */
  private readonly regionOverrides: ReadonlyArray<LandmarkDef & { forceRadius: number }>;

  constructor(seed: number) {
    this.seed = seed | 0;
    this.continentSeed = this.seed;
    this.moistureSeed = this.seed + 8191;
    this.detailSeed = this.seed + 16381;
    this.edgeSeed = this.seed + 24593;

    this.regionOverrides = TERRAIN_LANDMARKS.map((l) => ({
      ...l,
      forceRadius: l.forceRadius as number,
    }));
  }

  elevation(tx: number, ty: number): number {
    const continent = fbm(tx * 0.0032, ty * 0.0032, this.continentSeed, 4);
    const detail = fbm(tx * 0.021, ty * 0.021, this.detailSeed, 3);
    // Bias the curve so roughly a third of the map is water.
    const raw = continent * 0.8 + detail * 0.2;
    return Math.min(1, Math.max(0, (raw - 0.18) * 1.55));
  }

  moisture(tx: number, ty: number): number {
    return fbm(tx * 0.0085, ty * 0.0085, this.moistureSeed, 4);
  }

  temperature(tx: number, ty: number): number {
    // Cooler towards the poles, with local variation.
    const latitude = Math.abs((((ty % 4096) + 4096) % 4096) - 2048) / 2048;
    const wobble = fbm(tx * 0.004, ty * 0.004, this.seed + 4099, 3);
    return Math.min(1, Math.max(0, latitude * 0.7 + wobble * 0.3));
  }

  biomeAt(tx: number, ty: number): Biome {
    const forced = this.forcedRegion(tx, ty)?.forceBiome;
    if (forced) return forced;

    const e = this.elevation(tx, ty);
    const m = this.moisture(tx, ty);
    const t = this.temperature(tx, ty);

    if (e < 0.26) return "ocean";
    if (e < 0.36) return "shallows";
    if (e < 0.42) return "beach";
    if (e > 0.84 || (t > 0.78 && e > 0.72)) return "peak";
    if (e > 0.71) return "highland";
    if (m > 0.66 && e < 0.55) return "marsh";
    if (m > 0.54) return "forest";
    return "meadow";
  }

  /**
   * The landmark region covering this tile, if any.
   *
   * The edge wobbles with noise rather than tracing a clean circle, so a forced
   * region reads as a blast crater instead of a stamped disc. The cheap
   * bounding-box rejection keeps this negligible for the vast majority of tiles,
   * which matters because chunk generation calls it once per tile.
   */
  private forcedRegion(tx: number, ty: number): LandmarkDef | null {
    for (const landmark of this.regionOverrides) {
      const dx = tx - landmark.tx;
      const dy = ty - landmark.ty;
      const reach = landmark.forceRadius * 1.3;
      if (Math.abs(dx) > reach || Math.abs(dy) > reach) continue;

      const wobble = 0.72 + 0.56 * fbm(tx * 0.035, ty * 0.035, this.edgeSeed, 2);
      if (Math.hypot(dx, dy) <= landmark.forceRadius * wobble) return landmark;
    }
    return null;
  }

  sample(tx: number, ty: number): WorldSample {
    return {
      elevation: this.elevation(tx, ty),
      moisture: this.moisture(tx, ty),
      temperature: this.temperature(tx, ty),
      biome: this.biomeAt(tx, ty),
    };
  }

  groundTile(tx: number, ty: number): GroundTile {
    const region = this.forcedRegion(tx, ty);
    if (region?.forceGround) return region.forceGround;

    const biome = this.biomeAt(tx, ty);
    if (biome === "scar") {
      // Cracks open through the ash towards the rim of the blast.
      const crack = fbm(tx * 0.09, ty * 0.09, this.detailSeed + 555, 2);
      return crack > 0.56 ? "cracked_earth" : "ash";
    }
    return BIOME_GROUND[biome];
  }

  /** Terrain-only solidity. Structures are layered on top by the generator. */
  isTerrainSolid(tx: number, ty: number): boolean {
    return SOLID_BIOMES.has(this.biomeAt(tx, ty));
  }

  isWater(tx: number, ty: number): boolean {
    const biome = this.biomeAt(tx, ty);
    return biome === "ocean" || biome === "shallows";
  }

  /**
   * How likely a structure is to spawn in a chunk, based on how hospitable the
   * chunk's centre is. Water and peaks get none.
   */
  structureWeight(tx: number, ty: number): number {
    switch (this.biomeAt(tx, ty)) {
      case "meadow":
        return 0.34;
      case "forest":
        return 0.26;
      case "highland":
        return 0.22;
      case "beach":
        return 0.12;
      case "marsh":
        return 0.1;
      // The Scar is the story's stage; keep it sparse so the landmarks read.
      case "scar":
        return 0.08;
      default:
        return 0;
    }
  }
}
