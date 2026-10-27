import Phaser from "phaser";

import { civilianProfile, isAmbient, RANK_DEFAULTS } from "../data/civilians";
import type { ChallengeRank, CivilianProfile } from "../data/civilians";
import { DUEL_ENDED, registerEncounter } from "../data/encounters";
import type { DuelArena, DuelLaunch, DuelResult, EncounterDef } from "../data/encounters";
import type { SwingKind } from "../data/weapons";
import type { Actor } from "../entities/Actor";
import { NPC } from "../entities/NPC";
import type { Bystanders } from "../entities/Projectile";
import { Flee, Standoff } from "../entities/Reactions";
import { barkText } from "../gfx/FloatingText";
import type { WorldScene } from "../scenes/WorldScene";

/** Encounter ids for civilian challenges: `challenge_<npcId>`. */
export const CHALLENGE_PREFIX = "challenge_";

/** One swing can clip someone over several frames; it still only counts once. */
const MELEE_GRACE = 1.2;
/** Seconds after a duel before the same person will answer another hex with one. */
const CHALLENGE_REST = 45;
/** The beat between "Wand up!" and the duel opening: long enough to read, short enough to sting. */
const WINDUP = 0.9;
/** If the overlay has not taken over this long after launching, it never will. */
const LAUNCH_TIMEOUT = 2;
/** Affinity lost by a story character for being clouted. */
const MELEE_AFFINITY = -3;
/** A friendly duel never leaves you below this much health. */
const FRIENDLY_FLOOR = 0.3;
const BARK_LIFE = 2.1;
/** How high a bark sits above the speaker's feet. */
const BARK_HEIGHT = 46;

interface Bark {
  text: Phaser.GameObjects.Text;
  speaker: Actor;
  age: number;
  life: number;
}

interface Challenge {
  npc: NPC;
  profile: CivilianProfile;
  line: string;
  /** Counts down the windup, then up while waiting for the overlay. */
  timer: number;
  launched: boolean;
}

const VICTORY_TEXT: Record<ChallengeRank, (name: string) => string> = {
  faculty: (name) => `${name} lowers their wand and inclines their head. A point, fairly won.`,
  student: (name) => `${name} sits down hard, laughing, and holds up both hands.`,
  civilian: (name) => `${name} puffs, wheezes, and waves a hand in surrender.`,
};

const DEFEAT_TEXT: Record<ChallengeRank, (name: string) => string> = {
  faculty: (name) => `You are on the ground before you see it coming. ${name} helps you up and dusts you off.`,
  student: (name) => `You land on your backside. ${name} offers you a hand up, grinning.`,
  civilian: (name) => `Somehow you have lost to ${name}, who looks as surprised as you are.`,
};

function pick(lines: readonly string[], fallback = "Oi!"): string {
  return lines[Math.floor(Math.random() * lines.length)] ?? fallback;
}

/**
 * How the Academy's people answer being struck.
 *
 * A blow - light or heavy, any weapon - is an outrage: they yelp and run (see
 * entities/Reactions.ts), and never fight back. A spell is an invitation: they
 * stop, face you, shout a challenge and, a beat later, the duel overlay opens
 * with a friendly encounter built on the spot from who they are. Nobody here
 * is ever damaged, and losing a friendly duel costs pride and pocket money.
 *
 * Hooks: WorldScene calls onMeleeArc after a swing and update every frame;
 * SpellSystem calls onSpellHit (via `bystanders`) when a bolt or nova touches
 * an NPC. The outcome comes back on `korvana:duel-ended`.
 */
export class CivilianSystem implements Bystanders {
  private readonly scene: WorldScene;
  private readonly meleeGrace = new Map<string, number>();
  private readonly challengeRest = new Map<string, number>();
  private barks: Bark[] = [];
  private challenge: Challenge | null = null;
  private readonly onDuelEnded = (result: DuelResult): void => this.settle(result);

