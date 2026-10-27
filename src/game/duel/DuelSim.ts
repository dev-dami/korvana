/**
 * The rules of a real-time duel, with no rendering in them.
 *
 * Two fighters stand on a round floor and act through `Intent`s - the player's
 * come from the keyboard, the opponent's from DuelAI - so both sides obey the
 * same rules: the same windups, the same parry window, the same stamina.
 *
 * The heart of it is timing. Every attack has a windup the other side can
 * read, an instant where it lands, and a recovery where its owner is open.
 * Guarding soaks a blow for stamina; guarding *just* as it lands parries it
 * and leaves the attacker reeling; a dodge at the right moment slips it
 * entirely. Spells follow the same shape, and two bolts that meet in the air
 * lock into a contest of will.
 *
 * The scene listens to `DuelEvents` for everything it should show or play.
 */

export type Side = "player" | "enemy";

export type Act =
  | "idle"
  | "windup"
  | "active"
  | "recover"
  | "dodge"
  | "cast"
  | "stagger"
  | "hurt"
  | "quaff"
  | "lock"
  | "taunt"
  | "down"
  | "yield";

export type AttackKind = "light" | "heavy" | "lunge" | "special";

export interface AttackSpec {
  kind: AttackKind;
  windup: number;
  active: number;
  recover: number;
  reach: number;
  damage: number;
  stamina: number;
  knock: number;
  /** Ground covered during the windup - lunges and heavy steps. */
  step?: number;
  /** Bark shown when it lands, `{d}` replaced by the damage. */
  text?: string;
  /** Pulls out of the windup early: a feint. */
  feintAt?: number;
}

export type CastKind = "bolt" | "nova" | "ward" | "blink";

export interface CastSpec {
  kind: CastKind;
  windup: number;
  damage: number;
  color: number;
  /** World units per second, bolts only. */
  speed: number;
  /** Hit radius in world units (bolts) or blast radius (novas). */
  radius: number;
  mana: number;
  /** Seconds a ward lasts. */
  duration?: number;
  text?: string;
  spellId?: string;
}

export interface Intent {
  /** -1 retreat .. 1 advance, along the line to the opponent. */
  advance: number;
  /** -1 .. 1, circling round the opponent. */
  strafe: number;
  guard: boolean;
  light: boolean;
  heavy: boolean;
  dodge: boolean;
  quaff: boolean;
  cast: CastSpec | null;
  /** A fully specified attack, for AI specials and creature lunges. */
  attack: AttackSpec | null;
  taunt: { seconds: number; text: string } | null;
}

export function emptyIntent(): Intent {
  return {
    advance: 0,
    strafe: 0,
    guard: false,
    light: false,
    heavy: false,
    dodge: false,
    quaff: false,
    cast: null,
    attack: null,
    taunt: null,
  };
}

/** Clears the one-shot commands, keeping held ones (movement, guard). */
function consume(intent: Intent): void {
  intent.light = false;
  intent.heavy = false;
  intent.dodge = false;
  intent.quaff = false;
  intent.cast = null;
  intent.attack = null;
  intent.taunt = null;
}

export interface FighterConfig {
  side: Side;
  name: string;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  /** World units per second, walking. */
  speed: number;
  canGuard: boolean;
  /** Light and heavy swings for keyboard-driven attacks. */
  light: AttackSpec;
  heavy: AttackSpec;
  /** A friendly duel ends in a yield, not a fall. */
  yields: boolean;
}

export class Fighter {
  readonly side: Side;
  readonly name: string;
  readonly cfg: FighterConfig;

  x = 0;
  z = 0;
  y = 0;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  stamina = 100;
  readonly maxStamina = 100;

  act: Act = "idle";
  /** Seconds spent in the current act. */
  t = 0;
  dur = 0;
  attack: AttackSpec | null = null;
  cast: CastSpec | null = null;
  combo = 0;
  private comboQueued = false;
  private struck = false;

