import Phaser from "phaser";

import { DUEL_ENDED, encounterById } from "../data/encounters";
import type { DuelArena, DuelLaunch, DuelResult, DuelStyle, EncounterDef } from "../data/encounters";
import { ITEMS } from "../data/items";
import { landmarkById } from "../data/landmarks";
import { loreById } from "../data/lore";
import { SPELLS } from "../data/spells";
import { weaponById } from "../data/weapons";
import { TILE } from "../config";
import { DPR, viewHeight, viewWidth } from "../display";
import { heroLook, LOOKS } from "../gfx/looks";
import { DuelAI } from "../duel/DuelAI";
import { DuelArenaView } from "../duel/DuelArena";
import { DuelCamera, makeProjection } from "../duel/DuelCamera";
import { DuelHud } from "../duel/DuelHud";
import { DuelSim, Fighter } from "../duel/DuelSim";
import type { AttackSpec, Bolt, CastSpec, DuelEvents } from "../duel/DuelSim";
import { FighterView } from "../duel/FighterView";
import type { WeaponKind } from "../duel/FighterView";
import type { WorldScene } from "./WorldScene";

/**
 * A real-time duel, face to face, launched as an overlay from the world.
 *
 * The rules live in duel/DuelSim, the opponent's mind in duel/DuelAI, and the
 * look in duel/DuelArena + duel/FighterView. This scene is the stage manager:
 * it turns keys into the player's Intent, routes the sim's events into sound,
 * sparks and words, frames the camera, and settles the outcome with the world
 * exactly as the old turn-based duel did - rewards, story events, music holds.
 *
 * The arena is drawn on the main camera through a Blocky filter, so the
 * projected floor and scaled sprites resolve into one consistent chunky pixel
 * grid. The HUD has a camera of its own and stays crisp.
 */

type Phase = "intro" | "fight" | "outro";

const PIXEL = 3;
const INTRO_SECONDS = 2.1;

interface BoltView {
  glow: Phaser.GameObjects.Image;
  core: Phaser.GameObjects.Image;
  last: number;
}

export class BattleScene extends Phaser.Scene {
  private world!: WorldScene;
  private encounter!: EncounterDef;
  private challenger: string | undefined;

  private sim!: DuelSim;
  private ai!: DuelAI;
  private cam!: DuelCamera;
  private arena!: DuelArenaView;
  private hud!: DuelHud;
  private pView!: FighterView;
  private eView!: FighterView;
  private hudCam!: Phaser.Cameras.Scene2D.Camera;
  private fx!: Phaser.GameObjects.Graphics;
  private readonly boltViews = new Map<Bolt, BoltView>();
  private readonly proj = makeProjection();

  private phase: Phase = "intro";
  private phaseT = 0;
  private routing: "world" | "hud" = "world";
  private keys!: Record<string, Phaser.Input.Keyboard.Key>;
  private readonly pressed = new Set<string>();
  private spellCooldowns = new Map<string, number>();
  private yieldArmed = 0;
  private finished = false;
  private slowmo = 0;

  constructor() {
    super("battle");
  }

  init(data: Partial<DuelLaunch>): void {
    this.challenger = data.challenger;
    this.encounter = encounterById(data.encounter ?? "sparring") ?? encounterById("sparring")!;
  }

