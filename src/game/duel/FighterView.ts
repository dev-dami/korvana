import Phaser from "phaser";

import { animKey, attackKey, castKey, idleKey, sheetKey } from "../gfx/characters";
import type { Direction } from "../types";
import type { DuelCamera, Projection } from "./DuelCamera";
import { makeProjection } from "./DuelCamera";
import type { Fighter } from "./DuelSim";

/**
 * One duellist on screen.
 *
 * The body is the same 32x48 pixel sheet the world uses, scaled up by depth.
 * What makes it a fighting-game character is everything layered on top: a
 * separate blade or wand that swings through real arcs from the hand (with a
 * glowing trail on the cut), lean and squash on every phase of an attack,
 * a ward bubble, a telegraph glint at the top of a windup so the player can
 * time a parry, afterimages on a dodge, and a shadow pinned to the floor.
 */

export type WeaponKind = "sword" | "greatsword" | "dagger" | "wand" | "none";

/** Where the weapon hand sits in a side-facing frame, from the feet, in texels. */
const HAND_X = 5;
const HAND_Y = 21;

export interface FighterLookConfig {
  look: string;
  /** World units per texel: 3 is a normal person, bosses loom larger. */
  scale: number;
  weapon: WeaponKind;
  bladeColor: number;
  /** Ambient light of the arena. */
  ambient: number;
  floats: boolean;
}

export class FighterView {
  readonly sprite: Phaser.GameObjects.Sprite;
  private readonly scene: Phaser.Scene;
  private readonly cfg: FighterLookConfig;
  private readonly weapon: Phaser.GameObjects.Image | null;
  private readonly shadow: Phaser.GameObjects.Image;
  private readonly ward: Phaser.GameObjects.Graphics;
  private readonly trail: Phaser.GameObjects.Graphics;
  private readonly glint: Phaser.GameObjects.Image;
  private readonly p: Projection = makeProjection();
  private readonly tips: Array<{ x: number; y: number; hx: number; hy: number }> = [];
  private lastAct = "";
  private flashT = 0;
  private fallT = 0;
  private ghostT = 0;
  private wobble = 0;
  dir: Direction = "right";
  /** Screen position of the wand/blade tip, for beams and bolts. */
  readonly tip = { x: 0, y: 0 };
  /** Screen-space scale, for HUD text placement. */
  screenScale = 1;
  screenX = 0;
  screenY = 0;
  depth = 0;

  constructor(scene: Phaser.Scene, cfg: FighterLookConfig) {
    this.scene = scene;
    this.cfg = cfg;
    bakeWeapons(scene);
    this.shadow = scene.add.image(0, 0, "fx_shadow_soft").setAlpha(0.55);
    this.trail = scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    this.sprite = scene.add.sprite(0, 0, sheetKey(cfg.look)).setOrigin(0.5, 1);
    this.sprite.setTint(cfg.ambient);
    this.weapon = cfg.weapon === "none" ? null : scene.add.image(0, 0, `duel_w_${cfg.weapon}`).setOrigin(0.5, 0.88);
    if (this.weapon && cfg.weapon !== "wand") this.weapon.setTint(cfg.bladeColor);
    this.ward = scene.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    this.glint = scene.add.image(0, 0, "fx_star").setBlendMode(Phaser.BlendModes.ADD).setVisible(false);
  }

  /** A white flash on taking a hit. */
  flash(): void {
    this.flashT = 0.09;
  }