  guarding = false;
  guardSince = -10;
  iframesUntil = 0;
  dodgeStart = -10;
  wardUntil = 0;
  wardColor = 0xe8c86a;
  /** Seconds before stamina starts coming back. */
  private staminaDelay = 0;
  vx = 0;
  vz = 0;
  /** Knockback velocity along the axis, decays quickly. */
  knock = 0;
  moving = 0;
  /** -1..1 lateral motion this frame, for animation. */
  strafing = 0;
  tauntText = "";

  readonly intent: Intent = emptyIntent();

  constructor(cfg: FighterConfig) {
    this.cfg = cfg;
    this.side = cfg.side;
    this.name = cfg.name;
    this.hp = cfg.hp;
    this.maxHp = cfg.maxHp;
    this.mana = cfg.mana;
    this.maxMana = cfg.maxMana;
  }

  get out(): boolean {
    return this.act === "down" || this.act === "yield";
  }

  /** True while this fighter can start something new. */
  get free(): boolean {
    return this.act === "idle";
  }

  get warded(): boolean {
    return this.wardUntil > 0;
  }

  spendStamina(amount: number): boolean {
    if (this.stamina <= 0) return false;
    this.stamina = Math.max(0, this.stamina - amount);
    this.staminaDelay = 0.6;
    return true;
  }

  enter(act: Act, dur = 0): void {
    this.act = act;
    this.t = 0;
    this.dur = dur;
  }

  tick(dt: number): void {
    this.t += dt;
    if (this.staminaDelay > 0) this.staminaDelay -= dt;
    else if (!this.guarding) this.stamina = Math.min(this.maxStamina, this.stamina + 38 * dt);
    if (this.guarding) this.stamina = Math.min(this.maxStamina, this.stamina + 10 * dt);
    if (this.wardUntil > 0) this.wardUntil = Math.max(0, this.wardUntil - dt);
    this.mana = Math.min(this.maxMana, this.mana + 3 * dt);
  }

  queueCombo(): void {
    this.comboQueued = true;
  }

  takeQueuedCombo(): boolean {
    const q = this.comboQueued;
    this.comboQueued = false;
    return q;
  }

  markStruck(): boolean {
    if (this.struck) return false;
    this.struck = true;
    return true;
  }

  resetStrike(): void {
    this.struck = false;
  }
}

export interface Bolt {
  owner: Fighter;
  x: number;
  y: number;
  z: number;
  vx: number;
  vz: number;
  spec: CastSpec;
  alive: boolean;
  /** Reflected by a parry: belongs to the other side now. */
  reflected: boolean;
  age: number;
}

/** Two bolts locked in the air, each side pushing. */
export interface SpellLock {
  player: Bolt;
  enemy: Bolt;
  /** -1 (enemy wins) .. 1 (player wins). */
  balance: number;
  t: number;
}

export interface DuelEvents {
  hit(target: Fighter, damage: number, kind: AttackKind | "bolt" | "nova" | "lock", heavy: boolean): void;
  blocked(target: Fighter, broke: boolean, magic: boolean): void;
  parried(target: Fighter, attacker: Fighter, magic: boolean): void;
  evaded(target: Fighter, perfect: boolean): void;
  missed(attacker: Fighter): void;
  wardAbsorbed(target: Fighter): void;
  swing(attacker: Fighter): void;
  windup(attacker: Fighter): void;
  castStart(caster: Fighter): void;
  boltFired(bolt: Bolt): void;
  boltGone(bolt: Bolt, x: number, y: number, z: number): void;
  nova(caster: Fighter): void;
  wardRaised(caster: Fighter): void;
  blink(caster: Fighter, fromX: number, fromZ: number): void;
  dodged(f: Fighter): void;
  quaffed(f: Fighter, healed: number): void;
  lockStart(lock: SpellLock): void;
  lockEnd(lock: SpellLock, winner: Fighter | null, damage: number): void;
  taunt(f: Fighter, text: string): void;
  knockedOut(f: Fighter): void;
  /** Lands a special: show its bark. */
  bark(f: Fighter, text: string): void;
}

