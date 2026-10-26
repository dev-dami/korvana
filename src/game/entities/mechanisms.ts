import type Phaser from "phaser";

import type { SfxName } from "../audio/zones";
import { DEPTH, TILE } from "../config";
import { ITEMS } from "../data/items";
import type { ProcessedLevel } from "../data/levels";
import type {
  BellSpec,
  BlockSpec,
  BrazierSpec,
  ChestSpec,
  CollapseSpec,
  Cond,
  DartSpec,
  EscapeSpec,
  FloodSpec,
  GateSpec,
  LeverSpec,
  LootSpec,
  MechSpec,
  PedestalSpec,
  PlateSpec,
  PortalSpec,
  ResetSpec,
  RuneSpec,
  SecretSpec,
  SequenceSpec,
  SignSpec,
  SpikeSpec,
  PuzzleSpec,
} from "../data/levels/types";
import type { LightSource } from "../gfx/lights";
import { itemIconKey, itemTintHex } from "../gfx/tiles";
import type { GameEventKind } from "../systems/GameEvents";
import type { Direction } from "../types";
import { Pickup } from "./Pickup";

/**
 * The living parts of a level: plates, gates, traps, braziers, relics.
 *
 * Each class here is one `kind` from data/levels/types.ts. They know how to
 * draw and animate themselves and what their tile does to the player; the
 * MechanismSystem owns the bookkeeping they share (conditions, solidity,
 * prompts, falls, portals) and hands it to them as a MechContext.
 */

/** Floor-level mechanism art sits just above the baked ground. */
export const FLOOR_DEPTH = DEPTH.decal + 6;
/** Darkness drawn over undiscovered rooms. Above every actor, below the weather. */
const COVER_DEPTH = 250000;

export interface WorldTile {
  tx: number;
  ty: number;
  /** Position inside the level map, for looking at neighbours. */
  lx: number;
  ly: number;
}

export interface LevelRuntime {
  level: ProcessedLevel;
  ox: number;
  oy: number;
  mechs: Map<string, Mech>;
  /** Where a fall or a boulder puts you back. Updated by checkpoints and arrival. */
  respawn: { x: number; y: number } | null;
  flagPrefix: string;
  /** Stone set the level's mechanisms are dressed in. */
  stone: "crypt" | "barrow" | "reliquary" | "hall";
}

export type HitKind = "fire" | "spell" | "melee";

export interface MechContext {
  readonly scene: Phaser.Scene;
  /** Seconds since the system started; drives every timed trap. */
  readonly clock: number;
  holds(lvl: LevelRuntime, cond: Cond | undefined, fallback?: boolean): boolean;
  setSolid(tx: number, ty: number, solid: boolean | null): void;
  /** The tile under the centre of the player's feet. */
  playerTile(): { tx: number; ty: number };
  playerPos(): { x: number; y: number; direction: Direction; moving: boolean };
  /** Any actor (player, NPC, enemy) has its feet on this tile. */
  occupied(tx: number, ty: number): boolean;
  /** A block could be pushed onto this tile. */
  freeForBlock(tx: number, ty: number): boolean;
  hurt(amount: number, trap: string): void;
  fall(): void;
  respawnPlayer(lvl: LevelRuntime): void;
  toast(message: string): void;
  callout(x: number, y: number, message: string, color?: string): void;
  sfx(name: SfxName): void;
  tone(freq: number): void;
  emit(kind: GameEventKind, id: string): void;
  flag(id: string): boolean;
  setFlag(id: string, value?: boolean): void;
  hasItem(id: string): boolean;
  giveItem(id: string, qty?: number): boolean;
  takeItem(id: string): void;
  addGold(amount: number): void;
  addLight(source: LightSource): LightSource;
  removeLight(source: LightSource | null): void;
  shake(intensity: number, duration: number): void;
  flash(r: number, g: number, b: number, duration: number): void;
  dust(x: number, y: number, count: number, color?: number): void;
  knowsFire(): boolean;
}

export const tileCx = (t: { tx: number }): number => t.tx * TILE + TILE / 2;
export const tileBottom = (t: { ty: number }): number => (t.ty + 1) * TILE;

export abstract class Mech {
  readonly id: string;
  readonly spec: MechSpec;
  readonly lvl: LevelRuntime;
  readonly tiles: WorldTile[];
  /** The mechanism's boolean output: pressed, pulled, lit, solved... */
  active = false;
  /** True for exactly one update after the mechanism fires (bell struck, lever thrown). */
  pulse = false;

  protected readonly ctx: MechContext;
  protected readonly images: Phaser.GameObjects.Image[] = [];

  constructor(ctx: MechContext, lvl: LevelRuntime, spec: MechSpec, tiles: WorldTile[]) {
    this.ctx = ctx;
    this.lvl = lvl;
    this.spec = spec;
    this.id = spec.id;
    this.tiles = tiles;
  }

  get flagKey(): string {
    return `${this.lvl.flagPrefix}${this.id}`;
  }

  /** Called every frame while the player is inside the level. */
  update(_dt: number): void {}

  /** What pressing E here would do, or null if nothing. */
  promptText(): string | null {
    return null;
  }

  /** Tiles the player can interact with from an adjacent tile. */
  interactTiles(): WorldTile[] {
    return this.tiles;
  }

  interact(_tile: WorldTile): void {}

  /** A spell or blade struck this tile. Returns true if it meant something. */
  hit(_kind: HitKind, _tile: WorldTile): boolean {
    return false;
  }

  /** Whether this mechanism cares about being struck at all (for ray tests). */
  get hittable(): boolean {
    return false;
  }

  /** Called when the player leaves the level, so set pieces can reset. */
  sleep(): void {}

  setVisible(visible: boolean): void {
    for (const image of this.images) image.setVisible(visible);
  }

  destroy(): void {
    for (const image of this.images) image.destroy();
    this.images.length = 0;
  }

  protected floorImage(tile: WorldTile, texture: string): Phaser.GameObjects.Image {
    const image = this.ctx.scene.add
      .image(tile.tx * TILE, tile.ty * TILE, texture)
      .setOrigin(0, 0)
      .setDepth(FLOOR_DEPTH);
    this.images.push(image);
    return image;
  }

  protected standingImage(tile: WorldTile, texture: string, bias = 0): Phaser.GameObjects.Image {
    const image = this.ctx.scene.add
      .image(tileCx(tile), tileBottom(tile), texture)
      .setOrigin(0.5, 1)
      .setDepth(tileBottom(tile) + bias);
    this.images.push(image);
    return image;
  }

  protected playerOn(tile: WorldTile): boolean {
    const p = this.ctx.playerTile();
    return p.tx === tile.tx && p.ty === tile.ty;
  }

  protected persist(value: boolean): void {
    this.ctx.setFlag(this.flagKey, value);
  }

  protected persisted(): boolean {
    return this.ctx.flag(this.flagKey);
  }
}

/** Is the cell below this map cell something you can stand on (so a wall here shows its face)? */
export function floorBelow(level: ProcessedLevel, lx: number, ly: number): boolean {
  const ch = level.rows[ly + 1]?.[lx];
  if (!ch || ch === " ") return false;
  const spec = level.def.mech?.[ch];
  if (spec) return !(spec.kind === "secret" || spec.kind === "darts" || (spec.kind === "sign" && spec.wall));
  const tile = level.legend[ch];
  return !!tile && tile.role !== "wall";
}

// --- plates ----------------------------------------------------------------

export class Plate extends Mech {
  private readonly pressed: boolean[];
  private readonly sprites: Phaser.GameObjects.Image[] = [];
  /** Blocks resting on tiles, maintained by the system each frame. */
  weighted: (tile: WorldTile) => boolean = () => false;

