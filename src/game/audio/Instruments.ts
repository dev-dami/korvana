import type { Kit } from "./Kit";
import { adsr, adsrEnd, Patch, perc } from "./Patch";
import type { VoicePool } from "./Patch";

/**
 * The orchestra. Every instrument is a function that schedules one note from
 * oscillators, filters, envelopes and the kit's shared buffers.
 *
 * Gains are set so a full-velocity note of any pitched instrument peaks around
 * a quarter of full scale; the theme's layer gains do the actual mixing.
 */

/** Where a note goes and what it may use. */
export interface Target {
  ctx: BaseAudioContext;
  out: AudioNode;
  kit: Kit;
  pool: VoicePool;
}

export type PlayNote = (target: Target, t: number, hz: number, dur: number, vel: number) => void;

/**
 * Processing shared by every note of a layer. Filters are linear, so passing
 * the sum of the notes through one bank sounds the same as filtering each
 * note - at a fraction of the cost. The choir's vowel formants live here.
 */
export interface LayerBus {
  input: AudioNode;
  output: AudioNode;
  dispose(): void;
}

export interface InstrumentDef {
  play: PlayNote;
  bus?: (ctx: BaseAudioContext) => LayerBus;
}

const clamp = (v: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, v));

/** A slow vibrato that fades in, as players do once a note has settled. */
function vibrato(p: Patch, t: number, end: number, rate: number, depthHz: number, delay: number, targets: AudioParam[]): void {
  const lfo = p.osc("sine", rate * (0.95 + Math.random() * 0.1), t, end);
  const depth = p.gain();
  depth.gain.setValueAtTime(0, t);
  depth.gain.linearRampToValueAtTime(0, t + delay);
  depth.gain.linearRampToValueAtTime(depthHz, t + delay + 0.4);
  lfo.connect(depth);
  for (const param of targets) depth.connect(param);
}

// --- tuned percussion ---------------------------------------------------

/** A struck steel bar: pure tone with a short FM shimmer on the attack. */
const celesta: PlayNote = (tg, t, hz, _dur, vel) => {
  const p = new Patch(tg.ctx, tg.pool);
  const decay = clamp(2.6 * (440 / hz) ** 0.4, 0.7, 3.4);
  const end = t + decay + 0.05;
  const carrier = p.osc("sine", hz, t, end);
  const mod = p.osc("sine", hz * 3.5, t, t + 0.4);
  const modDepth = p.gain();
  modDepth.gain.setValueAtTime(hz * 1.6, t);
  modDepth.gain.setTargetAtTime(0, t, 0.05);
  mod.connect(modDepth).connect(carrier.frequency);
  // The fourth partial gives the bar its glassy top, and dies quickly.
  const upper = p.osc("sine", hz * 4.01, t, t + 0.6);
  const upperAmp = p.gain();
  perc(upperAmp.gain, t, 0.05 * vel, 0.002, 0.45);
  const amp = p.gain();
  perc(amp.gain, t, 0.2 * vel, 0.003, decay);
  carrier.connect(amp);
  upper.connect(upperAmp).connect(tg.out);
  amp.connect(tg.out);
  p.seal();
};

/** Inharmonic partials of a cast bell, each with its own decay. */
const BELL_PARTIALS: ReadonlyArray<[ratio: number, amp: number, decay: number]> = [
  [0.5, 0.9, 1],
  [1, 1, 0.7],
  [1.19, 0.7, 0.55],
  [1.71, 0.55, 0.4],
  [2.0, 0.45, 0.3],
  [2.74, 0.35, 0.2],
];

const bell: PlayNote = (tg, t, hz, dur, vel) => {
  const p = new Patch(tg.ctx, tg.pool);
  const base = clamp(dur, 2.5, 6);
  for (const [ratio, amp, decay] of BELL_PARTIALS) {
    const length = base * decay;
    const osc = p.osc("sine", hz * ratio, t, t + length + 0.05, (Math.random() - 0.5) * 6);
    const g = p.gain();
    perc(g.gain, t, 0.07 * amp * vel, 0.002, length);
    osc.connect(g).connect(tg.out);
  }
  p.seal();
};

