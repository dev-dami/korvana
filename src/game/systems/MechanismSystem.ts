import type Phaser from "phaser";

import type { SfxName } from "../audio/zones";
import { DEPTH, TILE } from "../config";
import { ITEMS } from "../data/items";
import { landmarkById } from "../data/landmarks";
import { LEVELS, levelAtPixel, levelOrigin } from "../data/levels";
import type { ProcessedLevel } from "../data/levels";
import { glyphPositions } from "../data/levels/build";
import type { Cond, MechSpec, PortalTarget } from "../data/levels/types";
import { SPELLS } from "../data/spells";
import { spotById } from "../data/spots";
import { ACTOR_BODY_OFFSET } from "../entities/Actor";
import {
  Bell,
  Block,
  Brazier,
  Checkpoint,
  Chest,
  Collapse,
  DartTrap,
  dirDelta,
  Escape,
  Flood,
  Gate,
  Lever,
  Loot,
  Mech,
  Pedestal,
  Pit,
  Plate,
  Portal,
  Puzzle,
  ResetRune,
  Rune,
  Secret,
  Sequence,
  Sign,
  Spikes,
  tileBottom,
  tileCx,
} from "../entities/mechanisms";
import type { HitKind, LevelRuntime, MechContext, WorldTile } from "../entities/mechanisms";
import { calloutText } from "../gfx/FloatingText";
import { bodyText } from "../gfx/fonts";
import type { LightSource } from "../gfx/lights";
import { TEXT_RES } from "../display";
import type { WorldScene } from "../scenes/WorldScene";
import type { Direction } from "../types";
import { AudioSystem } from "./AudioSystem";
import type { GameEventKind } from "./GameEvents";

/** Callbacks into WorldScene for the few things only the scene may do. */
export interface MechanismHost {
  hurt(amount: number): void;
  toast(message: string): void;
  /** True while the NPC prompt owns the E key. */
  npcTargeted(): boolean;
}

const PROMPT_RANGE = 52;
const TRAP_IFRAMES = 0.8;
const FALL_SECONDS = 0.5;
const FALL_DAMAGE = 12;
const FIRE_SPELLS = new Set(["fire_bolt", "ember_nova"]);

/** Update order: inputs, then the logic that reads them, then what the logic drives. */
const KIND_ORDER: Record<MechSpec["kind"], number> = {
  plate: 0,
  lever: 0,
  brazier: 0,
  bell: 0,
  rune: 0,
  block: 0,
  pedestal: 0,
  secret: 0,
  checkpoint: 0,
  reset: 1,
  sequence: 2,
  puzzle: 3,
  gate: 4,
  flood: 4,
  spikes: 5,
  darts: 5,
  collapse: 5,
  pit: 5,
  loot: 6,
  chest: 6,
  sign: 6,
  portal: 7,
  escape: 7,
};

interface PendingHit {
  at: number;
  mech: Mech;
  kind: HitKind;
  tile: WorldTile;
}

/**
 * Runs the authored levels' mechanisms: everything in data/levels that moves,
 * glows, bites or opens.
 *
 * Solidity changes go through ChunkManager.overrides, so a gate that drops is
 * as solid to bolts and enemies as it is to the player. Anything that must
 * survive a save is stored as a GameState flag:
 *
 *   mech_<level>_<id>    a lever's position, a gate latched open, a brazier
 *                        lit for good, a chest opened, a relic taken, a secret
 *                        found, a page picked up, a sequence completed
 *   puzzle_<puzzle id>   a puzzle solved (also announced as `puzzle_solved`)
 *
 * Only the level the player is standing in is updated; the others sleep.
 */
export class MechanismSystem implements MechContext {
  readonly scene: WorldScene;
  clock = 0;

  private readonly host: MechanismHost;
  private readonly runtimes: LevelRuntime[] = [];
  private readonly byTile = new Map<string, Mech[]>();
  private readonly ordered = new Map<LevelRuntime, Mech[]>();
  private current: LevelRuntime | null = null;
  private readonly label: Phaser.GameObjects.Text;
  private focus: { mech: Mech; tile: WorldTile } | null = null;