  constructor(ctx: MechContext, lvl: LevelRuntime, spec: PlateSpec, tiles: WorldTile[]) {
    super(ctx, lvl, spec, tiles);
    this.pressed = tiles.map(() => false);
    this.active = !!spec.latch && this.persisted();
    for (const tile of tiles) this.sprites.push(this.floorImage(tile, spec.trip ? "dg_plate_pale" : "dg_plate_up"));
  }

  private get plate(): PlateSpec {
    return this.spec as PlateSpec;
  }

  update(): void {
    this.pulse = false;
    let all = true;
    this.tiles.forEach((tile, i) => {
      const byPlayer = this.plate.weight !== "block" && this.playerOn(tile);
      const now = byPlayer || this.weighted(tile);
      if (now !== this.pressed[i]) {
        this.pressed[i] = now;
        if (!this.plate.trip) this.sprites[i]?.setTexture(now ? "dg_plate_down" : "dg_plate_up");
        this.ctx.sfx("plate_click");
      }
      if (!now) all = false;
    });

    if (this.plate.latch && this.active) return;
    if (all && !this.active) this.pulse = true;
    this.active = all;
    if (all && this.plate.latch) this.persist(true);
  }
}

// --- levers ----------------------------------------------------------------

export class Lever extends Mech {
  private readonly sprite: Phaser.GameObjects.Image;

  constructor(ctx: MechContext, lvl: LevelRuntime, spec: LeverSpec, tiles: WorldTile[]) {
    super(ctx, lvl, spec, tiles);
    this.active = this.persisted();
    const tile = tiles[0]!;
    this.sprite = this.standingImage(tile, this.active ? "dg_lever_on" : "dg_lever_off");
    ctx.setSolid(tile.tx, tile.ty, true);
  }

  private get lever(): LeverSpec {
    return this.spec as LeverSpec;
  }

  promptText(): string | null {
    if (this.active && this.lever.once) return null;
    return `${this.lever.label ?? "Lever"}\n[E] pull`;
  }

  interact(): void {
    if (this.active && this.lever.once) return;
    this.set(!this.active);
    if (this.active) this.pulse = true;
  }

  /** Throws the lever without it counting as a pull (sequence resets, loading). */
  set(on: boolean): void {
    this.active = on;
    this.sprite.setTexture(on ? "dg_lever_on" : "dg_lever_off");
    this.persist(on);
    this.ctx.sfx("lever");
  }
}

// --- gates -----------------------------------------------------------------

export class Gate extends Mech {
  private readonly sprites: Phaser.GameObjects.Image[] = [];
  private open = false;
  private pendingClose = false;

  constructor(ctx: MechContext, lvl: LevelRuntime, spec: GateSpec, tiles: WorldTile[]) {
    super(ctx, lvl, spec, tiles);
    const texture = `dg_gate_${spec.style ?? "iron"}`;
    for (const tile of tiles) this.sprites.push(this.standingImage(tile, texture));
    const start = (spec.latch && this.persisted()) || ctx.holds(lvl, spec.open);
    this.applyOpen(start, false);
  }

  private get gate(): GateSpec {
    return this.spec as GateSpec;
  }

  update(): void {
    if (this.gate.latch && this.open) return;
    const want = this.ctx.holds(this.lvl, this.gate.open);
    if (want === this.open && !this.pendingClose) return;
    if (!want && this.tiles.some((t) => this.ctx.occupied(t.tx, t.ty))) {
      // Never drop a portcullis on someone standing under it.
      this.pendingClose = true;
      return;
    }
    this.pendingClose = false;
    if (want !== this.open) this.applyOpen(want, true);
  }

  private applyOpen(open: boolean, animate: boolean): void {
    this.open = open;
    this.active = open;
    if (open && this.gate.latch) this.persist(true);
    for (const tile of this.tiles) this.ctx.setSolid(tile.tx, tile.ty, !open);

    const style = this.gate.style ?? "iron";
    this.sprites.forEach((sprite, i) => {
      const tile = this.tiles[i]!;
      const baseY = tileBottom(tile);
      // Iron rises into the arch, roots wither back, stone sinks into the floor.
      const target =
        style === "iron"
          ? { y: open ? baseY - 30 : baseY, alpha: open ? 0.2 : 1, scaleY: 1 }
          : style === "roots"
            ? { y: baseY, alpha: open ? 0 : 1, scaleY: open ? 0.2 : 1 }
            : { y: open ? baseY + 26 : baseY, alpha: open ? 0 : 1, scaleY: open ? 0.4 : 1 };
      if (animate) {
        this.ctx.scene.tweens.add({ targets: sprite, ...target, duration: open ? 700 : 260, ease: open ? "Sine.easeInOut" : "Quad.easeIn" });
      } else {
        sprite.setY(target.y).setAlpha(target.alpha).setScale(1, target.scaleY);
      }
    });
    if (animate) {
      this.ctx.sfx(open ? "gate_open" : "gate_close");
      if (style === "stone") this.ctx.shake(0.003, 220);
    }
  }

  promptText(): string | null {
    if (this.open || !this.gate.locked) return null;
    return "[E] examine";
  }

  interact(): void {
    if (!this.open && this.gate.locked) this.ctx.toast(this.gate.locked);
  }
}

// --- spikes ----------------------------------------------------------------

export class Spikes extends Mech {
  private readonly sprites: Phaser.GameObjects.Image[] = [];
  private readonly stage: number[];
  private readonly minX: number;
  private readonly trapUntil: number[];
  private readonly trapArm: number[];
  private wasUp = false;

  constructor(ctx: MechContext, lvl: LevelRuntime, spec: SpikeSpec, tiles: WorldTile[]) {
    super(ctx, lvl, spec, tiles);
    for (const tile of tiles) this.sprites.push(this.floorImage(tile, "dg_spikes_0"));
    this.stage = tiles.map(() => 0);
    this.trapUntil = tiles.map(() => 0);
    this.trapArm = tiles.map(() => -1);
    this.minX = Math.min(...tiles.map((t) => t.tx));
  }

  private get spikes(): SpikeSpec {
    return this.spec as SpikeSpec;
  }

  /** 0 down, 1 about to rise, 2 up. */
  private stageFor(i: number, tile: WorldTile): number {
    const s = this.spikes;
    if (s.off && this.ctx.holds(this.lvl, s.off)) return 0;
    const now = this.ctx.clock;
    if (s.trap) {
      if (this.playerOn(tile) && this.trapArm[i]! < 0 && now > this.trapUntil[i]!) this.trapArm[i] = now + 0.35;
      if (this.trapArm[i]! >= 0 && now >= this.trapArm[i]!) {
        this.trapArm[i] = -1;
        this.trapUntil[i] = now + 1.1;
      }
      if (now < this.trapUntil[i]!) return 2;
      return this.trapArm[i]! >= 0 ? 1 : 0;
    }
    if (s.when !== undefined) return this.ctx.holds(this.lvl, s.when) ? 2 : 0;
    const period = s.period ?? 2.4;
    const up = s.up ?? 1;
    const t = (((now + (s.offset ?? 0) + (s.wave ?? 0) * (tile.tx - this.minX)) % period) + period) % period;
    if (t < up) return 2;
    if (t > period - 0.35) return 1;
    return 0;
  }

  update(): void {
    let anyUp = false;
    this.tiles.forEach((tile, i) => {
      const stage = this.stageFor(i, tile);
      if (stage === 2) anyUp = true;
      if (stage !== this.stage[i]) {
        this.stage[i] = stage;
        this.sprites[i]?.setTexture(`dg_spikes_${stage}`);
      }
      if (stage === 2 && this.playerOn(tile)) this.ctx.hurt(this.spikes.damage ?? 10, "spikes");
    });
    if (anyUp && !this.wasUp) {
      const p = this.ctx.playerPos();
      const near = this.tiles.some((t) => Math.hypot(tileCx(t) - p.x, tileBottom(t) - p.y) < 320);
      if (near) this.ctx.sfx("spike_trap");
    }
    this.wasUp = anyUp;
    this.active = anyUp;
  }
}

