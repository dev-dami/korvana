/**
 * The one way a sound gets built.
 *
 * Every note and effect is a little graph of nodes that must be torn down when
 * it finishes, or the context slowly fills with silent, connected nodes that
 * still cost CPU. A Patch remembers everything it created and disconnects the
 * lot when its last source stops, so callers never have to think about it.
 *
 * It also counts live voices against a pool, which is how the music and the
 * effects each stay under a polyphony budget no matter how busy a scene gets.
 */

/** A polyphony budget shared by everything that plays into one bus. */
export interface VoicePool {
  active: number;
  readonly max: number;
}

export function makePool(max: number): VoicePool {
  return { active: 0, max };
}

/** True when the pool has room. Low-priority notes check before building. */
export function hasRoom(pool: VoicePool, reserve = 0): boolean {
  return pool.active < pool.max - reserve;
}

export class Patch {
  private readonly nodes: AudioNode[] = [];
  private anchor: AudioScheduledSourceNode | null = null;
  private anchorEnd = -Infinity;

  readonly ctx: BaseAudioContext;
  private readonly pool: VoicePool;

  constructor(ctx: BaseAudioContext, pool: VoicePool) {
    this.ctx = ctx;
    this.pool = pool;
  }

  osc(type: OscillatorType, freq: number, start: number, stop: number, detune = 0): OscillatorNode {
    const node = this.ctx.createOscillator();
    node.type = type;
    node.frequency.setValueAtTime(freq, start);
    if (detune) node.detune.setValueAtTime(detune, start);
    node.start(start);
    node.stop(stop);
    this.trackSource(node, stop);
    return node;
  }

  /** Plays a buffer. `offset` lets looping noise start somewhere random so layers do not phase. */
  buffer(buffer: AudioBuffer, start: number, stop: number, rate = 1, loop = false, offset = 0): AudioBufferSourceNode {
    const node = this.ctx.createBufferSource();
    node.buffer = buffer;
    node.loop = loop;
    node.playbackRate.setValueAtTime(rate, start);
    node.start(start, offset % buffer.duration);
    node.stop(stop);
    this.trackSource(node, stop);
    return node;
  }

  gain(value = 0): GainNode {
    const node = this.ctx.createGain();
    node.gain.value = value;
    this.nodes.push(node);
    return node;
  }

  filter(type: BiquadFilterType, freq: number, q = 0.7071): BiquadFilterNode {
    const node = this.ctx.createBiquadFilter();
    node.type = type;
    node.frequency.value = freq;
    node.Q.value = q;
    this.nodes.push(node);
    return node;
  }

  pan(value: number): StereoPannerNode {
    const node = this.ctx.createStereoPanner();
    node.pan.value = Math.max(-1, Math.min(1, value));
    this.nodes.push(node);
    return node;
  }

  /**
   * Hands the patch over to the audio thread. Call once, after everything is
   * scheduled; the patch frees its voice and its nodes when the last source ends.
   */
  seal(): void {
    const anchor = this.anchor;
    if (!anchor) return;
    const nodes = this.nodes;
    const pool = this.pool;
    pool.active++;
    anchor.onended = () => {
      pool.active--;
      for (const node of nodes) node.disconnect();
    };
  }

  private trackSource(node: AudioScheduledSourceNode, stop: number): void {
    this.nodes.push(node);
    if (stop >= this.anchorEnd) {
      this.anchorEnd = stop;
      this.anchor = node;
    }
  }
}

// --- envelopes ------------------------------------------------------------
//
// Small helpers for the shapes every instrument uses. All of them start from
// silence at `t` so a reused param never inherits a previous value.

/** Exponential-feeling percussive envelope: fast attack, decays to silence by `t + attack + decay`. */
export function perc(param: AudioParam, t: number, peak: number, attack: number, decay: number): void {
  param.setValueAtTime(0, t);
  param.linearRampToValueAtTime(peak, t + attack);
  // setTarget reaches ~-60 dB after 6.9 time constants.
  param.setTargetAtTime(0, t + attack, decay / 6.9);
}

/**
 * Attack / decay-to-sustain / release. `dur` is how long the note is held;
 * the tail rings for `release` after that.
 */
export function adsr(
  param: AudioParam,
  t: number,
  peak: number,
  attack: number,
  decay: number,
  sustain: number,
  dur: number,
  release: number,
): void {
  const holdEnd = t + Math.max(dur, attack);
  param.setValueAtTime(0, t);
  param.linearRampToValueAtTime(peak, t + attack);
  param.setTargetAtTime(peak * sustain, t + attack, Math.max(0.001, decay / 3));
  param.setTargetAtTime(0, holdEnd, Math.max(0.001, release / 5));
}

/** Seconds after `t` at which an adsr note is inaudible and can be stopped. */
export function adsrEnd(t: number, attack: number, dur: number, release: number): number {
  return t + Math.max(dur, attack) + release * 1.1 + 0.02;
}
