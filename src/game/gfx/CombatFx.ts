import Phaser from "phaser";

import { DEPTH } from "../config";
import type { Lighting } from "./Lighting";

/**
 * Combat feedback that lives entirely on the presentation side: hit sparks
 * when anything loses health, a burst when it dies, and afterimages when the
 * player covers ground faster than walking can (dash, blink).
 *
 * It watches state rather than being called by the combat code, so the
 * gameplay systems stay free of effects and nothing here can change a fight.
 */

const SPARKS = 72;
const GHOSTS = 10;
const RINGS = 8;

interface Spark {
  img: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  life: number;
  max: number;
}

interface Watched {
  hp: number;
  x: number;
  y: number;
  seen: number;
}

/** What CombatFx needs to know about an actor; matches Enemy and Player. */
export interface Combatant {
  x: number;
  y: number;
  health: number;
  readonly sprite: Phaser.GameObjects.Sprite;
}

export class CombatFx {
  private readonly scene: Phaser.Scene;
  private readonly lighting: Lighting;
  private readonly sparks: Spark[] = [];
  private readonly ghosts: Phaser.GameObjects.Image[] = [];
  private readonly rings: Phaser.GameObjects.Image[] = [];
  private readonly watched = new Map<Combatant, Watched>();
  private frame = 0;
  private lastX = Number.NaN;
  private lastY = Number.NaN;
  private nextGhost = 0;
  private nextRing = 0;