// --- darts -----------------------------------------------------------------

interface Dart {
  image: Phaser.GameObjects.Image;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
}

const DART_SPEED = 380;

export class DartTrap extends Mech {
  private readonly darts: Dart[] = [];
  private readonly lastFire: number[];
  private wasOn = false;

  constructor(ctx: MechContext, lvl: LevelRuntime, spec: DartSpec, tiles: WorldTile[]) {
    super(ctx, lvl, spec, tiles);
    for (const tile of tiles) {
      const face = floorBelow(lvl.level, tile.lx, tile.ly) ? "face" : "top";
      this.standingImage(tile, `dg_dart_${lvl.stone}_${face}`);
      ctx.setSolid(tile.tx, tile.ty, true);
    }
    this.lastFire = tiles.map(() => -999);
  }

  private get dart(): DartSpec {
    return this.spec as DartSpec;
  }

  update(dt: number): void {
    const s = this.dart;
    const off = s.off !== undefined && this.ctx.holds(this.lvl, s.off);
    if (!off) {
      if (s.when !== undefined) {
        const on = this.ctx.holds(this.lvl, s.when);
        if (on && !this.wasOn) this.tiles.forEach((tile) => this.fire(tile));
        this.wasOn = on;
      } else {
        const period = s.period ?? 2;
        this.tiles.forEach((tile, i) => {
          const phase = (s.offset ?? 0) + (s.wave ?? 0) * i;
          const cycle = Math.floor((this.ctx.clock - phase) / period);
          if (cycle > this.lastFire[i]!) {
            this.lastFire[i] = cycle;
            if (this.ctx.clock > phase) this.fire(tile);
          }
        });
      }
    }

    const p = this.ctx.playerPos();
    for (let i = this.darts.length - 1; i >= 0; i--) {
      const d = this.darts[i]!;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.life -= dt;
      d.image.setPosition(d.x, d.y).setDepth(d.y + 20);
      const hitPlayer = Math.abs(d.x - p.x) < 12 && Math.abs(d.y - (p.y - 12)) < 14;
      const tx = Math.floor(d.x / TILE);
      const ty = Math.floor(d.y / TILE);
      const inShooter = this.tiles.some((t) => t.tx === tx && t.ty === ty);
      const blocked = !inShooter && this.solidAt(d.x, d.y);
      if (hitPlayer) {
        this.ctx.hurt(s.damage ?? 8, "darts");
        this.ctx.emit("trap_triggered", "darts");
      }
      if (hitPlayer || blocked || d.life <= 0) {
        if (blocked) this.ctx.dust(d.x, d.y, 3, 0x9a9080);
        d.image.destroy();
        this.darts.splice(i, 1);
      }
    }
  }

  /** Set by the system: solidity test that includes runtime overrides. */
  solidAt: (x: number, y: number) => boolean = () => false;

  private fire(tile: WorldTile): void {
    const dir = this.dart.dir;
    const vx = dir === "left" ? -DART_SPEED : dir === "right" ? DART_SPEED : 0;
    const vy = dir === "up" ? -DART_SPEED : dir === "down" ? DART_SPEED : 0;
    const x = tileCx(tile) + Math.sign(vx) * 18;
    const y = tile.ty * TILE + TILE / 2 + Math.sign(vy) * 20;
    const image = this.ctx.scene.add
      .image(x, y, "dg_dart")
      .setRotation(Math.atan2(vy, vx))
      .setDepth(y + 20);
    this.images.push(image);
    this.darts.push({ image, x, y, vx, vy, life: 2 });
    const p = this.ctx.playerPos();
    if (Math.hypot(p.x - x, p.y - y) < 420) this.ctx.sfx("dart");
  }

  sleep(): void {
    for (const d of this.darts) d.image.destroy();
    this.darts.length = 0;
  }
}

// --- crumbling floors and pits ---------------------------------------------

export class Collapse extends Mech {
  private readonly sprites: Phaser.GameObjects.Image[] = [];
  /** Per tile: when it falls (or -1), when it comes back (or -1), and whether it is open now. */
  private readonly fallAt: number[];
  private readonly reformAt: number[];
  readonly open: boolean[];

  constructor(ctx: MechContext, lvl: LevelRuntime, spec: CollapseSpec, tiles: WorldTile[]) {
    super(ctx, lvl, spec, tiles);
    const texture = `dg_crumble_${lvl.stone === "hall" ? "crypt" : lvl.stone}`;
    for (const tile of tiles) this.sprites.push(this.floorImage(tile, texture));
    this.fallAt = tiles.map(() => -1);
    this.reformAt = tiles.map(() => -1);
    this.open = tiles.map(() => false);
  }

  private get collapse(): CollapseSpec {
    return this.spec as CollapseSpec;
  }

  update(): void {
    const now = this.ctx.clock;
    const wave = this.collapse.wave ?? 0.13;
    const reform = this.collapse.reform ?? 5;

    // Stepping on any sound tile starts the whole bridge going, outward from you.
    const idle = this.fallAt.every((t) => t < 0);
    if (idle) {
      const start = this.tiles.findIndex((tile, i) => !this.open[i] && this.playerOn(tile));
      if (start >= 0) {
        const origin = this.tiles[start]!;
        this.tiles.forEach((tile, i) => {
          if (this.open[i]) return;
          const d = Math.abs(tile.tx - origin.tx) + Math.abs(tile.ty - origin.ty);
          this.fallAt[i] = now + 0.4 + d * wave;
        });
        this.ctx.sfx("rumble");
        this.ctx.emit("trap_triggered", "collapse");
      }
    }

    this.tiles.forEach((tile, i) => {
      const sprite = this.sprites[i]!;
      const at = this.fallAt[i]!;
      if (at >= 0 && !this.open[i]) {
        const left = at - now;
        if (left <= 0) {
          this.open[i] = true;
          this.fallAt[i] = -1;
          this.reformAt[i] = now + reform;
          sprite.setTexture("dg_pit").setX(tile.tx * TILE);
          this.ctx.dust(tileCx(tile), tileBottom(tile) - 10, 5, 0x8a7a64);
          if (i % 4 === 0) this.ctx.sfx("collapse");
        } else if (left < 0.3) {
          sprite.setX(tile.tx * TILE + (Math.random() - 0.5) * 3);
        }
      }
      if (this.open[i] && this.reformAt[i]! >= 0 && now >= this.reformAt[i]! && !this.playerOn(tile)) {
        this.knit(i);
      }
    });
    this.active = this.open.some((o) => o);
  }

  private knit(i: number): void {
    const tile = this.tiles[i]!;
    this.open[i] = false;
    this.reformAt[i] = -1;
    this.fallAt[i] = -1;
    const texture = `dg_crumble_${this.lvl.stone === "hall" ? "crypt" : this.lvl.stone}`;
    this.sprites[i]!.setTexture(texture).setX(tile.tx * TILE).setAlpha(0);
    this.ctx.scene.tweens.add({ targets: this.sprites[i], alpha: 1, duration: 400 });
  }

  isOpenAt(tx: number, ty: number): boolean {
    return this.tiles.some((t, i) => this.open[i] && t.tx === tx && t.ty === ty);
  }

  sleep(): void {
    this.tiles.forEach((_, i) => {
      if (this.open[i]) this.knit(i);
      this.fallAt[i] = -1;
    });
  }
}

export class Pit extends Mech {
  constructor(ctx: MechContext, lvl: LevelRuntime, spec: MechSpec, tiles: WorldTile[]) {
    super(ctx, lvl, spec, tiles);
    for (const tile of tiles) this.floorImage(tile, "dg_pit");
    this.active = true;
  }

