import type { MusicZone } from "../../audio/zones";
import type { Direction, TileRole } from "../../types";

/**
 * Authored levels: the Academy, its grounds and the three tombs.
 *
 * A level is an ASCII map plus two tables. The *legend* says what each static
 * glyph is (floor, wall, bookshelf, torch...) and is baked into the world like
 * any other structure. The *mechanisms* table says which glyphs are alive -
 * plates, gates, braziers, traps - and is read by MechanismSystem at runtime.
 *
 * A mechanism glyph names every tile it appears on: three `O`s are one group of
 * three plates, a row of `G`s is one portcullis. Keys longer than one
 * character never appear in a map, which is how purely logical mechanisms
 * (sequences, puzzles) live in the same table.
 */

/** A static tile as the structure stamper understands it. */
export interface StaticTile {
  role: TileRole;
  solid: boolean;
  texture: string;
  /** Floor baked beneath a prop, so a bookshelf stands on parquet rather than bare rock. */
  under?: string;
}

/**
 * A condition over the level's state. A bare string is a mechanism id in the
 * same level and reads as "that mechanism is active" (plate pressed, lever
 * pulled, brazier lit, puzzle solved...).
 */
export type Cond =
  | string
  | { all: Cond[] }
  | { any: Cond[] }
  | { not: Cond }
  | { flag: string }
  | { item: string };

/** Where a portal sends you: a named spot, or a tile offset from a landmark. */
export type PortalTarget =
  | { spot: string; facing?: Direction }
  | { landmark: string; dx: number; dy: number; facing?: Direction };

interface MechBase {
  /** Unique within the level. Persisted state uses `mech_<level>_<id>`. */
  id: string;
  /** Static glyph drawn beneath this mechanism. Defaults to the level floor `.`. */
  under?: string;
}

export interface PlateSpec extends MechBase {
  kind: "plate";
  /** "block" plates ignore the player - only a stone block is heavy enough. */
  weight?: "any" | "block";
  /** Stays down once pressed (and stays down across saves). */
  latch?: boolean;
  /** A trap trigger: drawn as a pale, half-hidden slab rather than brass. */
  trip?: boolean;
}

export interface LeverSpec extends MechBase {
  kind: "lever";
  /** Cannot be pulled back once thrown. */
  once?: boolean;
  label?: string;
}

export interface GateSpec extends MechBase {
  kind: "gate";
  open: Cond;
  /** Once open, stays open for good. */
  latch?: boolean;
  style?: "iron" | "roots" | "stone";
  /** Shown when the player tries a closed gate. */
  locked?: string;
}

export interface SpikeSpec extends MechBase {
  kind: "spikes";
  /** Timed cycle, in seconds. */
  period?: number;
  /** Seconds of each cycle the spikes stand up. */
  up?: number;
  offset?: number;
  /** Extra delay per tile along x, so a row of spikes ripples. */
  wave?: number;
  /** Up while this holds, instead of on a timer. */
  when?: Cond;
  /** Pressure-triggered: rises a beat after you step on it. */
  trap?: boolean;
  /** Permanently retracted once this holds (a solved puzzle, a lever). */
  off?: Cond;
  damage?: number;
}

export interface DartSpec extends MechBase {
  kind: "darts";
  dir: Direction;
  period?: number;
  offset?: number;
  /** Extra delay per shooter, in reading order, for a rolling volley. */
  wave?: number;
  /** Fires on the rising edge of this instead of on a timer. */
  when?: Cond;
  off?: Cond;
  damage?: number;
}

export interface CollapseSpec extends MechBase {
  kind: "collapse";
  /** Seconds per tile of the crumbling wave. */
  wave?: number;
  /** Seconds before a collapsed floor knits back together. */
  reform?: number;
}

export interface PitSpec extends MechBase {
  kind: "pit";
}

export interface BlockSpec extends MechBase {
  kind: "block";
}

export interface ResetSpec extends MechBase {
  kind: "reset";
  /** Block mechanism ids to put back where they started. */
  blocks: string[];
  /** Does nothing once this holds - a solved block puzzle stays solved. */
  unless?: Cond;
}

export interface BrazierSpec extends MechBase {
  kind: "brazier";
  /** Starts lit. */
  lit?: boolean;
  /** Burns out after this many seconds. Unset burns forever (and is saved). */
  burn?: number;
}