  private lastX = 0;
  private lastY = 0;
  private trapCooldown = 0;
  private trapReported = new Map<string, number>();
  private falling = 0;
  private fallAt = { x: 0, y: 0 };
  private busy = false;
  /** Portals stay quiet until you step off the one you arrived on. */
  private portalArmed = true;
  /**
   * ...and until you have stopped walking once since arriving, so holding the
   * key that carried you through a door does not carry you straight back.
   */
  private needStop = false;
  private lockedNotified: Portal | null = null;
  private pending: PendingHit[] = [];
  private audioCtx: AudioContext | null = null;

  constructor(scene: WorldScene, host: MechanismHost) {
    this.scene = scene;
    this.host = host;

    this.label = scene.add
      .text(0, 0, "", bodyText({ size: 14, color: "#f8f1e2", align: "center", background: "#0d0e14f2", padding: 7 }))
      .setOrigin(0.5, 1)
      .setResolution(TEXT_RES)
      .setDepth(DEPTH.ui)
      .setVisible(false);
    this.label.setStroke("#000000", 3);

    for (const level of LEVELS) this.buildLevel(level);
    for (const lvl of this.runtimes) {
      for (const mech of lvl.mechs.values()) if (mech instanceof Sequence) mech.settle();
      for (const mech of lvl.mechs.values()) mech.setVisible(false);
    }
    this.lastX = scene.player.x;
    this.lastY = scene.player.y;
  }

  // --- construction ------------------------------------------------------

  private buildLevel(level: ProcessedLevel): void {
    const origin = levelOrigin(level);
    if (!origin) return;
    const stone =
      level.def.tileset === "barrow"
        ? "barrow"
        : level.def.tileset === "reliquary"
          ? "reliquary"
          : level.def.tileset === "academy"
            ? "hall"
            : "crypt";
    const lvl: LevelRuntime = {
      level,
      ox: origin.tx,
      oy: origin.ty,
      mechs: new Map(),
      respawn: null,
      flagPrefix: `mech_${level.def.id}_`,
      stone,
    };
    this.runtimes.push(lvl);

    const specs = Object.entries(level.def.mech ?? {});
    for (const [glyph, spec] of specs) {
      const tiles: WorldTile[] =
        glyph.length === 1
          ? glyphPositions(level, glyph).map(([lx, ly]) => ({ tx: lvl.ox + lx, ty: lvl.oy + ly, lx, ly }))
          : [];
      const mech = this.create(lvl, spec, tiles);
      if (!mech) continue;
      lvl.mechs.set(spec.id, mech);
      for (const t of tiles) {
        const key = `${t.tx},${t.ty}`;
        const list = this.byTile.get(key) ?? [];
        list.push(mech);
        this.byTile.set(key, list);
      }
    }

    // Wiring that needs the whole level built.
    const blocks = [...lvl.mechs.values()].filter((m): m is Block => m instanceof Block);
    for (const mech of lvl.mechs.values()) {
      if (mech instanceof Plate) {
        mech.weighted = (tile) =>
          blocks.some((b) => b.stones.some((s) => !s.moving && s.tx === tile.tx && s.ty === tile.ty));
      }
      if (mech instanceof DartTrap) mech.solidAt = (x, y) => this.scene.world.isSolidPixel(x, y);
      if (mech instanceof Portal) mech.onUse = (portal) => this.usePortal(portal);
    }
    this.ordered.set(
      lvl,
      [...lvl.mechs.values()].sort((a, b) => KIND_ORDER[a.spec.kind] - KIND_ORDER[b.spec.kind]),
    );
  }

