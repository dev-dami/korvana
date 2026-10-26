import { INSTRUMENTS } from "./Instruments";
import type { InstrumentName, Target } from "./Instruments";
import type { Kit } from "./Kit";
import { hasRoom, Patch, perc } from "./Patch";
import type { VoicePool } from "./Patch";
import { midiToHz } from "./theory";
import type { SfxName } from "./zones";

/**
 * One-shot effects. Each is layered from a few simple parts - a body (thud,
 * creak, ring), a texture (noise, grit, sparkle) and often a tail of tuned
 * notes - because no single oscillator ever sounds like a thing in the world.
 */

export type SpellSound = "projectile" | "nova" | "ward" | "blink";
export type UiSound = "open" | "select" | "close" | "error";

interface Outs {
  ctx: BaseAudioContext;
  kit: Kit;
  pool: VoicePool;
  /** A little room. */
  dry: AudioNode;
  /** A lot of room. */
  hall: AudioNode;
}

/** The same effect re-triggered faster than this is merged into the first. */
const MIN_REPEAT_SECONDS = 0.04;
/** Room kept for the effects that matter most (hurt, rewards) when things get busy. */
const LOW_PRIORITY_RESERVE = 6;

const rand = (lo: number, hi: number): number => lo + Math.random() * (hi - lo);

// --- building blocks ------------------------------------------------------

/** A pitched sweep with a percussive envelope. */
function sweep(
  p: Patch,
  out: AudioNode,
  t: number,
  type: OscillatorType,
  f0: number,
  f1: number,
  dur: number,
  peak: number,
  attack = 0.004,
): void {
  const osc = p.osc(type, f0, t, t + attack + dur + 0.05);
  osc.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + attack + dur * 0.7);
  const amp = p.gain();
  perc(amp.gain, t, peak, attack, dur);
  osc.connect(amp).connect(out);
}

/** Filtered noise whose filter glides from f0 to f1: whooshes, blasts, splashes. */
function noise(
  p: Patch,
  out: AudioNode,
  t: number,
  buffer: AudioBuffer,
  type: BiquadFilterType,
  f0: number,
  f1: number,
  q: number,
  dur: number,
  peak: number,
  attack = 0.003,
): void {
  const src = p.buffer(buffer, t, t + attack + dur + 0.05, 1, true, Math.random() * 2);
  const filter = p.filter(type, f0, q);
  filter.frequency.setValueAtTime(f0, t);
  filter.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + attack + dur * 0.8);
  const amp = p.gain();
  perc(amp.gain, t, peak, attack, dur);
  src.connect(filter).connect(amp).connect(out);
}

/** Noise that swells up then falls away, rather than starting at its loudest. */
function whoosh(p: Patch, out: AudioNode, t: number, buffer: AudioBuffer, f0: number, f1: number, q: number, dur: number, peak: number): void {
  const src = p.buffer(buffer, t, t + dur + 0.05, 1, true, Math.random() * 2);
  const filter = p.filter("bandpass", f0, q);
  filter.frequency.setValueAtTime(f0, t);
  filter.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
  const amp = p.gain();
  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(peak, t + dur * 0.4);
  amp.gain.linearRampToValueAtTime(0, t + dur);
  src.connect(filter).connect(amp).connect(out);
}

/** A struck metal object: a few inharmonic partials with short, uneven decays. */
function clank(p: Patch, out: AudioNode, t: number, base: number, dur: number, peak: number): void {
  for (const [ratio, level] of [[1, 1], [1.59, 0.7], [2.63, 0.5], [4.1, 0.3]] as const) {
    sweep(p, out, t, "sine", base * ratio, base * ratio * 0.995, dur * (1.1 - ratio * 0.15), peak * level, 0.001);
  }
}

/** A low body impact: a falling sine with a burst of dull noise. */
function thud(p: Patch, kit: Kit, out: AudioNode, t: number, f0: number, f1: number, dur: number, peak: number): void {
  sweep(p, out, t, "sine", f0, f1, dur, peak, 0.002);
  noise(p, out, t, kit.white, "lowpass", 900, 200, 0.7, dur * 0.4, peak * 0.5);
}