  isOpenAt(tx: number, ty: number): boolean {
    return this.tiles.some((t) => t.tx === tx && t.ty === ty);
  }
}

// --- pushable blocks ---------------------------------------------------------

interface Stone {
  start: WorldTile;
  tx: number;
  ty: number;
  sprite: Phaser.GameObjects.Image;
  moving: boolean;
}

const PUSH_DELAY = 0.18;
const SLIDE_MS = 170;

export class Block extends Mech {
  readonly stones: Stone[] = [];
  private pushTimer = 0;
  private pushTarget: Stone | null = null;

  constructor(ctx: MechContext, lvl: LevelRuntime, spec: BlockSpec, tiles: WorldTile[]) {
    super(ctx, lvl, spec, tiles);
    for (const tile of tiles) {
      const sprite = this.standingImage(tile, "dg_block");
      this.stones.push({ start: tile, tx: tile.tx, ty: tile.ty, sprite, moving: false });
      ctx.setSolid(tile.tx, tile.ty, true);
    }
  }

  stoneAt(tx: number, ty: number): Stone | undefined {
    return this.stones.find((s) => s.tx === tx && s.ty === ty);
  }

  /** Pushing: walk into a block for a moment and it slides a tile. */
  updatePush(dt: number, inputEnabled: boolean, stuck: boolean): void {
    const p = this.ctx.playerPos();
    if (!inputEnabled || !p.moving || !stuck) {
      this.pushTimer = 0;
      this.pushTarget = null;
      return;
    }
    const front = this.frontTile(p);
    const stone = this.stoneAt(front.tx, front.ty);
    if (!stone || stone.moving) {
      this.pushTimer = 0;
      this.pushTarget = null;
      return;
    }
    if (this.pushTarget !== stone) {
      this.pushTarget = stone;
      this.pushTimer = 0;
    }
    this.pushTimer += dt;
    if (this.pushTimer < PUSH_DELAY) return;
    this.pushTimer = 0;
    const [dx, dy] = dirDelta(p.direction);
    this.slide(stone, stone.tx + dx, stone.ty + dy);
  }

  frontTile(p: { x: number; y: number; direction: Direction }): { tx: number; ty: number } {
    const [dx, dy] = dirDelta(p.direction);
    const fx = p.x + dx * 18;
    const fy = p.y - 7 + dy * 14;
    return { tx: Math.floor(fx / TILE), ty: Math.floor(fy / TILE) };
  }

  slide(stone: Stone, tx: number, ty: number, quiet = false): boolean {
    if (!this.ctx.freeForBlock(tx, ty)) {
      if (!quiet) this.ctx.sfx("stone_grind");
      return false;
    }
    const from = { tx: stone.tx, ty: stone.ty };
    stone.moving = true;
    stone.tx = tx;
    stone.ty = ty;
    this.ctx.setSolid(tx, ty, true);
    this.ctx.sfx("stone_grind");
    this.ctx.scene.tweens.add({
      targets: stone.sprite,
      x: tileCx({ tx }),
      y: tileBottom({ ty }),
      duration: SLIDE_MS,
      ease: "Sine.easeOut",
      onUpdate: () => stone.sprite.setDepth(stone.sprite.y),
      onComplete: () => {
        stone.moving = false;
        this.ctx.setSolid(from.tx, from.ty, null);
        this.ctx.dust(tileCx({ tx }), tileBottom({ ty }) - 4, 2, 0x8a8478);
      },
    });
    return true;
  }

  /** E beside a block hauls it one tile towards you, so nothing is ever wedged for good. */
  promptText(): string | null {
    return this.pullable() ? "Stone block\n[E] pull" : null;
  }

  interactTiles(): WorldTile[] {
    return this.stones.map((s) => ({ tx: s.tx, ty: s.ty, lx: 0, ly: 0 }));
  }

  private pullable(): Stone | null {
    const p = this.ctx.playerPos();
    const front = this.frontTile(p);
    const stone = this.stoneAt(front.tx, front.ty);
    return stone && !stone.moving ? stone : null;
  }

  interact(): void {
    const stone = this.pullable();
    if (!stone) return;
    const p = this.ctx.playerPos();
    const [dx, dy] = dirDelta(p.direction);
    const pt = this.ctx.playerTile();
    const behind = { tx: pt.tx - dx, ty: pt.ty - dy };
    if (!this.ctx.freeForBlock(behind.tx, behind.ty)) {
      this.ctx.toast("No room behind you to haul it.");
      return;
    }
    this.pullRequest = { stone, to: { tx: stone.tx - dx, ty: stone.ty - dy }, step: { x: -dx * TILE, y: -dy * TILE } };
  }

  /** Read by the system, which moves the player and the block together. */
  pullRequest: { stone: Stone; to: { tx: number; ty: number }; step: { x: number; y: number } } | null = null;

  reset(): boolean {
    let moved = false;
    for (const stone of this.stones) {
      if (stone.tx === stone.start.tx && stone.ty === stone.start.ty) continue;
      if (this.ctx.occupied(stone.start.tx, stone.start.ty)) continue;
      if (this.stones.some((o) => o !== stone && o.tx === stone.start.tx && o.ty === stone.start.ty)) continue;
      this.ctx.setSolid(stone.tx, stone.ty, null);
      this.ctx.dust(tileCx(stone), tileBottom(stone) - 6, 4, 0x9fe0ff);
      stone.tx = stone.start.tx;
      stone.ty = stone.start.ty;
      this.ctx.setSolid(stone.tx, stone.ty, true);
      stone.sprite.setPosition(tileCx(stone), tileBottom(stone)).setDepth(tileBottom(stone)).setAlpha(0);
      this.ctx.scene.tweens.add({ targets: stone.sprite, alpha: 1, duration: 350 });
      moved = true;
    }
    return moved;
  }
}

export function dirDelta(dir: Direction): [number, number] {
  switch (dir) {
    case "left":
      return [-1, 0];
    case "right":
      return [1, 0];
    case "up":
      return [0, -1];
    case "down":
      return [0, 1];
  }
}

export class ResetRune extends Mech {
  private readonly sprite: Phaser.GameObjects.Image;
  private wasOn = false;

  constructor(ctx: MechContext, lvl: LevelRuntime, spec: ResetSpec, tiles: WorldTile[]) {
    super(ctx, lvl, spec, tiles);
    this.sprite = this.floorImage(tiles[0]!, "dg_rune_off");
  }

  update(): void {
    const on = this.tiles.some((t) => this.playerOn(t));
    if (on !== this.wasOn) this.sprite.setTexture(on ? "dg_rune_on" : "dg_rune_off");
    if (on && !this.wasOn) {
      const spec = this.spec as ResetSpec;
      if (spec.unless !== undefined && this.ctx.holds(this.lvl, spec.unless)) {
        this.ctx.toast("The rune is dark. The stones are content where they are.");
      } else {
        let moved = false;
        for (const id of spec.blocks) {
          const block = this.lvl.mechs.get(id);
          if (block instanceof Block && block.reset()) moved = true;
        }
        if (moved) {
          this.ctx.sfx("secret");
          this.ctx.toast("The rune flares, and the stones shudder back to where they began.");
        }
      }
    }
    this.wasOn = on;
  }
}

export class Rune extends Mech {
  private readonly sprites: Phaser.GameObjects.Image[] = [];
  private wasOn = false;

  constructor(ctx: MechContext, lvl: LevelRuntime, spec: RuneSpec, tiles: WorldTile[]) {
    super(ctx, lvl, spec, tiles);
    for (const tile of tiles) this.sprites.push(this.floorImage(tile, "dg_rune_off"));
  }