  private create(lvl: LevelRuntime, spec: MechSpec, tiles: WorldTile[]): Mech | null {
    switch (spec.kind) {
      case "plate":
        return new Plate(this, lvl, spec, tiles);
      case "lever":
        return new Lever(this, lvl, spec, tiles);
      case "gate":
        return new Gate(this, lvl, spec, tiles);
      case "spikes":
        return new Spikes(this, lvl, spec, tiles);
      case "darts":
        return new DartTrap(this, lvl, spec, tiles);
      case "collapse":
        return new Collapse(this, lvl, spec, tiles);
      case "pit":
        return new Pit(this, lvl, spec, tiles);
      case "block":
        return new Block(this, lvl, spec, tiles);
      case "reset":
        return new ResetRune(this, lvl, spec, tiles);
      case "brazier":
        return new Brazier(this, lvl, spec, tiles);
      case "secret":
        return new Secret(this, lvl, spec, tiles);
      case "loot":
        return new Loot(this, lvl, spec, tiles);
      case "chest":
        return new Chest(this, lvl, spec, tiles);
      case "pedestal":
        return new Pedestal(this, lvl, spec, tiles);
      case "bell":
        return new Bell(this, lvl, spec, tiles);
      case "rune":
        return new Rune(this, lvl, spec, tiles);
      case "sequence":
        return new Sequence(this, lvl, spec);
      case "puzzle":
        return new Puzzle(this, lvl, spec);
      case "flood":
        return new Flood(this, lvl, spec, tiles);
      case "checkpoint":
        return new Checkpoint(this, lvl, spec, tiles);
      case "sign":
        return new Sign(this, lvl, spec, tiles);
      case "portal":
        return new Portal(this, lvl, spec, tiles);
      case "escape": {
        const goals = glyphPositions(lvl.level, spec.goal).map(([lx, ly]) => ({ tx: lvl.ox + lx, ty: lvl.oy + ly, lx, ly }));
        return new Escape(this, lvl, spec, tiles, goals);
      }
    }
  }

  // --- per frame ---------------------------------------------------------

  /**
   * @param inputEnabled false while a dialogue, panel or cutscene owns input.
   */
  update(dt: number, inputEnabled: boolean): void {
    this.clock += dt;
    this.trapCooldown = Math.max(0, this.trapCooldown - dt);
    const player = this.scene.player;

    const here = this.runtimeAt(player.x, player.y);
    if (here !== this.current) this.enter(here);

    if (this.falling > 0) {
      this.updateFall(dt);
      this.hidePrompt();
      return;
    }

    const lvl = this.current;
    const stuck = Math.hypot(player.x - this.lastX, player.y - this.lastY) < 0.5;

    if (lvl) {
      for (const mech of this.ordered.get(lvl) ?? []) {
        if (mech instanceof Block) mech.updatePush(dt, inputEnabled, stuck);
        mech.update(dt);
      }
      for (const mech of lvl.mechs.values()) mech.pulse = false;

      this.resolvePending();
      if (!this.busy) this.checkPortals(lvl, inputEnabled);
      if (!this.busy) this.checkHazards(lvl);
    }

    this.lastX = player.x;
    this.lastY = player.y;
    this.updatePrompt(inputEnabled);
  }

  private runtimeAt(x: number, y: number): LevelRuntime | null {
    const level = levelAtPixel(x, y);
    return level ? (this.runtimes.find((r) => r.level === level) ?? null) : null;
  }

  private enter(next: LevelRuntime | null): void {
    if (this.current) {
      for (const mech of this.current.mechs.values()) {
        mech.sleep();
        mech.setVisible(false);
      }
    }
    this.current = next;
    this.pending = [];
    if (!next) return;
    for (const mech of next.mechs.values()) mech.setVisible(true);
    next.respawn ??= { x: this.scene.player.x, y: this.scene.player.y };
  }

  // --- conditions ----------------------------------------------------------

  holds(lvl: LevelRuntime, cond: Cond | undefined, fallback = true): boolean {
    if (cond === undefined) return fallback;
    if (typeof cond === "string") return lvl.mechs.get(cond)?.active ?? false;
    if ("all" in cond) return cond.all.every((c) => this.holds(lvl, c));
    if ("any" in cond) return cond.any.some((c) => this.holds(lvl, c));
    if ("not" in cond) return !this.holds(lvl, cond.not);
    if ("flag" in cond) return this.flag(cond.flag);
    return this.hasItem(cond.item);
  }

  // --- MechContext -----------------------------------------------------------

