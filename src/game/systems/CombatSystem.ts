import type Phaser from "phaser";

import { weaponById } from "../data/weapons";
import type { SwingDef, SwingKind, WeaponDef } from "../data/weapons";
import { ACTOR_BODY_OFFSET, dirVector } from "../entities/Actor";
import type { Actor } from "../entities/Actor";
import type { Direction } from "../types";

export interface SwingOutcome {
  ok: boolean;
  reason?: string;
  kind: SwingKind;
  weapon: WeaponDef;
  /** How many targets were in the arc. */
  hits: number;
  /** Total damage rolled across those targets. */
  damage: number;
  crits: number;
}

const CRIT_CHANCE = 0.15;
const CRIT_MULTIPLIER = 1.85;

const FACING_ANGLE: Record<Direction, number> = {
  right: 0,
  down: Math.PI / 2,
  left: Math.PI,
  up: -Math.PI / 2,
};

/**
 * Simple melee combat: a swing is an arc in front of the attacker's current
 * facing, gated by a cooldown. Light swings are fast and cheap; heavy swings
 * reach further and hit much harder, but commit you for longer.
 *
 * Direction comes purely from `attacker.direction` - the way the character is
 * already looking. Attacks never turn or move the attacker.
 */
export class CombatSystem {
  private readonly scene: Phaser.Scene;
  private readonly cooldowns: Record<SwingKind, number> = { light: 0, heavy: 0 };
  private readonly durations: Record<SwingKind, number> = { light: 0, heavy: 0 };

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  update(dt: number): void {
    const step = dt * 1000;
    this.cooldowns.light = Math.max(0, this.cooldowns.light - step);
    this.cooldowns.heavy = Math.max(0, this.cooldowns.heavy - step);
    this.durations.light = Math.max(0, this.durations.light - step);
    this.durations.heavy = Math.max(0, this.durations.heavy - step);
  }

  cooldownRemaining(kind: SwingKind): number {
    return this.cooldowns[kind];
  }

  /** 0 when ready, 1 when just used. Drives the HUD sweep. */
  cooldownFraction(kind: SwingKind, weaponId: string): number {
    const def = this.swingDef(kind, weaponId);
    return def.cooldown === 0 ? 0 : this.cooldowns[kind] / def.cooldown;
  }

  /** True while the character is committed to a swing. */
  get busy(): boolean {
    return this.durations.light > 0 || this.durations.heavy > 0;
  }

  canSwing(kind: SwingKind, weaponId: string): { ok: boolean; reason?: string } {
    if (this.durations[kind] > 0) return { ok: false, reason: "Still swinging" };
    if (this.cooldowns[kind] > 0) {
      const seconds = (this.cooldowns[kind] / 1000).toFixed(1);
      return { ok: false, reason: `Recharging (${seconds}s)` };
    }
    void weaponId;
    return { ok: true };
  }

  swing(
    attacker: Actor,
    kind: SwingKind,
    weaponId: string,
    targets: Actor[],
    onHit: (target: Actor, amount: number, crit: boolean) => void,
  ): SwingOutcome {
    const weapon = weaponById(weaponId);
    const def = kind === "light" ? weapon.light : weapon.heavy;

    const check = this.canSwing(kind, weaponId);
    if (!check.ok) {
      return { ok: false, reason: check.reason, kind, weapon, hits: 0, damage: 0, crits: 0 };
    }

    this.cooldowns[kind] = def.cooldown;
    this.durations[kind] = def.duration;

    this.drawSlash(attacker, def, weapon, kind);

    let hits = 0;
    let damage = 0;
    let crits = 0;

    for (const target of targets) {
      if (!this.covers(attacker, def, target)) continue;

      const crit = Math.random() < CRIT_CHANCE;
      const variance = 0.88 + Math.random() * 0.24;
      const amount = Math.max(1, Math.round(def.damage * variance * (crit ? CRIT_MULTIPLIER : 1)));

      onHit(target, amount, crit);
      hits++;
      damage += amount;
      if (crit) crits++;
    }

    return { ok: true, kind, weapon, hits, damage, crits };
  }

  /**
   * Which of `actors` the swing just thrown would have caught. Used for the
   * people a blow lands on without hurting - see systems/CivilianSystem.ts.
   */
  caughtInArc(attacker: Actor, kind: SwingKind, weaponId: string, actors: readonly Actor[]): Actor[] {
    const def = this.swingDef(kind, weaponId);
    return actors.filter((actor) => this.covers(attacker, def, actor));
  }

  /**
   * Whether a swing's arc covers a target, in the direction being faced. Both
   * ends of the measurement use the same body offset, so an actor level with
   * the attacker is neither favoured nor penalised.
   */
  private covers(attacker: Actor, def: SwingDef, target: Actor): boolean {
    if (!target.alive || target === attacker) return false;
    const facing = dirVector(attacker.direction);
    const dx = target.x - attacker.x;
    const dy = target.y - attacker.y;
    const distance = Math.hypot(dx, dy);
    if (distance > def.reach + 16) return false;
    if (distance <= 0.001) return true;
    return (dx / distance) * facing.x + (dy / distance) * facing.y >= Math.cos(def.arc);
  }

  private swingDef(kind: SwingKind, weaponId: string): SwingDef {
    const weapon = weaponById(weaponId);
    return kind === "light" ? weapon.light : weapon.heavy;
  }

  /** Draws the swipe arc in front of the attacker. */
  private drawSlash(attacker: Actor, def: SwingDef, weapon: WeaponDef, kind: SwingKind): void {
    const angle = FACING_ANGLE[attacker.direction];
    const forward = def.reach * 0.55;
    const scale = (def.reach * 2.1) / 72;

    const slash = this.scene.add
      .image(
        attacker.x + Math.cos(angle) * forward,
        attacker.y - ACTOR_BODY_OFFSET - 6 + Math.sin(angle) * forward * 0.6,
        "fx_slash",
      )
      .setRotation(angle)
      .setBlendMode("ADD")
      .setTint(weapon.color)
      .setDepth(attacker.y + 500)
      .setScale(scale * 0.45)
      .setAlpha(kind === "heavy" ? 1 : 0.85);

    this.scene.tweens.add({
      targets: slash,
      scale: scale * (kind === "heavy" ? 1.15 : 1.0),
      alpha: 0,
      duration: kind === "heavy" ? 260 : 180,
      ease: "Cubic.easeOut",
      onComplete: () => slash.destroy(),
    });

    if (kind === "heavy") {
      const burst = this.scene.add
        .image(attacker.x + Math.cos(angle) * forward, attacker.y - ACTOR_BODY_OFFSET - 6, "fx_glow")
        .setBlendMode("ADD")
        .setTint(weapon.color)
        .setDepth(attacker.y + 499)
        .setScale(0.2);
      this.scene.tweens.add({
        targets: burst,
        scale: 0.8,
        alpha: 0,
        duration: 300,
        onComplete: () => burst.destroy(),
      });
      this.scene.cameras.main.shake(120, 0.004);
    }
  }
}