export const ARENA_RADIUS = 600;
const PERSONAL_SPACE = 92;
const PARRY_WINDOW = 0.17;
const PERFECT_DODGE = 0.13;
const DODGE_TIME = 0.24;
const DODGE_SPEED = 720;
const FIGHTER_RADIUS = 38;
const BOLT_HEIGHT = 92;
const LOCK_DISTANCE = 64;
const LOCK_TIMEOUT = 7;

export class DuelSim {
  readonly player: Fighter;
  readonly enemy: Fighter;
  readonly bolts: Bolt[] = [];
  lock: SpellLock | null = null;
  now = 0;
  /** Freeze frames on impact, in seconds. */
  hitstop = 0;
  /** 1 = normal; drops for the finishing blow. */
  timeScale = 1;
  over = false;
  /** How hard the enemy pushes in a spell-lock, per second. */
  enemyLockPush = 0.4;
  /** Tonic count, supplied by the scene. */
  tonics: () => number = () => 0;
  useTonic: () => number = () => 0;

  private readonly ev: DuelEvents;

  constructor(player: Fighter, enemy: Fighter, events: DuelEvents) {
    this.player = player;
    this.enemy = enemy;
    this.ev = events;
    player.x = -190;
    player.z = 0;
    enemy.x = 190;
    enemy.z = 0;
  }

  foe(f: Fighter): Fighter {
    return f === this.player ? this.enemy : this.player;
  }

  distance(): number {
    return Math.hypot(this.enemy.x - this.player.x, this.enemy.z - this.player.z);
  }

  /** Unit vector from `f` towards its opponent. */
  axis(f: Fighter): { x: number; z: number } {
    const o = this.foe(f);
    const dx = o.x - f.x;
    const dz = o.z - f.z;
    const d = Math.hypot(dx, dz) || 1;
    return { x: dx / d, z: dz / d };
  }

  /** The player mashing their cast key during a spell-lock. */
  pushLock(): void {
    if (this.lock) this.lock.balance = Math.min(1.2, this.lock.balance + 0.075);
  }

  update(rawDt: number): void {
    if (this.hitstop > 0) {
      this.hitstop -= rawDt;
      return;
    }
    const dt = rawDt * this.timeScale;
    this.now += dt;

    for (const f of [this.player, this.enemy]) this.updateFighter(f, dt);
    this.separate();
    this.updateBolts(dt);
    this.updateLock(dt);
  }

  // --- fighters --------------------------------------------------------------------

  private updateFighter(f: Fighter, dt: number): void {
    f.tick(dt);
    const intent = f.intent;
    const o = this.foe(f);
    const a = this.axis(f);

    // Guard is held, and only from a standing start.
    const wantsGuard = intent.guard && f.cfg.canGuard && (f.act === "idle" || f.act === "recover") && !f.out;
    if (wantsGuard && !f.guarding) f.guardSince = this.now;
    f.guarding = wantsGuard && f.act === "idle";

    if (f.out || this.over) {
      f.vx = f.vz = 0;
      consume(intent);
      return;
    }

    switch (f.act) {
      case "idle":
        this.startSomething(f, intent, a);
        break;
      case "windup": {
        const atk = f.attack!;
        if (atk.step) {
          const step = (atk.step / Math.max(0.05, atk.windup)) * dt;
          f.x += a.x * step;
          f.z += a.z * step;
        }
        if (atk.feintAt !== undefined && f.t >= atk.windup * atk.feintAt) {
          f.attack = null;
          f.enter("idle");
          break;
        }
        if (f.t >= atk.windup) {
          f.enter("active", atk.active);
          f.resetStrike();
          this.ev.swing(f);
        }
        break;
      }
      case "active":
        if (f.markStruck()) this.resolveMelee(f, o);
        if (f.t >= f.dur) f.enter("recover", f.attack!.recover);
        break;
      case "recover":
        if (intent.light && f.combo < 2) f.queueCombo();
        if (f.t >= f.dur) {
          if (f.takeQueuedCombo() && f.attack?.kind === "light" && f.stamina > 0) {
            f.combo++;
            this.beginAttack(f, comboStep(f.cfg.light, f.combo));
          } else {
            f.combo = 0;
            f.attack = null;
            f.enter("idle");
          }
        }
        break;
      case "cast":
        if (f.t >= f.cast!.windup) this.release(f, o, a);
        break;
      case "dodge":
        if (f.t >= f.dur) {
          f.vx = f.vz = 0;
          f.enter("idle");
        }
        break;
      case "stagger":
      case "hurt":
      case "taunt":
        if (f.t >= f.dur) f.enter("idle");
        break;
      case "quaff":
        if (f.t >= 0.7) {
          this.ev.quaffed(f, this.useTonic());
          f.enter("idle");
        }
        break;
      case "lock":
      case "down":
      case "yield":
        break;
    }

    this.move(f, intent, a, dt);
    consume(intent);
  }