/** Bowed metal: a slow-blooming inharmonic ring with beating pairs. Tombs. */
const glass: PlayNote = (tg, t, hz, dur, vel) => {
  const p = new Patch(tg.ctx, tg.pool);
  const length = clamp(dur, 2, 8);
  const end = t + length + 0.1;
  const amp = p.gain();
  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(0.05 * vel, t + length * 0.35);
  amp.gain.setTargetAtTime(0, t + length * 0.4, length * 0.12);
  for (const [ratio, level] of [[1, 1], [2.32, 0.5], [4.25, 0.3], [6.63, 0.15]] as const) {
    for (const beat of [0, 1.7]) {
      const osc = p.osc("sine", hz * ratio + beat, t, end);
      const g = p.gain(level * 0.5);
      osc.connect(g).connect(amp);
    }
  }
  amp.connect(tg.out);
  p.seal();
};

// --- plucked strings (Karplus-Strong buffers from the kit) ----------------

function plucked(kind: "harp" | "lute" | "pizz", level: number, brightness: number): PlayNote {
  return (tg, t, hz, _dur, vel) => {
    const p = new Patch(tg.ctx, tg.pool);
    const { buffer, rate } = tg.kit.pluck(kind, hz);
    const src = p.buffer(buffer, t, t + buffer.duration / rate + 0.02, rate);
    const tone = p.filter("lowpass", clamp(hz * brightness * (0.6 + vel * 0.6), 400, 12000), 0.5);
    const amp = p.gain(level * vel);
    src.connect(tone).connect(amp).connect(tg.out);
    p.seal();
  };
}

// --- winds and brass ------------------------------------------------------

/** Breathy, round, with a late vibrato. */
const flute: PlayNote = (tg, t, hz, dur, vel) => {
  const p = new Patch(tg.ctx, tg.pool);
  const attack = 0.07;
  const release = 0.2;
  const end = adsrEnd(t, attack, dur, release);
  const fundamental = p.osc("sine", hz, t, end);
  const second = p.osc("triangle", hz * 2, t, end);
  vibrato(p, t, end, 5.2, hz * 0.006, 0.25, [fundamental.frequency]);
  const secondLevel = p.gain(0.08);
  const breath = p.buffer(tg.kit.white, t, end, 1, true, Math.random() * 2);
  const breathBand = p.filter("bandpass", clamp(hz * 2, 600, 9000), 2.5);
  const breathLevel = p.gain(0.09);
  const amp = p.gain();
  adsr(amp.gain, t, 0.18 * vel, attack, 0.2, 0.82, dur, release);
  fundamental.connect(amp);
  second.connect(secondLevel).connect(amp);
  breath.connect(breathBand).connect(breathLevel).connect(amp);
  amp.connect(tg.out);
  p.seal();
};

/** A woody, hollow reed - odd harmonics through a soft filter. Good for mischief. */
const reed: PlayNote = (tg, t, hz, dur, vel) => {
  const p = new Patch(tg.ctx, tg.pool);
  const attack = 0.03;
  const release = 0.09;
  const end = adsrEnd(t, attack, dur * 0.92, release);
  const body = p.osc("square", hz, t, end);
  vibrato(p, t, end, 5.6, hz * 0.004, 0.3, [body.frequency]);
  const tone = p.filter("lowpass", clamp(hz * 3.2, 600, 4200), 0.9);
  const amp = p.gain();
  adsr(amp.gain, t, 0.07 * vel, attack, 0.15, 0.8, dur * 0.92, release);
  body.connect(tone).connect(amp).connect(tg.out);
  p.seal();
};

