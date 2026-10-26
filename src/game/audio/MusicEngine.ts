import { INSTRUMENTS } from "./Instruments";
import type { InstrumentDef, LayerBus, Target } from "./Instruments";
import type { Kit } from "./Kit";
import { hasRoom } from "./Patch";
import type { VoicePool } from "./Patch";
import { chordToneAt, chordTones, midiToHz, parseLine, stepToSemis, voiceLead } from "./theory";
import type { LineNote, Scale } from "./theory";
import type { LinePart, SectionDef, ThemeDef } from "./themes/types";

/**
 * Plays themes. Each theme runs in its own ThemePlayer with its own fader, so
 * a crossfade is simply two players overlapping: the old one keeps playing
 * its bars while it fades, which is what makes the change sound like an
 * orchestra turning a page rather than a tape being swapped.
 */

/** Keep this many voices free for melody: accompaniment yields first. */
const ACCOMPANIMENT_RESERVE = 10;
/** Let ringing notes finish after a player has faded out before tearing it down. */
const TAIL_SECONDS = 5;

/**
 * A gain whose fades are tracked in JS. Web Audio cannot report a param's
 * value mid-ramp in every browser, and a fade that starts from the wrong
 * value pops - so we compute where the ramp is ourselves.
 */
class Fader {
  private from = 0;
  private to = 0;
  private start = 0;
  private end = 0;

  private readonly params: AudioParam[];

  constructor(params: AudioParam[]) {
    this.params = params;
    for (const p of params) p.value = 0;
  }

  valueAt(time: number): number {
    if (time >= this.end) return this.to;
    if (time <= this.start) return this.from;
    return this.from + ((this.to - this.from) * (time - this.start)) / (this.end - this.start);
  }

  fade(target: number, at: number, seconds: number): void {
    const from = this.valueAt(at);
    for (const p of this.params) {
      p.cancelScheduledValues(at);
      p.setValueAtTime(from, at);
      p.linearRampToValueAtTime(target, at + Math.max(0.01, seconds));
    }
    this.from = from;
    this.to = target;
    this.start = at;
    this.end = at + Math.max(0.01, seconds);
  }

  get target(): number {
    return this.to;
  }
}

interface Layer {
  def: InstrumentDef;
  target: Target;
  nodes: AudioNode[];
  bus: LayerBus | null;
}

interface QueuedNote {
  layer: Layer;
  at: number;
  hz: number;
  dur: number;
  vel: number;
  /** Accompaniment and ghost notes give way first when voices run short. */
  optional: boolean;
}

const DRUM_VELOCITY: Record<string, number> = { X: 1, x: 0.75, o: 0.45, g: 0.25 };

class ThemePlayer {
  private readonly dry: GainNode;
  private readonly wet: GainNode;
  private readonly fader: Fader;
  private readonly layers = new Map<string, Layer>();

  private sectionId: string;
  private section: SectionDef;
  private bar = 0;
  private pass = 0;
  private nextBarTime: number;
  /** Per part index: the line chosen for this pass, or null to sit it out. */
  private lines: Array<LineNote[] | null> = [];
  /** Per part index: the layer chosen for this pass. */
  private partLayers: string[] = [];
  private padVoicing = new Map<number, number[]>();
  /**
   * Notes composed for the current bar but not yet built. A bar is composed
   * as a whole (so phrases and voicings stay coherent) but only turned into
   * audio nodes once inside the lookahead window, which keeps the live node
   * count - and the polyphony budget - about what is actually sounding.
   */
  private queue: QueuedNote[] = [];

  retireAt = Infinity;
  disposed = false;

  readonly zone: string;
  readonly theme: ThemeDef;
  private readonly ctx: BaseAudioContext;

