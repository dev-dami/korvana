import { bedForZone } from "../audio/Ambience";
import type { Volumes } from "../audio/Mixer";
import { buildRig } from "../audio/Rig";
import type { AudioRig } from "../audio/Rig";
import { THEMES } from "../audio/themes";
import type { MusicZone, SfxName } from "../audio/zones";

/** Zones that cut in at once: a fight should not wait for a fade. */
const COMBAT: ReadonlySet<MusicZone> = new Set<MusicZone>(["battle", "boss"]);
/** A new place must hold this long before its theme takes over, so a wobbly border does not ping-pong. */
const ZONE_DEBOUNCE_MS = 1500;
/** How often the scheduler wakes, and how far ahead it books notes. */
const TICK_MS = 50;
const LOOKAHEAD_SECONDS = 0.3;
/** Timers are throttled in background tabs; book further ahead there. */
const HIDDEN_LOOKAHEAD_SECONDS = 1.5;
/** How reverberant each zone is for effects (1 = open air). */
const SPACE: Partial<Record<MusicZone, number>> = { tomb: 2.4, scar: 1.5, forest: 1.2 };
/** Night is dusk to dawn on the game clock (0 = midnight, 0.5 = noon). */
const NIGHT_START = 0.81;
const NIGHT_END = 0.23;
const STORAGE_KEY = "korvana.audio";

interface StoredSettings {
  volumes?: Partial<Volumes>;
  muted?: boolean;
}

/**
 * The game's one audio engine: an adaptive score, ambience beds and layered
 * effects, all synthesised live with Web Audio (see src/game/audio/).
 *
 * Scenes talk to it in game terms - "the player is in the forest", "a lever
 * was pulled" - and it decides what that sounds like. Nothing is created until
 * `unlock()`, which must follow a user gesture to satisfy browser autoplay
 * rules; calls before that are remembered (zone, volumes) or dropped (effects).
 */
export class AudioSystem {
  private static instance: AudioSystem | null = null;

  /** The one audio engine. Shared by every scene so music survives restarts. */
  static shared(): AudioSystem {
    AudioSystem.instance ??= new AudioSystem();
    return AudioSystem.instance;
  }

  private context: AudioContext | null = null;
  private rig: AudioRig | null = null;
  private timer: number | null = null;

  /** What the scene last reported. */
  private reported: MusicZone | null = null;
  /**
   * Zones that override the reports for a while (a duel, the ending), keyed
   * by whoever holds them so each caller only ever releases its own. The most
   * recent hold wins.
   */
  private readonly holds = new Map<string, MusicZone>();
  /** What the score is playing or crossfading to. */
  private playing: MusicZone | null = null;
  private pending: MusicZone | null = null;
  private pendingSince = 0;
  private night = false;

  private volumes: Volumes = { master: 1, music: 1, sfx: 1, ambience: 1 };
  private muted = false;

  private constructor() {
    this.loadSettings();
  }

  unlock(): void {
    const context = this.ensureContext();
    if (!context) return;
    if (context.state === "suspended" && !document.hidden) void context.resume();
    if (this.timer !== null) return;

    this.timer = window.setInterval(() => this.tick(), TICK_MS);
    document.addEventListener("visibilitychange", this.onVisibility);
    this.reconsider();
    this.tick();
  }

  destroy(): void {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.rig?.music.dispose();
    this.rig?.ambience.dispose();
    this.rig = null;
    this.playing = null;
    this.pending = null;
    const context = this.context;
    this.context = null;
    if (context) void context.close();
  }

  /**
   * Tells the music where the player is. Cheap to call every frame: it only
   * acts when the zone actually changes, and waits for a new place to settle.
   */
  setZone(zone: MusicZone): void {
    if (zone === this.reported) return;
    this.reported = zone;
    this.reconsider();
  }

  /** The zone the score is following: a hold if there is one, else the last report. */
  get currentZone(): MusicZone | null {
    return this.held ?? this.reported;
  }

  private get held(): MusicZone | null {
    let latest: MusicZone | null = null;
    for (const zone of this.holds.values()) latest = zone;
    return latest;
  }

  /**
   * Pins the music to `zone` regardless of reports until released with null -
   * for a duel scene, or a cutscene that has its own theme. While held, the
   * world's reports are still recorded, so releasing returns to the right place.
   *
   * `owner` names the hold, so a scene that releases its hold every frame
   * cannot clear one somebody else set. Cheap to call every frame.
   */
  holdZone(zone: MusicZone | null, owner = "default"): void {
    if ((this.holds.get(owner) ?? null) === zone) return;
    // Re-inserting moves the hold to the end: the newest hold wins.
    this.holds.delete(owner);
    if (zone) this.holds.set(owner, zone);
    this.reconsider();
  }

  /** The game clock, 0 = midnight. Switches birdsong for crickets and owls after dark. */
  setTimeOfDay(dayFraction: number): void {
    const night = dayFraction >= NIGHT_START || dayFraction < NIGHT_END;
    if (night === this.night) return;
    this.night = night;
    this.rig?.ambience.setNight(night);
  }