export interface SecretSpec extends MechBase {
  kind: "secret";
  /** "lantern": shown by the Warden's Lantern. "hit": a cracked wall broken by a spell or blade. */
  reveal: "lantern" | "hit";
  /** Static floor glyph of the hidden room behind it, kept dark until found. */
  area?: string;
}

export interface LootSpec extends MechBase {
  kind: "loot";
  item: string;
  qty?: number;
  /** Only appears once this holds (usually the secret it sits behind). */
  when?: Cond;
}

export interface ChestSpec extends MechBase {
  kind: "chest";
  gold?: number;
  items?: Array<{ id: string; qty?: number }>;
  /** Item needed to open it (consumed if it is a key). */
  needs?: string;
}

export interface PedestalSpec extends MechBase {
  kind: "pedestal";
  item: string;
  text?: string;
}

export interface BellSpec extends MechBase {
  kind: "bell";
  /** Pitch in Hz. */
  note: number;
  label?: string;
}

export interface RuneSpec extends MechBase {
  kind: "rune";
  label?: string;
}

export interface SequenceSpec extends MechBase {
  kind: "sequence";
  /** Mechanism ids that must pulse in exactly this order. */
  order: string[];
  /** Levers to throw back when the order is wrong. */
  resets?: string[];
}

export interface PuzzleSpec extends MechBase {
  kind: "puzzle";
  /** The puzzle id from docs/DESIGN.md - also the `puzzle_solved` event id. */
  puzzle: string;
  when: Cond;
  text?: string;
}

export interface FloodSpec extends MechBase {
  kind: "flood";
  drained: Cond;
}

export interface CheckpointSpec extends MechBase {
  kind: "checkpoint";
}

export interface SignSpec extends MechBase {
  kind: "sign";
  text: string;
  label?: string;
  /** The sign is a wall tile (mural) rather than something on the floor. */
  wall?: boolean;
}

export interface PortalSpec extends MechBase {
  kind: "portal";
  to: PortalTarget;
  trigger?: "step" | "interact";
  /** Step portals only fire while the player walks this way - a door, not a trapdoor. */
  facing?: Direction;
  requiresFlag?: string;
  requiresItem?: string;
  locked?: string;
  setsFlag?: string;
  label?: string;
}

export interface EscapeSpec extends MechBase {
  kind: "escape";
  /** The puzzle id reported when the player makes it out. */
  puzzle: string;
  /** The chase can start once this holds. */
  armed: Cond;
  /** Glyph marking the finish line. The spec's own glyph marks the start line. */
  goal: string;
  /** Boulder waypoints, in level tiles. */
  path: Array<[number, number]>;
  /** Boulder speed, px/s. */
  speed?: number;
  /** Head start, in seconds. */
  delay?: number;
  /**
   * Where a flattened player wakes, in level tiles - just behind the start
   * line, so the next run begins when they choose to step over it.
   */
  respawn?: [number, number];
}

/** An unseen light source - lamplight from above, a glow off water - so rooms read in the dark. */
export interface GlowSpec extends MechBase {
  kind: "glow";
  radius?: number;
  /** 0xRRGGBB. */
  color?: number;
  intensity?: number;
  flicker?: number;
}

export type MechSpec =
  | GlowSpec
  | PlateSpec
  | LeverSpec
  | GateSpec
  | SpikeSpec
  | DartSpec
  | CollapseSpec
  | PitSpec
  | BlockSpec
  | ResetSpec
  | BrazierSpec
  | SecretSpec
  | LootSpec
  | ChestSpec
  | PedestalSpec
  | BellSpec
  | RuneSpec
  | SequenceSpec
  | PuzzleSpec
  | FloodSpec
  | CheckpointSpec
  | SignSpec
  | PortalSpec
  | EscapeSpec;

export type Tileset = "crypt" | "barrow" | "reliquary" | "academy" | "grounds";

export interface LevelDef {
  /** Structure id; also the landmark id unless `landmark` says otherwise. */
  id: string;
  /** Landmark whose origin the map is stamped at. */
  landmark: string;
  tileset: Tileset;
  rows: string[];
  /**
   * Underground maps are drawn as floors in empty rock; walls are raised
   * automatically wherever rock touches floor, so a room is only its floor.
   */
  autoWalls?: boolean;
  /** Extra static glyphs on top of the tileset's. */
  legend?: Record<string, StaticTile>;
  mech?: Record<string, MechSpec>;
  /** Named spots, in level tiles. Exported through data/spots.ts. */
  spots?: Record<string, [number, number]>;
  /** Music while inside the level's bounds. */
  music?: MusicZone;
}