  constructor(
    zone: string,
    theme: ThemeDef,
    ctx: BaseAudioContext,
    output: AudioNode,
    reverb: AudioNode,
    kit: Kit,
    pool: VoicePool,
    start: number,
    startSection: string,
  ) {
    this.zone = zone;
    this.theme = theme;
    this.ctx = ctx;
    this.dry = ctx.createGain();
    this.wet = ctx.createGain();
    this.dry.connect(output);
    this.wet.connect(reverb);
    this.fader = new Fader([this.dry.gain, this.wet.gain]);

    const themeGain = theme.gain ?? 1;
    for (const [id, def] of Object.entries(theme.layers)) {
      const instrument = INSTRUMENTS[def.inst];
      const bus = instrument.bus ? instrument.bus(ctx) : null;
      const level = ctx.createGain();
      level.gain.value = def.gain * themeGain;
      const panner = ctx.createStereoPanner();
      panner.pan.value = def.pan ?? 0;
      const send = ctx.createGain();
      send.gain.value = def.reverb ?? theme.reverb;
      const input = bus ? bus.input : level;
      if (bus) bus.output.connect(level);
      level.connect(panner).connect(this.dry);
      panner.connect(send).connect(this.wet);
      this.layers.set(id, {
        def: instrument,
        target: { ctx, out: input, kit, pool },
        nodes: [level, panner, send],
        bus,
      });
    }

    this.sectionId = theme.sections[startSection] ? startSection : theme.start;
    this.section = theme.sections[this.sectionId]!;
    this.nextBarTime = start;
    this.enterSection();
  }

  get currentSection(): string {
    return this.sectionId;
  }

  get fadingOut(): boolean {
    return this.retireAt !== Infinity;
  }

  fadeIn(at: number, seconds: number): void {
    this.retireAt = Infinity;
    this.fader.fade(1, at, seconds);
  }

  fadeOut(at: number, seconds: number): void {
    this.fader.fade(0, at, seconds);
    this.retireAt = at + seconds;
  }

  /** Composes every bar that starts before `until`, then builds the notes that fall before it. */
  schedule(until: number): void {
    if (this.disposed) return;
    const now = this.ctx.currentTime;
    // A theme revived after it stopped composing (or a stalled timer) must not
    // replay the bars it missed in one burst: skip silently to the present.
    while (this.nextBarTime + this.barSeconds < now && this.nextBarTime < this.retireAt) {
      this.nextBarTime += this.barSeconds;
      this.bar++;
      if (this.bar >= this.section.chords.length) this.advanceSection();
    }
    let composed = false;
    while (this.nextBarTime < until && this.nextBarTime < this.retireAt) {
      this.playBar(this.nextBarTime);
      composed = true;
      this.nextBarTime += this.barSeconds;
      this.bar++;
      if (this.bar >= this.section.chords.length) this.advanceSection();
    }
    if (composed) this.queue.sort((a, b) => a.at - b.at);

    let taken = 0;
    while (taken < this.queue.length && this.queue[taken]!.at < until) {
      const q = this.queue[taken++]!;
      if (q.at >= this.retireAt || q.at < now - 0.1) continue;
      if (!hasRoom(q.layer.target.pool, q.optional ? ACCOMPANIMENT_RESERVE : 0)) continue;
      q.layer.def.play(q.layer.target, Math.max(now, q.at), q.hz, q.dur, q.vel);
    }
    if (taken > 0) this.queue.splice(0, taken);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.queue = [];
    this.dry.disconnect();
    this.wet.disconnect();
    for (const layer of this.layers.values()) {
      for (const node of layer.nodes) node.disconnect();
      layer.bus?.dispose();
    }
    this.layers.clear();
  }

  private get beatSeconds(): number {
    return 60 / this.theme.bpm;
  }

  private get barSeconds(): number {
    return this.beatSeconds * this.theme.meter;
  }

  private get scale(): Scale {
    return this.section.scale ?? this.theme.scale;
  }

  private advanceSection(): void {
    const options = this.section.next;
    const nextId = options[Math.floor(Math.random() * options.length)] ?? this.theme.start;
    this.sectionId = this.theme.sections[nextId] ? nextId : this.theme.start;
    this.section = this.theme.sections[this.sectionId]!;
    this.bar = 0;
    this.pass++;
    this.enterSection();
  }

  /** Decides, once per pass of a section, who plays the tune and which phrases they play. */
  private enterSection(): void {
    this.lines = [];
    this.partLayers = [];
    this.section.parts.forEach((part, index) => {
      this.partLayers[index] = pick(part.layer);
      this.lines[index] = part.kind === "line" ? this.composeLine(part) : null;
    });
  }

  private composeLine(part: LinePart): LineNote[] | null {
    if (part.prob !== undefined && Math.random() > part.prob) return null;
    const notes: LineNote[] = [];
    let offset = 0;
    for (const slot of part.phrases) {
      const choice = slot[Math.floor(Math.random() * slot.length)] ?? "-";
      if (choice === "-") {
        // A silent slot still takes up the length of its siblings.
        const sibling = slot.find((s) => s !== "-");
        offset += sibling ? parseLine(sibling).beats : this.theme.meter;
        continue;
      }
      const line = parseLine(choice);
      for (const note of line.notes) notes.push({ ...note, beat: note.beat + offset });
      offset += line.beats;
    }
    return notes;
  }