  update(): void {
    const on = this.tiles.some((t) => this.playerOn(t));
    this.pulse = on && !this.wasOn;
    if (on !== this.wasOn) for (const s of this.sprites) s.setTexture(on ? "dg_rune_on" : "dg_rune_off");
    if (this.pulse) this.ctx.sfx("plate_click");
    this.wasOn = on;
    this.active = on;
  }
}

// --- fire --------------------------------------------------------------------

export class Brazier extends Mech {
  private readonly sprites: Phaser.GameObjects.Image[] = [];
  private readonly lit: boolean[];
  private readonly burnUntil: number[];
  private readonly lights: (LightSource | null)[];
  private flickerTimer = 0;
  private frame = 0;

  constructor(ctx: MechContext, lvl: LevelRuntime, spec: BrazierSpec, tiles: WorldTile[]) {
    super(ctx, lvl, spec, tiles);
    const start = spec.lit || (spec.burn === undefined && this.persisted());
    this.lit = tiles.map(() => false);
    this.burnUntil = tiles.map(() => -1);
    this.lights = tiles.map(() => null);
    for (const tile of tiles) {
      this.sprites.push(this.standingImage(tile, "dg_brazier_off"));
      ctx.setSolid(tile.tx, tile.ty, true);
    }
    if (start) tiles.forEach((_, i) => this.kindle(i, false));
    this.active = this.lit.every((l) => l);
  }

  private get brazier(): BrazierSpec {
    return this.spec as BrazierSpec;
  }

  get hittable(): boolean {
    return true;
  }

  private kindle(i: number, loud: boolean): void {
    if (this.lit[i]) {
      // Re-lighting a timed brazier tops it up.
      if (this.brazier.burn !== undefined) this.burnUntil[i] = this.ctx.clock + this.brazier.burn;
      return;
    }
    const tile = this.tiles[i]!;
    this.lit[i] = true;
    this.sprites[i]!.setTexture("dg_brazier_on_0");
    this.lights[i] = this.ctx.addLight({
      x: tileCx(tile),
      y: tileBottom(tile) - 24,
      radius: 190,
      color: 0xffa04a,
      intensity: 0.95,
      flicker: 0.4,
    });
    if (this.brazier.burn !== undefined) this.burnUntil[i] = this.ctx.clock + this.brazier.burn;
    else this.persist(true);
    if (loud) {
      this.ctx.sfx("brazier_light");
      this.ctx.dust(tileCx(tile), tileBottom(tile) - 26, 6, 0xffb04a);
    }
  }

  private douse(i: number): void {
    this.lit[i] = false;
    this.burnUntil[i] = -1;
    this.sprites[i]!.setTexture("dg_brazier_off");
    this.ctx.removeLight(this.lights[i] ?? null);
    this.lights[i] = null;
    const tile = this.tiles[i]!;
    this.ctx.dust(tileCx(tile), tileBottom(tile) - 26, 4, 0x55524c);
  }

  hit(kind: HitKind, tile: WorldTile): boolean {
    if (kind !== "fire") return false;
    const i = this.tiles.findIndex((t) => t.tx === tile.tx && t.ty === tile.ty);
    if (i < 0) return false;
    this.kindle(i, true);
    return true;
  }

  update(dt: number): void {
    const before = this.active;
    this.tiles.forEach((_, i) => {
      if (this.lit[i] && this.burnUntil[i]! >= 0 && this.ctx.clock >= this.burnUntil[i]!) this.douse(i);
    });
    this.flickerTimer -= dt;
    if (this.flickerTimer <= 0) {
      this.flickerTimer = 0.14;
      this.frame = 1 - this.frame;
      this.tiles.forEach((_, i) => {
        if (this.lit[i]) this.sprites[i]!.setTexture(`dg_brazier_on_${this.frame}`);
      });
    }
    this.active = this.lit.every((l) => l);
    if (this.active && !before) this.pulse = true;
  }

  promptText(): string | null {
    return this.lit.every((l) => l) ? null : "Cold brazier\n[E] examine";
  }

  interact(tile: WorldTile): void {
    const i = this.tiles.findIndex((t) => t.tx === tile.tx && t.ty === tile.ty);
    if (i < 0 || this.lit[i]) return;
    if (this.ctx.knowsFire()) {
      this.ctx.toast("The coals are cold and damp. A fire spell would wake them.");
      return;
    }
    // A student without fire magic is not stuck forever: there is always tinder.
    this.ctx.toast("You have no fire spell, so you strike your tinderbox until the coals catch.");
    this.kindle(i, true);
  }

  destroy(): void {
    for (const light of this.lights) this.ctx.removeLight(light);
    super.destroy();
  }
}

// --- secrets -----------------------------------------------------------------

export class Secret extends Mech {
  private readonly sprites: Phaser.GameObjects.Image[] = [];
  private readonly covers: Phaser.GameObjects.Image[] = [];
  private shimmer: Phaser.GameObjects.Image | null = null;

  constructor(ctx: MechContext, lvl: LevelRuntime, spec: SecretSpec, tiles: WorldTile[]) {
    super(ctx, lvl, spec, tiles);
    this.active = this.persisted();
    if (this.active) return;

    for (const tile of tiles) {
      const face = floorBelow(lvl.level, tile.lx, tile.ly);
      const cracked = spec.reveal === "hit";
      const texture = `dg_wall_${lvl.stone}${cracked ? "_cracked" : ""}${face ? "" : "_top"}`;
      this.sprites.push(this.standingImage(tile, texture));
      ctx.setSolid(tile.tx, tile.ty, true);
    }
    if (spec.area) this.buildCovers(spec.area);
    if (spec.reveal === "lantern") {
      const t = tiles[0]!;
      this.shimmer = ctx.scene.add
        .image(tileCx(t), tileBottom(t) - 18, "dg_shimmer")
        .setBlendMode("ADD")
        .setDepth(tileBottom(t) + 2)
        .setAlpha(0);
      this.images.push(this.shimmer);
    }
  }

  private get secret(): SecretSpec {
    return this.spec as SecretSpec;
  }

  get hittable(): boolean {
    return !this.active && this.secret.reveal === "hit";
  }

  /** Darkness over the hidden room and any of its walls you could not otherwise see. */
  private buildCovers(area: string): void {
    const { level } = this.lvl;
    const rows = level.rows;
    const isArea = (x: number, y: number) => rows[y]?.[x] === area;
    const visibleFloor = (x: number, y: number): boolean => {
      const ch = rows[y]?.[x];
      if (!ch || ch === " " || ch === area) return false;
      const spec = level.def.mech?.[ch];
      if (spec) return !(spec.kind === "secret" || spec.kind === "darts" || (spec.kind === "loot" && spec.when === this.id));
      const tile = level.legend[ch];
      return !!tile && tile.role !== "wall";
    };
    const cells: Array<[number, number]> = [];
    for (let y = 0; y < rows.length; y++) {
      for (let x = 0; x < (rows[y]?.length ?? 0); x++) {
        const ch = rows[y]![x]!;
        const loot = level.def.mech?.[ch];
        const hiddenLoot = loot?.kind === "loot" && loot.when === this.id;
        if (isArea(x, y) || hiddenLoot) {
          cells.push([x, y]);
          continue;
        }
        if (ch !== "#" && ch !== '"') continue;
        let touchesArea = false;
        let touchesVisible = false;
        for (let oy = -1; oy <= 1; oy++) {
          for (let ox = -1; ox <= 1; ox++) {
            if (!ox && !oy) continue;
            if (isArea(x + ox, y + oy)) touchesArea = true;
            if (visibleFloor(x + ox, y + oy)) touchesVisible = true;
          }
        }
        if (touchesArea && !touchesVisible) cells.push([x, y]);
      }
    }
    for (const [x, y] of cells) {
      const px = (this.lvl.ox + x) * TILE;
      const py = (this.lvl.oy + y) * TILE - 14;
      const cover = this.ctx.scene.add
        .image(px, py, "fx_pixel")
        .setOrigin(0, 0)
        .setDisplaySize(TILE, TILE + 14)
        .setTint(0x050507)
        .setDepth(COVER_DEPTH);
      this.covers.push(cover);
      this.images.push(cover);
    }
  }