  private startSomething(f: Fighter, intent: Intent, a: { x: number; z: number }): void {
    if (intent.taunt) {
      f.tauntText = intent.taunt.text;
      f.enter("taunt", intent.taunt.seconds);
      this.ev.taunt(f, intent.taunt.text);
      return;
    }
    if (intent.dodge && f.spendStamina(20)) {
      let dx = a.x * intent.advance + -a.z * intent.strafe;
      let dz = a.z * intent.advance + a.x * intent.strafe;
      const len = Math.hypot(dx, dz);
      if (len < 0.1) {
        dx = -a.x;
        dz = -a.z;
      } else {
        dx /= len;
        dz /= len;
      }
      f.vx = dx * DODGE_SPEED;
      f.vz = dz * DODGE_SPEED;
      f.iframesUntil = this.now + DODGE_TIME * 0.9;
      f.dodgeStart = this.now;
      f.enter("dodge", DODGE_TIME);
      this.ev.dodged(f);
      return;
    }
    if (intent.attack) {
      if (f.spendStamina(intent.attack.stamina)) this.beginAttack(f, intent.attack);
      return;
    }
    if (intent.cast) {
      const c = intent.cast;
      if (f.mana >= c.mana) {
        f.mana -= c.mana;
        f.cast = c;
        f.enter("cast", c.windup);
        this.ev.castStart(f);
      }
      return;
    }
    if (intent.heavy && f.stamina > 0) {
      f.combo = 0;
      if (f.spendStamina(f.cfg.heavy.stamina)) this.beginAttack(f, f.cfg.heavy);
      return;
    }
    if (intent.light && f.stamina > 0) {
      f.combo = 0;
      if (f.spendStamina(f.cfg.light.stamina)) this.beginAttack(f, f.cfg.light);
      return;
    }
    if (intent.quaff && this.tonics() > 0 && f.side === "player") {
      f.enter("quaff", 0.7);
    }
  }

  private beginAttack(f: Fighter, atk: AttackSpec): void {
    f.attack = atk;
    f.enter("windup", atk.windup);
    this.ev.windup(f);
  }

  private move(f: Fighter, intent: Intent, a: { x: number; z: number }, dt: number): void {
    let speed = 0;
    let adv = 0;
    let str = 0;
    if (f.act === "idle") {
      speed = f.cfg.speed * (f.guarding ? 0.45 : 1);
      adv = intent.advance;
      str = intent.strafe;
    } else if (f.act === "windup" || f.act === "cast") {
      // A little drift while committing, so attacks still track a circling foe.
      speed = f.cfg.speed * 0.25;
      str = intent.strafe;
    }

    let mx = 0;
    let mz = 0;
    if (speed > 0 && (adv !== 0 || str !== 0)) {
      // Circling is slightly slower than walking straight, like real footwork.
      mx = (a.x * adv + -a.z * str * 0.9) * speed;
      mz = (a.z * adv + a.x * str * 0.9) * speed;
    }
    f.moving = Math.hypot(mx, mz) > 1 ? 1 : 0;
    f.strafing = str;

    if (f.act === "dodge") {
      mx += f.vx;
      mz += f.vz;
    }
    if (f.knock !== 0) {
      mx -= a.x * f.knock;
      mz -= a.z * f.knock;
      f.knock *= Math.exp(-dt * 9);
      if (Math.abs(f.knock) < 4) f.knock = 0;
    }

    const o = this.foe(f);
    const before = Math.hypot(o.x - f.x, o.z - f.z);
    f.x += mx * dt;
    f.z += mz * dt;
    // Pure sidestepping circles the opponent at a steady distance instead of
    // spiralling out along the tangent - that is what swings the camera round.
    if (adv === 0 && str !== 0 && f.act === "idle") {
      const dx = f.x - o.x;
      const dz = f.z - o.z;
      const now = Math.hypot(dx, dz) || 1;
      f.x = o.x + (dx / now) * before;
      f.z = o.z + (dz / now) * before;
    }

    const r = Math.hypot(f.x, f.z);
    if (r > ARENA_RADIUS) {
      f.x = (f.x / r) * ARENA_RADIUS;
      f.z = (f.z / r) * ARENA_RADIUS;
    }
  }