/** Grit and creaks: the kit's crackle buffer through a band. */
function grit(p: Patch, kit: Kit, out: AudioNode, t: number, freq: number, q: number, dur: number, peak: number, attack = 0.05): void {
  const src = p.buffer(kit.crackle, t, t + dur + 0.1, rand(0.8, 1.2), true, Math.random() * 2);
  const band = p.filter("bandpass", freq, q);
  const amp = p.gain();
  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(peak, t + attack);
  amp.gain.setValueAtTime(peak, t + Math.max(attack, dur - 0.15));
  amp.gain.linearRampToValueAtTime(0, t + dur);
  src.connect(band).connect(amp).connect(out);
}

/** Stone dragging on stone: brown noise in a wavering band, with grit on top. */
function grind(p: Patch, kit: Kit, out: AudioNode, t: number, dur: number, peak: number): void {
  const src = p.buffer(kit.brown, t, t + dur + 0.1, 1, true, Math.random() * 3);
  const band = p.filter("bandpass", 260, 1.4);
  const wobble = p.osc("triangle", rand(5, 8), t, t + dur + 0.1);
  const wobbleDepth = p.gain(80);
  wobble.connect(wobbleDepth).connect(band.frequency);
  const amp = p.gain();
  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(peak, t + 0.15);
  amp.gain.setValueAtTime(peak, t + dur - 0.2);
  amp.gain.linearRampToValueAtTime(0, t + dur);
  src.connect(band).connect(amp).connect(out);
  grit(p, kit, out, t, 1100, 1.2, dur, peak * 0.5, 0.15);
}

/** A creaking hinge: a slow saw with a wobbling pitch, through a narrow band. */
function creak(p: Patch, out: AudioNode, t: number, hz: number, dur: number, peak: number): void {
  const osc = p.osc("sawtooth", hz, t, t + dur + 0.05);
  osc.frequency.linearRampToValueAtTime(hz * rand(1.2, 1.5), t + dur);
  const wobble = p.osc("sine", rand(11, 16), t, t + dur + 0.05);
  const wobbleDepth = p.gain(hz * 0.18);
  wobble.connect(wobbleDepth).connect(osc.frequency);
  const band = p.filter("bandpass", hz * 7, 5);
  const amp = p.gain();
  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(peak, t + dur * 0.3);
  amp.gain.linearRampToValueAtTime(peak * 0.6, t + dur * 0.8);
  amp.gain.linearRampToValueAtTime(0, t + dur);
  osc.connect(band).connect(amp).connect(out);
}

export class Sfx {
  private readonly last = new Map<string, number>();
  private readonly dryTarget: Target;
  private readonly hallTarget: Target;

  private readonly o: Outs;

  constructor(o: Outs) {
    this.o = o;
    this.dryTarget = { ctx: o.ctx, out: o.dry, kit: o.kit, pool: o.pool };
    this.hallTarget = { ctx: o.ctx, out: o.hall, kit: o.kit, pool: o.pool };
  }

  play(name: SfxName): void {
    const t = this.start(name);
    if (t === null) return;
    const recipe = RECIPES[name];
    recipe.call(this, t);
  }

  ui(kind: UiSound): void {
    const t = this.start(`ui_${kind}`, true);
    if (t === null) return;
    switch (kind) {
      case "open":
        this.note("celesta", t, 81, 0.4, false);
        this.note("celesta", t + 0.06, 88, 0.35, false);
        return;
      case "select":
        this.note("celesta", t, 86, 0.32, false);
        this.patch((p) => noise(p, this.o.dry, t, this.o.kit.white, "highpass", 6000, 6000, 0.7, 0.02, 0.04));
        return;
      case "close":
        this.note("celesta", t, 88, 0.3, false);
        this.note("celesta", t + 0.06, 81, 0.28, false);
        return;
      case "error":
        this.patch((p) => {
          const tone = p.filter("lowpass", 700, 1);
          tone.connect(this.o.dry);
          sweep(p, tone, t, "square", 196, 180, 0.08, 0.07);
          sweep(p, tone, t + 0.1, "square", 165, 150, 0.12, 0.07);
        });
        return;
    }
  }