  hit(kind: HitKind, tile: WorldTile): boolean {
    void kind;
    if (!this.hittable) return false;
    if (!this.tiles.some((t) => t.tx === tile.tx && t.ty === tile.ty)) return false;
    this.reveal();
    return true;
  }

  update(): void {
    if (this.active || this.secret.reveal !== "lantern") return;
    if (!this.ctx.hasItem("wardens_lantern")) {
      this.shimmer?.setAlpha(0);
      return;
    }
    const p = this.ctx.playerPos();
    let nearest = Infinity;
    for (const t of this.tiles) nearest = Math.min(nearest, Math.hypot(tileCx(t) - p.x, tileBottom(t) - 16 - (p.y - 10)));
    // The Lantern's light finds the seam before you reach it.
    if (this.shimmer) this.shimmer.setAlpha(nearest < 200 ? (0.35 + 0.25 * Math.sin(this.ctx.clock * 5)) * (1 - nearest / 220) : 0);
    if (nearest < 76) this.reveal();
  }

  reveal(): void {
    if (this.active) return;
    this.active = true;
    this.persist(true);
    for (const tile of this.tiles) {
      this.ctx.setSolid(tile.tx, tile.ty, null);
      this.ctx.dust(tileCx(tile), tileBottom(tile) - 14, 8, 0x9a9080);
    }
    this.ctx.scene.tweens.add({ targets: this.sprites, alpha: 0, scaleY: 0.3, duration: 450, ease: "Quad.easeIn" });
    this.ctx.scene.tweens.add({ targets: this.covers, alpha: 0, duration: 900, delay: 150 });
    if (this.shimmer) this.shimmer.setVisible(false);
    this.ctx.sfx("secret");
    this.ctx.shake(0.003, 200);
    const t = this.tiles[0]!;
    this.ctx.callout(tileCx(t), tileBottom(t) - 50, this.secret.reveal === "lantern" ? "The Lantern shows a way" : "Hidden passage", "#cfe4ff");
    this.ctx.emit("secret_found", `${this.lvl.level.def.id}_${this.id}`);
  }
}

// --- things to take ----------------------------------------------------------

export class Loot extends Mech {
  private pickup: Pickup | null = null;
  private taken: boolean;

  constructor(ctx: MechContext, lvl: LevelRuntime, spec: LootSpec, tiles: WorldTile[]) {
    super(ctx, lvl, spec, tiles);
    this.taken = this.persisted();
  }

  private get loot(): LootSpec {
    return this.spec as LootSpec;
  }

  update(dt: number): void {
    if (this.taken) return;
    if (!this.pickup) {
      if (this.loot.when !== undefined && !this.ctx.holds(this.lvl, this.loot.when)) return;
      const def = ITEMS[this.loot.item];
      if (!def) return;
      const t = this.tiles[0]!;
      this.pickup = new Pickup(this.ctx.scene, def.id, def.kind, itemTintHex(def.kind), this.loot.qty ?? 1, tileCx(t), tileBottom(t) - 6);
    }
    const p = this.ctx.playerPos();
    this.pickup.update(dt, p.x, p.y);
    if (this.pickup.inRange(p.x, p.y)) {
      this.taken = true;
      this.persist(true);
      this.active = true;
      this.pickup.collect();
      this.pickup = null;
      this.ctx.giveItem(this.loot.item, this.loot.qty ?? 1);
    }
  }

  setVisible(visible: boolean): void {
    if (!visible && this.pickup) {
      this.pickup.destroy();
      this.pickup = null;
    }
  }

  destroy(): void {
    this.pickup?.destroy();
    this.pickup = null;
    super.destroy();
  }
}

export class Chest extends Mech {
  private readonly sprite: Phaser.GameObjects.Image;

  constructor(ctx: MechContext, lvl: LevelRuntime, spec: ChestSpec, tiles: WorldTile[]) {
    super(ctx, lvl, spec, tiles);
    this.active = this.persisted();
    const tile = tiles[0]!;
    this.sprite = this.standingImage(tile, this.active ? "dg_chest_open" : "dg_chest_closed");
    ctx.setSolid(tile.tx, tile.ty, true);
  }

  private get chest(): ChestSpec {
    return this.spec as ChestSpec;
  }

  promptText(): string | null {
    return this.active ? null : "Chest\n[E] open";
  }

  interact(): void {
    if (this.active) return;
    const needs = this.chest.needs;
    if (needs && !this.ctx.hasItem(needs)) {
      this.ctx.toast(`Locked. It wants a ${ITEMS[needs]?.name ?? needs}.`);
      return;
    }
    if (needs && ITEMS[needs]?.kind === "key" && ITEMS[needs]?.stackable) this.ctx.takeItem(needs);
    this.active = true;
    this.persist(true);
    this.sprite.setTexture("dg_chest_open");
    this.ctx.sfx("chest_open");
    const tile = this.tiles[0]!;
    this.ctx.dust(tileCx(tile), tileBottom(tile) - 16, 6, 0xffd36a);
    const found: string[] = [];
    if (this.chest.gold) {
      this.ctx.addGold(this.chest.gold);
      found.push(`${this.chest.gold} gold`);
    }
    for (const item of this.chest.items ?? []) {
      if (this.ctx.giveItem(item.id, item.qty ?? 1)) {
        const name = ITEMS[item.id]?.name ?? item.id;
        found.push((item.qty ?? 1) > 1 ? `${name} x${item.qty}` : name);
      }
    }
    if (found.length) this.ctx.toast(`Inside: ${found.join(", ")}.`);
  }
}

export class Pedestal extends Mech {
  private readonly relic: Phaser.GameObjects.Image | null = null;
  private readonly glow: Phaser.GameObjects.Image | null = null;
  private light: LightSource | null = null;
  private bob = 0;

  constructor(ctx: MechContext, lvl: LevelRuntime, spec: PedestalSpec, tiles: WorldTile[]) {
    super(ctx, lvl, spec, tiles);
    this.active = this.persisted();
    const tile = tiles[0]!;
    this.standingImage(tile, "dg_pedestal");
    ctx.setSolid(tile.tx, tile.ty, true);
    if (this.active) return;
    const def = ITEMS[spec.item];
    const texture = ctx.scene.textures.exists(`dg_relic_${spec.item}`)
      ? `dg_relic_${spec.item}`
      : itemIconKey(def?.kind ?? "relic");
    this.glow = ctx.scene.add
      .image(tileCx(tile), tileBottom(tile) - 44, "fx_glow_cool")
      .setBlendMode("ADD")
      .setScale(0.6)
      .setDepth(tileBottom(tile) + 1);
    this.relic = ctx.scene.add
      .image(tileCx(tile), tileBottom(tile) - 40, texture)
      .setOrigin(0.5, 1)
      .setDepth(tileBottom(tile) + 2);
    this.images.push(this.glow, this.relic);
    this.light = ctx.addLight({ x: tileCx(tile), y: tileBottom(tile) - 46, radius: 150, color: 0xcfe4ff, intensity: 0.7, flicker: 0.05 });
  }

  private get pedestal(): PedestalSpec {
    return this.spec as PedestalSpec;
  }

  update(dt: number): void {
    if (this.active || !this.relic) return;
    this.bob += dt * 2.2;
    const tile = this.tiles[0]!;
    this.relic.setY(tileBottom(tile) - 40 + Math.sin(this.bob) * 2.5);
    this.glow?.setAlpha(0.65 + Math.sin(this.bob * 1.3) * 0.2);
  }