  update(f: Fighter, foeX: number, cam: DuelCamera, dt: number, time: number): void {
    const p = cam.project(f.x, f.y, f.z, this.p);
    const visible = p.visible;
    this.sprite.setVisible(visible);
    this.shadow.setVisible(visible);
    this.weapon?.setVisible(visible);
    if (!visible) return;

    const s = p.s * this.cfg.scale;
    this.screenScale = s;
    this.screenX = p.x;
    this.screenY = p.y;
    this.depth = p.depth;
    this.dir = foeX >= p.x ? "right" : "left";
    const sign = this.dir === "right" ? 1 : -1;
    const look = this.cfg.look;

    // --- body pose ----------------------------------------------------------
    const actChanged = f.act !== this.lastAct;
    if (actChanged) {
      this.lastAct = f.act;
      this.fallT = 0;
      this.tips.length = 0;
    }
    let lean = 0;
    let squash = 1;
    let lift = this.cfg.floats ? Math.sin(time * 2.4) * 4 * s : 0;
    let anim = f.moving ? animKey(look, this.dir) : idleKey(look, this.dir);
    const phase = f.dur > 0 ? Math.min(1, f.t / f.dur) : 0;

    switch (f.act) {
      case "windup":
        lean = -0.1 * phase;
        squash = 1 - 0.05 * phase;
        anim = idleKey(look, this.dir);
        break;
      case "active":
        lean = 0.17;
        squash = 1.04;
        anim = attackKey(look, this.dir);
        break;
      case "recover":
        lean = 0.14 * (1 - phase);
        anim = phase < 0.6 ? attackKey(look, this.dir) : idleKey(look, this.dir);
        break;
      case "cast":
        lean = -0.05;
        anim = castKey(look, this.dir);
        break;
      case "lock":
        lean = -0.12 + Math.sin(time * 40) * 0.015;
        anim = castKey(look, this.dir);
        break;
      case "hurt":
        lean = -0.24 * (1 - phase);
        break;
      case "stagger":
        this.wobble += dt * 14;
        lean = -0.28 + Math.sin(this.wobble) * 0.08;
        break;
      case "dodge":
        lean = 0.22;
        squash = 0.92;
        anim = animKey(look, this.dir);
        this.ghostT -= dt;
        if (this.ghostT <= 0) {
          this.ghostT = 0.035;
          this.afterimage(s);
        }
        break;
      case "quaff":
        lean = -0.14;
        break;
      case "down":
        this.fallT = Math.min(1, this.fallT + dt * 2.2);
        lean = -1.45 * easeOutBack(this.fallT);
        lift = 0;
        break;
      case "yield":
        this.fallT = Math.min(1, this.fallT + dt * 3);
        squash = 1 - 0.24 * this.fallT;
        lean = 0.22 * this.fallT;
        break;
      default:
        squash = 1 + Math.sin(time * 3.1) * 0.008;
    }

    if (this.sprite.anims.currentAnim?.key !== anim && this.scene.anims.exists(anim)) this.sprite.anims.play(anim, true);
    this.sprite
      .setPosition(p.x, p.y - lift)
      .setScale(s, s * squash)
      .setRotation(lean * sign)
      .setDepth(-p.depth)
      .setAlpha(f.act === "dodge" ? 0.75 : 1);

    if (this.flashT > 0) {
      this.flashT -= dt;
      this.sprite.setTint(0xffffff).setTintMode(Phaser.TintModes.FILL);
    } else {
      this.sprite.setTint(f.act === "hurt" ? 0xff9a90 : this.cfg.ambient).setTintMode(Phaser.TintModes.MULTIPLY);
    }

    const shadowW = (this.cfg.floats ? 16 : 22) * s;
    this.shadow
      .setPosition(p.x, p.y)
      .setDisplaySize(shadowW * (f.act === "down" ? 1.8 : 1), shadowW * 0.32)
      .setDepth(-p.depth - 2)
      .setAlpha(this.cfg.floats ? 0.3 : 0.55);

    // --- weapon --------------------------------------------------------------
    const hx = p.x + sign * HAND_X * s * Math.cos(lean) + Math.sin(lean * sign) * HAND_Y * s;
    const hy = p.y - lift - HAND_Y * s * Math.cos(lean) * squash;
    const angle = this.weaponAngle(f, phase, time);
    const len = (this.weapon?.height ?? 18) * s * 0.88;
    const world = sign > 0 ? angle : Math.PI - angle;
    this.tip.x = hx + Math.cos(world) * len;
    this.tip.y = hy + Math.sin(world) * len;

    const hideWeapon = !this.weapon || f.act === "cast" || f.act === "lock" || f.act === "down" || f.act === "yield" || f.act === "quaff";
    if (this.weapon) {
      this.weapon
        .setVisible(!hideWeapon)
        .setPosition(hx, hy)
        .setScale(s)
        .setRotation(world + Math.PI / 2)
        .setDepth(-p.depth + (sign > 0 ? 1 : -1) * 0.5 + 0.1);
    }
    if (f.act === "cast" || f.act === "lock") {
      // The painted cast frame holds the wand out and up; aim beams from there.
      this.tip.x = p.x + sign * 13 * s;
      this.tip.y = p.y - 30 * s;
    }

    this.drawTrail(f, hx, hy, !hideWeapon);
    this.drawWard(f, p, s, time);
    this.drawGlint(f, phase, s);
  }

