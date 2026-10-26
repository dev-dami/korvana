import type { InstrumentName } from "../Instruments";
import type { ChordSpec, Scale } from "../theory";

/**
 * A theme is pure data: a key, a tempo, a set of mixer layers, and sections
 * of bars that chain into one another. The MusicEngine reads it bar by bar.
 *
 * Variety comes from the data rather than from code: sections choose their
 * successor from a list, melody slots choose between composed alternatives,
 * parts can be probabilistic or wait for later passes before joining, and a
 * part can hand its line to a different instrument each time round.
 */

/** One mixer channel: an instrument with a level, a place in the stereo field and a reverb send. */
export interface LayerDef {
  inst: InstrumentName;
  gain: number;
  /** -1 left to 1 right. Orchestral seating rather than ping-pong. */
  pan?: number;
  /** Reverb send, overriding the theme's. */
  reverb?: number;
}

interface PartBase {
  /** The layer that plays it. A list picks one per pass, so the tune changes hands. */
  layer: string | readonly string[];
  /** Octaves above (or below) the theme's root. */
  octave?: number;
  vel?: number;
  /** Chance of playing: per bar for most parts, per section for lines. */
  prob?: number;
  /** Only once the theme has played this many sections - so a piece can build. */
  fromPass?: number;
  /** Restrict to these bars of the section (0-based). */
  bars?: readonly number[];
}

/** Sustained chords, voice-led from bar to bar. Repeated chords are tied. */
export interface PadPart extends PartBase {
  kind: "pad";
  /** Double the root an octave below the voicing. */
  root?: boolean;
}

/** Chord tones in a fixed rhythm: indices into the chord, wrapping by octave. */
export interface ArpPart extends PartBase {
  kind: "arp";
  pattern: readonly number[];
  /** Beats per note. */
  step: number;
  /** Note length as a multiple of `step`. Plucks ring regardless. */
  gate?: number;
}

/** A line in theory.ts notation where the numbers are chord-tone indices, not scale steps. */
export interface BassPart extends PartBase {
  kind: "bass";
  pattern: string;
}

/**
 * A composed melody. `phrases` is a list of slots; each slot lists
 * interchangeable alternatives (in scale steps) of equal length, and one is
 * chosen per pass. An alternative of "-" is a deliberate silence.
 */
export interface LinePart extends PartBase {
  kind: "line";
  phrases: readonly (readonly string[])[];
  /** Add a diatonic second voice this many scale steps away (-2 is a third below). */
  harmony?: number;
}

/** A step pattern: X accent, x normal, o soft, g ghost, anything else rests. */
export interface DrumPart extends PartBase {
  kind: "drum";
  pattern: string;
  step: number;
  /** Tune the drum to the chord root at the part's octave (timpani). */
  tuned?: boolean;
  /** Fixed tuning in Hz otherwise (110 is each drum's natural pitch). */
  pitch?: number;
  /** Note length in beats, for drums that read it (timpani ring, cymbal roll). */
  dur?: number;
}

/** A few notes at random beats: sparkles, drips of melody, distant clangs. */
export interface ScatterPart extends PartBase {
  kind: "scatter";
  pool: "chord" | "scale";
  count: readonly [min: number, max: number];
  /** Note length in beats. */
  dur: number;
  /** How many octaves the pool spans upward. */
  spread?: number;
}

export type PartDef = PadPart | ArpPart | BassPart | LinePart | DrumPart | ScatterPart;

export interface SectionDef {
  /** One chord per bar; the section is as long as this list. */
  chords: readonly ChordSpec[];
  /** Candidate successors. Repeat an id to weight it. */
  next: readonly string[];
  parts: readonly PartDef[];
  /** Override the theme's mode for this section (a reprise heard in the major). */
  scale?: Scale;
}

export interface ThemeDef {
  bpm: number;
  /** Beats per bar. */
  meter: number;
  /** MIDI note of the tonic at octave 0. */
  root: number;
  scale: Scale;
  /** Delay of off-beat eighths as a fraction of half a beat. */
  swing?: number;
  /** Default reverb send for its layers. */
  reverb: number;
  /** Overall level of the theme. */
  gain?: number;
  start: string;
  /** Where to pick up when the player comes back, so returning skips the intro. */
  resume?: string;
  sections: Readonly<Record<string, SectionDef>>;
  layers: Readonly<Record<string, LayerDef>>;
}
