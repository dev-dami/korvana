import type { StructureDef } from "../structures";
import { TILESETS } from "./tilesets";
import type { LevelDef, MechSpec, StaticTile } from "./types";

/** Mechanisms that sit in a wall line rather than on the floor. */
const WALL_MOUNTED: ReadonlySet<MechSpec["kind"]> = new Set(["secret", "darts"]);
const WALL_GLYPHS = new Set(["#", '"', "T", "M", "W", "1", "2", "3", "4", "h", "D"]);

export interface ProcessedLevel {
  def: LevelDef;
  rows: string[];
  width: number;
  height: number;
  /** Static resolution per glyph, mechanisms resolved to what lies beneath them. */
  legend: Record<string, StaticTile>;
}

function isMapGlyph(key: string): boolean {
  return key.length === 1;
}

function isWallMech(spec: MechSpec | undefined): boolean {
  if (!spec) return false;
  if (WALL_MOUNTED.has(spec.kind)) return true;
  return spec.kind === "sign" && spec.wall === true;
}

/**
 * Resolves a level's glyphs and, for underground maps, raises walls.
 *
 * Authoring floors-only is what keeps the maps readable: a room is drawn as its
 * floor and the stamper works out where its walls go. Walls with a floor below
 * them get the brick face; every other wall gets the flat top you see from
 * above, which is what makes a corridor read as a corridor.
 */
export function processLevel(def: LevelDef): ProcessedLevel {
  const base = TILESETS[def.tileset];
  const legend: Record<string, StaticTile> = { ...base, ...(def.legend ?? {}) };
  const mech = def.mech ?? {};
  for (const [glyph, spec] of Object.entries(mech)) {
    if (!isMapGlyph(glyph)) continue;
    const under = legend[spec.under ?? "."];
    if (under) legend[glyph] = under;
  }

  // One spare row and column of rock, so a room drawn against the map's edge
  // still gets its outer wall.
  const pad = def.autoWalls ? 1 : 0;
  const height = def.rows.length + pad;
  const width = def.rows.reduce((m, r) => Math.max(m, r.length), 0) + pad;
  if (pad) def = { ...def, rows: [...def.rows, ""] };
  const grid: string[][] = def.rows.map((r) => r.padEnd(width, " ").split(""));

  if (def.autoWalls) {
    const isRoom = (x: number, y: number): boolean => {
      const ch = grid[y]?.[x];
      if (!ch || ch === " ") return false;
      const spec = mech[ch];
      if (spec) return !isWallMech(spec);
      return !WALL_GLYPHS.has(ch);
    };

    // Pass 1: rock that touches a room becomes wall.
    const raise: Array<[number, number]> = [];
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (grid[y]![x] !== " ") continue;
        let touches = false;
        for (let oy = -1; oy <= 1 && !touches; oy++) {
          for (let ox = -1; ox <= 1; ox++) {
            if ((ox || oy) && isRoom(x + ox, y + oy)) {
              touches = true;
              break;
            }
          }
        }
        if (touches) raise.push([x, y]);
      }
    }
    for (const [x, y] of raise) grid[y]![x] = "#";

    // Pass 2: only walls facing a room get a face.
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (grid[y]![x] === "#" && !isRoom(x, y + 1)) grid[y]![x] = '"';
      }
    }
  }

  giveFloorsToProps(grid, legend, def);

  return { def, rows: grid.map((r) => r.join("").replace(/\s+$/, "")), width, height, legend };
}

/**
 * A prop is a sprite, and whatever is baked beneath it shows round its edges:
 * underground that is black rock. Each prop cell gets the floor most of its
 * neighbours have, so a library shelf stands on parquet and a hall candelabra
 * on flagstones. Cells are rewritten to private glyphs that carry the floor;
 * nothing authored ever uses those code points.
 */
function giveFloorsToProps(grid: string[][], legend: Record<string, StaticTile>, def: LevelDef): void {
  const mech = def.mech ?? {};
  const derived = new Map<string, string>();
  let next = 0xe000;
  const original = grid.map((row) => [...row]);
  for (let y = 0; y < original.length; y++) {
    for (let x = 0; x < original[y]!.length; x++) {
      const ch = original[y]![x]!;
      if (mech[ch]) continue;
      const tile = legend[ch];
      if (!tile || (tile.role !== "prop" && tile.role !== "torch")) continue;
      const votes = new Map<string, number>();
      for (let oy = -1; oy <= 1; oy++) {
        for (let ox = -1; ox <= 1; ox++) {
          const n = legend[original[y + oy]?.[x + ox] ?? " "];
          if (!n || n.role !== "floor" || n.solid) continue;
          votes.set(n.texture, (votes.get(n.texture) ?? 0) + (ox && oy ? 1 : 2));
        }
      }
      let best: string | null = null;
      for (const [texture, count] of votes) if (!best || count > (votes.get(best) ?? 0)) best = texture;
      if (!best) continue;
      const key = `${ch}|${best}`;
      let glyph = derived.get(key);
      if (!glyph) {
        glyph = String.fromCharCode(next++);
        derived.set(key, glyph);
        legend[glyph] = { ...tile, under: best };
      }
      grid[y]![x] = glyph;
    }
  }
}

export function toStructure(level: ProcessedLevel): StructureDef & { legend: Record<string, StaticTile> } {
  return {
    id: level.def.id,
    floor: level.legend["."]?.texture ?? "st_floor_stone",
    wall: level.legend["#"]?.texture ?? "st_wall_stone",
    rows: level.rows,
    weight: 0,
    // Never placed at random: levels exist only where a landmark pins them.
    biomes: [],
    legend: level.legend,
  };
}

/** Every tile position of a glyph, in level tiles. */
export function glyphPositions(level: ProcessedLevel, glyph: string): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let y = 0; y < level.rows.length; y++) {
    const row = level.rows[y]!;
    for (let x = 0; x < row.length; x++) if (row[x] === glyph) out.push([x, y]);
  }
  return out;
}
