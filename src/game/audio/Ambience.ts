import type { Kit } from "./Kit";
import { hasRoom, Patch, perc } from "./Patch";
import type { VoicePool } from "./Patch";
import type { Sfx } from "./Sfx";
import type { MusicZone } from "./zones";

/**
 * The world's own sound, under the music: wind, surf, birds, crickets,
 * water dripping in the dark.
 *
 * A bed is a few continuous loops (filtered noise breathing under slow LFOs)
 * plus a set of random events scheduled as a Poisson process, so a bird sings
 * when it likes rather than on the beat. Beds crossfade like themes do.
 */

type NoiseColour = "white" | "pink" | "brown" | "crackle";

interface LoopDef {
  noise: NoiseColour;
  filter: BiquadFilterType;
  freq: number;
  q: number;
  gain: number;
  /** [rate Hz, depth as a fraction of `gain`]: gusts, waves. */
  swell?: readonly [number, number];
  /** [rate Hz, depth in Hz]: the wind's whistle wandering. */
  sweep?: readonly [number, number];
  pan?: number;
}

type EventKind = "bird" | "cricket" | "owl" | "drip" | "settle" | "whisper" | "gull";

interface EventDef {
  kind: EventKind;
  /** Average events per second. */
  rate: number;
  when?: "day" | "night";
  level?: number;
}

interface BedDef {
  loops: readonly LoopDef[];
  events: readonly EventDef[];
  /** Reverb send for the bed: high in stone, low in open air. */
  reverb: number;
}

export type BedName = "meadow" | "academy" | "forest" | "highland" | "coast" | "tomb" | "scar";

const BEDS: Record<BedName, BedDef> = {
  meadow: {
    reverb: 0.15,
    loops: [{ noise: "pink", filter: "bandpass", freq: 500, q: 0.6, gain: 0.1, swell: [0.07, 0.6], sweep: [0.05, 150] }],
    events: [
      { kind: "bird", rate: 0.35, when: "day" },
      { kind: "cricket", rate: 1.6, when: "night" },
      { kind: "owl", rate: 0.02, when: "night", level: 0.6 },
    ],
  },
  academy: {
    reverb: 0.2,
    loops: [{ noise: "pink", filter: "bandpass", freq: 420, q: 0.5, gain: 0.07, swell: [0.05, 0.5] }],
    events: [
      { kind: "bird", rate: 0.15, when: "day", level: 0.8 },
      { kind: "cricket", rate: 0.7, when: "night", level: 0.8 },
    ],
  },
  forest: {
    reverb: 0.3,
    loops: [
      { noise: "pink", filter: "bandpass", freq: 380, q: 0.5, gain: 0.08, swell: [0.06, 0.5] },
      // Leaves: high, soft, rising and falling with the wind.
      { noise: "white", filter: "highpass", freq: 2600, q: 0.5, gain: 0.025, swell: [0.11, 0.8], pan: 0.3 },
    ],
    events: [
      { kind: "bird", rate: 0.55, when: "day" },
      { kind: "cricket", rate: 1.2, when: "night", level: 0.9 },
      { kind: "owl", rate: 0.05, when: "night" },
    ],
  },
  highland: {
    reverb: 0.25,
    loops: [
      { noise: "pink", filter: "bandpass", freq: 700, q: 0.8, gain: 0.16, swell: [0.09, 0.75], sweep: [0.07, 300], pan: -0.2 },
      { noise: "white", filter: "bandpass", freq: 1500, q: 6, gain: 0.03, swell: [0.13, 0.9], sweep: [0.05, 600], pan: 0.35 },
    ],
    events: [{ kind: "bird", rate: 0.08, when: "day", level: 0.7 }],
  },
  coast: {
    reverb: 0.25,
    loops: [
      // Surf: a slow swell of weight with a hiss riding on it.
      { noise: "brown", filter: "lowpass", freq: 650, q: 0.6, gain: 0.13, swell: [0.11, 0.85] },
      { noise: "pink", filter: "highpass", freq: 1800, q: 0.5, gain: 0.03, swell: [0.11, 0.9], pan: 0.25 },
      { noise: "pink", filter: "bandpass", freq: 500, q: 0.5, gain: 0.03, swell: [0.04, 0.5] },
    ],
    events: [
      { kind: "gull", rate: 0.05, when: "day" },
      { kind: "cricket", rate: 0.4, when: "night", level: 0.6 },
    ],
  },
  tomb: {
    reverb: 0.75,
    loops: [
      // Moving air in deep stone, and something like a hum far below.
      { noise: "brown", filter: "lowpass", freq: 130, q: 1, gain: 0.14, swell: [0.03, 0.4] },
      { noise: "pink", filter: "bandpass", freq: 900, q: 0.7, gain: 0.018, swell: [0.05, 0.6], sweep: [0.03, 200] },
      // A torch somewhere: faint crackle.
      { noise: "crackle", filter: "bandpass", freq: 2800, q: 0.7, gain: 0.05, swell: [0.3, 0.4], pan: 0.4 },
    ],
    events: [
      { kind: "drip", rate: 0.45 },
      { kind: "settle", rate: 0.03 },
    ],
  },
  scar: {
    reverb: 0.6,
    loops: [
      { noise: "pink", filter: "bandpass", freq: 420, q: 1.5, gain: 0.12, swell: [0.06, 0.7], sweep: [0.04, 180] },
      // The wind singing through something it should not: a narrow, wandering whistle.
      { noise: "white", filter: "bandpass", freq: 1100, q: 18, gain: 0.05, swell: [0.08, 0.9], sweep: [0.025, 500], pan: -0.3 },
      { noise: "brown", filter: "lowpass", freq: 90, q: 1, gain: 0.1 },
    ],
    events: [
      { kind: "whisper", rate: 0.04 },
      { kind: "settle", rate: 0.02 },
    ],
  },
};