  private separate(): void {
    const p = this.player;
    const e = this.enemy;
    const dx = e.x - p.x;
    const dz = e.z - p.z;
    const d = Math.hypot(dx, dz);
    if (d >= PERSONAL_SPACE || d === 0) return;
    const push = (PERSONAL_SPACE - d) / 2;
    p.x -= (dx / d) * push;
    p.z -= (dz / d) * push;
    e.x += (dx / d) * push;
    e.z += (dz / d) * push;
  }

  // --- melee -----------------------------------------------------------------------

  private resolveMelee(attacker: Fighter, target: Fighter): void {
    const atk = attacker.attack!;
    const d = Math.hypot(target.x - attacker.x, target.z - attacker.z);
    if (d > atk.reach + FIGHTER_RADIUS || target.out) {
      this.ev.missed(attacker);
      return;
    }
    const heavy = atk.kind !== "light";

    if (target.iframesUntil > this.now) {
      this.ev.evaded(target, this.now - target.dodgeStart < PERFECT_DODGE + 0.06);
      return;
    }

    if (target.guarding) {
      if (this.now - target.guardSince <= PARRY_WINDOW) {
        attacker.enter("stagger", heavy ? 1.15 : 0.85);
        attacker.knock = 140;
        attacker.combo = 0;
        target.stamina = Math.min(target.maxStamina, target.stamina + 15);
        this.hitstop = 0.11;
        this.ev.parried(target, attacker, false);
        return;
      }
      const cost = atk.damage * (heavy ? 3.2 : 1.6);
      const broke = target.stamina < cost;
      target.spendStamina(cost);
      target.knock = heavy ? 150 : 70;
      if (broke) {
        target.guarding = false;
        target.enter("stagger", 0.85);
        this.damage(target, Math.round(atk.damage * 0.5), atk.kind, heavy);
      }
      this.hitstop = 0.05;
      this.ev.blocked(target, broke, false);
      return;
    }

    if (target.warded) {
      target.wardUntil = 0;
      target.knock = 80;
      this.ev.wardAbsorbed(target);
      return;
    }

    const third = atk.kind === "light" && attacker.combo >= 2;
    const dmg = Math.round(atk.damage * (third ? 1.5 : 1) * (0.9 + Math.random() * 0.2));
    target.knock = atk.knock * (third ? 1.6 : 1);
    this.interrupt(target, heavy || third ? 0.45 : 0.24);
    this.hitstop = heavy ? 0.1 : 0.055;
    if (atk.text) this.ev.bark(attacker, atk.text.replace("{d}", String(dmg)));
    this.damage(target, dmg, atk.kind, heavy || third);
  }

  /** Being hit knocks you out of whatever you were doing. */
  private interrupt(target: Fighter, seconds: number): void {
    if (target.act === "lock") return;
    target.attack = null;
    target.cast = null;
    target.combo = 0;
    target.guarding = false;
    target.enter("hurt", seconds);
  }