/** Warm horn: two saws whose filter opens on the attack the way lips buzz into a note. */
const horn: PlayNote = (tg, t, hz, dur, vel) => {
  const p = new Patch(tg.ctx, tg.pool);
  const attack = 0.09;
  const release = 0.35;
  const end = adsrEnd(t, attack, dur, release);
  const a = p.osc("sawtooth", hz, t, end, -5);
  const b = p.osc("sawtooth", hz, t, end, 5);
  vibrato(p, t, end, 4.8, hz * 0.004, 0.45, [a.frequency, b.frequency]);
  const tone = p.filter("lowpass", hz * 1.2, 1.1);
  tone.frequency.setValueAtTime(hz * 1.2, t);
  tone.frequency.linearRampToValueAtTime(clamp(hz * (3 + vel * 2), 300, 5000), t + attack);
  tone.frequency.setTargetAtTime(clamp(hz * 2.4, 250, 3000), t + attack, 0.25);
  const amp = p.gain();
  adsr(amp.gain, t, 0.085 * vel, attack, 0.3, 0.8, dur, release);
  a.connect(tone);
  b.connect(tone);
  tone.connect(amp).connect(tg.out);
  p.seal();
};

/** Trombones and tubas: rounder low end, more bite on the front. */
const lowbrass: PlayNote = (tg, t, hz, dur, vel) => {
  const p = new Patch(tg.ctx, tg.pool);
  const attack = 0.05;
  const release = 0.3;
  const end = adsrEnd(t, attack, dur, release);
  const a = p.osc("sawtooth", hz, t, end, -4);
  const b = p.osc("sawtooth", hz, t, end, 6);
  const sub = p.osc("triangle", hz / 2, t, end);
  const subLevel = p.gain(0.5);
  const tone = p.filter("lowpass", hz * 1.5, 1.6);
  tone.frequency.setValueAtTime(hz * 1.5, t);
  tone.frequency.linearRampToValueAtTime(clamp(hz * (4 + vel * 4), 300, 4000), t + attack);
  tone.frequency.setTargetAtTime(clamp(hz * 3, 200, 2400), t + attack, 0.2);
  const amp = p.gain();
  adsr(amp.gain, t, 0.09 * vel, attack, 0.25, 0.75, dur, release);
  a.connect(tone);
  b.connect(tone);
  sub.connect(subLevel).connect(amp);
  tone.connect(amp).connect(tg.out);
  p.seal();
};

// --- bowed strings ------------------------------------------------------

/** An ensemble section: three detuned saws sharing one vibrato. */
function section(tg: Target, t: number, hz: number, dur: number, vel: number, attack: number, release: number, swell: boolean): void {
  const p = new Patch(tg.ctx, tg.pool);
  const end = swell ? t + dur + release + 0.05 : adsrEnd(t, attack, dur, release);
  const oscs = [-9, 0, 8].map((cents) => p.osc("sawtooth", hz, t, end, cents + (Math.random() - 0.5) * 4));
  vibrato(p, t, end, 5.3, hz * 0.005, 0.2, oscs.map((o) => o.frequency));
  const tone = p.filter("lowpass", clamp(hz * 5, 500, 6000), 0.5);
  const amp = p.gain();
  const peak = 0.04 * vel;
  if (swell) {
    // Crescendo to a peak two-thirds in, then fall away.
    amp.gain.setValueAtTime(0, t);
    amp.gain.linearRampToValueAtTime(peak * 0.3, t + dur * 0.3);
    amp.gain.linearRampToValueAtTime(peak, t + dur * 0.68);
    amp.gain.linearRampToValueAtTime(0, t + dur + release);
  } else {
    adsr(amp.gain, t, peak, attack, 0.4, 0.9, dur, release);
  }
  for (const osc of oscs) osc.connect(tone);
  tone.connect(amp).connect(tg.out);
  p.seal();
}

const strings: PlayNote = (tg, t, hz, dur, vel) =>
  section(tg, t, hz, dur, vel, clamp(dur * 0.25, 0.08, 0.6), 0.6, false);

const swell: PlayNote = (tg, t, hz, dur, vel) => section(tg, t, hz, dur, vel, 0, Math.min(1.2, dur * 0.3), true);