/** Which bed a music zone implies. Fights and story beats have none of their own. */
export function bedForZone(zone: MusicZone): BedName | null {
  switch (zone) {
    case "meadow":
    case "academy":
    case "forest":
    case "highland":
    case "coast":
    case "tomb":
    case "scar":
      return zone;
    default:
      return null;
  }
}

const rand = (lo: number, hi: number): number => lo + Math.random() * (hi - lo);

class Bed {
  readonly name: BedName;
  private readonly def: BedDef;
  private readonly ctx: BaseAudioContext;
  private readonly fader: GainNode;
  private readonly send: GainNode;
  private readonly sources: AudioScheduledSourceNode[] = [];
  private readonly nodes: AudioNode[] = [];
  private readonly nextAt: number[];
  retireAt = Infinity;

  constructor(name: BedName, ctx: BaseAudioContext, kit: Kit, out: AudioNode, reverb: AudioNode) {
    this.name = name;
    this.def = BEDS[name];
    this.ctx = ctx;
    this.fader = ctx.createGain();
    this.fader.gain.value = 0;
    this.send = ctx.createGain();
    this.send.gain.value = this.def.reverb;
    this.fader.connect(out);
    this.fader.connect(this.send).connect(reverb);

    const now = ctx.currentTime;
    for (const loop of this.def.loops) this.buildLoop(kit, loop, now);
    this.nextAt = this.def.events.map((e) => now + rand(0.5, 2) / Math.max(0.01, e.rate));
  }

  /** The fader's input: events are routed here so they fade with the bed. */
  get input(): AudioNode {
    return this.fader;
  }

  fadeTo(value: number, seconds: number): void {
    const now = this.ctx.currentTime;
    this.fader.gain.cancelScheduledValues(now);
    this.fader.gain.setTargetAtTime(value, now, Math.max(0.01, seconds / 3));
  }

  retire(seconds: number): void {
    this.fadeTo(0, seconds);
    this.retireAt = this.ctx.currentTime + seconds * 1.5;
  }

  /** Yields each event that falls before `until`, already advanced. */
  due(until: number, night: boolean, play: (kind: EventKind, t: number, level: number) => void): void {
    this.def.events.forEach((event, i) => {
      let at = this.nextAt[i]!;
      while (at < until) {
        const wanted = !event.when || (event.when === "night") === night;
        if (wanted && at >= this.ctx.currentTime) play(event.kind, at, event.level ?? 1);
        at += -Math.log(1 - Math.random()) / event.rate;
      }
      this.nextAt[i] = at;
    });
  }

  dispose(): void {
    for (const src of this.sources) src.stop();
    for (const node of this.nodes) node.disconnect();
    this.fader.disconnect();
    this.send.disconnect();
  }

  private buildLoop(kit: Kit, loop: LoopDef, now: number): void {
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = kit[loop.noise];
    src.loop = true;
    // Slightly off-speed playback so two beds using the same buffer never phase.
    src.playbackRate.value = rand(0.92, 1.08);
    const filter = ctx.createBiquadFilter();
    filter.type = loop.filter;
    filter.frequency.value = loop.freq;
    filter.Q.value = loop.q;
    const level = ctx.createGain();
    // With a swell the level breathes between (1 - depth) and 1 of `gain`.
    const depth = loop.swell?.[1] ?? 0;
    level.gain.value = loop.gain * (1 - depth / 2);
    const panner = ctx.createStereoPanner();
    panner.pan.value = loop.pan ?? 0;
    src.connect(filter).connect(level).connect(panner).connect(this.fader);
    src.start(now, Math.random() * src.buffer.duration);
    this.sources.push(src);
    this.nodes.push(src, filter, level, panner);

    if (loop.swell) {
      const lfo = ctx.createOscillator();
      lfo.frequency.value = loop.swell[0] * rand(0.85, 1.15);
      const amount = ctx.createGain();
      amount.gain.value = (loop.gain * depth) / 2;
      lfo.connect(amount).connect(level.gain);
      lfo.start(now);
      this.sources.push(lfo);
      this.nodes.push(lfo, amount);
    }
    if (loop.sweep) {
      const lfo = ctx.createOscillator();
      lfo.frequency.value = loop.sweep[0] * rand(0.8, 1.2);
      const amount = ctx.createGain();
      amount.gain.value = loop.sweep[1];
      lfo.connect(amount).connect(filter.frequency);
      lfo.start(now);
      this.sources.push(lfo);
      this.nodes.push(lfo, amount);
    }
  }
}