  private playBar(t0: number): void {
    const section = this.section;
    const chord = section.chords[this.bar] ?? "0";
    const tones = chordTones(this.scale, chord);
    const beat = this.beatSeconds;
    const meter = this.theme.meter;

    section.parts.forEach((part, index) => {
      if (part.fromPass !== undefined && this.pass < part.fromPass) return;
      if (part.bars && !part.bars.includes(this.bar)) return;
      if (part.kind !== "line" && part.prob !== undefined && Math.random() > part.prob) return;
      const layer = this.layers.get(this.partLayers[index] ?? "");
      if (!layer) return;
      const base = this.theme.root + 12 * (part.octave ?? 0);
      const vel = part.vel ?? 0.8;

      switch (part.kind) {
        case "pad": {
          // Tie a chord that repeats over the following bars into one long note.
          if (this.bar > 0 && sameChord(section.chords[this.bar - 1], chord)) return;
          let bars = 1;
          while (this.bar + bars < section.chords.length && sameChord(section.chords[this.bar + bars], chord)) bars++;
          // Voiced around the tritone above the part's tonic: the middle of its octave.
          const voiced = voiceLead(tones, 6, this.padVoicing.get(index) ?? null);
          this.padVoicing.set(index, voiced);
          const dur = bars * this.barSeconds * 0.98;
          for (const note of voiced) this.note(layer, t0, dur, vel, true, base + note);
          if (part.root) this.note(layer, t0, dur, vel * 0.8, true, base + tones[0]! - 12);
          return;
        }
        case "arp": {
          const steps = Math.round(meter / part.step);
          for (let k = 0; k < steps; k++) {
            const idx = part.pattern[(this.bar * steps + k) % part.pattern.length]!;
            if (idx < -50) continue;
            const at = t0 + this.swung(k * part.step) * beat;
            this.note(layer, at, part.step * beat * (part.gate ?? 1.5), vel, true, base + chordToneAt(tones, idx));
          }
          return;
        }
        case "bass": {
          const line = parseLine(part.pattern);
          for (let offset = 0; offset < meter && line.beats > 0; offset += line.beats) {
            for (const n of line.notes) {
              if (n.beat + offset >= meter) break;
              const at = t0 + this.swung(n.beat + offset) * beat;
              this.note(layer, at, n.dur * beat, vel * (n.accent ? 1.15 : 1), false, base + chordToneAt(tones, n.step) + n.shift);
            }
          }
          return;
        }
        case "line": {
          const notes = this.lines[index];
          if (!notes) return;
          const from = this.bar * meter;
          const to = from + meter;
          for (const n of notes) {
            if (n.beat < from || n.beat >= to) continue;
            const at = t0 + this.swung(n.beat - from) * beat;
            const midi = base + stepToSemis(this.scale, n.step) + n.shift;
            const v = vel * (n.accent ? 1.15 : 1);
            this.note(layer, at, n.dur * beat, v, false, midi);
            if (part.harmony) {
              this.note(layer, at, n.dur * beat, v * 0.7, true, base + stepToSemis(this.scale, n.step + part.harmony));
            }
          }
          return;
        }
        case "drum": {
          const steps = Math.round(meter / part.step);
          const hz = part.tuned ? midiToHz(base + tones[0]!) : (part.pitch ?? 110);
          for (let k = 0; k < steps; k++) {
            const ch = part.pattern[(this.bar * steps + k) % part.pattern.length] ?? ".";
            const level = DRUM_VELOCITY[ch];
            if (!level) continue;
            const at = t0 + this.swung(k * part.step) * beat;
            this.trigger(layer, at, hz, (part.dur ?? part.step) * beat, vel * level, ch !== "X");
          }
          return;
        }
        case "scatter": {
          const [lo, hi] = part.count;
          const count = lo + Math.floor(Math.random() * (hi - lo + 1));
          const spread = part.spread ?? 1;
          for (let i = 0; i < count; i++) {
            const at = t0 + Math.floor(Math.random() * meter * 2) * 0.5 * beat;
            const midi =
              part.pool === "chord"
                ? base + chordToneAt(tones, Math.floor(Math.random() * tones.length * spread))
                : base + stepToSemis(this.scale, Math.floor(Math.random() * 7 * spread));
            this.note(layer, at, part.dur * beat, vel * (0.7 + Math.random() * 0.3), true, midi);
          }
          return;
        }
      }
    });
  }