/** Short, driven bow strokes for ostinatos. */
const spiccato: PlayNote = (tg, t, hz, _dur, vel) => {
  const p = new Patch(tg.ctx, tg.pool);
  const end = t + 0.32;
  const a = p.osc("sawtooth", hz, t, end, -6);
  const b = p.osc("sawtooth", hz, t, end, 6);
  const tone = p.filter("lowpass", hz * 2, 1.2);
  tone.frequency.setValueAtTime(clamp(hz * 7, 600, 5000), t);
  tone.frequency.setTargetAtTime(clamp(hz * 2, 200, 2000), t, 0.05);
  const amp = p.gain();
  perc(amp.gain, t, 0.09 * vel, 0.006, 0.26);
  a.connect(tone);
  b.connect(tone);
  tone.connect(amp).connect(tg.out);
  p.seal();
};

// --- pads, voices, bass ---------------------------------------------------

/** A soft synthetic pad: the glue under everything. */
const pad: PlayNote = (tg, t, hz, dur, vel) => {
  const p = new Patch(tg.ctx, tg.pool);
  const attack = clamp(dur * 0.35, 0.3, 1.6);
  const release = 1.6;
  const end = adsrEnd(t, attack, dur, release);
  const a = p.osc("sawtooth", hz, t, end, -11);
  const b = p.osc("sawtooth", hz, t, end, 11);
  const c = p.osc("triangle", hz / 2, t, end);
  const tone = p.filter("lowpass", clamp(hz * 2.5, 300, 1600), 0.6);
  const amp = p.gain();
  adsr(amp.gain, t, 0.03 * vel, attack, 0.5, 1, dur, release);
  a.connect(tone);
  b.connect(tone);
  c.connect(tone);
  tone.connect(amp).connect(tg.out);
  p.seal();
};

/** Two saws per singer; the vowel is in the layer's formant bus. */
const choirVoice: PlayNote = (tg, t, hz, dur, vel) => {
  const p = new Patch(tg.ctx, tg.pool);
  const attack = clamp(dur * 0.3, 0.2, 0.9);
  const release = 0.9;
  const end = adsrEnd(t, attack, dur, release);
  const a = p.osc("sawtooth", hz, t, end, -7 + Math.random() * 3);
  const b = p.osc("sawtooth", hz, t, end, 7 - Math.random() * 3);
  vibrato(p, t, end, 4.7, hz * 0.006, 0.3, [a.frequency, b.frequency]);
  const amp = p.gain();
  adsr(amp.gain, t, 0.1 * vel, attack, 0.4, 0.9, dur, release);
  a.connect(amp);
  b.connect(amp);
  amp.connect(tg.out);
  p.seal();
};

/**
 * Vowel formants between "ah" and "oh", drifting slowly between the two so a
 * held chord breathes. Plus a little unfiltered body underneath.
 */
function formantBus(ctx: BaseAudioContext): LayerBus {
  const input = ctx.createGain();
  const output = ctx.createGain();
  output.gain.value = 2.2;
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.05;
  lfo.start();
  const nodes: AudioNode[] = [input, output, lfo];
  for (const [freq, q, level] of [[650, 5, 1], [1050, 7, 0.55], [2600, 9, 0.25]] as const) {
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = freq;
    band.Q.value = q;
    const gain = ctx.createGain();
    gain.gain.value = level;
    const drift = ctx.createGain();
    drift.gain.value = freq * 0.14;
    lfo.connect(drift).connect(band.frequency);
    input.connect(band).connect(gain).connect(output);
    nodes.push(band, gain, drift);
  }
  const body = ctx.createBiquadFilter();
  body.type = "lowpass";
  body.frequency.value = 500;
  const bodyLevel = ctx.createGain();
  bodyLevel.gain.value = 0.12;
  input.connect(body).connect(bodyLevel).connect(output);
  nodes.push(body, bodyLevel);
  return {
    input,
    output,
    dispose: () => {
      lfo.stop();
      for (const node of nodes) node.disconnect();
    },
  };
}