  private weaponAngle(f: Fighter, phase: number, time: number): number {
    const idle = -1.12 + Math.sin(time * 2.6) * 0.03;
    const heavy = f.attack && f.attack.kind !== "light";
    const back = heavy ? -3.05 : -2.45;
    const through = heavy ? 0.95 : 0.55;
    if (this.cfg.weapon === "wand") {
      if (f.act === "windup" || f.act === "active") return -0.35;
      return -0.9 + Math.sin(time * 2.6) * 0.04;
    }
    switch (f.act) {
      case "windup":
        return lerp(idle, back, easeOutCubic(phase));
      case "active":
        return lerp(back, through, easeOutCubic(phase));
      case "recover":
        return lerp(through, idle, easeInOut(phase));
      case "hurt":
        return -0.55;
      case "stagger":
        return -0.2;
      case "dodge":
        return -0.6;
      default:
        return f.guarding ? -1.62 : idle;
    }
  }

  private drawTrail(f: Fighter, hx: number, hy: number, shown: boolean): void {
    const g = this.trail;
    g.clear();
    if (!shown || (f.act !== "active" && !(f.act === "recover" && f.t < 0.07))) {
      this.tips.length = 0;
      return;
    }
    this.tips.push({ x: this.tip.x, y: this.tip.y, hx, hy });
    if (this.tips.length > 7) this.tips.shift();
    const heavy = f.attack && f.attack.kind !== "light";
    const color = this.cfg.weapon === "none" ? 0xffffff : this.cfg.bladeColor;
    for (let i = 1; i < this.tips.length; i++) {
      const a = this.tips[i - 1]!;
      const b = this.tips[i]!;
      const alpha = (i / this.tips.length) * (heavy ? 0.85 : 0.6);
      g.fillStyle(color, alpha * 0.5);
      g.fillTriangle(a.x, a.y, b.x, b.y, lerp(b.x, b.hx, 0.35), lerp(b.y, b.hy, 0.35));
      g.fillStyle(0xffffff, alpha);
      g.fillTriangle(a.x, a.y, b.x, b.y, lerp(b.x, b.hx, 0.12), lerp(b.y, b.hy, 0.12));
    }
    g.setDepth(this.sprite.depth + 0.3);
  }

  private drawWard(f: Fighter, p: Projection, s: number, time: number): void {
    const g = this.ward;
    g.clear();
    const guarding = f.guarding && f.cfg.canGuard;
    if (!f.warded && !guarding) return;
    const cx = p.x;
    const cy = p.y - 24 * s;
    const pulse = 0.5 + Math.sin(time * 8) * 0.15;
    if (f.warded) {
      g.fillStyle(f.wardColor, 0.1 + pulse * 0.06);
      g.fillEllipse(cx, cy, 34 * s, 54 * s);
      g.lineStyle(Math.max(1.5, s * 0.8), f.wardColor, 0.6 + pulse * 0.3);
      g.strokeEllipse(cx, cy, 34 * s, 54 * s);
    }
    if (guarding) {
      // A faint shield arc on the side facing the foe.
      const sign = this.dir === "right" ? 1 : -1;
      g.lineStyle(Math.max(2, s), 0xe8e0c0, 0.32 + pulse * 0.2);
      g.beginPath();
      g.arc(cx + sign * 4 * s, cy, 20 * s, sign > 0 ? -1.1 : Math.PI - 1.1, sign > 0 ? 1.1 : Math.PI + 1.1);
      g.strokePath();
    }
    g.setDepth(this.sprite.depth + 0.4);
  }