  setSolid(tx: number, ty: number, solid: boolean | null): void {
    const overrides = this.scene.world.chunks.overrides;
    const key = this.overrideKey(tx, ty);
    if (solid === null) overrides.delete(key);
    else overrides.set(key, solid);
  }

  private overrideKey(tx: number, ty: number): number {
    return (tx + 0x8000) * 0x10000 + (ty + 0x8000);
  }

  playerTile(): { tx: number; ty: number } {
    const p = this.scene.player;
    return { tx: Math.floor(p.x / TILE), ty: Math.floor((p.y - 6) / TILE) };
  }

  playerPos(): { x: number; y: number; direction: Direction; moving: boolean } {
    const p = this.scene.player;
    return { x: p.x, y: p.y, direction: p.direction, moving: p.moving };
  }

  occupied(tx: number, ty: number): boolean {
    const x0 = tx * TILE;
    const y0 = ty * TILE;
    const actors = [this.scene.player, ...this.scene.npcs, ...this.scene.enemies];
    return actors.some(
      (a) => a.alive && a.x + 11 > x0 && a.x - 11 < x0 + TILE && a.y > y0 && a.y - 14 < y0 + TILE,
    );
  }

  freeForBlock(tx: number, ty: number): boolean {
    if (this.scene.world.chunks.tileSolid(tx, ty)) return false;
    if (this.occupied(tx, ty)) return false;
    for (const mech of this.byTile.get(`${tx},${ty}`) ?? []) {
      const kind = mech.spec.kind;
      if (kind !== "plate" && kind !== "spikes" && kind !== "checkpoint") return false;
    }
    return true;
  }

  hurt(amount: number, trap: string): void {
    if (this.trapCooldown > 0) return;
    this.trapCooldown = TRAP_IFRAMES;
    // Traps punish, they do not kill: a tomb should send you back a room, not
    // back to the Academy courtyard.
    const health = this.scene.state.player.health;
    const dealt = Math.max(0, Math.min(amount, health - 1));
    if (dealt > 0) this.host.hurt(dealt);
    const last = this.trapReported.get(trap) ?? -99;
    if (this.clock - last > 2) {
      this.trapReported.set(trap, this.clock);
      this.emit("trap_triggered", trap);
    }
  }

  fall(): void {
    if (this.falling > 0) return;
    const p = this.scene.player;
    this.falling = FALL_SECONDS;
    this.fallAt = { x: p.x, y: p.y };
    this.sfx("collapse");
    this.scene.tweens.add({ targets: p.sprite, scaleX: 0.15, scaleY: 0.15, alpha: 0, duration: FALL_SECONDS * 1000, ease: "Quad.easeIn" });
    this.scene.tweens.add({ targets: p.shadow, alpha: 0, duration: 200 });
    for (const mech of this.current?.mechs.values() ?? []) if (mech instanceof Escape) mech.reset();
  }

  private updateFall(dt: number): void {
    const p = this.scene.player;
    p.setPosition(this.fallAt.x, this.fallAt.y);
    this.falling -= dt;
    if (this.falling > 0) return;
    this.falling = 0;
    p.sprite.setScale(1).setAlpha(1);
    p.shadow.setAlpha(0.55);
    if (this.current) this.respawnPlayer(this.current);
    this.trapCooldown = 0;
    this.hurt(FALL_DAMAGE, "pit");
    this.toast("You fall, hard, and climb back out bruised.");
  }

  respawnPlayer(lvl: LevelRuntime): void {
    const at = lvl.respawn ?? { x: this.scene.player.x, y: this.scene.player.y };
    this.scene.player.setPosition(at.x, at.y);
    this.scene.world.update(at.x, at.y);
    this.lastX = at.x;
    this.lastY = at.y;
    this.scene.cameras.main.flash(260, 30, 20, 30);
  }

  toast(message: string): void {
    this.host.toast(message);
  }

  callout(x: number, y: number, message: string, color = "#e8eef7"): void {
    calloutText(this.scene, x, y, message, color);
  }

  sfx(name: SfxName): void {
    AudioSystem.shared().playSfx(name);
  }