  constructor(scene: Phaser.Scene, lighting: Lighting) {
    this.scene = scene;
    this.lighting = lighting;
    for (let i = 0; i < SPARKS; i++) {
      this.sparks.push({
        img: scene.add.image(0, 0, "fx_spark").setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.weather - 30).setVisible(false),
        vx: 0,
        vy: 0,
        life: 0,
        max: 1,
      });
    }
    for (let i = 0; i < GHOSTS; i++) {
      this.ghosts.push(scene.add.image(0, 0, "fx_pixel").setOrigin(0.5, 1).setBlendMode(Phaser.BlendModes.ADD).setVisible(false));
    }
    for (let i = 0; i < RINGS; i++) {
      this.rings.push(scene.add.image(0, 0, "fx_ring").setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.weather - 31).setVisible(false));
    }
  }

  update(dt: number, enemies: readonly Combatant[], player: { x: number; y: number; sprite: Phaser.GameObjects.Sprite }): void {
    this.frame++;
    for (const enemy of enemies) {
      let w = this.watched.get(enemy);
      if (!w) {
        w = { hp: enemy.health, x: enemy.x, y: enemy.y, seen: this.frame };
        this.watched.set(enemy, w);
      }
      if (enemy.health < w.hp) this.hit(enemy.x, enemy.y - 14, Math.min(1, (w.hp - enemy.health) / 20));
      w.hp = enemy.health;
      w.x = enemy.x;
      w.y = enemy.y;
      w.seen = this.frame;
    }
    for (const [key, w] of this.watched) {
      if (w.seen === this.frame) continue;
      // Gone from the roster: if it went with no health left, it was a kill.
      if (key.health <= 0) {
        this.hit(w.x, w.y - 14, 1);
        this.death(w.x, w.y);
      }
      this.watched.delete(key);
    }

    this.trackPlayer(player);
    this.stepSparks(dt);
  }

  /** Bright sparks flying off the point of impact, plus a flash of light. */
  hit(x: number, y: number, weight: number): void {
    const count = 6 + Math.round(weight * 8);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 90 + Math.random() * 160 * (0.6 + weight);
      this.spark(x, y, Math.cos(a) * speed, Math.sin(a) * speed - 40, i % 3 === 0 ? 0xffffff : 0xffd27a, 0.25 + Math.random() * 0.2);
    }
    this.ring(x, y, 0xfff0c0, 0.5 + weight * 0.4);
    this.lighting.flash({ x, y, radius: 70 + weight * 40, color: 0xffd8a0, intensity: 0.8 }, 180);
  }

  /** The enemy's light goes out: a burst of pale motes rising. */
  death(x: number, y: number): void {
    for (let i = 0; i < 16; i++) {
      const a = -Math.PI / 2 + (Math.random() - 0.5) * 2.4;
      const speed = 40 + Math.random() * 90;
      this.spark(x + (Math.random() - 0.5) * 12, y - 10, Math.cos(a) * speed, Math.sin(a) * speed, 0xbfd4ff, 0.6 + Math.random() * 0.4);
    }
    this.ring(x, y - 10, 0xa8c4ff, 1.4);
    this.lighting.flash({ x, y: y - 10, radius: 140, color: 0xa8c4ff, intensity: 0.9 }, 420);
  }

  destroy(): void {
    for (const s of this.sparks) s.img.destroy();
    for (const g of this.ghosts) g.destroy();
    for (const r of this.rings) r.destroy();
    this.sparks.length = 0;
    this.ghosts.length = 0;
    this.rings.length = 0;
    this.watched.clear();
  }

  private trackPlayer(player: { x: number; y: number; sprite: Phaser.GameObjects.Sprite }): void {
    const dx = player.x - this.lastX;
    const dy = player.y - this.lastY;
    const jump = Math.hypot(dx, dy);
    // Faster than any walk, slower than a respawn: a dash or a blink.
    if (jump > 36 && jump < 320) {
      const steps = 4;
      for (let i = 0; i < steps; i++) {
        const t = i / steps;
        this.ghost(player.sprite, this.lastX + dx * t, this.lastY + dy * t, 0.45 * (0.4 + t * 0.6), 160 + i * 60);
      }
    }
    this.lastX = player.x;
    this.lastY = player.y;
  }

  private ghost(sprite: Phaser.GameObjects.Sprite, x: number, y: number, alpha: number, ms: number): void {
    const img = this.ghosts[this.nextGhost]!;
    this.nextGhost = (this.nextGhost + 1) % this.ghosts.length;
    this.scene.tweens.killTweensOf(img);
    img
      .setTexture(sprite.texture.key, sprite.frame.name)
      .setOrigin(sprite.originX, sprite.originY)
      .setScale(sprite.scaleX, sprite.scaleY)
      .setFlipX(sprite.flipX)
      .setPosition(Math.round(x), Math.round(y))
      .setDepth(y - 1)
      .setTint(0x8fc8ff)
      .setAlpha(alpha)
      .setVisible(true);
    this.scene.tweens.add({
      targets: img,
      alpha: 0,
      duration: ms,
      ease: "Quad.easeOut",
      onComplete: () => img.setVisible(false),
    });
  }

  private ring(x: number, y: number, color: number, size: number): void {
    const img = this.rings[this.nextRing]!;
    this.nextRing = (this.nextRing + 1) % this.rings.length;
    this.scene.tweens.killTweensOf(img);
    img.setPosition(x, y).setTint(color).setScale(0.15 * size).setAlpha(0.9).setVisible(true);
    this.scene.tweens.add({
      targets: img,
      scale: 0.75 * size,
      alpha: 0,
      duration: 240,
      ease: "Cubic.easeOut",
      onComplete: () => img.setVisible(false),
    });
  }

  private spark(x: number, y: number, vx: number, vy: number, color: number, life: number): void {
    const s = this.sparks.find((q) => !q.img.visible) ?? this.sparks[Math.floor(Math.random() * this.sparks.length)];
    if (!s) return;
    s.vx = vx;
    s.vy = vy;
    s.life = 0;
    s.max = life;
    s.img.setPosition(x, y).setTint(color).setAlpha(1).setScale(1.5).setVisible(true);
  }

  private stepSparks(dt: number): void {
    for (const s of this.sparks) {
      if (!s.img.visible) continue;
      s.life += dt;
      const t = s.life / s.max;
      if (t >= 1) {
        s.img.setVisible(false);
        continue;
      }
      s.vx *= 1 - dt * 5;
      s.vy = s.vy * (1 - dt * 5) + 260 * dt;
      s.img.setPosition(s.img.x + s.vx * dt, s.img.y + s.vy * dt);
      s.img.setAlpha(1 - t * t).setScale(1.5 - t);
    }
  }
}