/** Round bass with a touch of second harmonic so it reads on small speakers. */
const bass: PlayNote = (tg, t, hz, dur, vel) => {
  const p = new Patch(tg.ctx, tg.pool);
  const attack = 0.012;
  const release = 0.18;
  const end = adsrEnd(t, attack, dur, release);
  const sine = p.osc("sine", hz, t, end);
  const tri = p.osc("triangle", hz, t, end);
  const octave = p.osc("sine", hz * 2, t, end);
  const triLevel = p.gain(0.35);
  const octaveLevel = p.gain(0.18);
  const amp = p.gain();
  adsr(amp.gain, t, 0.26 * vel, attack, 0.5, 0.6, dur, release);
  sine.connect(amp);
  tri.connect(triLevel).connect(amp);
  octave.connect(octaveLevel).connect(amp);
  amp.connect(tg.out);
  p.seal();
};

/** A dark, slowly-breathing drone for tombs and the Scar. */
const drone: PlayNote = (tg, t, hz, dur, vel) => {
  const p = new Patch(tg.ctx, tg.pool);
  const attack = clamp(dur * 0.3, 1, 4);
  const release = 3;
  const end = adsrEnd(t, attack, dur, release);
  const oscs = [p.osc("sawtooth", hz, t, end, -6), p.osc("sawtooth", hz, t, end, 7), p.osc("sine", hz / 2, t, end)];
  const tone = p.filter("lowpass", clamp(hz * 2.5, 120, 900), 2);
  const sweep = p.osc("sine", 0.06 + Math.random() * 0.05, t, end);
  const sweepDepth = p.gain(clamp(hz * 1.2, 60, 500));
  sweep.connect(sweepDepth).connect(tone.frequency);
  const amp = p.gain();
  adsr(amp.gain, t, 0.05 * vel, attack, 1, 1, dur, release);
  for (const osc of oscs) osc.connect(tone);
  tone.connect(amp).connect(tg.out);
  p.seal();
};

// --- drums ----------------------------------------------------------------
//
// Untuned drums still receive a frequency; it is read as a tuning multiplier
// against the drum's natural pitch, so a pattern can use a high and low head.

function noiseHit(p: Patch, tg: Target, t: number, type: BiquadFilterType, freq: number, q: number, peak: number, decay: number): AudioNode {
  const src = p.buffer(tg.kit.white, t, t + decay + 0.05, 1, true, Math.random() * 2);
  const band = p.filter(type, freq, q);
  const amp = p.gain();
  perc(amp.gain, t, peak, 0.001, decay);
  src.connect(band).connect(amp);
  return amp;
}

const timpani: PlayNote = (tg, t, hz, dur, vel) => {
  const p = new Patch(tg.ctx, tg.pool);
  const decay = clamp(dur, 0.8, 2.4);
  const end = t + decay + 0.05;
  const head = p.osc("sine", hz * 1.04, t, end);
  head.frequency.setTargetAtTime(hz, t, 0.03);
  const mode2 = p.osc("sine", hz * 1.5, t, t + decay * 0.6);
  const mode3 = p.osc("sine", hz * 1.98, t, t + decay * 0.4);
  const amp = p.gain();
  perc(amp.gain, t, 0.38 * vel, 0.004, decay);
  const amp2 = p.gain();
  perc(amp2.gain, t, 0.15 * vel, 0.004, decay * 0.5);
  const amp3 = p.gain();
  perc(amp3.gain, t, 0.07 * vel, 0.004, decay * 0.35);
  head.connect(amp).connect(tg.out);
  mode2.connect(amp2).connect(tg.out);
  mode3.connect(amp3).connect(tg.out);
  noiseHit(p, tg, t, "lowpass", 700, 0.7, 0.12 * vel, 0.08).connect(tg.out);
  p.seal();
};

/** Hand drum: a soft low thump with skin noise on top. */
const frame: PlayNote = (tg, t, hz, _dur, vel) => {
  const p = new Patch(tg.ctx, tg.pool);
  const tune = hz / 110;
  const thump = p.osc("sine", 120 * tune, t, t + 0.4);
  thump.frequency.setTargetAtTime(68 * tune, t, 0.04);
  const amp = p.gain();
  perc(amp.gain, t, 0.32 * vel, 0.003, 0.32);
  thump.connect(amp).connect(tg.out);
  noiseHit(p, tg, t, "bandpass", 320 * tune, 1, 0.22 * vel, 0.12).connect(tg.out);
  noiseHit(p, tg, t, "highpass", 3200, 0.7, 0.05 * vel, 0.03).connect(tg.out);
  p.seal();
};