  attack(heavy: boolean, hit: boolean): void {
    const t = this.start(`attack_${heavy}_${hit}`);
    if (t === null) return;
    const kit = this.o.kit;
    this.patch((p) => {
      const out = p.pan(rand(-0.15, 0.15));
      out.connect(this.o.dry);
      if (heavy) whoosh(p, out, t, kit.white, 350, 1400, 1.2, 0.26, 0.3);
      else whoosh(p, out, t, kit.white, 700, 2600, 1.4, 0.16, 0.24);
      if (!hit) return;
      const at = t + (heavy ? 0.1 : 0.06);
      thud(p, kit, out, at, heavy ? 130 : 170, heavy ? 45 : 70, heavy ? 0.22 : 0.13, heavy ? 0.42 : 0.3);
      noise(p, out, at, kit.white, "bandpass", 2400, 900, 0.9, 0.06, heavy ? 0.22 : 0.16);
      if (heavy) grit(p, kit, out, at, 1300, 1, 0.12, 0.25, 0.005);
    });
  }

  spell(kind: string): void {
    const t = this.start(`spell_${kind}`);
    if (t === null) return;
    const kit = this.o.kit;
    switch (kind as SpellSound) {
      case "nova":
        this.patch((p) => {
          thud(p, kit, this.o.hall, t, 95, 32, 0.6, 0.4);
          noise(p, this.o.hall, t, kit.pink, "lowpass", 1400, 180, 0.8, 0.7, 0.3, 0.01);
          noise(p, this.o.hall, t + 0.05, kit.white, "bandpass", 5000, 700, 1.5, 0.8, 0.07, 0.05);
        });
        this.note("bell", t + 0.02, 69, 0.45, true, 2.5);
        this.note("bell", t + 0.02, 76, 0.3, true, 2.5);
        return;
      case "ward":
        this.patch((p) => {
          for (const [midi, delay] of [[69, 0], [76, 0.05], [85, 0.1]] as const) {
            for (const detune of [-4, 4]) {
              const osc = p.osc("sine", midiToHz(midi), t + delay, t + delay + 1.4, detune);
              const amp = p.gain();
              amp.gain.setValueAtTime(0, t + delay);
              amp.gain.linearRampToValueAtTime(0.045, t + delay + 0.15);
              amp.gain.setTargetAtTime(0, t + delay + 0.25, 0.3);
              osc.connect(amp).connect(this.o.hall);
            }
          }
          whoosh(p, this.o.hall, t, kit.white, 2000, 6000, 2, 0.4, 0.04);
        });
        this.note("glass", t, 81, 0.5, true, 1.6);
        return;
      case "blink":
        this.patch((p) => {
          whoosh(p, this.o.hall, t, kit.white, 400, 6000, 1.5, 0.18, 0.2);
          sweep(p, this.o.hall, t, "sine", 400, 2600, 0.12, 0.08, 0.02);
          sweep(p, this.o.hall, t + 0.17, "sine", 1900, 900, 0.06, 0.1);
        });
        return;
      default:
        // Projectile: a bright zap that rises, with sparkle trailing behind.
        this.patch((p) => {
          const band = p.filter("bandpass", 1200, 3);
          band.frequency.setValueAtTime(600, t);
          band.frequency.exponentialRampToValueAtTime(3200, t + 0.15);
          band.connect(this.o.hall);
          sweep(p, band, t, "sawtooth", 320, 1500, 0.18, 0.14, 0.01);
          noise(p, this.o.hall, t, kit.white, "highpass", 3000, 7000, 0.7, 0.12, 0.05, 0.02);
        });
        for (let i = 0; i < 3; i++) {
          const note = [86, 88, 91, 93, 95][Math.floor(Math.random() * 5)]!;
          this.note("celesta", t + 0.04 + i * 0.045, note, 0.22, true);
        }
    }
  }

  dash(): void {
    const t = this.start("dash");
    if (t === null) return;
    const kit = this.o.kit;
    this.patch((p) => {
      whoosh(p, this.o.dry, t, kit.white, 300, 1800, 1, 0.22, 0.2);
      whoosh(p, this.o.dry, t, kit.brown, 200, 500, 0.8, 0.2, 0.2);
    });
  }

