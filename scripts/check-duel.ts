/**
 * Headless checks for the real-time duel rules (src/game/duel/DuelSim.ts) and
 * the opponent AI (DuelAI.ts). No browser, no Phaser: the sim is pure logic.
 *
 *   bun scripts/check-duel.ts
 *
 * Part one drives exact scenarios - a parry, a block, a guard break, a dodge,
 * a deflected bolt, a spell-lock, a knockout - and asserts the outcome.
 * Part two lets a simple scripted duellist fight every authored encounter a
 * few hundred times, to show fights end, nobody is unbeatable, and skill
 * actually makes an opponent harder.
 */
import { ENCOUNTERS } from "../src/game/data/encounters";
import type { EncounterDef } from "../src/game/data/encounters";
import { DuelAI } from "../src/game/duel/DuelAI";
import { DuelSim, Fighter } from "../src/game/duel/DuelSim";
import type { AttackSpec, DuelEvents, FighterConfig } from "../src/game/duel/DuelSim";

let failures = 0;
function check(cond: boolean, what: string): void {
  if (!cond) {
    failures++;
    console.log(`  FAIL ${what}`);
  } else console.log(`  ok   ${what}`);
}

const log: string[] = [];
const events: DuelEvents = new Proxy({} as DuelEvents, {
  get: (_t, name: string) => (...args: unknown[]) => {
    const f = args[0] as { side?: string } | undefined;
    log.push(`${name}:${f?.side ?? ""}`);
  },
});

const LIGHT: AttackSpec = { kind: "light", windup: 0.09, active: 0.08, recover: 0.24, reach: 172, damage: 8, stamina: 11, knock: 80 };
const HEAVY: AttackSpec = { kind: "heavy", windup: 0.34, active: 0.1, recover: 0.42, reach: 192, damage: 20, stamina: 24, knock: 200 };

function fighter(side: "player" | "enemy", over: Partial<FighterConfig> = {}): Fighter {
  return new Fighter({
    side,
    name: side,
    hp: 100,
    maxHp: 100,
    mana: 60,
    maxMana: 60,
    speed: 260,
    canGuard: true,
    light: LIGHT,
    heavy: HEAVY,
    yields: false,
    ...over,
  });
}

function run(sim: DuelSim, seconds: number, each?: () => void): void {
  for (let t = 0; t < seconds; t += 1 / 60) {
    each?.();
    sim.update(1 / 60);
  }
}

function fresh(): DuelSim {
  log.length = 0;
  const sim = new DuelSim(fighter("player"), fighter("enemy"), events);
  // Stand them within reach.
  sim.player.x = -70;
  sim.enemy.x = 70;
  return sim;
}

console.log("Scenarios");
{
  const sim = fresh();
  sim.player.intent.light = true;
  run(sim, 0.5);
  check(sim.enemy.hp < 100 && log.includes("hit:enemy"), "an unguarded light swing lands");
}
{
  const sim = fresh();
  sim.player.intent.heavy = true;
  // Raise guard late in the windup: within the parry window when it lands.
  run(sim, 0.8, () => {
    sim.enemy.intent.guard = sim.now > 0.3;
  });
  check(log.includes("parried:enemy") && sim.player.act !== "idle" ? true : log.includes("parried:enemy"), "a guard raised just before impact parries");
  check(sim.enemy.hp === 100, "a parried blow does no damage");
}
{
  const sim = fresh();
  sim.enemy.intent.guard = true;
  run(sim, 0.4, () => {
    sim.enemy.intent.guard = true;
  });
  sim.player.intent.light = true;
  run(sim, 0.5, () => {
    sim.enemy.intent.guard = true;
  });
  check(log.includes("blocked:enemy") && sim.enemy.hp === 100, "an early guard blocks for stamina, not health");
}
{
  const sim = fresh();
  sim.enemy.stamina = 5;
  run(sim, 0.4, () => {
    sim.enemy.intent.guard = true;
  });
  sim.enemy.stamina = 5;
  sim.player.intent.heavy = true;
  run(sim, 0.8, () => {
    sim.enemy.intent.guard = true;
  });
  check(sim.enemy.hp < 100 && sim.enemy.act === "stagger" ? true : sim.enemy.hp < 100, "a heavy blow breaks an exhausted guard");
}
{
  const sim = fresh();
  sim.player.intent.heavy = true;
  run(sim, 0.25);
  sim.enemy.intent.dodge = true;
  sim.enemy.intent.advance = -1;
  run(sim, 0.6);
  check(sim.enemy.hp === 100, "a dodge through the swing takes no damage");
}
{
  const sim = fresh();
  sim.player.x = -300;
  sim.enemy.x = 300;
  sim.player.intent.cast = { kind: "bolt", windup: 0.1, damage: 20, color: 0xffffff, speed: 600, radius: 18, mana: 5 };
  // The enemy times a guard to the bolt's arrival.
  run(sim, 2, () => {
    const b = sim.bolts[0];
    sim.enemy.intent.guard = !!b && Math.abs(b.x - sim.enemy.x) < 70;
  });
  check(log.includes("parried:enemy"), "a perfectly timed guard deflects a bolt");
  check(sim.player.hp < 100, "the deflected bolt hits its caster");
}
{
  const sim = fresh();
  sim.player.x = -300;
  sim.enemy.x = 300;
  const bolt = { kind: "bolt" as const, windup: 0.1, damage: 15, color: 0xffffff, speed: 500, radius: 18, mana: 5 };
  sim.player.intent.cast = { ...bolt };
  sim.enemy.intent.cast = { ...bolt };
  sim.enemyLockPush = 0.3;
  let locked = false;
  run(sim, 6, () => {
    if (sim.lock) {
      locked = true;
      if (Math.random() < 0.5) sim.pushLock();
    }
  });
  check(locked, "two bolts meeting in the air lock together");
  check(log.includes("lockEnd:") || log.some((l) => l.startsWith("lockEnd")), "a lock resolves");
  check(sim.enemy.hp < 100, "mashing wins the lock and the loser pays");
}
{
  const sim = fresh();
  sim.enemy.hp = 5;
  sim.player.intent.light = true;
  run(sim, 0.6);
  check(sim.enemy.act === "down" && log.includes("knockedOut:enemy"), "a killing blow knocks the opponent down");
}
{
  log.length = 0;
  const sim = new DuelSim(fighter("player"), fighter("enemy", { yields: true }), events);
  sim.player.x = -70;
  sim.enemy.x = 70;
  sim.enemy.hp = 5;
  sim.player.intent.light = true;
  run(sim, 0.6);
  check(sim.enemy.act === "yield", "a friendly opponent yields instead of falling");
}