/** Big low war drum for battles. */
const taiko: PlayNote = (tg, t, hz, _dur, vel) => {
  const p = new Patch(tg.ctx, tg.pool);
  const tune = hz / 110;
  const body = p.osc("sine", 85 * tune, t, t + 0.8);
  body.frequency.setTargetAtTime(46 * tune, t, 0.07);
  const amp = p.gain();
  perc(amp.gain, t, 0.55 * vel, 0.002, 0.7);
  body.connect(amp).connect(tg.out);
  noiseHit(p, tg, t, "lowpass", 500 * tune, 0.8, 0.35 * vel, 0.12).connect(tg.out);
  p.seal();
};

const shaker: PlayNote = (tg, t, _hz, _dur, vel) => {
  const p = new Patch(tg.ctx, tg.pool);
  const src = p.buffer(tg.kit.white, t, t + 0.12, 1, true, Math.random() * 2);
  const band = p.filter("bandpass", 7200, 1.1);
  const amp = p.gain();
  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(0.14 * vel, t + 0.014);
  amp.gain.setTargetAtTime(0, t + 0.014, 0.018);
  src.connect(band).connect(amp).connect(tg.out);
  p.seal();
};

/** Woodblock-ish rim click. */
const rim: PlayNote = (tg, t, hz, _dur, vel) => {
  const p = new Patch(tg.ctx, tg.pool);
  const tune = hz / 110;
  const knock = p.osc("triangle", 820 * tune, t, t + 0.08);
  const amp = p.gain();
  perc(amp.gain, t, 0.14 * vel, 0.001, 0.05);
  knock.connect(amp).connect(tg.out);
  noiseHit(p, tg, t, "bandpass", 2200 * tune, 3, 0.1 * vel, 0.025).connect(tg.out);
  p.seal();
};

/** A suspended cymbal rolled into a crescendo: transitions and swells. */
const cymbal: PlayNote = (tg, t, _hz, dur, vel) => {
  const p = new Patch(tg.ctx, tg.pool);
  const end = t + dur + 1.3;
  const src = p.buffer(tg.kit.white, t, end, 1, true, Math.random() * 2);
  const high = p.filter("highpass", 4200, 0.7);
  const shimmer = p.filter("peaking", 8500, 1);
  shimmer.gain.value = 6;
  const amp = p.gain();
  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(0.05 * vel, t + dur);
  amp.gain.setTargetAtTime(0, t + dur, 0.25);
  src.connect(high).connect(shimmer).connect(amp).connect(tg.out);
  p.seal();
};

export type InstrumentName =
  | "celesta"
  | "bell"
  | "glass"
  | "harp"
  | "lute"
  | "pizz"
  | "flute"
  | "reed"
  | "horn"
  | "lowbrass"
  | "strings"
  | "swell"
  | "spiccato"
  | "pad"
  | "choir"
  | "bass"
  | "drone"
  | "timpani"
  | "frame"
  | "taiko"
  | "shaker"
  | "rim"
  | "cymbal";

export const INSTRUMENTS: Record<InstrumentName, InstrumentDef> = {
  celesta: { play: celesta },
  bell: { play: bell },
  glass: { play: glass },
  harp: { play: plucked("harp", 0.3, 6) },
  lute: { play: plucked("lute", 0.26, 8) },
  pizz: { play: plucked("pizz", 0.42, 4) },
  flute: { play: flute },
  reed: { play: reed },
  horn: { play: horn },
  lowbrass: { play: lowbrass },
  strings: { play: strings },
  swell: { play: swell },
  spiccato: { play: spiccato },
  pad: { play: pad },
  choir: { play: choirVoice, bus: formantBus },
  bass: { play: bass },
  drone: { play: drone },
  timpani: { play: timpani },
  frame: { play: frame },
  taiko: { play: taiko },
  shaker: { play: shaker },
  rim: { play: rim },
  cymbal: { play: cymbal },
};