  pickup(): void {
    const t = this.start("pickup");
    if (t === null) return;
    this.note("celesta", t, 88, 0.5, false);
    this.note("celesta", t + 0.07, 95, 0.45, false);
    this.patch((p) => noise(p, this.o.dry, t, this.o.kit.white, "highpass", 7000, 9000, 0.7, 0.05, 0.03));
  }

  hurt(): void {
    const t = this.start("hurt", true);
    if (t === null) return;
    const kit = this.o.kit;
    this.patch((p) => {
      thud(p, kit, this.o.dry, t, 150, 55, 0.2, 0.42);
      noise(p, this.o.dry, t, kit.white, "lowpass", 1200, 300, 0.7, 0.1, 0.25);
      // A short vocal "hff" so the hit reads as someone, not something.
      const band = p.filter("bandpass", 650, 3);
      band.connect(this.o.dry);
      sweep(p, band, t + 0.01, "sawtooth", 190, 120, 0.16, 0.1, 0.01);
    });
  }

  hit(): void {
    const t = this.start("hit");
    if (t === null) return;
    const kit = this.o.kit;
    this.patch((p) => {
      noise(p, this.o.dry, t, kit.white, "bandpass", 1900, 700, 1, 0.06, 0.26);
      sweep(p, this.o.dry, t, "sine", 280, 110, 0.09, 0.22);
    });
  }

  defeat(): void {
    const t = this.start("defeat");
    if (t === null) return;
    const kit = this.o.kit;
    [86, 81, 77, 74].forEach((note, i) => this.note("celesta", t + i * 0.055, note, 0.33, true));
    this.patch((p) => {
      noise(p, this.o.hall, t, kit.pink, "lowpass", 3500, 250, 0.8, 0.55, 0.22, 0.02);
      sweep(p, this.o.hall, t, "sine", 210, 55, 0.45, 0.2);
    });
  }

  reward(): void {
    const t = this.start("reward", true);
    if (t === null) return;
    [74, 78, 81, 86].forEach((note, i) => {
      this.note("celesta", t + i * 0.07, note, 0.45, true);
      this.note("harp", t + i * 0.07, note - 12, 0.4, true);
    });
    this.note("bell", t + 0.28, 86, 0.25, true, 2.5);
  }

  /** The owl, shared with the ambience beds. */
  owl(t: number, out: AudioNode, level = 1): void {
    if (!hasRoom(this.o.pool, LOW_PRIORITY_RESERVE)) return;
    const kit = this.o.kit;
    this.patch((p) => {
      const tone = p.filter("lowpass", 900, 0.8);
      tone.connect(out);
      const base = rand(360, 400);
      for (const [at, len] of [[0, 0.34], [0.58, 0.16], [0.8, 0.42]] as const) {
        const start = t + at;
        const osc = p.osc("sine", base * 0.94, start, start + len + 0.1);
        osc.frequency.linearRampToValueAtTime(base, start + 0.06);
        osc.frequency.linearRampToValueAtTime(base * 0.9, start + len);
        const amp = p.gain();
        amp.gain.setValueAtTime(0, start);
        amp.gain.linearRampToValueAtTime(0.12 * level, start + 0.06);
        amp.gain.setValueAtTime(0.12 * level, start + len * 0.7);
        amp.gain.linearRampToValueAtTime(0, start + len);
        osc.connect(amp).connect(tone);
        noise(p, tone, start, kit.white, "bandpass", base, base, 4, len, 0.035 * level, 0.04);
      }
    });
  }

  // --- internals ----------------------------------------------------------

  /** When to start an effect now, or null if it is a duplicate or there is no room. */
  private start(key: string, important = false): number | null {
    const now = this.o.ctx.currentTime;
    const previous = this.last.get(key);
    if (previous !== undefined && now - previous < MIN_REPEAT_SECONDS) return null;
    if (!hasRoom(this.o.pool, important ? 0 : LOW_PRIORITY_RESERVE)) return null;
    this.last.set(key, now);
    return now + 0.005;
  }

  patch(build: (p: Patch) => void): void {
    const p = new Patch(this.o.ctx, this.o.pool);
    build(p);
    p.seal();
  }