export class Ambience {
  private readonly ctx: BaseAudioContext;
  private readonly kit: Kit;
  private readonly out: AudioNode;
  private readonly reverb: AudioNode;
  private readonly pool: VoicePool;
  private readonly sfx: Sfx;
  private beds: Bed[] = [];
  private night = false;
  private ducked = false;

  constructor(ctx: BaseAudioContext, kit: Kit, out: AudioNode, reverb: AudioNode, pool: VoicePool, sfx: Sfx) {
    this.ctx = ctx;
    this.kit = kit;
    this.out = out;
    this.reverb = reverb;
    this.pool = pool;
    this.sfx = sfx;
  }

  get current(): BedName | null {
    const live = this.beds.filter((b) => b.retireAt === Infinity);
    return live[live.length - 1]?.name ?? null;
  }

  setBed(name: BedName | null, seconds = 3): void {
    if (name === this.current) return;
    for (const bed of this.beds) if (bed.retireAt === Infinity) bed.retire(seconds);
    if (!name) return;
    const bed = new Bed(name, this.ctx, this.kit, this.out, this.reverb);
    bed.fadeTo(this.level, seconds);
    this.beds.push(bed);
  }

  setNight(night: boolean): void {
    this.night = night;
  }

  /** Pull the world back under a fight without losing it. */
  duck(ducked: boolean): void {
    if (ducked === this.ducked) return;
    this.ducked = ducked;
    for (const bed of this.beds) if (bed.retireAt === Infinity) bed.fadeTo(this.level, 1.2);
  }

  schedule(until: number): void {
    const now = this.ctx.currentTime;
    for (const bed of this.beds) {
      if (bed.retireAt === Infinity) bed.due(until, this.night, (kind, t, level) => this.event(bed, kind, t, level));
    }
    const finished = this.beds.filter((b) => b.retireAt < now);
    if (finished.length > 0) {
      for (const bed of finished) bed.dispose();
      this.beds = this.beds.filter((b) => b.retireAt >= now);
    }
  }

  dispose(): void {
    for (const bed of this.beds) bed.dispose();
    this.beds = [];
  }

  private get level(): number {
    return this.ducked ? 0.4 : 1;
  }

  private event(bed: Bed, kind: EventKind, t: number, level: number): void {
    if (!hasRoom(this.pool, 2)) return;
    const out = bed.input;
    switch (kind) {
      case "bird":
        return this.bird(t, out, level);
      case "cricket":
        return this.cricket(t, out, level);
      case "owl":
        return this.sfx.owl(t, out, level * 0.5);
      case "drip":
        return this.drip(t, out, level);
      case "settle":
        return this.settle(t, out, level);
      case "whisper":
        return this.whisper(t, out, level);
      case "gull":
        return this.gull(t, out, level);
    }
  }

  private patch(build: (p: Patch) => void): void {
    const p = new Patch(this.ctx, this.pool);
    build(p);
    p.seal();
  }

  /** A short song: a handful of quick sine chirps whose shape is chosen per call. */
  private bird(t: number, out: AudioNode, level: number): void {
    this.patch((p) => {
      const pan = p.pan(rand(-0.8, 0.8));
      pan.connect(out);
      const base = rand(2600, 4600);
      const count = 2 + Math.floor(Math.random() * 5);
      const gap = rand(0.06, 0.14);
      const fall = Math.random() < 0.5;
      const span = rand(0.15, 0.4);
      const vol = rand(0.02, 0.05) * level;
      for (let i = 0; i < count; i++) {
        const at = t + i * gap;
        const f = base * (1 + (fall ? -1 : 1) * span * (i / count));
        const osc = p.osc("sine", f, at, at + 0.08);
        osc.frequency.exponentialRampToValueAtTime(f * rand(1.15, 1.5), at + 0.04);
        osc.frequency.exponentialRampToValueAtTime(f * rand(0.8, 1), at + 0.07);
        const amp = p.gain();
        perc(amp.gain, at, vol, 0.006, 0.06);
        osc.connect(amp).connect(pan);
      }
    });
  }