  /**
   * A struck bell. Synthesised here rather than in AudioSystem because the
   * pitch is part of the puzzle: inharmonic partials over a long decay.
   */
  tone(freq: number): void {
    try {
      this.audioCtx ??= new AudioContext();
      const ctx = this.audioCtx;
      if (ctx.state === "suspended") void ctx.resume();
      const now = ctx.currentTime;
      const out = ctx.createGain();
      out.gain.setValueAtTime(0.0001, now);
      out.gain.exponentialRampToValueAtTime(0.22, now + 0.01);
      out.gain.exponentialRampToValueAtTime(0.0001, now + 3.2);
      out.connect(ctx.destination);
      for (const [ratio, level] of [
        [1, 1],
        [2.76, 0.45],
        [5.4, 0.22],
        [0.5, 0.3],
      ] as const) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq * ratio;
        gain.gain.value = level;
        osc.connect(gain).connect(out);
        osc.start(now);
        osc.stop(now + 3.3);
      }
    } catch {
      // No audio device: the bell simply rings silently.
    }
  }

  emit(kind: GameEventKind, id: string): void {
    this.scene.gameEvents.emit({ kind, id });
  }

  flag(id: string): boolean {
    return this.scene.state.flag(id);
  }

  setFlag(id: string, value = true): void {
    this.scene.state.setFlag(id, value);
  }

  hasItem(id: string): boolean {
    return this.scene.inventory.count(id) > 0;
  }

  giveItem(id: string, qty = 1): boolean {
    const def = ITEMS[id];
    if (!this.scene.inventory.add(id, qty)) return false;
    AudioSystem.shared().playPickup();
    this.emit("item_gained", id);
    if (id === "keeper_page") {
      this.toast(`${def?.name ?? id} (${this.scene.inventory.count(id)} of 9)`);
    } else if (def && def.kind !== "relic" && !(def.kind === "key" && !def.stackable)) {
      this.toast(qty > 1 ? `${def.name} x${qty}` : def.name);
    }
    return true;
  }

  takeItem(id: string): void {
    this.scene.inventory.remove(id, 1);
  }

  addGold(amount: number): void {
    this.scene.state.player.gold += amount;
    this.scene.gameEvents.emit({ kind: "gold_gained", amount });
  }

  addLight(source: LightSource): LightSource {
    return this.scene.lightRegistry.add(source);
  }

  removeLight(source: LightSource | null): void {
    this.scene.lightRegistry.remove(source);
  }

  shake(intensity: number, duration: number): void {
    this.scene.cameras.main.shake(duration, intensity);
  }

  flash(r: number, g: number, b: number, duration: number): void {
    this.scene.cameras.main.flash(duration, r, g, b);
  }

  dust(x: number, y: number, count: number, color = 0xb8b0a0): void {
    for (let i = 0; i < count; i++) {
      const mote = this.scene.add
        .image(x + (Math.random() - 0.5) * 18, y + (Math.random() - 0.5) * 10, "dg_dust")
        .setTint(color)
        .setAlpha(0.8)
        .setScale(0.5 + Math.random() * 0.8)
        .setDepth(y + 60);
      this.scene.tweens.add({
        targets: mote,
        x: mote.x + (Math.random() - 0.5) * 40,
        y: mote.y + 10 + Math.random() * 26,
        alpha: 0,
        duration: 500 + Math.random() * 500,
        onComplete: () => mote.destroy(),
      });
    }
  }

  knowsFire(): boolean {
    return [...FIRE_SPELLS].some((id) => this.scene.state.knowsSpell(id));
  }

  // --- portals & hazards ---------------------------------------------------

  private checkPortals(lvl: LevelRuntime, inputEnabled: boolean): void {
    const portals = [...lvl.mechs.values()].filter((m): m is Portal => m instanceof Portal);
    const pt = this.playerTile();
    const onAny = portals.some((p) => p.tiles.some((t) => t.tx === pt.tx && t.ty === pt.ty));
    if (this.needStop && !this.scene.player.moving) this.needStop = false;
    if (!onAny && !this.needStop) {
      this.portalArmed = true;
      this.lockedNotified = null;
      return;
    }
    if (!this.portalArmed || !inputEnabled) return;
    for (const portal of portals) {
      if (!portal.stepped()) continue;
      if (!portal.unlocked) {
        if (this.lockedNotified !== portal) {
          this.lockedNotified = portal;
          this.toast(portal.portal.locked ?? "It will not open.");
          AudioSystem.shared().playUi("error");
        }
        return;
      }
      this.usePortal(portal);
      return;
    }
  }

  private usePortal(portal: Portal): void {
    if (this.busy) return;
    const spec = portal.portal;
    if (!portal.unlocked) {
      this.toast(spec.locked ?? "It will not open.");
      AudioSystem.shared().playUi("error");
      return;
    }
    const target = this.resolveTarget(spec.to);
    if (!target) return;
    if (spec.setsFlag && !this.flag(spec.setsFlag)) this.setFlag(spec.setsFlag);

    this.busy = true;
    this.hidePrompt();
    this.sfx(spec.trigger === "interact" ? "portal" : "door");
    const camera = this.scene.cameras.main;
    camera.fadeOut(260, 6, 6, 10);
    camera.once("camerafadeoutcomplete", () => {
      const player = this.scene.player;
      player.setPosition(target.x, target.y);
      if (target.facing) {
        player.direction = target.facing;
        player.holdStill();
      }
      this.scene.world.update(target.x, target.y);
      this.lastX = target.x;
      this.lastY = target.y;
      const arrived = this.runtimeAt(target.x, target.y);
      if (arrived) arrived.respawn = { x: target.x, y: target.y };
      this.enter(arrived);
      this.portalArmed = false;
      this.needStop = true;
      this.busy = false;
      camera.fadeIn(380, 6, 6, 10);
    });
  }

  private resolveTarget(to: PortalTarget): { x: number; y: number; facing?: Direction } | null {
    let tx: number;
    let ty: number;
    if ("spot" in to) {
      const spot = spotById(to.spot);
      const host = spot ? landmarkById(spot.landmark) : undefined;
      if (!spot || !host) return null;
      tx = host.tx + spot.dx;
      ty = host.ty + spot.dy;
    } else {
      const host = landmarkById(to.landmark);
      if (!host) return null;
      tx = host.tx + to.dx;
      ty = host.ty + to.dy;
    }
    return { x: tx * TILE + TILE / 2, y: (ty + 1) * TILE - 2, facing: to.facing };
  }

  private checkHazards(lvl: LevelRuntime): void {
    const pt = this.playerTile();
    for (const mech of this.byTile.get(`${pt.tx},${pt.ty}`) ?? []) {
      if (mech.lvl !== lvl) continue;
      if ((mech instanceof Pit || mech instanceof Collapse) && mech.isOpenAt(pt.tx, pt.ty)) {
        this.fall();
        return;
      }
    }
  }

  // --- interaction -----------------------------------------------------------

  private updatePrompt(inputEnabled: boolean): void {
    this.focus = null;
    const lvl = this.current;
    if (!lvl || !inputEnabled || this.busy || this.host.npcTargeted()) {
      this.hidePrompt();
      return;
    }
    const p = this.scene.player;
    const px = p.x;
    const py = p.y - 10;
    let best: { mech: Mech; tile: WorldTile; text: string; d: number } | null = null;
    for (const mech of lvl.mechs.values()) {
      for (const tile of mech.interactTiles()) {
        const d = Math.hypot(tileCx(tile) - px, tile.ty * TILE + TILE / 2 - py);
        if (d > PROMPT_RANGE || (best && d >= best.d)) continue;
        const text = mech.promptText();
        if (!text) continue;
        best = { mech, tile, text, d };
      }
    }
    if (!best) {
      this.hidePrompt();
      return;
    }
    this.focus = { mech: best.mech, tile: best.tile };
    this.label
      .setText(best.text)
      .setPosition(Math.round(tileCx(best.tile)), Math.round(best.tile.ty * TILE - 14))
      .setVisible(true);
  }

  hidePrompt(): void {
    this.label.setVisible(false);
  }

  /** E pressed with no one to talk to. Returns true if a mechanism took it. */
  interact(): boolean {
    if (!this.focus || this.busy || this.falling > 0) return false;
    const { mech, tile } = this.focus;
    mech.interact(tile);
    if (mech instanceof Block && mech.pullRequest) this.pull(mech);
    return true;
  }

  private pull(block: Block): void {
    const request = block.pullRequest;
    block.pullRequest = null;
    if (!request) return;
    const p = this.scene.player;
    const before = { x: p.x, y: p.y };
    p.setPosition(p.x + request.step.x, p.y + request.step.y);
    if (!block.slide(request.stone, request.to.tx, request.to.ty)) p.setPosition(before.x, before.y);
  }

  /** A spell left the player's hands: work out what, if anything, it will strike. */
  onSpellCast(spellId: string): void {
    const spell = SPELLS[spellId];
    const lvl = this.current;
    if (!spell || !lvl) return;
    const kind: HitKind = FIRE_SPELLS.has(spellId) ? "fire" : "spell";
    const p = this.scene.player;

    if (spell.kind === "nova") {
      for (const mech of lvl.mechs.values()) {
        if (!mech.hittable) continue;
        for (const tile of mech.tiles) {
          if (Math.hypot(tileCx(tile) - p.x, tileBottom(tile) - 16 - p.y) <= spell.range + 24) mech.hit(kind, tile);
        }
      }
      return;
    }
    if (spell.kind !== "projectile") return;

    // Trace the bolt's line the way Projectile flies it, to the first solid tile.
    const [dx, dy] = dirDelta(p.direction);
    let x = p.x + dx * 14;
    let y = p.y - ACTOR_BODY_OFFSET - 6 + dy * 14;
    const speed = spell.speed ?? 520;
    for (let travelled = 0; travelled < spell.range; travelled += 6) {
      x += dx * 6;
      y += dy * 6;
      const tx = Math.floor(x / TILE);
      const ty = Math.floor(y / TILE);
      if (!this.scene.world.chunks.tileSolid(tx, ty)) continue;
      for (const mech of this.byTile.get(`${tx},${ty}`) ?? []) {
        if (mech.lvl !== lvl || !mech.hittable) continue;
        const tile = mech.tiles.find((t) => t.tx === tx && t.ty === ty);
        if (tile) this.pending.push({ at: this.clock + travelled / speed, mech, kind, tile });
      }
      return;
    }
  }

  /** A blade swing: cracked walls break and bells ring if you are right against them. */
  onMelee(): void {
    const lvl = this.current;
    if (!lvl) return;
    const p = this.scene.player;
    const [dx, dy] = dirDelta(p.direction);
    for (const reach of [20, 34]) {
      const tx = Math.floor((p.x + dx * reach) / TILE);
      const ty = Math.floor((p.y - 8 + dy * reach) / TILE);
      for (const mech of this.byTile.get(`${tx},${ty}`) ?? []) {
        if (mech.lvl !== lvl || !mech.hittable || mech instanceof Brazier) continue;
        const tile = mech.tiles.find((t) => t.tx === tx && t.ty === ty);
        if (tile && mech.hit("melee", tile)) return;
      }
    }
  }

  private resolvePending(): void {
    if (this.pending.length === 0) return;
    const due = this.pending.filter((h) => h.at <= this.clock);
    if (due.length === 0) return;
    this.pending = this.pending.filter((h) => h.at > this.clock);
    for (const h of due) h.mech.hit(h.kind, h.tile);
  }

  /** Where the player would wake after a fall in the current level - for tests and the debug HUD. */
  get currentLevelId(): string | null {
    return this.current?.level.def.id ?? null;
  }

  /** Looks a mechanism up by level and id (debugging and tests). */
  mechanism(levelId: string, id: string): Mech | undefined {
    return this.runtimes.find((r) => r.level.def.id === levelId)?.mechs.get(id);
  }

  destroy(): void {
    for (const lvl of this.runtimes) for (const mech of lvl.mechs.values()) mech.destroy();
    this.runtimes.length = 0;
    this.byTile.clear();
    this.scene.world.chunks.overrides.clear();
    this.label.destroy();
    void this.audioCtx?.close();
    this.audioCtx = null;
  }
}