  note(inst: InstrumentName, t: number, midi: number, vel: number, hall: boolean, dur = 0.5): void {
    INSTRUMENTS[inst].play(hall ? this.hallTarget : this.dryTarget, t, midiToHz(midi), dur, vel);
  }

  get outs(): Outs {
    return this.o;
  }
}

// --- named effects --------------------------------------------------------

type Recipe = (this: Sfx, t: number) => void;

const RECIPES: Record<SfxName, Recipe> = {
  lever(t) {
    const { dry, kit } = this.outs;
    this.patch((p) => {
      // A ratchet of clicks, then the clank as it lands.
      for (let i = 0; i < 4; i++) noise(p, dry, t + i * 0.035, kit.white, "bandpass", 3200, 3200, 3, 0.012, 0.18);
      clank(p, dry, t + 0.15, rand(760, 860), 0.4, 0.07);
      thud(p, kit, dry, t + 0.15, 190, 90, 0.1, 0.28);
    });
  },

  plate_click(t) {
    const { dry, kit } = this.outs;
    this.patch((p) => {
      noise(p, dry, t, kit.white, "bandpass", 2600, 2600, 2, 0.02, 0.28);
      thud(p, kit, dry, t + 0.02, 130, 70, 0.12, 0.33);
      grit(p, kit, dry, t + 0.02, 900, 1, 0.12, 0.12, 0.005);
    });
  },

  gate_open(t) {
    const { dry, kit } = this.outs;
    this.patch((p) => {
      grind(p, kit, dry, t, 1.6, 0.35);
      // Chains paying out.
      grit(p, kit, dry, t + 0.05, 4200, 2, 1.4, 0.22, 0.1);
      thud(p, kit, dry, t + 1.6, 95, 40, 0.4, 0.42);
      noise(p, dry, t + 1.6, kit.brown, "lowpass", 400, 120, 0.7, 0.3, 0.3);
    });
  },

  gate_close(t) {
    const { dry, kit } = this.outs;
    this.patch((p) => {
      grit(p, kit, dry, t, 4000, 2, 0.6, 0.22, 0.05);
      grind(p, kit, dry, t, 0.6, 0.3);
      thud(p, kit, dry, t + 0.6, 85, 35, 0.5, 0.55);
      noise(p, dry, t + 0.6, kit.brown, "lowpass", 500, 100, 0.7, 0.4, 0.4);
      clank(p, dry, t + 0.6, rand(300, 360), 0.6, 0.05);
    });
  },

  stone_grind(t) {
    const { dry, kit } = this.outs;
    this.patch((p) => grind(p, kit, dry, t, 1.3, 0.38));
  },

  spike_trap(t) {
    const { dry, kit } = this.outs;
    this.patch((p) => {
      thud(p, kit, dry, t, 160, 80, 0.08, 0.3);
      noise(p, dry, t, kit.white, "highpass", 2000, 8000, 0.8, 0.14, 0.22);
      clank(p, dry, t + 0.02, rand(1700, 1900), 0.5, 0.05);
    });
  },

  dart(t) {
    const { dry, kit } = this.outs;
    this.patch((p) => {
      noise(p, dry, t, kit.white, "bandpass", 3200, 1200, 2, 0.12, 0.22, 0.01);
      sweep(p, dry, t, "sine", 2500, 1600, 0.12, 0.035, 0.01);
      noise(p, dry, t + 0.13, kit.white, "bandpass", 1300, 1300, 2, 0.03, 0.24);
      sweep(p, dry, t + 0.13, "triangle", 620, 300, 0.05, 0.14);
    });
  },

  rumble(t) {
    const { dry, kit } = this.outs;
    this.patch((p) => {
      const src = p.buffer(kit.brown, t, t + 2.7, 1, true, Math.random() * 3);
      const low = p.filter("lowpass", 140, 1);
      const amp = p.gain();
      amp.gain.setValueAtTime(0, t);
      amp.gain.linearRampToValueAtTime(0.45, t + 0.6);
      amp.gain.setTargetAtTime(0, t + 1.2, 0.4);
      src.connect(low).connect(amp).connect(dry);
      const sub = p.osc("sine", 38, t, t + 2.6);
      const tremolo = p.osc("sine", 7, t, t + 2.6);
      const tremoloDepth = p.gain(0.08);
      const subAmp = p.gain();
      subAmp.gain.setValueAtTime(0, t);
      subAmp.gain.linearRampToValueAtTime(0.14, t + 0.6);
      subAmp.gain.setTargetAtTime(0, t + 1.2, 0.4);
      tremolo.connect(tremoloDepth).connect(subAmp.gain);
      sub.connect(subAmp).connect(dry);
      grit(p, kit, dry, t + 0.2, 700, 1, 1.8, 0.1, 0.4);
    });
  },

  collapse(t) {
    const { dry, kit } = this.outs;
    RECIPES.rumble.call(this, t);
    this.patch((p) => {
      for (let i = 0; i < 7; i++) {
        const at = t + 0.15 + Math.random() * 1.8;
        thud(p, kit, dry, at, rand(90, 170), 40, rand(0.15, 0.35), rand(0.15, 0.35));
      }
      grit(p, kit, dry, t + 0.1, 1500, 0.8, 2, 0.28, 0.2);
      noise(p, dry, t, kit.pink, "lowpass", 2500, 300, 0.7, 1.4, 0.2, 0.15);
    });
  },

  secret(t) {
    // A rising Lydian arpeggio over a bowed-glass bloom: "something here".
    [72, 76, 78, 79, 83, 84].forEach((note, i) => this.note("celesta", t + i * 0.09, note + 12, 0.42, true));
    this.note("glass", t, 72, 0.6, true, 2.5);
    const { hall, kit } = this.outs;
    this.patch((p) => whoosh(p, hall, t, kit.white, 5000, 9000, 1, 0.9, 0.035));
  },

  chest_open(t) {
    const { dry, hall, kit } = this.outs;
    this.patch((p) => {
      noise(p, dry, t, kit.white, "bandpass", 3000, 3000, 3, 0.02, 0.2);
      creak(p, dry, t + 0.03, 120, 0.5, 0.07);
      thud(p, kit, dry, t + 0.53, 150, 80, 0.15, 0.28);
      whoosh(p, hall, t + 0.55, kit.white, 6000, 9000, 1, 0.7, 0.03);
    });
    [86, 90, 93, 98].forEach((note, i) => this.note("celesta", t + 0.58 + i * 0.07, note, 0.38, true));
  },

  relic_fanfare(t) {
    // Harp sweep up, a horn call A-D-F#, held over a string chord, timpani
    // under the arrival and celesta glitter falling over the top.
    [62, 66, 69, 74, 78, 81, 86, 90].forEach((note, i) => this.note("harp", t + i * 0.045, note, 0.45, true));
    this.note("horn", t, 69, 0.6, true, 0.12);
    this.note("horn", t + 0.15, 74, 0.65, true, 0.12);
    this.note("horn", t + 0.3, 78, 0.75, true, 1.4);
    this.note("horn", t + 0.3, 74, 0.55, true, 1.4);
    for (const note of [50, 62, 66, 69]) this.note("strings", t + 0.3, note, 0.6, true, 1.6);
    this.note("timpani", t + 0.3, 38, 0.8, true, 1.8);
    [98, 93, 90, 86, 81].forEach((note, i) => this.note("celesta", t + 0.45 + i * 0.08, note, 0.35, true));
    this.note("bell", t + 0.3, 74, 0.3, true, 4);
  },

  door(t) {
    const { dry, kit } = this.outs;
    this.patch((p) => {
      noise(p, dry, t, kit.white, "bandpass", 2500, 2500, 3, 0.02, 0.18);
      creak(p, dry, t + 0.04, 90, 0.6, 0.065);
      thud(p, kit, dry, t + 0.66, 115, 60, 0.18, 0.32);
    });
  },

  brazier_light(t) {
    const { hall, kit } = this.outs;
    this.patch((p) => {
      // Whoomph: the filter opens as the flame catches, then the fire settles in.
      const src = p.buffer(kit.pink, t, t + 0.8, 1, true, Math.random() * 3);
      const filter = p.filter("lowpass", 200, 1.2);
      filter.frequency.setValueAtTime(200, t);
      filter.frequency.exponentialRampToValueAtTime(2600, t + 0.18);
      filter.frequency.exponentialRampToValueAtTime(500, t + 0.7);
      const amp = p.gain();
      amp.gain.setValueAtTime(0, t);
      amp.gain.linearRampToValueAtTime(0.38, t + 0.12);
      amp.gain.setTargetAtTime(0, t + 0.2, 0.15);
      src.connect(filter).connect(amp).connect(hall);
      sweep(p, hall, t, "sine", 60, 110, 0.35, 0.25, 0.04);
      grit(p, kit, hall, t + 0.1, 2600, 0.8, 1.3, 0.3, 0.1);
    });
  },

  splash(t) {
    const { dry, kit } = this.outs;
    this.patch((p) => {
      noise(p, dry, t, kit.white, "bandpass", 2600, 600, 0.8, 0.32, 0.34);
      sweep(p, dry, t, "sine", 320, 120, 0.1, 0.2);
      for (let i = 0; i < 5; i++) {
        const at = t + 0.08 + Math.random() * 0.4;
        sweep(p, dry, at, "sine", rand(500, 800), rand(1200, 1700), 0.04, 0.05, 0.002);
      }
    });
  },

  portal(t) {
    const { hall, kit } = this.outs;
    this.patch((p) => {
      const src = p.buffer(kit.white, t, t + 1.5, 1, true, Math.random() * 2);
      const band = p.filter("bandpass", 300, 3);
      band.frequency.setValueAtTime(300, t);
      band.frequency.exponentialRampToValueAtTime(3000, t + 1.2);
      const swirl = p.osc("sine", 6, t, t + 1.5);
      const swirlDepth = p.gain(250);
      swirl.connect(swirlDepth).connect(band.frequency);
      const amp = p.gain();
      amp.gain.setValueAtTime(0, t);
      amp.gain.linearRampToValueAtTime(0.25, t + 0.45);
      amp.gain.linearRampToValueAtTime(0, t + 1.4);
      src.connect(band).connect(amp).connect(hall);
      for (const detune of [-12, 12]) {
        const osc = p.osc("sine", 220, t, t + 1.4, detune);
        osc.frequency.exponentialRampToValueAtTime(880, t + 1.2);
        const g = p.gain();
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.05, t + 0.5);
        g.gain.linearRampToValueAtTime(0, t + 1.35);
        osc.connect(g).connect(hall);
      }
    });
    for (let i = 0; i < 4; i++) this.note("celesta", t + 0.3 + i * 0.16, [86, 90, 93, 97][i]!, 0.25, true);
  },

  quest_complete(t) {
    [79, 84, 88].forEach((note, i) => this.note("celesta", t + i * 0.11, note, 0.5, true));
    this.note("celesta", t + 0.33, 86, 0.45, true);
    this.note("celesta", t + 0.45, 91, 0.55, true);
    [60, 64, 67, 72].forEach((note, i) => this.note("harp", t + i * 0.05, note, 0.4, true));
    for (const note of [48, 60, 64, 67]) this.note("strings", t + 0.05, note, 0.45, true, 1.1);
    this.note("bell", t + 0.45, 79, 0.25, true, 3);
  },

  level_up(t) {
    [60, 62, 64, 67, 69, 72, 74, 76, 79, 81, 84].forEach((note, i) => this.note("harp", t + i * 0.04, note, 0.4, true));
    for (const note of [84, 88, 91]) this.note("celesta", t + 0.46, note, 0.45, true);
    for (const note of [60, 64, 67, 72]) this.note("swell", t, note, 0.5, true, 1.2);
    const { hall, kit } = this.outs;
    this.patch((p) => whoosh(p, hall, t, kit.white, 4000, 9000, 1, 1, 0.04));
  },

  page_turn(t) {
    const { dry, kit } = this.outs;
    this.patch((p) => {
      whoosh(p, dry, t, kit.white, 2500, 6000, 0.9, 0.22, 0.12);
      grit(p, kit, dry, t, 3500, 0.9, 0.22, 0.12, 0.03);
      whoosh(p, dry, t + 0.2, kit.white, 4000, 2500, 1, 0.1, 0.07);
    });
  },

  owl(t) {
    this.owl(t, this.outs.hall);
  },
};