  promptText(): string | null {
    if (this.active) return null;
    return `${ITEMS[this.pedestal.item]?.name ?? "Relic"}\n[E] take it`;
  }

  interact(): void {
    if (this.active) return;
    const item = this.pedestal.item;
    this.active = true;
    this.pulse = true;
    this.persist(true);
    this.ctx.giveItem(item, 1);
    this.ctx.sfx("relic_fanfare");
    this.ctx.flash(255, 240, 200, 380);
    const tile = this.tiles[0]!;
    this.ctx.callout(tileCx(tile), tileBottom(tile) - 70, ITEMS[item]?.name ?? item, "#ffe6a0");
    if (this.pedestal.text) this.ctx.toast(this.pedestal.text);
    this.ctx.removeLight(this.light);
    this.light = null;
    if (this.relic) {
      this.ctx.scene.tweens.add({ targets: [this.relic, this.glow], y: "-=30", alpha: 0, duration: 600 });
    }
  }

  destroy(): void {
    this.ctx.removeLight(this.light);
    super.destroy();
  }
}

// --- bells, signs ----------------------------------------------------------------

export class Bell extends Mech {
  private readonly sprite: Phaser.GameObjects.Image;

  constructor(ctx: MechContext, lvl: LevelRuntime, spec: BellSpec, tiles: WorldTile[]) {
    super(ctx, lvl, spec, tiles);
    const tile = tiles[0]!;
    this.sprite = this.standingImage(tile, "dg_bell");
    ctx.setSolid(tile.tx, tile.ty, true);
  }

  private get bell(): BellSpec {
    return this.spec as BellSpec;
  }

  get hittable(): boolean {
    return true;
  }

  promptText(): string | null {
    return `${this.bell.label ?? "Bell"}\n[E] ring`;
  }

  interact(): void {
    this.strike();
  }

  hit(): boolean {
    this.strike();
    return true;
  }

  private strike(): void {
    this.pulse = true;
    this.ctx.tone(this.bell.note);
    this.ctx.scene.tweens.add({ targets: this.sprite, angle: { from: -6, to: 6 }, duration: 120, yoyo: true, repeat: 2, onComplete: () => this.sprite.setAngle(0) });
    const tile = this.tiles[0]!;
    this.ctx.dust(tileCx(tile), tileBottom(tile) - 30, 5, 0xffe6a0);
  }
}

export class Sign extends Mech {
  constructor(ctx: MechContext, lvl: LevelRuntime, spec: SignSpec, tiles: WorldTile[]) {
    super(ctx, lvl, spec, tiles);
    if (!spec.wall) {
      for (const tile of tiles) {
        this.standingImage(tile, "dg_stele");
        ctx.setSolid(tile.tx, tile.ty, true);
      }
    }
  }

  promptText(): string | null {
    return `[E] ${(this.spec as SignSpec).label ?? "read"}`;
  }

  interact(): void {
    this.ctx.sfx("page_turn");
    this.ctx.toast((this.spec as SignSpec).text);
  }
}

// --- logic -------------------------------------------------------------------

export class Sequence extends Mech {
  progress = 0;

  constructor(ctx: MechContext, lvl: LevelRuntime, spec: SequenceSpec) {
    super(ctx, lvl, spec, []);
    this.active = this.persisted();
  }

  /** Called once every input exists: levers left half-pulled by a save are thrown back. */
  settle(): void {
    if (this.active) return;
    for (const id of (this.spec as SequenceSpec).resets ?? []) {
      const lever = this.lvl.mechs.get(id);
      if (lever instanceof Lever && lever.active) lever.set(false);
    }
  }

  update(): void {
    if (this.active) return;
    const spec = this.spec as SequenceSpec;
    for (const id of new Set(spec.order)) {
      const input = this.lvl.mechs.get(id);
      if (!input?.pulse) continue;
      if (id === spec.order[this.progress]) {
        this.progress++;
        if (this.progress >= spec.order.length) {
          this.active = true;
          this.persist(true);
        }
      } else {
        this.fail(id === spec.order[0]);
      }
    }
  }

  private fail(restartsAtOne: boolean): void {
    this.progress = restartsAtOne ? 1 : 0;
    this.ctx.sfx("gate_close");
    this.ctx.toast("Something deep in the stone answers wrongly, and falls silent.");
    const spec = this.spec as SequenceSpec;
    const resets = spec.resets ?? [];
    if (resets.length) {
      this.ctx.scene.time.delayedCall(450, () => {
        for (const id of resets) {
          const lever = this.lvl.mechs.get(id);
          if (lever instanceof Lever && lever.active) lever.set(false);
        }
        this.ctx.sfx("splash");
      });
      this.progress = 0;
    }
  }
}

export class Puzzle extends Mech {
  constructor(ctx: MechContext, lvl: LevelRuntime, spec: PuzzleSpec) {
    super(ctx, lvl, spec, []);
    this.active = ctx.flag(Puzzle.flagFor(spec.puzzle));
  }

  static flagFor(puzzle: string): string {
    return `puzzle_${puzzle}`;
  }

  update(): void {
    this.pulse = false;
    if (this.active) return;
    const spec = this.spec as PuzzleSpec;
    if (!this.ctx.holds(this.lvl, spec.when)) return;
    this.active = true;
    this.pulse = true;
    this.ctx.setFlag(Puzzle.flagFor(spec.puzzle));
    this.ctx.sfx("quest_complete");
    this.ctx.shake(0.004, 400);
    if (spec.text) this.ctx.toast(spec.text);
    this.ctx.emit("puzzle_solved", spec.puzzle);
  }
}

export class Flood extends Mech {
  private readonly sprites: Phaser.GameObjects.Image[] = [];
  private drained = false;
  private frameTimer = 0;
  private frame = 0;

  constructor(ctx: MechContext, lvl: LevelRuntime, spec: FloodSpec, tiles: WorldTile[]) {
    super(ctx, lvl, spec, tiles);
    this.drained = ctx.holds(lvl, spec.drained);
    if (this.drained) return;
    for (const tile of tiles) {
      this.sprites.push(this.floorImage(tile, "dg_water_deep_0"));
      ctx.setSolid(tile.tx, tile.ty, true);
    }
  }

  update(dt: number): void {
    this.active = this.drained;
    if (this.drained) return;
    this.frameTimer -= dt;
    if (this.frameTimer <= 0) {
      this.frameTimer = 0.55;
      this.frame = 1 - this.frame;
      this.sprites.forEach((s, i) => s.setTexture(`dg_water_deep_${(this.frame + i) % 2}`));
    }
    if (!this.ctx.holds(this.lvl, (this.spec as FloodSpec).drained)) return;
    this.drained = true;
    for (const tile of this.tiles) this.ctx.setSolid(tile.tx, tile.ty, null);
    this.ctx.sfx("splash");
    this.ctx.sfx("rumble");
    this.ctx.shake(0.006, 900);
    // Drain from the edges inward, like water finding the sluices.
    const cx = this.tiles.reduce((s, t) => s + t.tx, 0) / Math.max(1, this.tiles.length);
    this.sprites.forEach((sprite, i) => {
      const d = Math.abs(this.tiles[i]!.tx - cx);
      this.ctx.scene.tweens.add({ targets: sprite, alpha: 0, duration: 900, delay: Math.max(0, 1400 - d * 90) });
    });
  }
}

export class Checkpoint extends Mech {
  update(): void {
    for (const tile of this.tiles) {
      if (this.playerOn(tile)) {
        this.lvl.respawn = { x: tileCx(tile), y: tileBottom(tile) - 2 };
        this.active = true;
      }
    }
  }
}

