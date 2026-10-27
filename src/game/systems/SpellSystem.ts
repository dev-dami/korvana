import type Phaser from "phaser";

import { SPELLS } from "../data/spells";
import type { Spell } from "../data/spells";
import { ACTOR_BODY_OFFSET, dirVector } from "../entities/Actor";
import { Projectile } from "../entities/Projectile";
import type { Bystanders } from "../entities/Projectile";
import type { Actor } from "../entities/Actor";
import type { GameState } from "../state/GameState";
import type { WorldManager } from "../world/WorldManager";

export interface CastResult {
  ok: boolean;
  reason?: string;
}

/**
 * Turns spell data into projectiles, novas, wards and blinks. Balance lives in
 * data/spells.ts; this only knows how to execute a `kind`.
 */
export class SpellSystem {
  private readonly scene: Phaser.Scene;
  private readonly state: GameState;
  private readonly world: WorldManager;

  /**
   * People a spell can hit without hurting: bolts and novas tell them, and they
   * answer (usually with a duel). Set by the world scene; null anywhere else.
   */
  bystanders: Bystanders | null = null;

  private readonly cooldowns = new Map<string, number>();
  private readonly projectiles: Projectile[] = [];

  constructor(scene: Phaser.Scene, state: GameState, world: WorldManager) {
    this.scene = scene;
    this.state = state;
    this.world = world;
  }

  cooldownRemaining(id: string): number {
    return Math.max(0, this.cooldowns.get(id) ?? 0);
  }

  /** 0..1, for the UI cooldown sweep. */
  cooldownFraction(id: string): number {
    const spell = SPELLS[id];
    if (!spell) return 0;
    const remaining = this.cooldownRemaining(id);
    return spell.cooldown === 0 ? 0 : remaining / spell.cooldown;
  }

  canCast(id: string): CastResult {
    if (!id) return { ok: false, reason: "No spell is attuned yet." };
    const spell = SPELLS[id];
    if (!spell) return { ok: false, reason: "Unknown spell" };
    if (!this.state.knowsSpell(id)) return { ok: false, reason: "Not learned" };
    if (this.state.player.mana < spell.manaCost) return { ok: false, reason: "Not enough mana" };
    if (this.cooldownRemaining(id) > 0) return { ok: false, reason: "Recharging" };
    return { ok: true };
  }

  cast(
    id: string,
    caster: Actor,
    targets: Actor[],
    onDamage: (target: Actor, amount: number) => void,
  ): CastResult {
    const check = this.canCast(id);
    if (!check.ok) return check;

    const spell = SPELLS[id];
    if (!spell) return { ok: false, reason: "Unknown spell" };

    this.state.spendMana(spell.manaCost);
    this.cooldowns.set(id, spell.cooldown);

    // Spells travel the way the caster is already facing, exactly like melee.
    const facing = dirVector(caster.direction);
    const angle = Math.atan2(facing.y, facing.x);
    const muzzleY = caster.y - ACTOR_BODY_OFFSET - 6;

    switch (spell.kind) {
      case "projectile": {
        const projectile = new Projectile(
          this.scene,
          caster.x + Math.cos(angle) * 14,
          muzzleY + Math.sin(angle) * 14,
          angle,
          {
            damage: spell.damage,
            speed: spell.speed ?? 520,
            life: spell.range / (spell.speed ?? 520),
            radius: spell.radius,
            color: spell.color,
            spell: id,
          },
        );
        this.projectiles.push(projectile);
        this.muzzleFlash(caster.x, muzzleY, spell.color);
        break;
      }
      case "nova": {
        this.nova(caster, spell, targets, onDamage);
        break;
      }
      case "ward": {
        this.state.setWard(5000);
        this.wardBurst(caster);
        break;
      }
      case "blink": {
        this.blink(caster, spell, angle);
        break;
      }
    }

    return { ok: true };
  }

  update(dt: number, targets: Actor[], onDamage: (target: Actor, amount: number) => void): void {
    for (const [id, remaining] of this.cooldowns) {
      const next = remaining - dt * 1000;
      if (next <= 0) this.cooldowns.delete(id);
      else this.cooldowns.set(id, next);
    }

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const projectile = this.projectiles[i];
      if (!projectile) continue;
      const hit = projectile.update(dt, this.world, targets, this.bystanders);
      if (hit) {
        onDamage(hit, projectile.damage);
      }
      if (!projectile.alive) {
        projectile.destroy();
        this.projectiles.splice(i, 1);
      }
    }
  }

  get activeProjectiles(): number {
    return this.projectiles.length;
  }

  clear(): void {
    for (const projectile of this.projectiles) projectile.destroy();
    this.projectiles.length = 0;
  }

  private nova(
    caster: Actor,
    spell: Spell,
    targets: Actor[],
    onDamage: (target: Actor, amount: number) => void,
  ): void {
    for (const target of targets) {
      if (!target.alive) continue;
      if (caster.distanceTo(target) <= spell.range) {
        onDamage(target, spell.damage);
      }
    }
    for (const actor of this.bystanders?.actors ?? []) {
      if (actor.alive && caster.distanceTo(actor) <= spell.range) this.bystanders?.onSpellHit(actor, spell.id);
    }

    const ring = this.scene.add
      .image(caster.x, caster.y - 10, "fx_glow_cool")
      .setBlendMode("ADD")
      .setScale(0.2)
      .setDepth(caster.y + 30)
      .setTint(spell.color);
    this.scene.tweens.add({
      targets: ring,
      scale: (spell.range * 2) / 128,
      alpha: 0,
      duration: 380,
      onComplete: () => ring.destroy(),
    });
  }

  private wardBurst(caster: Actor): void {
    const ward = this.scene.add
      .image(caster.x, caster.y - 18, "fx_glow")
      .setBlendMode("ADD")
      .setScale(0.4)
      .setDepth(caster.y + 30)
      .setTint(0xd9b44a);
    this.scene.tweens.add({
      targets: ward,
      scale: 1.1,
      alpha: 0.35,
      duration: 320,
      yoyo: true,
      onComplete: () => ward.destroy(),
    });
  }

  private blink(caster: Actor, spell: Spell, angle: number): void {
    const before = { x: caster.x, y: caster.y };
    const step = 6;
    let travelled = 0;

    while (travelled < spell.range) {
      const nx = caster.x + Math.cos(angle) * step;
      const ny = caster.y + Math.sin(angle) * step;
      if (this.world.chunks.boxSolid(nx - 11, ny - 14, 22, 14)) break;
      caster.x = nx;
      caster.y = ny;
      travelled += step;
    }

    if (travelled === 0) return;
    caster.setPosition(caster.x, caster.y);

    for (const point of [before, { x: caster.x, y: caster.y }]) {
      const puff = this.scene.add
        .image(point.x, point.y - 18, "fx_glow_cool")
        .setBlendMode("ADD")
        .setScale(0.35)
        .setDepth(point.y + 30)
        .setTint(spell.color);
      this.scene.tweens.add({
        targets: puff,
        scale: 0.05,
        alpha: 0,
        duration: 300,
        onComplete: () => puff.destroy(),
      });
    }
  }

  private muzzleFlash(x: number, y: number, color: number): void {
    const flash = this.scene.add
      .image(x, y, "fx_glow_cool")
      .setBlendMode("ADD")
      .setScale(0.22)
      .setDepth(y + 40)
      .setTint(color);
    this.scene.tweens.add({
      targets: flash,
      scale: 0.05,
      alpha: 0,
      duration: 180,
      onComplete: () => flash.destroy(),
    });
  }
}