  create(): void {
    this.world = this.scene.get("world") as WorldScene;
    const W = viewWidth(this);
    const H = viewHeight(this);

    // A relaunched scene reuses this instance, so reset everything create() fills.
    this.phase = "intro";
    this.phaseT = 0;
    this.finished = false;
    this.slowmo = 0;
    this.yieldArmed = 0;
    this.pressed.clear();
    this.boltViews.clear();
    this.spellCooldowns = new Map();

    this.setupCameras(W, H);

    // Music: the duel theme while this scene lives.
    this.world.audio.holdZone(this.encounter.boss ? "boss" : "battle", "duel");
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.world.audio.holdZone(null, "duel");
      this.hud?.destroy();
      this.events.off(Phaser.Scenes.Events.ADDED_TO_SCENE, this.route, this);
    });

    const enc = this.encounter;
    const state = this.world.state;
    const style: DuelStyle = enc.style ?? defaultStyle(enc.look);
    const skill = enc.skill ?? 0.5;
    const arenaId = enc.arena ?? this.arenaFromWorld();

    this.cam = new DuelCamera();
    this.cam.resize(W, H);
    this.arena = new DuelArenaView(this, arenaId, W, H, this.cam.horizonY);
    const ambient = this.arena.theme.ambient;

    // --- the duellists -----------------------------------------------------------
    const weapon = weaponById(state.player.weapon);
    const reach = weapon.kind === "greatsword" ? 205 : weapon.kind === "dagger" ? 140 : 172;
    const playerLight: AttackSpec = {
      kind: "light",
      windup: weapon.kind === "greatsword" ? 0.13 : 0.09,
      active: 0.08,
      recover: 0.24,
      reach,
      damage: Math.round(weapon.light.damage * 1.35),
      stamina: 11,
      knock: 80,
    };
    const playerHeavy: AttackSpec = {
      kind: "heavy",
      windup: weapon.kind === "greatsword" ? 0.42 : 0.34,
      active: 0.1,
      recover: 0.42,
      reach: reach + 20,
      damage: Math.round(weapon.heavy.damage * 1.35),
      stamina: 24,
      knock: 200,
      step: 45,
    };
    const player = new Fighter({
      side: "player",
      name: state.player.name,
      hp: Math.max(1, state.player.health),
      maxHp: state.player.maxHealth,
      mana: state.player.mana,
      maxMana: state.player.maxMana,
      speed: 270,
      canGuard: true,
      light: playerLight,
      heavy: playerHeavy,
      yields: false,
    });

    const enemyAttacks = DuelAI.attacks(enc, style, skill);
    const enemy = new Fighter({
      side: "enemy",
      name: enc.name,
      hp: enc.health,
      maxHp: enc.health,
      mana: 120,
      maxMana: 120,
      speed: style === "beast" ? 300 : style === "magic" ? 230 : 245,
      canGuard: style !== "beast",
      light: enemyAttacks.light,
      heavy: enemyAttacks.heavy,
      yields: enc.friendly === true,
    });

    this.sim = new DuelSim(player, enemy, this.duelEvents());
    this.sim.tonics = () => this.world.inventory.count("lesser_tonic");
    this.sim.useTonic = () => {
      if (!this.world.inventory.remove("lesser_tonic", 1)) return 0;
      const before = player.hp;
      player.hp = Math.min(player.maxHp, player.hp + 40);
      return Math.round(player.hp - before);
    };
    this.ai = new DuelAI(this.sim, enemy, enc, style, skill, boltColor(enc));

    const playerLook = heroLook(state.house);
    const enemyLook = this.textures.exists(`char_${enc.look}`) ? enc.look : "shade";
    this.pView = new FighterView(this, {
      look: playerLook,
      scale: 3,
      weapon: weaponKind(weapon.kind),
      bladeColor: weapon.color,
      ambient,
      floats: false,
    });
    this.eView = new FighterView(this, {
      look: enemyLook,
      scale: 3 * ((enc.scale ?? 4) / 4),
      weapon: enemyWeapon(enemyLook, style),
      bladeColor: enemyBlade(enemyLook),
      ambient,
      floats: LOOKS[enemyLook]?.floats === true,
    });
    this.fx = this.add.graphics().setBlendMode(Phaser.BlendModes.ADD).setDepth(50000);

    // --- HUD on its own camera ------------------------------------------------------
    this.inHud(() => {
      this.hud = new DuelHud(this, W, H, {
        playerName: state.player.name,
        playerLook,
        enemyName: enc.name,
        enemyLook,
        boss: enc.boss === true,
        friendly: enc.friendly === true,
      });
    });

    this.bindKeys();

    // The intro: the camera sweeps round from behind the opponent.
    this.cam.frame(player.x, player.z, enemy.x, enemy.z, 0, true);
    this.cam.yaw += Math.PI * 0.85;
    this.cam.dist *= 1.6;
    this.time.delayedCall(450, () => {
      this.inHud(() => this.hud.caption(enc.name, enc.openingLine ?? `${enc.name} squares up.`, 2.6));
    });
    this.time.delayedCall(INTRO_SECONDS * 1000 - 350, () => this.inHud(() => this.hud.banner("Duel!", "#f6dc8c", "#e09040", 72)));
  }

  // --- cameras ------------------------------------------------------------------

  private setupCameras(W: number, H: number): void {
    const main = this.cameras.main;
    main.setZoom(DPR).setOrigin(0, 0).setBackgroundColor("#05060a");
    this.hudCam = this.cameras.add(0, 0, Math.round(W * DPR), Math.round(H * DPR));
    this.hudCam.setZoom(DPR).setOrigin(0, 0);

    // Every object is created on one camera or the other: route as they arrive.
    this.events.on(Phaser.Scenes.Events.ADDED_TO_SCENE, this.route, this);

    if (this.renderer.type === Phaser.WEBGL && main.filters) {
      try {
        main.filters.internal.addBlocky({ size: Math.round(PIXEL * DPR) });
        main.filters.external.addVignette(0.5, 0.5, 0.95, 0.22, 0x030306);
      } catch (err) {
        console.warn("Duel filters unavailable", err);
      }
    }
  }

  private route(obj: Phaser.GameObjects.GameObject): void {
    if (this.routing === "hud") this.cameras.main.ignore(obj);
    else this.hudCam.ignore(obj);
  }

  private inHud(fn: () => void): void {
    const prev = this.routing;
    this.routing = "hud";
    try {
      fn();
    } finally {
      this.routing = prev;
    }
  }

  // --- input --------------------------------------------------------------------

  private bindKeys(): void {
    const kb = this.input.keyboard!;
    const C = Phaser.Input.Keyboard.KeyCodes;
    kb.addCapture([C.SPACE, C.UP, C.DOWN, C.LEFT, C.RIGHT, C.SHIFT]);
    this.keys = {
      left: kb.addKey(C.A),
      right: kb.addKey(C.D),
      up: kb.addKey(C.W),
      down: kb.addKey(C.S),
      left2: kb.addKey(C.LEFT),
      right2: kb.addKey(C.RIGHT),
      up2: kb.addKey(C.UP),
      down2: kb.addKey(C.DOWN),
      guard: kb.addKey(C.SHIFT),
      guard2: kb.addKey(C.F),
    };
    const tap = (code: number, action: string) =>
      kb.addKey(code).on("down", () => {
        this.world.audio.unlock();
        this.pressed.add(action);
      });
    tap(C.Z, "light");
    tap(C.X, "heavy");
    tap(C.C, "dodge");
    tap(C.SPACE, "cast");
    tap(C.Q, "quaff");
    tap(C.ESC, "yield");
    [C.ONE, C.TWO, C.THREE, C.FOUR, C.FIVE, C.SIX].forEach((code, i) => tap(code, `spell${i}`));
  }

  private readPlayer(): void {
    const k = this.keys;
    const intent = this.sim.player.intent;
    const held = (a: Phaser.Input.Keyboard.Key, b: Phaser.Input.Keyboard.Key) => a.isDown || b.isDown;
    intent.advance = (held(k.right!, k.right2!) ? 1 : 0) - (held(k.left!, k.left2!) ? 1 : 0);
    intent.strafe = (held(k.up!, k.up2!) ? 1 : 0) - (held(k.down!, k.down2!) ? 1 : 0);
    intent.guard = k.guard!.isDown || k.guard2!.isDown;

    const pressed = this.pressed;
    if (pressed.size === 0) return;
    const state = this.world.state;

    for (let i = 0; i < 6; i++) {
      if (!pressed.has(`spell${i}`)) continue;
      const id = state.player.learnedSpells[i];
      if (id) {
        state.player.selectedSpell = id;
        this.world.audio.playUi("select");
      }
    }
    if (pressed.has("light")) intent.light = true;
    if (pressed.has("heavy")) intent.heavy = true;
    if (pressed.has("dodge")) intent.dodge = true;
    if (pressed.has("quaff")) {
      if (this.world.inventory.count("lesser_tonic") > 0) intent.quaff = true;
      else this.popAt(this.pView, "No tonic", "#c9c1a8", 18);
    }
    if (pressed.has("cast")) {
      if (this.sim.lock) this.sim.pushLock();
      else this.tryCast();
    }
    if (pressed.has("yield")) this.tryYield();
    pressed.clear();
  }

  private tryCast(): void {
    const state = this.world.state;
    const id = state.player.selectedSpell;
    const spell = SPELLS[id];
    if (!spell || !this.sim.player.free) return;
    const ready = this.spellCooldowns.get(id) ?? 0;
    if (this.sim.now < ready) return;
    const spec = castSpecFor(id);
    if (!spec) return;
    if (this.sim.player.mana < spec.mana) {
      this.world.audio.playUi("error");
      this.popAt(this.pView, "No mana", "#8fb4ff", 18);
      return;
    }
    this.sim.player.intent.cast = spec;
    this.spellCooldowns.set(id, this.sim.now + spell.cooldown / 1000);
  }

  private tryYield(): void {
    if (this.encounter.noYield) {
      this.inHud(() => this.hud.caption("", "There is no yielding from this one.", 2));
      return;
    }
    if (this.sim.now < this.yieldArmed) {
      this.end(false, "You lower your wand.", true);
      return;
    }
    this.yieldArmed = this.sim.now + 2;
    this.inHud(() => this.hud.caption("", "Press ESC again to yield.", 2));
  }

  // --- the loop -------------------------------------------------------------------

  update(_time: number, delta: number): void {
    const dt = Math.min(delta, 50) / 1000;
    this.phaseT += dt;
    const { player, enemy } = this.sim;

    if (this.phase === "intro") {
      this.pressed.clear();
      if (this.phaseT >= INTRO_SECONDS) {
        this.phase = "fight";
        this.phaseT = 0;
      }
    } else if (this.phase === "fight") {
      this.readPlayer();
      this.ai.update(dt);
    }

    if (this.slowmo > 0) {
      this.slowmo -= dt;
      this.sim.timeScale = this.slowmo > 0 ? 0.22 : 1;
    }
    this.sim.update(dt);

    // Keep the world's numbers in step, so the HUD outside agrees with in here -
    // until the duel is settled, when end() has the last word on them.
    const state = this.world.state;
    if (!this.finished) {
      state.player.health = Math.max(0, Math.round(player.hp));
      state.player.mana = Math.round(player.mana);
    }

    this.cam.frame(player.x, player.z, enemy.x, enemy.z, dt);
    this.cam.punch += ((this.phase === "outro" ? 1.18 : 1) - this.cam.punch) * Math.min(1, dt * 3);
    this.cam.commit(dt);

    this.arena.update(this.cam, dt);
    const t = this.time.now / 1000;
    // Each view needs the other's screen position to decide which way to face.
    const pScreen = this.cam.project(player.x, 0, player.z, this.proj).x;
    const eScreen = this.cam.project(enemy.x, 0, enemy.z, this.proj).x;
    this.pView.update(player, eScreen, this.cam, dt, t);
    this.eView.update(enemy, pScreen, this.cam, dt, t);

    this.fx.clear();
    this.drawBolts();
    this.drawLock(t);

    const spell = SPELLS[state.player.selectedSpell];
    const cooling = spell ? (this.spellCooldowns.get(spell.id) ?? 0) > this.sim.now : false;
    const spellLine = spell ? `${spell.name} · ${spell.manaCost} mana${cooling ? " · recharging" : ""}` : "No spell attuned";
    this.hud.update(player, enemy, dt, spellLine);
    this.hud.setLock(this.sim.lock ? this.sim.lock.balance : null);
  }

  // --- sim events → theatre ----------------------------------------------------------

  private duelEvents(): DuelEvents {
    const audio = this.world.audio;
    const viewOf = (f: Fighter) => (f === this.sim.player ? this.pView : this.eView);
    return {
      hit: (target, damage, kind, heavy) => {
        const v = viewOf(target);
        v.flash();
        this.burst(v.screenX, v.screenY - 26 * v.screenScale, heavy ? 0xffd07a : 0xffffff, heavy ? 1.4 : 1);
        this.cam.shake(heavy ? 9 : 5, heavy ? 0.3 : 0.18);
        if (kind === "bolt" || kind === "nova" || kind === "lock") audio.playHit();
        audio.playAttack(heavy, true);
        if (target === this.sim.player) audio.playHurt();
        this.popAt(v, `${damage}`, target === this.sim.player ? "#ff8a7a" : heavy ? "#ffd166" : "#ffffff", heavy ? 34 : 28);
      },
      blocked: (target, broke, magic) => {
        const v = viewOf(target);
        this.sparks(v.tip.x, v.tip.y, magic ? 0xbfe0ff : 0xffe6a0, 10);
        audio.playHit();
        if (broke) {
          this.popAt(v, "Guard broken!", "#ff9a6a", 24);
          this.cam.shake(8, 0.25);
        } else this.popAt(v, magic ? "Warded" : "Blocked", "#e8e0c0", 20);
      },
      parried: (target, attacker, magic) => {
        const v = viewOf(target);
        this.sparks(v.tip.x, v.tip.y, 0xfff4c8, 22);
        this.arena.ringFlash = 1;
        audio.playSfx("secret");
        audio.playAttack(true, true);
        this.cam.shake(6, 0.2);
        this.popAt(v, magic ? "Deflected!" : "Parry!", "#fff2a8", 32);
        if (target === this.sim.player && !magic) this.popAt(viewOf(attacker), "Open!", "#ffd166", 20);
      },
      evaded: (target, perfect) => {
        if (perfect) {
          this.popAt(viewOf(target), "Evaded!", "#bfe8ff", 24);
          target.stamina = Math.min(target.maxStamina, target.stamina + 20);
        }
        audio.playAttack(false, false);
      },
      missed: () => audio.playAttack(false, false),
      wardAbsorbed: (target) => {
        const v = viewOf(target);
        this.sparks(v.screenX, v.screenY - 26 * v.screenScale, 0xe8c86a, 14);
        audio.playSpell("ward");
        this.popAt(v, "Absorbed", "#ffe08a", 20);
      },
      swing: (f) => audio.playAttack(f.attack?.kind !== "light", false),
      windup: (f) => {
        if (f === this.sim.enemy && f.attack?.kind === "special") audio.playSfx("stone_grind");
      },
      castStart: (f) => {
        const v = viewOf(f);
        this.sparks(v.tip.x, v.tip.y, f.cast?.color ?? 0xffffff, 4);
      },
      boltFired: (b) => {
        audio.playSpell("projectile");
        this.boltViews.set(b, this.makeBoltView(b));
      },
      boltGone: (b, x, y, z) => {
        const view = this.boltViews.get(b);
        if (view) {
          view.glow.destroy();
          view.core.destroy();
          this.boltViews.delete(b);
        }
        const p = this.cam.project(x, y, z, this.proj);
        if (p.visible) this.burst(p.x, p.y, b.spec.color, 0.9);
      },
      nova: (f) => {
        audio.playSpell("nova");
        this.ringBurst(f, f.cast?.color ?? 0xff8a3a);
        this.cam.shake(7, 0.25);
      },
      wardRaised: () => audio.playSpell("ward"),
      blink: (_f, fromX, fromZ) => {
        audio.playSpell("blink");
        const p = this.cam.project(fromX, 40, fromZ, this.proj);
        if (p.visible) this.burst(p.x, p.y - 30 * p.s, 0xbfa8ff, 1.2);
      },
      dodged: () => audio.playDash(),
      quaffed: (f, healed) => {
        audio.playPickup();
        if (healed > 0) this.popAt(viewOf(f), `+${healed}`, "#8af0a0", 26);
      },
      lockStart: () => {
        audio.playSfx("portal");
        this.arena.ringFlash = 1;
        this.cam.shake(4, 0.4);
      },
      lockEnd: (_lock, winner) => {
        audio.playSfx(winner ? "collapse" : "rumble");
        this.arena.ringFlash = 1;
        this.cam.shake(12, 0.45);
        if (!winner) return;
        const won = winner === this.sim.player;
        this.inHud(() => this.hud.banner(won ? "You win the lock!" : "Overpowered!", won ? "#bfe0ff" : "#ff9a8a", "#3060c0", 40));
      },
      taunt: (f, text) => this.inHud(() => this.hud.caption(f.name, text, 3)),
      knockedOut: (f) => this.onKnockout(f),
      bark: (f, text) => this.inHud(() => this.hud.caption(f === this.sim.player ? "" : f.name, text, 3.4)),
    };
  }

  private onKnockout(f: Fighter): void {
    if (this.phase === "outro") return;
    this.phase = "outro";
    this.phaseT = 0;
    this.sim.over = true;
    this.slowmo = 0.9;
    this.cam.shake(14, 0.5);
    const victory = f === this.sim.enemy;
    const enc = this.encounter;
    if (victory) {
      if (enc.friendly) {
        const line = enc.yieldLine ?? `${enc.name} lowers their wand. "Enough. You win."`;
        this.time.delayedCall(700, () => this.inHud(() => this.hud.caption(enc.name, line, 3)));
      }
      this.time.delayedCall(450, () => this.inHud(() => this.hud.banner(enc.friendly ? "They yield" : "Victory")));
      this.time.delayedCall(2600, () => this.end(true, enc.victoryText, false));
    } else {
      this.time.delayedCall(450, () => this.inHud(() => this.hud.banner("Defeated", "#c8bca0", "#000000")));
      this.time.delayedCall(2400, () => this.end(false, enc.defeatText, false));
    }
  }

  // --- spells on screen ---------------------------------------------------------------

  private makeBoltView(b: Bolt): BoltView {
    const glow = this.add.image(0, 0, "fx_glow_cool").setBlendMode(Phaser.BlendModes.ADD).setTint(b.spec.color);
    const core = this.add.image(0, 0, "fx_glow").setBlendMode(Phaser.BlendModes.ADD);
    return { glow, core, last: 0 };
  }

  private drawBolts(): void {
    for (const [b, v] of this.boltViews) {
      const p = this.cam.project(b.x, b.y, b.z, this.proj);
      if (!p.visible) continue;
      const big = b.spec.radius / 18;
      v.glow.setPosition(p.x, p.y).setScale(p.s * 0.55 * big).setDepth(-p.depth + 5);
      v.core.setPosition(p.x, p.y).setScale(p.s * 0.22 * big).setDepth(-p.depth + 6);
      if (this.time.now - v.last > 24) {
        v.last = this.time.now;
        const mote = this.add
          .image(p.x, p.y, "fx_glow_cool")
          .setBlendMode(Phaser.BlendModes.ADD)
          .setScale(p.s * 0.28 * big)
          .setTint(b.spec.color)
          .setDepth(-p.depth + 4);
        this.tweens.add({ targets: mote, alpha: 0, scale: 0.02, duration: 320, onComplete: () => mote.destroy() });
      }
    }
  }

  private drawLock(t: number): void {
    const lock = this.sim.lock;
    if (!lock) return;
    const g = this.fx;
    const a = this.pView.tip;
    const b = this.eView.tip;
    const k = 0.5 + Math.max(-1, Math.min(1, lock.balance)) * 0.42;
    const mx = a.x + (b.x - a.x) * k;
    const my = a.y + (b.y - a.y) * k + Math.sin(t * 30) * 2;
    const beam = (x0: number, y0: number, color: number) => {
      for (const [w, alpha] of [
        [14, 0.18],
        [7, 0.45],
        [2.5, 1],
      ] as const) {
        g.lineStyle(w + Math.sin(t * 40 + w) * 1.5, color, alpha);
        g.beginPath();
        g.moveTo(x0, y0);
        // A shiver in the middle of each beam.
        g.lineTo((x0 + mx) / 2 + Math.sin(t * 50 + x0) * 4, (y0 + my) / 2 + Math.cos(t * 47 + y0) * 4);
        g.lineTo(mx, my);
        g.strokePath();
      }
    };
    beam(a.x, a.y, lock.player.spec.color);
    beam(b.x, b.y, lock.enemy.spec.color);
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(mx, my, 10 + Math.sin(t * 22) * 3);
    g.fillStyle(0xfff0c0, 0.35);
    g.fillCircle(mx, my, 26 + Math.sin(t * 13) * 5);
    if (Math.random() < 0.5) this.sparks(mx, my, Math.random() < 0.5 ? lock.player.spec.color : lock.enemy.spec.color, 1);
  }

  // --- effects --------------------------------------------------------------------------

  private burst(x: number, y: number, color: number, size: number): void {
    const flash = this.add.image(x, y, "fx_glow").setBlendMode(Phaser.BlendModes.ADD).setTint(color).setScale(0.25 * size).setDepth(60000);
    this.tweens.add({ targets: flash, scale: 1.3 * size, alpha: 0, duration: 260, onComplete: () => flash.destroy() });
    const slash = this.add
      .image(x, y, "fx_slash")
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(1.2 * size)
      .setTint(color)
      .setRotation(Math.random() * Math.PI)
      .setDepth(60001);
    this.tweens.add({ targets: slash, alpha: 0, scale: 2 * size, duration: 240, onComplete: () => slash.destroy() });
    this.sparks(x, y, color, 7);
  }

  private sparks(x: number, y: number, color: number, count: number): void {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = 20 + Math.random() * 60;
      const s = this.add
        .image(x, y, "fx_spark")
        .setBlendMode(Phaser.BlendModes.ADD)
        .setTint(color)
        .setScale(0.5 + Math.random() * 0.5)
        .setDepth(60002);
      this.tweens.add({
        targets: s,
        x: x + Math.cos(a) * d,
        y: y + Math.sin(a) * d * 0.7 + 10,
        alpha: 0,
        duration: 260 + Math.random() * 220,
        ease: "Quad.easeOut",
        onComplete: () => s.destroy(),
      });
    }
  }

  /** A nova: a ring racing out across the floor from the caster's feet. */
  private ringBurst(f: Fighter, color: number): void {
    const state = { r: 20 };
    const g = this.add.graphics().setBlendMode(Phaser.BlendModes.ADD).setDepth(55000);
    const pts: Phaser.Math.Vector2[] = [];
    for (let i = 0; i < 40; i++) pts.push(new Phaser.Math.Vector2());
    this.tweens.add({
      targets: state,
      r: 260,
      duration: 380,
      ease: "Cubic.easeOut",
      onUpdate: () => {
        g.clear();
        let n = 0;
        for (let i = 0; i < pts.length; i++) {
          const a = (i / pts.length) * Math.PI * 2;
          const p = this.cam.project(f.x + Math.cos(a) * state.r, 6, f.z + Math.sin(a) * state.r, this.proj);
          if (p.visible) pts[n++]!.set(p.x, p.y);
        }
        const alpha = 1 - state.r / 280;
        g.lineStyle(6, color, alpha);
        g.strokePoints(pts.slice(0, n), true);
        g.lineStyle(2, 0xffffff, alpha);
        g.strokePoints(pts.slice(0, n), true);
      },
      onComplete: () => g.destroy(),
    });
  }

  private popAt(v: FighterView, text: string, color: string, size: number): void {
    const x = v.screenX + (Math.random() - 0.5) * 30;
    const y = v.screenY - 52 * v.screenScale;
    this.inHud(() => this.hud.pop(x, y, text, color, size));
  }

  // --- where and how --------------------------------------------------------------------

  /** Picks the arena from where the duel was called, when the encounter doesn't say. */
  private arenaFromWorld(): DuelArena {
    const w = this.world;
    const level = w.mechanisms?.currentLevelId ?? null;
    if (level === "academy_interior") return "hall";
    const biome = w.world.biomeNameAtPixel(w.player.x, w.player.y);
    if (biome === "crypt") return "crypt";
    if (biome === "scar") {
      const well = landmarkById("wellhead");
      if (well && Math.hypot((well.tx + 2) * TILE - w.player.x, (well.ty + 2) * TILE - w.player.y) < 600) return "well";
      return "scar";
    }
    if (biome === "forest" || biome === "marsh") return "forest";
    return "courtyard";
  }

  // --- settling up -------------------------------------------------------------------------

  private end(victory: boolean, message: string, yielded: boolean): void {
    if (this.finished) return;
    this.finished = true;
    const state = this.world.state;

    if (victory) {
      this.world.audio.playDefeat();
      this.grantVictory();
    } else {
      this.world.audio.playUi("error");
      // Losing is a setback, not a dead end.
      if (!yielded) state.player.health = Math.max(1, Math.round(state.player.maxHealth * 0.4));
      this.game.events.emit("korvana:toast", yielded ? "You yield the duel." : `Duel lost. ${message}`);
    }
    state.player.health = Math.max(1, state.player.health);

    const result: DuelResult = { encounter: this.encounter.id, challenger: this.challenger, victory, yielded };
    this.cameras.main.fadeOut(320, 5, 6, 10);
    this.hudCam.fadeOut(320, 5, 6, 10);
    this.time.delayedCall(340, () => {
      this.scene.resume("world");
      this.scene.stop();
      if (!victory) this.world.gameEvents.emit({ kind: "battle_lost", id: result.encounter });
      this.game.events.emit(DUEL_ENDED, result);
    });
  }

  private grantVictory(): void {
    const state = this.world.state;
    const encounter = this.encounter;

    this.world.audio.playReward();
    state.player.gold += encounter.gold;

    const lines = [`${encounter.name} defeated.`];
    if (encounter.gold > 0) lines.push(`+${encounter.gold} gold.`);

    // One-shot rewards are gated on a flag so a repeatable duel cannot be
    // farmed for the boss's sword.
    const rewardFlag = `battle_reward_${encounter.id}`;
    if (encounter.rewardItem && !state.flag(rewardFlag)) {
      const reward = ITEMS[encounter.rewardItem];
      if (this.world.inventory.add(encounter.rewardItem)) {
        state.setFlag(rewardFlag);
        lines.push(`Received ${reward?.name ?? encounter.rewardItem}.`);
      }
    }

    if (encounter.lore && state.unlockLore(encounter.lore)) {
      lines.push(`Journal: ${loreById(encounter.lore)?.title ?? encounter.lore}`);
    }

    const events = this.world.gameEvents;
    events.emit({ kind: "battle_won", id: encounter.id });
    if (encounter.boss) events.emit({ kind: "boss_defeated", id: encounter.id });

    for (const line of lines) this.game.events.emit("korvana:toast", line);
  }
}

