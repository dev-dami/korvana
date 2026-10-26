/**
 * Buffers every instrument and effect shares.
 *
 * Noise and plucked strings are computed once per context and reused by every
 * voice that needs them; generating a buffer per note would be the single
 * biggest CPU and garbage cost in the audio layer.
 */

export type PluckKind = "harp" | "lute" | "pizz";

/** Pluck buffers are rendered every few semitones and repitched to the rest. */
const PLUCK_STEP = 3;
/** Enough distinct plucked pitches for any arrangement, few enough to stay small. */
const PLUCK_CACHE_LIMIT = 40;

interface PluckRecipe {
  /** Seconds to ring for, before register shortening. */
  ring: number;
  /** One-pole smoothing applied to the excitation: lower is darker. */
  brightness: number;
  /** Where along the string it is plucked, as a fraction; shapes the overtones. */
  position: number;
  /** Longest buffer to render, in seconds. */
  maxLength: number;
}

const PLUCKS: Record<PluckKind, PluckRecipe> = {
  harp: { ring: 3.2, brightness: 0.45, position: 0.18, maxLength: 2.6 },
  lute: { ring: 1.6, brightness: 0.75, position: 0.12, maxLength: 1.6 },
  pizz: { ring: 0.38, brightness: 0.35, position: 0.3, maxLength: 0.5 },
};

export interface Pluck {
  buffer: AudioBuffer;
  /** playbackRate that brings the rendered pitch to the requested one. */
  rate: number;
}

export class Kit {
  readonly white: AudioBuffer;
  readonly pink: AudioBuffer;
  readonly brown: AudioBuffer;
  /** Sparse random clicks: fire, gravel, chains, depending on the filter. */
  readonly crackle: AudioBuffer;
  private readonly plucks = new Map<string, { buffer: AudioBuffer; hz: number }>();

  readonly ctx: BaseAudioContext;

  constructor(ctx: BaseAudioContext) {
    this.ctx = ctx;
    const rate = ctx.sampleRate;
    this.white = this.fill(2, (data) => {
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    });
    // Pink and brown noise give wind, surf and rumble their weight; white noise
    // through a lowpass sounds thin by comparison.
    this.pink = this.fill(4, (data) => {
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < data.length; i++) {
        const w = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + w * 0.0555179;
        b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.969 * b2 + w * 0.153852;
        b3 = 0.8665 * b3 + w * 0.3104856;
        b4 = 0.55 * b4 + w * 0.5329522;
        b5 = -0.7616 * b5 - w * 0.016898;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
        b6 = w * 0.115926;
      }
    });
    this.brown = this.fill(4, (data) => {
      let last = 0;
      for (let i = 0; i < data.length; i++) {
        last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
        data[i] = last * 3.5;
      }
    });
    this.crackle = this.fill(2, (data) => {
      // A few hundred decaying micro-impulses per second, of random size.
      let i = 0;
      while (i < data.length) {
        i += Math.floor(rate * (0.002 + Math.random() * 0.03));
        const amp = Math.random() ** 2 * (Math.random() < 0.5 ? -1 : 1);
        const len = Math.floor(rate * (0.0006 + Math.random() * 0.002));
        for (let k = 0; k < len && i + k < data.length; k++) {
          data[i + k] += amp * (1 - k / len) * (Math.random() * 2 - 1);
        }
      }
    });
    // The fill above wraps, so smooth the seam to keep looping click-free.
    this.smoothLoop(this.white);
    this.smoothLoop(this.pink);
    this.smoothLoop(this.brown);
  }

  /** A Karplus-Strong plucked string near `hz`, rendered once and cached. */
  pluck(kind: PluckKind, hz: number): Pluck {
    const midi = 69 + 12 * Math.log2(hz / 440);
    const base = Math.round(midi / PLUCK_STEP) * PLUCK_STEP;
    const key = `${kind}:${base}`;
    let entry = this.plucks.get(key);
    if (!entry) {
      entry = this.renderPluck(kind, 440 * 2 ** ((base - 69) / 12));
      if (this.plucks.size >= PLUCK_CACHE_LIMIT) {
        const oldest = this.plucks.keys().next().value;
        if (oldest !== undefined) this.plucks.delete(oldest);
      }
      this.plucks.set(key, entry);
    } else {
      // Refresh recency so the cache evicts notes no theme is using.
      this.plucks.delete(key);
      this.plucks.set(key, entry);
    }
    return { buffer: entry.buffer, rate: hz / entry.hz };
  }

  private renderPluck(kind: PluckKind, hz: number): { buffer: AudioBuffer; hz: number } {
    const recipe = PLUCKS[kind];
    const rate = this.ctx.sampleRate;
    const period = Math.max(2, Math.round(rate / hz));
    // Higher strings die faster, as real ones do.
    const ring = Math.max(0.25, recipe.ring * Math.min(1, 220 / hz) ** 0.35);
    const length = Math.floor(rate * Math.min(recipe.maxLength, ring));
    const buffer = this.ctx.createBuffer(1, length, rate);
    const out = buffer.getChannelData(0);

    // Excitation: smoothed noise with a comb notch for pluck position.
    const excite = new Float32Array(period);
    let smooth = 0;
    for (let i = 0; i < period; i++) {
      smooth += recipe.brightness * (Math.random() * 2 - 1 - smooth);
      excite[i] = smooth;
    }
    const notch = Math.max(1, Math.floor(period * recipe.position));
    for (let i = 0; i < period; i++) out[i] = excite[i]! - 0.6 * (i >= notch ? excite[i - notch]! : 0);

    // Per-sample loss so the string falls 60 dB over `ring` seconds.
    const loss = 10 ** (-3 / (hz * ring));
    for (let i = period; i < length; i++) {
      out[i] = loss * 0.5 * (out[i - period]! + out[i - period + 1]!);
    }

    // Normalise, then fade the last few ms so a truncated tail never clicks.
    let peak = 0;
    for (let i = 0; i < length; i++) peak = Math.max(peak, Math.abs(out[i]!));
    const scale = peak > 0 ? 0.9 / peak : 1;
    const fade = Math.min(length, Math.floor(rate * 0.03));
    for (let i = 0; i < length; i++) {
      const tail = i > length - fade ? (length - i) / fade : 1;
      out[i] = out[i]! * scale * tail;
    }
    // Averaging samples n-P and n-P+1 makes the loop half a sample shorter
    // than P, which sharpens the pitch; report the true rendered frequency so
    // the playback rate corrects it.
    return { buffer, hz: rate / (period - 0.5) };
  }

  private fill(seconds: number, write: (data: Float32Array) => void): AudioBuffer {
    const buffer = this.ctx.createBuffer(1, Math.floor(this.ctx.sampleRate * seconds), this.ctx.sampleRate);
    write(buffer.getChannelData(0));
    return buffer;
  }

  private smoothLoop(buffer: AudioBuffer): void {
    const data = buffer.getChannelData(0);
    const n = Math.min(512, data.length >> 2);
    for (let i = 0; i < n; i++) {
      const a = i / n;
      data[data.length - n + i] = data[data.length - n + i]! * (1 - a) + data[i]! * a;
    }
  }
}