  constructor(scene: WorldScene) {
    this.scene = scene;
    scene.game.events.on(DUEL_ENDED, this.onDuelEnded);
    scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.destroy());
  }

  /** Everyone a spell can touch without harming. */
  get actors(): readonly Actor[] {
    return this.scene.npcs;
  }

  /** While someone squares up to you, you stand and face them. */
  get holdingPlayer(): boolean {
    return this.challenge !== null;
  }

  // --- hooks -------------------------------------------------------------

  /**
   * After a swing has been thrown. Returns how many people it caught, so the
   * scene does not call a blow that landed on someone a miss.
   */
  onMeleeArc(kind: SwingKind, weaponId: string): number {
    const caught = this.scene.combat.caughtInArc(this.scene.player, kind, weaponId, this.scene.npcs);
    for (const actor of caught) {
      if (!(actor instanceof NPC) || (this.meleeGrace.get(actor.id) ?? 0) > 0) continue;
      this.meleeGrace.set(actor.id, MELEE_GRACE);
      if (this.challenge?.npc === actor) continue;

      const profile = civilianProfile(actor.id);
      const reaction = profile.onMelee ?? "flee";
      if (reaction !== "flee") {
        if (reaction === "absorb") actor.flash(0xffe9a8);
        this.bark(actor, profile.meleeLine ?? "...", profile.color);
        continue;
      }

      this.frighten(actor, profile, pick(profile.voice.yelp));
      // The ambient cast has no story to sour; the named characters remember.
      if (!isAmbient(actor.id)) {
        this.scene.state.adjustRelationship(actor.id, MELEE_AFFINITY);
        this.toast(`${MELEE_AFFINITY} with ${actor.name}`);
      }
    }
    return caught.length;
  }

  /** A spell touched someone. True stops a bolt; false lets it fly on through. */
  onSpellHit(actor: Actor, _spellId: string): boolean {
    if (!(actor instanceof NPC)) return true;
    const profile = civilianProfile(actor.id);

    switch (profile.onSpell ?? "duel") {
      case "pass":
        this.bark(actor, profile.spellLine ?? "...", profile.color);
        return false;
      case "absorb":
        actor.flash(0xffe9a8);
        this.bark(actor, profile.spellLine ?? "...", profile.color);
        return true;
      case "decline":
        actor.flash(0xd8f0ff);
        if (actor.approachable) actor.turnTo(this.scene.player);
        this.bark(actor, profile.spellLine ?? "No.", profile.color);
        return true;
      case "flee":
        this.frighten(actor, profile, profile.spellLine ?? pick(profile.voice.yelp));
        return true;
      case "duel":
        this.answer(actor, profile);
        return true;
    }
  }

  update(dt: number): void {
    for (const timers of [this.meleeGrace, this.challengeRest]) {
      for (const [id, left] of timers) {
        if (left - dt <= 0) timers.delete(id);
        else timers.set(id, left - dt);
      }
    }
    this.updateChallenge(dt);
    this.updateBarks(dt);
  }

  // --- challenges ----------------------------------------------------------

  /** A spell landed on someone who duels. Whether they actually do depends on the moment. */
  private answer(npc: NPC, profile: CivilianProfile): void {
    if (this.challenge) {
      // Someone else is already squaring up; anyone caught in the crossfire gets out of the way.
      if (this.challenge.npc !== npc) this.frighten(npc, profile, pick(profile.voice.yelp));
      return;
    }
    if (this.blocked) {
      // A bolt still in flight when a conversation or a door takes over: a flinch, nothing more.
      npc.flash(0xffffff);
      this.bark(npc, pick(profile.voice.yelp), profile.color);
      return;
    }
    if ((this.challengeRest.get(npc.id) ?? 0) > 0) {
      // Spamming hexes does not chain duels. It just gets you a reputation.
      this.frighten(npc, profile, pick(profile.voice.refuse, "Not again."));
      return;
    }

    const line = pick(profile.voice.challenge, "Wand up!");
    const player = this.scene.player;
    npc.reaction = new Standoff(player);
    npc.turnTo(player);
    npc.flash(0xfff1b8);
    npc.strikePose("cast", WINDUP * 1000 + 300);
    player.turnTo(npc);
    this.bark(npc, line, profile.color, WINDUP + 1.2);
    this.scene.cameras.main.shake(160, 0.0035);
    this.scene.audio.playUi("open");
    this.challenge = { npc, profile, line, timer: WINDUP, launched: false };
  }

  private updateChallenge(dt: number): void {
    const c = this.challenge;
    if (!c) return;
    if (!c.npc.alive) {
      this.challenge = null;
      return;
    }
    if (c.launched) {
      // The world pauses once the overlay is up, so this only runs during the
      // fade - or if the overlay never opened at all.
      c.timer += dt;
      if (c.timer > LAUNCH_TIMEOUT) this.cancel();
      return;
    }
    if (this.blocked) {
      this.cancel();
      return;
    }
    c.timer -= dt;
    if (c.timer <= 0) this.launch(c);
  }

  private launch(c: Challenge): void {
    const encounter = this.buildEncounter(c.npc, c.profile, c.line);
    registerEncounter(encounter);
    this.clearBarks(c.npc);
    this.scene.dialogue.end();
    this.scene.transition.openOverlay("battle", { encounter: encounter.id, challenger: c.npc.id } satisfies DuelLaunch);
    c.launched = true;
    c.timer = 0;
  }

  /**
   * The friendly duel, built from whoever was hit. Ranks set the baseline -
   * professors are a wall, students a fair fight, the groundskeeper a kindness
   * - and each person adds their own moves and lines on top.
   */
  private buildEncounter(npc: NPC, profile: CivilianProfile, line: string): EncounterDef {
    const base = RANK_DEFAULTS[profile.rank];
    return {
      id: `${CHALLENGE_PREFIX}${npc.id}`,
      name: npc.name,
      look: npc.lookKey,
      health: profile.health ?? base.health,
      gold: profile.gold ?? base.gold,
      actions: [...base.moves, ...(profile.moves ?? [])],
      style: "magic",
      skill: profile.skill ?? base.skill,
      arena: this.arenaHere(),
      friendly: true,
      openingLine: line,
      yieldLine: pick(profile.voice.concede, "All right. You win."),
      victoryText: profile.victoryText ?? VICTORY_TEXT[profile.rank](npc.name),
      defeatText: profile.defeatText ?? DEFEAT_TEXT[profile.rank](npc.name),
    };
  }

  private arenaHere(): DuelArena {
    if (this.scene.mechanisms.currentLevelId === "academy_interior") return "hall";
    const biome = this.scene.world.biomeNameAtPixel(this.scene.player.x, this.scene.player.y);
    if (biome === "crypt" || biome === "scar" || biome === "forest") return biome;
    return "courtyard";
  }

  /** The duel is over: settle up, then let them get on with their day. */
  private settle(result: DuelResult): void {
    if (!result.challenger || !result.encounter.startsWith(CHALLENGE_PREFIX)) return;
    this.challenge = null;

    const id = result.challenger;
    const profile = civilianProfile(id);
    const npc = this.scene.npcs.find((n) => n.id === id && n.alive);
    const name = npc?.name ?? id;
    const state = this.scene.state;
    this.challengeRest.set(id, CHALLENGE_REST);
    // Only the latest result is remembered, so a rematch changes what they say.
    state.setFlag(`duel_won_${id}`, result.victory);
    state.setFlag(`duel_lost_${id}`, !result.victory);

    if (result.victory) {
      const respect = isAmbient(id) ? 0 : (profile.respect ?? 0);
      if (respect !== 0) {
        state.adjustRelationship(id, respect);
        this.toast(`+${respect} with ${name}`);
      }
      if (npc) this.bark(npc, pick(profile.voice.concede, "You win."), profile.color, 2.8);
    } else {
      const player = state.player;
      const floor = Math.ceil(player.maxHealth * Math.max(FRIENDLY_FLOOR, profile.mend ?? 0));
      player.health = Math.max(player.health, floor);
      const fee = Math.min(player.gold, profile.fee ?? RANK_DEFAULTS[profile.rank].fee);
      if (profile.rank === "student" && fee > 0) {
        player.gold -= fee;
        this.toast(`${name} pockets ${fee} gold. A winner's fee.`);
      }
      if (npc) this.bark(npc, pick(profile.voice.gloat, "Better luck next time."), profile.color, 2.8);
    }
    npc?.settle();
  }

  private cancel(): void {
    const c = this.challenge;
    this.challenge = null;
    if (!c) return;
    this.clearBarks(c.npc);
    if (c.npc.alive) c.npc.settle();
  }

  /**
   * Moments a duel must not interrupt: a cutscene, a conversation, a panel, a
   * door mid-fade, a fall, a boulder at your back.
   */
  private get blocked(): boolean {
    const s = this.scene;
    return (
      s.cutscenes.active ||
      s.dialogue.active ||
      s.inventoryOpen ||
      s.journalOpen ||
      s.spellbookOpen ||
      s.isPaused ||
      s.transition.transitioning ||
      s.mechanisms.inSequence
    );
  }

  // --- fleeing -----------------------------------------------------------

  private frighten(npc: NPC, profile: CivilianProfile, line: string): void {
    npc.flash(0xff9a7a);
    this.bark(npc, line, profile.color);
    npc.reaction = new Flee(this.scene.player, npc.home, npc.speed);
  }

  // --- barks -------------------------------------------------------------

  /** One line at a time per speaker: a new bark replaces the last. */
  private bark(speaker: Actor, message: string, color?: string, life = BARK_LIFE): void {
    this.clearBarks(speaker);
    const text = barkText(this.scene, speaker.x, speaker.y - BARK_HEIGHT, message, color);
    this.barks.push({ text, speaker, age: 0, life });
  }

  private updateBarks(dt: number): void {
    if (this.barks.length === 0) return;
    let finished = false;
    for (const bark of this.barks) {
      bark.age += dt;
      const t = bark.age / bark.life;
      if (t >= 1 || !bark.speaker.alive) {
        bark.text.destroy();
        finished = true;
        continue;
      }
      // Follows the speaker (they may be running), rises a little, fades at the end.
      bark.text
        .setPosition(Math.round(bark.speaker.x), Math.round(bark.speaker.y - BARK_HEIGHT - Math.min(1, t * 3) * 10))
        .setAlpha(t < 0.75 ? 1 : (1 - t) / 0.25);
    }
    if (finished) this.barks = this.barks.filter((bark) => bark.age < bark.life && bark.speaker.alive);
  }

  private clearBarks(speaker: Actor): void {
    const kept: Bark[] = [];
    for (const bark of this.barks) {
      if (bark.speaker === speaker) bark.text.destroy();
      else kept.push(bark);
    }
    this.barks = kept;
  }

  private toast(message: string): void {
    this.scene.game.events.emit("korvana:toast", message);
  }

  private destroy(): void {
    this.scene.game.events.off(DUEL_ENDED, this.onDuelEnded);
    for (const bark of this.barks) bark.text.destroy();
    this.barks = [];
    this.challenge = null;
  }
}