// --- tables ---------------------------------------------------------------------------------

function defaultStyle(look: string): DuelStyle {
  if (["shade", "husk", "wraith", "spider", "bat", "owl"].includes(look)) return "beast";
  if (["adept", "vale", "headmistress", "professor", "librarian", "keeper", "ghost", "lamp"].includes(look)) return "magic";
  if (["guardian", "skeleton"].includes(look)) return "sword";
  return "mixed";
}

function weaponKind(kind: string): WeaponKind {
  if (kind === "greatsword" || kind === "dagger" || kind === "wand") return kind;
  return "sword";
}

function enemyWeapon(look: string, style: DuelStyle): WeaponKind {
  if (style === "beast") return "none";
  if (style === "magic") return "wand";
  if (look === "guardian") return "greatsword";
  if (look === "raider") return "dagger";
  return "sword";
}

function enemyBlade(look: string): number {
  if (look === "shade" || look === "wraith") return 0x9fb4ff;
  if (look === "guardian" || look === "skeleton") return 0xc8d0d8;
  return 0xe6ecf2;
}

/** The colour of an opponent's magic. */
function boltColor(enc: EncounterDef): number {
  if (enc.look === "vale") return 0xa8f0c8;
  if (enc.look === "raider") return 0xffb060;
  if (enc.look === "adept") return 0xc77dff;
  const palette = [0xff8a6a, 0x8fd4ff, 0xb48cff, 0x8af0a0, 0xffd166];
  let h = 0;
  for (const ch of enc.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return palette[h % palette.length]!;
}

/** The player's spells, reshaped for the duel: same identity, duel-sized numbers. */
function castSpecFor(id: string): CastSpec | null {
  const spell = SPELLS[id];
  if (!spell) return null;
  switch (spell.kind) {
    case "projectile":
      return {
        kind: "bolt",
        windup: 0.16,
        damage: Math.round(spell.damage * 1.5),
        color: spell.color,
        speed: Math.max(520, spell.speed ?? 600),
        radius: Math.max(14, Math.min(26, spell.radius ?? 16)),
        mana: spell.manaCost,
        spellId: id,
      };
    case "nova":
      return { kind: "nova", windup: 0.24, damage: Math.round(spell.damage * 1.4), color: spell.color, speed: 0, radius: 230, mana: spell.manaCost, spellId: id };
    case "ward":
      return { kind: "ward", windup: 0.12, damage: 0, color: spell.color, speed: 0, radius: 0, mana: spell.manaCost, duration: 3.5, spellId: id };
    case "blink":
      return { kind: "blink", windup: 0.06, damage: 0, color: spell.color, speed: 0, radius: 0, mana: spell.manaCost, spellId: id };
  }
}