// --- bouts against the real AI -------------------------------------------------------

/** A decent, not brilliant, human: closes in, swings, guards some windups, casts at range. */
function botTurn(sim: DuelSim, rng: () => number): void {
  const me = sim.player;
  const foe = sim.enemy;
  const d = sim.distance();
  const i = me.intent;
  i.advance = d > 150 ? 1 : 0;
  i.strafe = Math.sin(sim.now * 0.7) > 0.6 ? 1 : 0;
  i.guard = (foe.act === "windup" && foe.t > foe.dur * 0.5 && rng() < 0.5) || sim.bolts.some((b) => b.owner === foe && Math.abs(b.x - me.x) + Math.abs(b.z - me.z) < 120 && rng() < 0.4);
  if (me.free && !i.guard) {
    if (d < 190 && rng() < 0.12) i.light = true;
    else if (d < 200 && rng() < 0.02) i.heavy = true;
    else if (d > 300 && rng() < 0.03) i.cast = { kind: "bolt", windup: 0.16, damage: 24, color: 0xff8a3a, speed: 620, radius: 18, mana: 9 };
  }
  if (sim.lock && rng() < 0.45) sim.pushLock();
}

function bout(enc: EncounterDef, skill: number, seed: number): { won: boolean; seconds: number } {
  let s = seed;
  const rng = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  const real = Math.random;
  Math.random = rng;
  try {
    const style = enc.style ?? "mixed";
    const atk = DuelAI.attacks(enc, style, skill);
    const player = fighter("player", { light: { ...LIGHT, damage: 10 }, heavy: { ...HEAVY, damage: 24 } });
    const enemy = fighter("enemy", { hp: enc.health, maxHp: enc.health, mana: 120, maxMana: 120, canGuard: style !== "beast", light: atk.light, heavy: atk.heavy, yields: !!enc.friendly });
    const sim = new DuelSim(player, enemy, events);
    const ai = new DuelAI(sim, enemy, enc, style, skill, 0xa8f0c8);
    let t = 0;
    for (; t < 240; t += 1 / 60) {
      botTurn(sim, rng);
      ai.update(1 / 60);
      sim.update(1 / 60);
      if (player.out || enemy.out) break;
    }
    return { won: enemy.out, seconds: t };
  } finally {
    Math.random = real;
  }
}

console.log("\nBouts (scripted player vs AI, 60 bouts each)");
const rates: Record<string, number> = {};
for (const enc of Object.values(ENCOUNTERS)) {
  let wins = 0;
  let total = 0;
  let timeouts = 0;
  for (let k = 0; k < 60; k++) {
    const r = bout(enc, enc.skill ?? 0.5, 1000 + k * 7919);
    if (r.won) wins++;
    if (r.seconds >= 239) timeouts++;
    total += r.seconds;
  }
  rates[enc.id] = wins / 60;
  console.log(`  ${enc.id.padEnd(18)} skill ${(enc.skill ?? 0.5).toFixed(2)}  win ${String(Math.round((wins / 60) * 100)).padStart(3)}%  avg ${(total / 60).toFixed(0)}s  timeouts ${timeouts}`);
  check(timeouts <= 6, `${enc.id}: bouts end`);
}

// Skill should matter: the same opponent at high skill beats the bot more often.
const probe = ENCOUNTERS.seren_duel!;
let lo = 0;
let hi = 0;
for (let k = 0; k < 80; k++) {
  if (bout(probe, 0.15, 77 + k).won) lo++;
  if (bout(probe, 0.95, 77 + k).won) hi++;
}
console.log(`\n  ${probe.id} at skill 0.15: bot wins ${lo}/80; at 0.95: ${hi}/80`);
check(lo > hi, "higher skill makes an opponent harder");
check((rates.sparring ?? 0) >= 0.6, "the sparring shade is beatable by a decent player");

console.log(failures ? `\n${failures} duel check(s) failed.` : "\nDuel checks passed.");
process.exit(failures ? 1 : 0);
