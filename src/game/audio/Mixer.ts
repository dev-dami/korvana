import { makeImpulse, softClipCurve, SOFT_CLIP_INPUT_SCALE } from "./Kit";

/**
 * The console every sound plugs into.
 *
 *   music ───┐
 *   ambience ┼─> mix ─> compressor ─> soft clip ─> master ─> speakers
 *   sfx ─────┤    ^
 *   sfxHall ─┘    └── reverb return <── convolver <── sends
 *
 * Music and ambience layers send to the reverb themselves; effects pick a
 * dry bus (a touch of room) or the hall bus (a lot of it). The compressor
 * gently holds a busy fight together, and the soft clipper is a safety net:
 * transparent at normal levels, it means a pile-up can never hard-clip.
 */

export interface Volumes {
  master: number;
  music: number;
  sfx: number;
  ambience: number;
}

/** Fixed trims under the user's sliders: music sits back, effects are clear. */
const TRIM = { master: 0.9, music: 0.55, sfx: 0.8, ambience: 0.8 } as const;
/** How much room the two effect buses get in an ordinary, open-air space. */
const SFX_SEND = { dry: 0.1, hall: 0.4 } as const;

export class Mixer {
  readonly music: GainNode;
  readonly ambience: GainNode;
  /** Effects with a touch of room. */
  readonly sfx: GainNode;
  /** Effects that should bloom: magic, chimes, fanfares. */
  readonly sfxHall: GainNode;
  /** Reverb send for music layers; follows the music volume so a muted score leaves no echo. */
  readonly musicReverb: GainNode;
  /** Reverb send for ambience, likewise. */
  readonly ambienceReverb: GainNode;

  private readonly reverb: GainNode;

  private readonly master: GainNode;
  private readonly sfxDrySend: GainNode;
  private readonly sfxHallSend: GainNode;
  private volumes: Volumes = { master: 1, music: 1, sfx: 1, ambience: 1 };
  private muted = false;

  private readonly ctx: BaseAudioContext;

  constructor(ctx: BaseAudioContext) {
    this.ctx = ctx;
    const mix = ctx.createGain();

    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.value = -16;
    compressor.knee.value = 12;
    compressor.ratio.value = 3;
    compressor.attack.value = 0.012;
    compressor.release.value = 0.25;

    const preClip = ctx.createGain();
    preClip.gain.value = SOFT_CLIP_INPUT_SCALE;
    const clip = ctx.createWaveShaper();
    clip.curve = softClipCurve();

    this.master = ctx.createGain();
    mix.connect(compressor).connect(preClip).connect(clip).connect(this.master).connect(ctx.destination);

    // Low end in a reverb is mud: drones and bass would smear into a roar.
    this.reverb = ctx.createGain();
    const reverbHighpass = ctx.createBiquadFilter();
    reverbHighpass.type = "highpass";
    reverbHighpass.frequency.value = 220;
    const convolver = ctx.createConvolver();
    convolver.buffer = makeImpulse(ctx, 3.2, 0.7);
    const reverbReturn = ctx.createGain();
    reverbReturn.gain.value = 0.85;
    this.reverb.connect(reverbHighpass).connect(convolver).connect(reverbReturn).connect(mix);

    this.music = ctx.createGain();
    this.ambience = ctx.createGain();
    this.musicReverb = ctx.createGain();
    this.ambienceReverb = ctx.createGain();
    this.musicReverb.connect(this.reverb);
    this.ambienceReverb.connect(this.reverb);
    this.sfx = ctx.createGain();
    this.sfxHall = ctx.createGain();
    this.music.connect(mix);
    this.ambience.connect(mix);
    this.sfx.connect(mix);
    this.sfxHall.connect(this.sfx);

    this.sfxDrySend = ctx.createGain();
    this.sfxHallSend = ctx.createGain();
    this.sfx.connect(this.sfxDrySend).connect(this.reverb);
    this.sfxHall.connect(this.sfxHallSend).connect(this.reverb);
    this.setSpace(1);

    this.apply(0);
  }

  get current(): Volumes {
    return { ...this.volumes };
  }

  get isMuted(): boolean {
    return this.muted;
  }

  setVolumes(volumes: Partial<Volumes>): void {
    for (const key of ["master", "music", "sfx", "ambience"] as const) {
      const value = volumes[key];
      if (typeof value === "number" && Number.isFinite(value)) this.volumes[key] = Math.max(0, Math.min(1, value));
    }
    this.apply(0.08);
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.apply(0.12);
  }

  /**
   * How reverberant the player's surroundings are, 1 being open air. Stone
   * rooms push effects further into the reverb so a lever echoes in a tomb.
   */
  setSpace(amount: number, seconds = 2): void {
    const now = this.ctx.currentTime;
    this.sfxDrySend.gain.setTargetAtTime(SFX_SEND.dry * amount, now, seconds / 3);
    this.sfxHallSend.gain.setTargetAtTime(SFX_SEND.hall * Math.min(1.6, amount), now, seconds / 3);
  }

  private apply(seconds: number): void {
    const now = this.ctx.currentTime;
    const set = (param: AudioParam, value: number): void => {
      if (seconds <= 0) param.value = value;
      else param.setTargetAtTime(value, now, seconds / 3);
    };
    set(this.master.gain, this.muted ? 0 : this.volumes.master * TRIM.master);
    set(this.music.gain, this.volumes.music * TRIM.music);
    set(this.musicReverb.gain, this.volumes.music * TRIM.music);
    set(this.sfx.gain, this.volumes.sfx * TRIM.sfx);
    set(this.ambience.gain, this.volumes.ambience * TRIM.ambience);
    set(this.ambienceReverb.gain, this.volumes.ambience * TRIM.ambience);
  }
}