  /** A star at the top of every windup: the "now" a parry is timed against. */
  private drawGlint(f: Fighter, phase: number, s: number): void {
    const show = (f.act === "windup" && phase > 0.45) || (f.act === "cast" && phase > 0.5);
    this.glint.setVisible(show);
    if (!show) return;
    const special = f.attack?.kind === "special" || f.attack?.kind === "heavy";
    this.glint
      .setPosition(this.tip.x, this.tip.y)
      .setScale(s * (special ? 0.5 : 0.32) * (0.8 + phase * 0.5))
      .setRotation(phase * 3)
      .setTint(special ? 0xff9a6a : 0xfff4c8)
      .setDepth(this.sprite.depth + 0.6);
  }

  private afterimage(s: number): void {
    const ghost = this.scene.add
      .image(this.sprite.x, this.sprite.y, this.sprite.texture.key, this.sprite.frame.name)
      .setOrigin(0.5, 1)
      .setScale(s)
      .setRotation(this.sprite.rotation)
      .setTint(0x9fc8ff)
      .setAlpha(0.45)
      .setDepth(this.sprite.depth - 0.5)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.scene.tweens.add({ targets: ghost, alpha: 0, duration: 260, onComplete: () => ghost.destroy() });
  }
}

// --- weapon art ---------------------------------------------------------------------

/**
 * Blades are painted white-steel and tinted by the weapon's colour; the wand
 * keeps its own wood and brass. All point straight up, grip at the bottom.
 */
function bakeWeapons(scene: Phaser.Scene): void {
  const blade = (key: string, w: number, bladeLen: number, gripLen: number, guardW: number) => {
    if (scene.textures.exists(key)) return;
    const h = bladeLen + gripLen + 3;
    const c = document.createElement("canvas");
    c.width = Math.max(w, guardW);
    c.height = h;
    const ctx = c.getContext("2d")!;
    const cx = Math.floor(c.width / 2);
    // Blade, with a bright edge and a fuller down the middle.
    ctx.fillStyle = "#dfe4ea";
    ctx.fillRect(cx - Math.floor(w / 2), 2, w, bladeLen);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(cx - Math.floor(w / 2), 2, 1, bladeLen);
    ctx.fillStyle = "#a9b0ba";
    ctx.fillRect(cx, 4, 1, bladeLen - 4);
    // Tip.
    ctx.fillStyle = "#dfe4ea";
    ctx.fillRect(cx - Math.floor(w / 2) + 1, 0, Math.max(1, w - 2), 2);
    // Cross-guard, grip, pommel.
    ctx.fillStyle = "#c9a24e";
    ctx.fillRect(cx - Math.floor(guardW / 2), bladeLen + 2, guardW, 2);
    ctx.fillStyle = "#5a3a22";
    ctx.fillRect(cx - 1, bladeLen + 4, 2, gripLen - 2);
    ctx.fillStyle = "#e1c46e";
    ctx.fillRect(cx - 1, h - 2, 3, 2);
    scene.textures.addCanvas(key, c);
  };
  blade("duel_w_sword", 3, 26, 7, 7);
  blade("duel_w_greatsword", 4, 36, 9, 10);
  blade("duel_w_dagger", 3, 14, 5, 5);

  if (!scene.textures.exists("duel_w_wand")) {
    const c = document.createElement("canvas");
    c.width = 3;
    c.height = 18;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#6b4426";
    ctx.fillRect(1, 2, 1, 16);
    ctx.fillStyle = "#3e2614";
    ctx.fillRect(0, 12, 3, 6);
    ctx.fillStyle = "#c9a24e";
    ctx.fillRect(0, 11, 3, 1);
    ctx.fillStyle = "#fff4c8";
    ctx.fillRect(1, 0, 1, 2);
    scene.textures.addCanvas("duel_w_wand", c);
  }
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function easeOutBack(t: number): number {
  const c = 1.4;
  return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
}
