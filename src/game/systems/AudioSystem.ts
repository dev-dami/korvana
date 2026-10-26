import type { MusicZone, SfxName } from "../audio/zones";

type ToneType = OscillatorType;

/** Small procedural audio layer so Korvana has sound without extra asset downloads. */
export class AudioSystem {
  private static instance: AudioSystem | null = null;

  /** The one audio engine. Shared by every scene so music survives restarts. */
  static shared(): AudioSystem {
    AudioSystem.instance ??= new AudioSystem();
    return AudioSystem.instance;
  }

  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private music: GainNode | null = null;
  private sfx: GainNode | null = null;
  private musicTimer: number | null = null;
  private musicStep = 0;
  private zone: MusicZone | null = null;

  unlock(): void {
    const context = this.ensureContext();
    if (!context) return;

    void context.resume();
    if (this.musicTimer !== null) return;

    this.playMusicStep();
    this.musicTimer = window.setInterval(() => this.playMusicStep(), 1200);
  }

  destroy(): void {
    if (this.musicTimer !== null) window.clearInterval(this.musicTimer);
    this.musicTimer = null;
    const context = this.context;
    this.context = null;
    this.master = null;
    this.music = null;
    this.sfx = null;
    if (context) void context.close();
  }

  /**
   * Tells the music where the player is. Cheap to call every frame: it only
   * acts when the zone actually changes.
   */
  setZone(zone: MusicZone): void {
    this.zone = zone;
  }

  get currentZone(): MusicZone | null {
    return this.zone;
  }

  /** Plays a named one-shot effect. */
  playSfx(name: SfxName): void {
    switch (name) {
      case "relic_fanfare":
      case "quest_complete":
      case "level_up":
        this.playReward();
        return;
      case "rumble":
      case "collapse":
      case "stone_grind":
        this.tone(70, 40, 0.6, "sawtooth", 0.1);
        return;
      default:
        this.tone(320, 240, 0.12, "triangle", 0.07);
    }
  }

  playUi(kind: "open" | "select" | "close" | "error"): void {
    const notes = {
      open: [360, 520],
      select: [440, 660],
      close: [420, 280],
      error: [180, 120],
    } as const;
    const [start, end] = notes[kind];
    this.tone(start, end, 0.11, "sine", 0.08);
  }

  playAttack(heavy: boolean, hit: boolean): void {
    if (!hit) {
      this.tone(190, 120, 0.1, "triangle", 0.05);
      return;
    }
    this.tone(heavy ? 110 : 170, heavy ? 70 : 100, heavy ? 0.2 : 0.12, "sawtooth", heavy ? 0.12 : 0.08);
  }

  playSpell(kind = "projectile"): void {
    const notes: Record<string, [number, number]> = {
      projectile: [260, 720],
      nova: [180, 90],
      ward: [420, 820],
      blink: [300, 980],
    };
    const [start, end] = notes[kind] ?? notes.projectile;
    this.tone(start, end, kind === "nova" ? 0.28 : 0.18, "sine", 0.1);
  }

  playDash(): void {
    this.tone(150, 680, 0.16, "triangle", 0.11);
  }

  playPickup(): void {
    this.tone(520, 880, 0.16, "sine", 0.1);
  }

  playHurt(): void {
    this.tone(120, 70, 0.22, "sawtooth", 0.13);
  }

  playHit(): void {
    this.tone(260, 180, 0.07, "square", 0.05);
  }

  playDefeat(): void {
    this.tone(520, 180, 0.35, "triangle", 0.13);
  }

  playReward(): void {
    this.tone(440, 660, 0.12, "sine", 0.08);
    window.setTimeout(() => this.tone(660, 880, 0.18, "sine", 0.08), 105);
  }

  private ensureContext(): AudioContext | null {
    if (this.context) return this.context;
    if (typeof window === "undefined" || typeof window.AudioContext === "undefined") return null;

    this.context = new window.AudioContext();
    this.master = this.context.createGain();
    this.music = this.context.createGain();
    this.sfx = this.context.createGain();
    this.master.gain.value = 0.24;
    this.music.gain.value = 0.18;
    this.sfx.gain.value = 0.8;
    this.music.connect(this.master);
    this.sfx.connect(this.master);
    this.master.connect(this.context.destination);
    return this.context;
  }

  private playMusicStep(): void {
    const context = this.context;
    const music = this.music;
    if (!context || !music) return;

    const melody = [146.83, 174.61, 196, 233.08, 196, 174.61, 130.81, 174.61];
    const note = melody[this.musicStep % melody.length] ?? melody[0]!;
    const when = context.currentTime + 0.02;
    this.tone(note, note * 1.01, 1.05, "sine", 0.09, when, music);
    this.tone(note / 2, note / 2, 1.1, "triangle", 0.045, when, music);
    this.musicStep++;
  }

  private tone(
    startFrequency: number,
    endFrequency: number,
    duration: number,
    type: ToneType,
    volume: number,
    when?: number,
    output?: GainNode,
  ): void {
    const context = this.context;
    const destination = output ?? this.sfx;
    if (!context || !destination) return;

    const start = when ?? context.currentTime;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(startFrequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, endFrequency), start + duration);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.04);
  }
}
