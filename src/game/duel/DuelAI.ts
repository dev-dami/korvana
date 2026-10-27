import type { DuelStyle, EncounterAction, EncounterDef } from "../data/encounters";
import type { AttackSpec, CastSpec, DuelSim, Fighter } from "./DuelSim";

/**
 * The opponent's mind.
 *
 * It only ever sets an Intent, exactly as the keyboard does for the player, so
 * it cannot cheat the rules: its swings have windups, its guard costs stamina,
 * its bolts can be dodged and parried back.
 *
 * Skill (0..1) is the one dial. It shortens reaction time, raises the odds of
 * guarding and parrying, lengthens combos, and unlocks feints and
 * counter-casts. A first-year's sparring shade and Vale at the well run the
 * same code with different numbers.
 *
 * Every few seconds it reaches for one of the encounter's authored actions -
 * the lines the story wrote for this fight - and performs it as a special: a
 * heavy committed attack or a big spell if it deals damage, a taunt that
 * leaves it open if it does not.
 */
export class DuelAI {
  private readonly sim: DuelSim;
  private readonly me: Fighter;
  private readonly enc: EncounterDef;
  readonly style: DuelStyle;
  private readonly skill: number;
  private readonly color: number;
  /** Typical damage of this opponent's authored blows. */
  private readonly base: number;

  private think = 0.6;
  private strafeDir = 1;
  private strafeTimer = 1.5;
  private specialTimer: number;
  private castCooldown = 1.2;
  private reactAt = -1;
  private trackingSwing = false;
  private boltSeen = new WeakSet<object>();
  private guardUntil = 0;
  private comboLeft = 0;
  /** Mixed fighters drift between keeping range and closing in. */
  private wantsClose = true;
  private modeTimer = 4;

  constructor(sim: DuelSim, me: Fighter, enc: EncounterDef, style: DuelStyle, skill: number, color: number) {
    this.sim = sim;
    this.me = me;
    this.enc = enc;
    this.style = style;
    this.skill = Math.max(0, Math.min(1, skill));
    this.color = color;
    const hurting = enc.actions.filter((a) => a.max > 0);
    this.base = hurting.length
      ? hurting.reduce((sum, a) => sum + (a.min + a.max) / 2, 0) / hurting.length
      : 10;
    this.specialTimer = 5 + Math.random() * 3;
    sim.enemyLockPush = 0.22 + this.skill * 0.42;
  }

  /** Light and heavy blows for this opponent, scaled from the encounter's numbers. */
  static attacks(enc: EncounterDef, style: DuelStyle, skill: number): { light: AttackSpec; heavy: AttackSpec } {
    const hurting = enc.actions.filter((a) => a.max > 0);
    const base = hurting.length ? hurting.reduce((s, a) => s + (a.min + a.max) / 2, 0) / hurting.length : 10;
    const quick = 1 - skill * 0.35;
    if (style === "beast") {
      return {
        light: { kind: "lunge", windup: 0.34 * quick, active: 0.1, recover: 0.42, reach: 150, damage: Math.round(base * 0.6), stamina: 10, knock: 110, step: 110 },
        heavy: { kind: "heavy", windup: 0.62 * quick, active: 0.12, recover: 0.6, reach: 170, damage: Math.round(base * 1.05), stamina: 22, knock: 220, step: 150 },
      };
    }
    return {
      light: { kind: "light", windup: 0.26 * quick, active: 0.08, recover: 0.3, reach: style === "magic" ? 120 : 165, damage: Math.round(base * 0.5), stamina: 12, knock: 70 },
      heavy: { kind: "heavy", windup: 0.62 * quick, active: 0.1, recover: 0.48, reach: 185, damage: Math.round(base * 0.95), stamina: 24, knock: 190, step: 40 },
    };
  }

  private get preferredRange(): number {
    switch (this.style) {
      case "magic":
        return 430;
      case "beast":
        return 120;
      case "mixed":
        return this.wantsClose ? 150 : 400;
      default:
        return 145;
    }
  }