  /** Queues one note with a little human looseness in time and weight. */
  private note(layer: Layer, t: number, dur: number, vel: number, accompaniment: boolean, midi: number): void {
    this.queue.push({
      layer,
      at: t + (Math.random() - 0.5) * 0.012,
      hz: midiToHz(midi),
      dur,
      vel: Math.min(1, vel * (0.9 + Math.random() * 0.15)),
      optional: accompaniment,
    });
  }

  private trigger(layer: Layer, t: number, hz: number, dur: number, vel: number, optional: boolean): void {
    this.queue.push({
      layer,
      at: t + (Math.random() - 0.5) * 0.006,
      hz,
      dur,
      vel: Math.min(1, vel * (0.92 + Math.random() * 0.1)),
      optional,
    });
  }

  /** Beat position after swing: off-beat eighths lean late. */
  private swung(beats: number): number {
    const swing = this.theme.swing ?? 0;
    if (!swing) return beats;
    const frac = beats % 1;
    return Math.abs(frac - 0.5) < 1e-6 ? beats + swing * 0.5 : beats;
  }
}

function pick<T>(value: T | readonly T[]): T {
  if (!Array.isArray(value)) return value as T;
  const list = value as readonly T[];
  return list[Math.floor(Math.random() * list.length)]!;
}

function sameChord(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((v, i) => v === b[i]);
  return false;
}

export class MusicEngine {
  private players: ThemePlayer[] = [];
  /** Where each zone's theme had got to, so coming back does not restart it. */
  private readonly resumeAt = new Map<string, string>();

  private readonly ctx: BaseAudioContext;
  private readonly output: AudioNode;
  private readonly reverb: AudioNode;
  private readonly kit: Kit;
  private readonly pool: VoicePool;

  constructor(ctx: BaseAudioContext, output: AudioNode, reverb: AudioNode, kit: Kit, pool: VoicePool) {
    this.ctx = ctx;
    this.output = output;
    this.reverb = reverb;
    this.kit = kit;
    this.pool = pool;
  }

  /** The theme currently fading in or playing, if any. */
  get current(): string | null {
    for (let i = this.players.length - 1; i >= 0; i--) {
      const player = this.players[i]!;
      if (!player.fadingOut && !player.disposed) return player.zone;
    }
    return null;
  }

  /**
   * Crossfades to `zone`'s theme. A theme that is still fading out is brought
   * back where it is instead of being restarted.
   */
  play(zone: string, theme: ThemeDef, fadeIn: number, fadeOut: number): void {
    const now = this.ctx.currentTime;
    for (const player of this.players) {
      if (player.zone !== zone && !player.fadingOut) {
        this.resumeAt.set(player.zone, player.currentSection);
        player.fadeOut(now, fadeOut);
      }
    }

    const existing = this.players.find((p) => p.zone === zone && !p.disposed);
    if (existing) {
      existing.fadeIn(now, fadeIn);
      return;
    }

    const section = this.resumeAt.get(zone) ? (theme.resume ?? theme.start) : theme.start;
    const player = new ThemePlayer(zone, theme, this.ctx, this.output, this.reverb, this.kit, this.pool, now + 0.05, section);
    player.fadeIn(now, fadeIn);
    this.players.push(player);

    // More than three overlapping themes means the player is zone-hopping
    // faster than any fade; drop the oldest rather than stack them up.
    while (this.players.length > 3) this.players.shift()!.dispose();
  }

  /** Fades everything out (the ending, or a mute that should not cut mid-note). */
  stop(fadeOut: number): void {
    const now = this.ctx.currentTime;
    for (const player of this.players) if (!player.fadingOut) player.fadeOut(now, fadeOut);
  }

  schedule(until: number): void {
    const now = this.ctx.currentTime;
    for (const player of this.players) {
      player.schedule(until);
      if (player.retireAt + TAIL_SECONDS < now) player.dispose();
    }
    if (this.players.some((p) => p.disposed)) this.players = this.players.filter((p) => !p.disposed);
  }

  dispose(): void {
    for (const player of this.players) player.dispose();
    this.players = [];
  }
}