  private damage(target: Fighter, amount: number, kind: AttackKind | "bolt" | "nova" | "lock", heavy: boolean): void {
    target.hp = Math.max(0, target.hp - amount);
    this.ev.hit(target, amount, kind, heavy);
    if (target.hp <= 0 && !target.out) {
      target.attack = null;
      target.cast = null;
      target.enter(target.cfg.yields ? "yield" : "down");
      this.ev.knockedOut(target);
    }
  }

  // --- magic -----------------------------------------------------------------------

  private release(f: Fighter, o: Fighter, a: { x: number; z: number }): void {
    const c = f.cast!;
    f.cast = null;
    switch (c.kind) {
      case "bolt": {
        const bolt: Bolt = {
          owner: f,
          x: f.x + a.x * 50,
          y: BOLT_HEIGHT,
          z: f.z + a.z * 50,
          vx: a.x * c.speed,
          vz: a.z * c.speed,
          spec: c,
          alive: true,
          reflected: false,
          age: 0,
        };
        this.bolts.push(bolt);
        this.ev.boltFired(bolt);
        break;
      }
      case "nova": {
        this.ev.nova(f);
        const d = Math.hypot(o.x - f.x, o.z - f.z);
        if (d <= c.radius + FIGHTER_RADIUS && !o.out) {
          if (o.iframesUntil > this.now) this.ev.evaded(o, true);
          else if (o.warded) {
            o.wardUntil = 0;
            this.ev.wardAbsorbed(o);
          } else {
            const dmg = Math.round(c.damage * (o.guarding ? 0.5 : 1));
            o.knock = 260;
            this.interrupt(o, 0.45);
            this.hitstop = 0.08;
            if (c.text) this.ev.bark(f, c.text.replace("{d}", String(dmg)));
            this.damage(o, dmg, "nova", true);
          }
        }
        break;
      }
      case "ward":
        f.wardUntil = c.duration ?? 3.5;
        f.wardColor = c.color;
        this.ev.wardRaised(f);
        break;
      case "blink": {
        const fromX = f.x;
        const fromZ = f.z;
        // Step out to whichever side is further from the arena's edge.
        const side = Math.sign(f.intent.strafe || (Math.random() < 0.5 ? -1 : 1));
        f.x += -a.z * side * 230 - a.x * 60;
        f.z += a.x * side * 230 - a.z * 60;
        f.iframesUntil = this.now + 0.35;
        this.ev.blink(f, fromX, fromZ);
        break;
      }
    }
    f.enter("recover", 0.22);
  }

  private updateBolts(dt: number): void {
    for (const b of this.bolts) {
      if (!b.alive || this.lock) continue;
      b.age += dt;
      const target = this.boltTarget(b);
      // A gentle homing pull, so circling slips a bolt only if it's late.
      const tx = target.x - b.x;
      const tz = target.z - b.z;
      const td = Math.hypot(tx, tz) || 1;
      const sp = Math.hypot(b.vx, b.vz);
      const turn = Math.min(1, dt * 1.6);
      b.vx += ((tx / td) * sp - b.vx) * turn;
      b.vz += ((tz / td) * sp - b.vz) * turn;
      b.x += b.vx * dt;
      b.z += b.vz * dt;

      if (b.age > 3 || Math.hypot(b.x, b.z) > ARENA_RADIUS + 300) {
        this.killBolt(b);
        continue;
      }
      if (td <= b.spec.radius + FIGHTER_RADIUS) this.boltHits(b, target);
    }

    // Two bolts from opposite sides meeting in the air lock together.
    if (!this.lock) {
      const mine = this.bolts.find((b) => b.alive && this.boltSide(b) === "player");
      const theirs = this.bolts.find((b) => b.alive && this.boltSide(b) === "enemy");
      if (mine && theirs && Math.hypot(mine.x - theirs.x, mine.z - theirs.z) < LOCK_DISTANCE + mine.spec.radius) {
        this.lock = { player: mine, enemy: theirs, balance: 0, t: 0 };
        this.player.enter("lock");
        this.enemy.enter("lock");
        this.player.guarding = this.enemy.guarding = false;
        this.ev.lockStart(this.lock);
      }
    }

    for (let i = this.bolts.length - 1; i >= 0; i--) if (!this.bolts[i]!.alive) this.bolts.splice(i, 1);
  }