/**
 * A procedural hall impulse response: a short pre-delay, a handful of early
 * reflections, then a diffuse tail whose high end dies faster than its low
 * end - which is most of what makes a reverb sound like stone rather than tin.
 */
export function makeImpulse(ctx: BaseAudioContext, seconds: number, darkness: number): AudioBuffer {
  const rate = ctx.sampleRate;
  const length = Math.floor(rate * seconds);
  const buffer = ctx.createBuffer(2, length, rate);
  const predelay = Math.floor(rate * 0.018);
  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    for (let r = 0; r < 7; r++) {
      const at = predelay + Math.floor(rate * (0.008 + Math.random() * 0.07));
      if (at < length) data[at] = (Math.random() * 0.6 + 0.2) * (Math.random() < 0.5 ? -1 : 1);
    }
    let lp = 0;
    for (let i = predelay; i < length; i++) {
      const t = (i - predelay) / (length - predelay);
      // Lowpass coefficient closes as the tail ages.
      const coeff = 0.85 * (1 - darkness * t) ** 2 + 0.04;
      lp += coeff * (Math.random() * 2 - 1 - lp);
      const envelope = (1 - t) ** 1.6 * Math.exp(-t * 3.2);
      data[i] = data[i]! + lp * envelope * 0.7;
    }
  }
  return buffer;
}

/**
 * Transfer curve for the last-resort soft clipper. The shaper's input is
 * pre-scaled by 1/2, so the curve covers signals up to +-2: below 0.7 it is a
 * straight line (no colouring at sane levels), above it it bends smoothly
 * towards 0.98 so even a pile-up of effects can never clip the output.
 */
export const SOFT_CLIP_INPUT_SCALE = 0.5;

export function softClipCurve(): Float32Array<ArrayBuffer> {
  const n = 4096;
  const knee = 0.7;
  const room = 0.28;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = ((i / (n - 1)) * 2 - 1) / SOFT_CLIP_INPUT_SCALE;
    const mag = Math.abs(x);
    const y = mag <= knee ? mag : knee + room * Math.tanh((mag - knee) / room);
    curve[i] = Math.sign(x) * y;
  }
  return curve;
}