  update(dt: number): void {
    const me = this.me;
    const foe = this.sim.foe(me);
    const intent = me.intent;
    if (me.out || this.sim.over) return;

    const dist = this.sim.distance();
    this.think -= dt;
    this.strafeTimer -= dt;
    this.specialTimer -= dt;
    this.castCooldown -= dt;
    this.modeTimer -= dt;

    if (this.strafeTimer <= 0) {
      this.strafeDir = Math.random() < 0.5 ? -1 : 1;
      this.strafeTimer = 1.2 + Math.random() * 2.2;
    }
    if (this.style === "mixed" && this.modeTimer <= 0) {
      this.wantsClose = !this.wantsClose;
      this.modeTimer = 3 + Math.random() * 4;
    }

    // --- reactions: these run every frame, gated by reaction time ---------------
    this.react(foe, dist);
    intent.guard = this.sim.now < this.guardUntil;

    if (!me.free) {
      // Mid-combo: keep pressing if the plan says so.
      if (me.act === "recover" && this.comboLeft > 0 && me.attack?.kind === "light") {
        intent.light = true;
        this.comboLeft--;
      }
      return;
    }

    // --- footwork ----------------------------------------------------------------
    const want = this.preferredRange;
    const tired = me.stamina < 25;
    intent.advance = tired ? -0.6 : dist > want + 40 ? 1 : dist < want - 50 ? -0.8 : 0;
    const lateral = this.style === "magic" ? 0.85 : this.style === "beast" ? 0.7 : 0.45;
    intent.strafe = this.strafeDir * lateral * (dist < want + 120 ? 1 : 0.4);

    if (this.think > 0) return;
    this.think = 0.42 - this.skill * 0.26 + Math.random() * 0.18;

    // --- specials ------------------------------------------------------------------
    if (this.specialTimer <= 0 && dist < 760) {
      this.specialTimer = 7 + Math.random() * 5 - this.skill * 2;
      if (this.special(dist)) return;
    }

    // --- ordinary offence ----------------------------------------------------------
    const reach = me.cfg.light.reach + 25;
    const magicReady = this.castCooldown <= 0 && me.mana >= 8;
    const ranged = this.style === "magic" || (this.style === "mixed" && !this.wantsClose);

    if (ranged && magicReady && dist > 200) {
      intent.cast = this.bolt(1);
      this.castCooldown = 1.6 - this.skill * 0.7 + Math.random() * 0.8;
      return;
    }
    if (this.style === "magic" && dist < 170) {
      // Too close for comfort: blink out if practised, shove if not.
      if (this.skill > 0.45 && me.mana >= 10 && Math.random() < 0.55) intent.cast = this.blinkSpec();
      else if (Math.random() < 0.6) intent.light = true;
      return;
    }
    if (dist <= reach && this.style !== "magic") {
      if (tired) return;
      const roll = Math.random();
      if (roll < 0.5) {
        intent.light = true;
        this.comboLeft = Math.floor(Math.random() * (1 + this.skill * 2.4));
      } else if (roll < 0.74) {
        intent.heavy = true;
      } else if (roll < 0.74 + this.skill * 0.18 && this.style !== "beast") {
        intent.attack = { ...me.cfg.heavy, feintAt: 0.55 + Math.random() * 0.2 };
        this.guardUntil = this.sim.now + 0.9;
      }
    }
  }