  private boltSide(b: Bolt): Side {
    return b.reflected ? (b.owner.side === "player" ? "enemy" : "player") : b.owner.side;
  }

  private boltTarget(b: Bolt): Fighter {
    return this.boltSide(b) === "player" ? this.enemy : this.player;
  }

  private boltHits(b: Bolt, target: Fighter): void {
    if (target.out) return;
    if (target.iframesUntil > this.now) {
      // Dodged bolts fly on past; mark it so it can't catch them on the way.
      this.ev.evaded(target, this.now - target.dodgeStart < PERFECT_DODGE + 0.06);
      this.killBolt(b);
      return;
    }
    if (target.warded) {
      target.wardUntil = Math.max(0, target.wardUntil - 1.2);
      this.ev.wardAbsorbed(target);
      this.killBolt(b);
      return;
    }
    if (target.guarding) {
      if (this.now - target.guardSince <= PARRY_WINDOW + 0.04) {
        // A perfect guard throws the spell back the way it came.
        b.reflected = !b.reflected;
        b.vx = -b.vx * 1.25;
        b.vz = -b.vz * 1.25;
        b.age = 0;
        this.hitstop = 0.08;
        this.ev.parried(target, this.foe(target), true);
        return;
      }
      const cost = b.spec.damage * 0.9;
      if (target.mana >= cost) target.mana -= cost;
      else target.spendStamina(cost * 2);
      target.knock = 90;
      this.ev.blocked(target, false, true);
      this.killBolt(b);
      return;
    }
    const dmg = Math.round(b.spec.damage * (0.9 + Math.random() * 0.2) * (b.reflected ? 1.25 : 1));
    target.knock = 150;
    this.interrupt(target, 0.32);
    this.hitstop = 0.06;
    if (b.spec.text && !b.reflected) this.ev.bark(b.owner, b.spec.text.replace("{d}", String(dmg)));
    this.damage(target, dmg, "bolt", b.spec.damage >= 18);
    this.killBolt(b);
  }

  private killBolt(b: Bolt): void {
    if (!b.alive) return;
    b.alive = false;
    this.ev.boltGone(b, b.x, b.y, b.z);
  }

  private updateLock(dt: number): void {
    const lock = this.lock;
    if (!lock) return;
    lock.t += dt;
    // The enemy leans in steadily, with a wobble so it never feels mechanical.
    lock.balance -= (this.enemyLockPush + Math.sin(lock.t * 5.3) * 0.12) * dt;

    let winner: Fighter | null = null;
    if (lock.balance >= 1) winner = this.player;
    else if (lock.balance <= -1) winner = this.enemy;
    else if (lock.t < LOCK_TIMEOUT) return;

    const pool = Math.round((lock.player.spec.damage + lock.enemy.spec.damage) * 1.3);
    lock.player.alive = false;
    lock.enemy.alive = false;
    this.lock = null;
    this.player.enter("idle");
    this.enemy.enter("idle");

    if (winner) {
      const loser = this.foe(winner);
      loser.knock = 320;
      this.interrupt(loser, 0.9);
      this.hitstop = 0.14;
      this.ev.lockEnd(lock, winner, pool);
      this.damage(loser, pool, "lock", true);
    } else {
      // Neither gives: the magic tears loose and throws both of you back.
      this.player.knock = this.enemy.knock = 260;
      this.ev.lockEnd(lock, null, 0);
    }
  }
}

/** The second and third cuts of a light combo come faster, the last hits harder. */
function comboStep(base: AttackSpec, n: number): AttackSpec {
  return {
    ...base,
    windup: base.windup * (n === 2 ? 1.25 : 0.8),
    recover: base.recover * (n === 2 ? 1.6 : 1),
    knock: base.knock * (n === 2 ? 1.8 : 1),
  };
}