  /** Three or four rapid pulses of a high tone: one cricket's chirp. */
  private cricket(t: number, out: AudioNode, level: number): void {
    this.patch((p) => {
      const pan = p.pan(rand(-0.9, 0.9));
      pan.connect(out);
      const pulses = 3 + Math.floor(Math.random() * 2);
      const osc = p.osc("sine", rand(4300, 4900), t, t + pulses * 0.035 + 0.05);
      const amp = p.gain();
      const vol = rand(0.008, 0.02) * level;
      amp.gain.setValueAtTime(0, t);
      for (let i = 0; i < pulses; i++) {
        const at = t + i * 0.035;
        amp.gain.setValueAtTime(0, at);
        amp.gain.linearRampToValueAtTime(vol, at + 0.006);
        amp.gain.linearRampToValueAtTime(0, at + 0.022);
      }
      osc.connect(amp).connect(pan);
    });
  }

  /** Water drop: a short tone whose pitch rises as the bubble closes. Mostly heard in its echo. */
  private drip(t: number, out: AudioNode, level: number): void {
    this.patch((p) => {
      const pan = p.pan(rand(-0.9, 0.9));
      pan.connect(out);
      const f = rand(900, 2000);
      const osc = p.osc("sine", f, t, t + 0.15);
      osc.frequency.exponentialRampToValueAtTime(f * rand(1.4, 1.9), t + 0.05);
      const amp = p.gain();
      perc(amp.gain, t, rand(0.04, 0.09) * level, 0.002, 0.1);
      osc.connect(amp).connect(pan);
    });
  }

  /** Stone settling somewhere out of sight: a far thud and a trickle of grit. */
  private settle(t: number, out: AudioNode, level: number): void {
    this.patch((p) => {
      const pan = p.pan(rand(-0.7, 0.7));
      pan.connect(out);
      const thump = p.osc("sine", rand(60, 90), t, t + 0.5);
      thump.frequency.exponentialRampToValueAtTime(35, t + 0.4);
      const thumpAmp = p.gain();
      perc(thumpAmp.gain, t, 0.12 * level, 0.01, 0.4);
      thump.connect(thumpAmp).connect(pan);
      const grit = p.buffer(this.kit.crackle, t + 0.05, t + 1.4, rand(0.7, 1), true, Math.random() * 2);
      const band = p.filter("bandpass", rand(1200, 2200), 1);
      const gritAmp = p.gain();
      gritAmp.gain.setValueAtTime(0, t);
      gritAmp.gain.linearRampToValueAtTime(0.08 * level, t + 0.2);
      gritAmp.gain.linearRampToValueAtTime(0, t + 1.3);
      grit.connect(band).connect(gritAmp).connect(pan);
    });
  }

  /** Breath shaped by drifting vowel formants: not quite words. */
  private whisper(t: number, out: AudioNode, level: number): void {
    this.patch((p) => {
      const pan = p.pan(rand(-0.9, 0.9));
      pan.connect(out);
      const dur = rand(1.2, 2.2);
      const src = p.buffer(this.kit.white, t, t + dur + 0.1, 1, true, Math.random() * 2);
      const amp = p.gain();
      amp.gain.setValueAtTime(0, t);
      amp.gain.linearRampToValueAtTime(0.05 * level, t + dur * 0.4);
      amp.gain.linearRampToValueAtTime(0, t + dur);
      for (const [lo, hi] of [[500, 900], [1100, 2200]] as const) {
        const band = p.filter("bandpass", rand(lo, hi), 9);
        band.frequency.linearRampToValueAtTime(rand(lo, hi), t + dur);
        src.connect(band).connect(amp);
      }
      amp.connect(pan);
    });
  }

  /** A gull's falling cry, two or three times. */
  private gull(t: number, out: AudioNode, level: number): void {
    this.patch((p) => {
      const pan = p.pan(rand(-0.9, 0.9));
      pan.connect(out);
      const tone = p.filter("bandpass", 1800, 2);
      tone.connect(pan);
      const cries = 2 + Math.floor(Math.random() * 2);
      for (let i = 0; i < cries; i++) {
        const at = t + i * rand(0.3, 0.42);
        const osc = p.osc("sawtooth", rand(1300, 1600), at, at + 0.32);
        osc.frequency.exponentialRampToValueAtTime(rand(900, 1100), at + 0.28);
        const amp = p.gain();
        amp.gain.setValueAtTime(0, at);
        amp.gain.linearRampToValueAtTime(0.03 * level, at + 0.04);
        amp.gain.linearRampToValueAtTime(0, at + 0.3);
        osc.connect(amp).connect(tone);
      }
    });
  }
}