  /** Reads the player's windups and bolts, and answers after a human-ish delay. */
  private react(foe: Fighter, dist: number): void {
    const me = this.me;
    const reaction = 0.3 - this.skill * 0.2;

    // Incoming melee.
    if ((foe.act === "windup" || foe.act === "active") && dist < foe.cfg.heavy.reach + 80) {
      // One read per swing: schedule it as the windup begins.
      if (!this.trackingSwing) {
        this.trackingSwing = true;
        this.reactAt = this.sim.now + reaction * (0.7 + Math.random() * 0.6);
      }
      if (this.reactAt >= 0 && this.sim.now >= this.reactAt) {
        this.reactAt = -1;
        if (me.free) {
          const guardOdds = me.cfg.canGuard ? 0.12 + this.skill * 0.62 : 0;
          const dodgeOdds = 0.08 + this.skill * 0.3;
          const r = Math.random();
          if (r < guardOdds) this.guardUntil = this.sim.now + 0.55;
          else if (r < guardOdds + dodgeOdds) {
            me.intent.dodge = true;
            me.intent.advance = -1;
            me.intent.strafe = this.strafeDir;
          }
        }
      }
    } else {
      this.reactAt = -1;
      this.trackingSwing = false;
    }

    // Incoming bolts.
    for (const b of this.sim.bolts) {
      if (!b.alive || this.boltSeen.has(b)) continue;
      const mine = b.reflected ? b.owner === foe : b.owner === me;
      if (mine) continue;
      const d = Math.hypot(b.x - me.x, b.z - me.z);
      if (d > 520) continue;
      this.boltSeen.add(b);
      if (!me.free) continue;
      const r = Math.random();
      const canLock = (this.style === "magic" || this.style === "mixed") && this.skill > 0.35 && me.mana >= 10 && d > 260;
      if (canLock && r < 0.22 + this.skill * 0.3) {
        // Meet it head-on: two bolts in the air become a spell-lock.
        me.intent.cast = { ...this.bolt(1), windup: 0.08 };
        this.castCooldown = 1.2;
      } else if (r < 0.45 + this.skill * 0.25 && me.cfg.canGuard) {
        this.guardUntil = this.sim.now + 0.7;
      } else if (r < 0.7 + this.skill * 0.2) {
        me.intent.dodge = true;
        me.intent.strafe = this.strafeDir;
      }
    }
  }

  /** Performs one of the encounter's authored actions. Returns false if it can't now. */
  private special(dist: number): boolean {
    const action = pick(this.enc.actions);
    if (!action) return false;
    const me = this.me;
    const text = action.text.replace("{name}", this.enc.name);

    if (action.max <= 0) {
      // A line instead of a blow - and a window for the player.
      me.intent.taunt = { seconds: 1.5 + Math.random() * 0.6, text };
      return true;
    }

    const damage = Math.round((action.min + action.max) / 2);
    const spellish = this.style === "magic" || (this.style === "mixed" && dist > 260);
    if (spellish && me.mana >= 12) {
      me.intent.cast = { ...this.bolt(damage / Math.max(1, this.base * 0.75)), windup: 0.7 - this.skill * 0.2, radius: 26, speed: 520, text };
      return true;
    }
    if (dist > me.cfg.heavy.reach + 120 && this.style !== "beast") return false;
    me.intent.attack = {
      ...me.cfg.heavy,
      kind: "special",
      damage,
      windup: me.cfg.heavy.windup * 1.15,
      step: this.style === "beast" ? 170 : 90,
      text,
    };
    return true;
  }

  private bolt(scale: number): CastSpec {
    return {
      kind: "bolt",
      windup: 0.55 - this.skill * 0.22,
      damage: Math.round(this.base * 0.75 * scale),
      color: this.color,
      speed: 560 + this.skill * 180,
      radius: 18,
      mana: 8,
    };
  }

  private blinkSpec(): CastSpec {
    return { kind: "blink", windup: 0.12, damage: 0, color: this.color, speed: 0, radius: 0, mana: 10 };
  }
}

function pick(actions: EncounterAction[]): EncounterAction | undefined {
  const total = actions.reduce((sum, a) => sum + a.weight, 0);
  let roll = Math.random() * total;
  for (const a of actions) {
    roll -= a.weight;
    if (roll <= 0) return a;
  }
  return actions[0];
}