/** Portals: doors and stairs between the surface and the levels. */
export class Portal extends Mech {
  constructor(ctx: MechContext, lvl: LevelRuntime, spec: PortalSpec, tiles: WorldTile[]) {
    super(ctx, lvl, spec, tiles);
  }

  get portal(): PortalSpec {
    return this.spec as PortalSpec;
  }

  get unlocked(): boolean {
    const p = this.portal;
    if (p.requiresFlag && !this.ctx.flag(p.requiresFlag)) return false;
    if (p.requiresItem && !this.ctx.hasItem(p.requiresItem)) return false;
    return true;
  }

  promptText(): string | null {
    if (this.portal.trigger !== "interact") return null;
    return `${this.portal.label ?? "Way through"}\n[E] ${this.unlocked ? "enter" : "examine"}`;
  }

  /** Set by the system: what to do when this portal fires. */
  onUse: (portal: Portal) => void = () => {};

  interact(): void {
    if (this.portal.trigger === "interact") this.onUse(this);
  }

  /** Step portals: the player walked into it the right way. */
  stepped(): boolean {
    if (this.portal.trigger === "interact") return false;
    const p = this.ctx.playerPos();
    if (this.portal.facing && (p.direction !== this.portal.facing || !p.moving)) return false;
    return this.tiles.some((t) => this.playerOn(t));
  }
}

// --- the boulder ---------------------------------------------------------------

type ChaseState = "idle" | "waiting" | "rolling" | "done";

export class Escape extends Mech {
  private state: ChaseState = "idle";
  private readonly goals: WorldTile[];
  private boulder: Phaser.GameObjects.Image | null = null;
  private shadow: Phaser.GameObjects.Image | null = null;
  private timer = 0;
  private segment = 0;
  private bx = 0;
  private by = 0;
  private grace = 0;
  private rumbleTimer = 0;
  private dustTimer = 0;

  constructor(ctx: MechContext, lvl: LevelRuntime, spec: EscapeSpec, tiles: WorldTile[], goals: WorldTile[]) {
    super(ctx, lvl, spec, tiles);
    this.goals = goals;
    this.active = ctx.flag(Puzzle.flagFor(spec.puzzle));
    if (this.active) this.state = "done";
  }

  private get escape(): EscapeSpec {
    return this.spec as EscapeSpec;
  }

  private point(i: number): { x: number; y: number } {
    const [x, y] = this.escape.path[i] ?? this.escape.path[0]!;
    return { x: (this.lvl.ox + x) * TILE, y: (this.lvl.oy + y) * TILE };
  }

  update(dt: number): void {
    if (this.state === "done") return;
    const armed = this.ctx.holds(this.lvl, this.escape.armed);
    if (!armed) return;

    // The vault is coming down whether or not the boulder has started.
    this.rumbleTimer -= dt;
    if (this.rumbleTimer <= 0) {
      this.rumbleTimer = this.state === "rolling" ? 1.1 : 2.6;
      this.ctx.shake(this.state === "rolling" ? 0.006 : 0.0025, 500);
      this.ctx.sfx("rumble");
    }
    this.dustTimer -= dt;
    if (this.dustTimer <= 0) {
      this.dustTimer = 0.35;
      const p = this.ctx.playerPos();
      this.ctx.dust(p.x + (Math.random() - 0.5) * 260, p.y - 120 - Math.random() * 60, 3, 0xb8b0a0);
    }

    this.grace = Math.max(0, this.grace - dt);
    const onStart = this.tiles.some((t) => this.playerOn(t));

    if (this.state === "idle" && onStart && this.grace <= 0) {
      this.state = "waiting";
      this.timer = this.escape.delay ?? 1.2;
      const t = this.tiles[0]!;
      this.lvl.respawn = { x: tileCx(t), y: tileBottom(t) - 2 };
      this.ctx.toast("Behind you, something enormous comes loose.");
      this.ctx.sfx("collapse");
      this.ctx.emit("trap_triggered", "boulder");
    }

    if (this.state === "waiting") {
      this.timer -= dt;
      if (this.timer <= 0) this.release();
      return;
    }

    if (this.state === "rolling") this.roll(dt);
  }

  private release(): void {
    this.state = "rolling";
    this.segment = 0;
    const start = this.point(0);
    this.bx = start.x;
    this.by = start.y;
    this.shadow = this.ctx.scene.add.image(this.bx, this.by + 30, "fx_shadow").setScale(2.6, 2).setAlpha(0.6).setDepth(DEPTH.shadow);
    this.boulder = this.ctx.scene.add.image(this.bx, this.by, "dg_boulder").setDepth(this.by + 40);
    this.images.push(this.boulder, this.shadow);
    this.ctx.shake(0.01, 400);
    this.ctx.dust(this.bx, this.by, 14, 0xa89a80);
  }

  private roll(dt: number): void {
    const boulder = this.boulder;
    if (!boulder) return;
    const speed = this.escape.speed ?? 230;
    let step = speed * dt;
    while (step > 0 && this.segment < this.escape.path.length - 1) {
      const target = this.point(this.segment + 1);
      const dx = target.x - this.bx;
      const dy = target.y - this.by;
      const dist = Math.hypot(dx, dy);
      if (dist <= step) {
        this.bx = target.x;
        this.by = target.y;
        step -= dist;
        this.segment++;
      } else {
        this.bx += (dx / dist) * step;
        this.by += (dy / dist) * step;
        step = 0;
      }
    }
    boulder.setPosition(this.bx, this.by).setDepth(this.by + 40);
    boulder.rotation += (speed * dt) / 34;
    this.shadow?.setPosition(this.bx, this.by + 30);

    const p = this.ctx.playerPos();
    if (this.goals.some((g) => this.playerOn(g))) {
      this.finish();
      return;
    }
    if (Math.hypot(this.bx - p.x, this.by - (p.y - 12)) < 40) {
      this.crush();
      return;
    }
    if (this.segment >= this.escape.path.length - 1) {
      // Reached the end without you: it slams into the far wall.
      this.ctx.shake(0.012, 500);
      this.ctx.sfx("collapse");
      this.reset();
    }
  }

  private crush(): void {
    this.ctx.sfx("collapse");
    this.ctx.flash(120, 20, 10, 300);
    this.ctx.hurt(28, "boulder");
    this.reset();
    this.ctx.respawnPlayer(this.lvl);
    this.ctx.toast("The boulder flattens you against the stone. You come to at the corridor's mouth, aching.");
  }

  /** The player fell or left mid-chase. */
  reset(): void {
    this.boulder?.destroy();
    this.shadow?.destroy();
    this.boulder = null;
    this.shadow = null;
    if (this.state !== "done") this.state = "idle";
    this.grace = 0.8;
  }

  sleep(): void {
    this.reset();
  }

  get running(): boolean {
    return this.state === "waiting" || this.state === "rolling";
  }

  private finish(): void {
    this.state = "done";
    this.active = true;
    const spec = this.escape;
    this.ctx.setFlag(Puzzle.flagFor(spec.puzzle));
    this.ctx.emit("puzzle_solved", spec.puzzle);
    this.ctx.sfx("quest_complete");
    this.ctx.toast("You throw yourself clear as the boulder thunders past and bursts against the wall.");
    const boulder = this.boulder;
    if (boulder) {
      const end = this.point(this.escape.path.length - 1);
      this.ctx.scene.tweens.add({
        targets: boulder,
        x: end.x,
        y: end.y,
        rotation: boulder.rotation + 4,
        duration: 600,
        onComplete: () => {
          this.ctx.shake(0.014, 600);
          this.ctx.dust(end.x, end.y, 18, 0xa89a80);
          boulder.destroy();
          this.shadow?.destroy();
        },
      });
    }
  }
}