  /** Each value 0..1; omitted ones are left as they are. Remembered between sessions. */
  setVolumes(volumes: Partial<Volumes>): void {
    this.setVolumesSilently(volumes);
    this.rig?.mixer.setVolumes(this.volumes);
    this.saveSettings();
  }

  getVolumes(): Volumes {
    return { ...this.volumes };
  }

  /** Mutes or unmutes everything; returns the new state. */
  toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.rig?.mixer.setMuted(muted);
    this.saveSettings();
  }

  get isMuted(): boolean {
    return this.muted;
  }

  /** Plays a named one-shot effect. */
  playSfx(name: SfxName): void {
    this.rig?.sfx.play(name);
  }

  playUi(kind: "open" | "select" | "close" | "error"): void {
    this.rig?.sfx.ui(kind);
  }

  playAttack(heavy: boolean, hit: boolean): void {
    this.rig?.sfx.attack(heavy, hit);
  }

  playSpell(kind = "projectile"): void {
    this.rig?.sfx.spell(kind);
  }

  playDash(): void {
    this.rig?.sfx.dash();
  }

  playPickup(): void {
    this.rig?.sfx.pickup();
  }

  playHurt(): void {
    this.rig?.sfx.hurt();
  }

  playHit(): void {
    this.rig?.sfx.hit();
  }

  playDefeat(): void {
    this.rig?.sfx.defeat();
  }

  playReward(): void {
    this.rig?.sfx.reward();
  }

  // --- internals ----------------------------------------------------------

  private ensureContext(): AudioContext | null {
    if (this.context) return this.context;
    if (typeof window === "undefined" || typeof window.AudioContext === "undefined") return null;

    this.context = new window.AudioContext({ latencyHint: "interactive" });
    this.rig = buildRig(this.context);
    this.rig.mixer.setVolumes(this.volumes);
    this.rig.mixer.setMuted(this.muted);
    this.rig.ambience.setNight(this.night);
    return this.context;
  }

  /** Decides whether the score should change now, after a settle, or not at all. */
  private reconsider(): void {
    const want = this.held ?? this.reported;
    if (!want || !this.rig) return;
    if (want === this.playing) {
      this.pending = null;
      return;
    }
    const immediate =
      this.playing === null ||
      this.held !== null ||
      COMBAT.has(want) ||
      COMBAT.has(this.playing) ||
      want === "title" ||
      this.playing === "title" ||
      this.playing === "ending";
    if (immediate) {
      this.switchTo(want);
    } else if (this.pending !== want) {
      this.pending = want;
      this.pendingSince = performance.now();
    }
  }

  private switchTo(zone: MusicZone): void {
    const rig = this.rig;
    if (!rig) return;
    const from = this.playing;
    this.playing = zone;
    this.pending = null;

    const toCombat = COMBAT.has(zone);
    const fromCombat = from !== null && COMBAT.has(from);
    // Into a fight: snap. Out of one: a quicker fade than travel, so the
    // world comes back while the victory is still sinking in.
    const fadeIn = from === null ? 1.5 : toCombat ? 0.25 : fromCombat ? 2 : 3;
    const fadeOut = toCombat ? 0.6 : fromCombat ? 1.5 : 3;
    rig.music.play(zone, THEMES[zone], fadeIn, fadeOut);

    // A fight keeps the place it happens in, just quieter.
    rig.ambience.duck(toCombat);
    if (!toCombat) {
      rig.ambience.setBed(bedForZone(zone));
      rig.mixer.setSpace(SPACE[zone] ?? 1);
    }
  }

  private tick(): void {
    const rig = this.rig;
    const context = this.context;
    if (!rig || !context) return;
    if (this.pending && performance.now() - this.pendingSince >= ZONE_DEBOUNCE_MS) this.switchTo(this.pending);
    const until = context.currentTime + (document.hidden ? HIDDEN_LOOKAHEAD_SECONDS : LOOKAHEAD_SECONDS);
    rig.music.schedule(until);
    rig.ambience.schedule(until);
  }

  /** A hidden tab is suspended outright: no throttled-timer stutter, no CPU. */
  private readonly onVisibility = (): void => {
    const context = this.context;
    if (!context) return;
    if (document.hidden) void context.suspend();
    else void context.resume();
  };

  private loadSettings(): void {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const stored = JSON.parse(raw) as StoredSettings;
      if (stored.volumes) this.setVolumesSilently(stored.volumes);
      this.muted = stored.muted === true;
    } catch {
      // Private windows and blocked storage: defaults are fine.
    }
  }

  private setVolumesSilently(volumes: Partial<Volumes>): void {
    for (const key of ["master", "music", "sfx", "ambience"] as const) {
      const value = volumes[key];
      if (typeof value === "number" && Number.isFinite(value)) this.volumes[key] = Math.max(0, Math.min(1, value));
    }
  }

  private saveSettings(): void {
    try {
      const stored: StoredSettings = { volumes: this.volumes, muted: this.muted };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
    } catch {
      // Ignored for the same reason.
    }
  }
}
