/**
 * Just enough music theory to write themes as data.
 *
 * Melodies are written in scale steps, not pitches, so a phrase can be reused
 * in another mode (the ending's reprise is the title's leitmotif re-heard in
 * the major) and a theme can be transposed by changing one number.
 */

export const MODES = {
  ionian: [0, 2, 4, 5, 7, 9, 11],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
  lydian: [0, 2, 4, 6, 7, 9, 11],
  mixolydian: [0, 2, 4, 5, 7, 9, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  harmonicMinor: [0, 2, 3, 5, 7, 8, 11],
  locrian: [0, 1, 3, 5, 6, 8, 10],
} as const;

export type Scale = readonly number[];

export function midiToHz(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

/** Semitones above the tonic for a (possibly negative, possibly multi-octave) scale step. */
export function stepToSemis(scale: Scale, step: number): number {
  const octave = Math.floor(step / scale.length);
  const index = step - octave * scale.length;
  return octave * 12 + scale[index]!;
}

// --- lines ---------------------------------------------------------------
//
// A line is a string of tokens like `4/0.5 3+/0.5 5^/2 r/1`:
//   4      scale step (0 = tonic, 7 = the octave above, -1 = the step below)
//   + / -  raise or lower by a semitone (chromatic neighbours, borrowed notes)
//   /0.5   duration in beats (defaults to 1)
//   ^      accent (before or after the duration)
//   r      rest
// `|` is ignored and only there to make bars readable in the source.

export interface LineNote {
  /** Beat offset from the start of the line. */
  beat: number;
  dur: number;
  step: number;
  /** Chromatic alteration in semitones. */
  shift: number;
  accent: boolean;
}

export interface Line {
  notes: LineNote[];
  beats: number;
}

const lineCache = new Map<string, Line>();
const TOKEN = /^(r|-?\d+)([+-]*)(\^)?(?:\/([\d.]+))?(\^)?$/;

export function parseLine(source: string): Line {
  const cached = lineCache.get(source);
  if (cached) return cached;

  const notes: LineNote[] = [];
  let beat = 0;
  for (const raw of source.split(/\s+/)) {
    if (!raw || raw === "|") continue;
    const match = TOKEN.exec(raw);
    if (!match) {
      console.warn(`Bad note "${raw}" in line "${source}"`);
      continue;
    }
    const dur = match[4] ? Number(match[4]) : 1;
    if (match[1] !== "r") {
      const accidentals = match[2] ?? "";
      let shift = 0;
      for (const c of accidentals) shift += c === "+" ? 1 : -1;
      notes.push({ beat, dur, step: Number(match[1]), shift, accent: !!(match[3] || match[5]) });
    }
    beat += dur;
  }
  const line = { notes, beats: beat };
  lineCache.set(source, line);
  return line;
}

// --- chords --------------------------------------------------------------
//
// A chord is either a string naming a scale step plus modifiers, or an
// explicit list of semitones above the tonic for clusters no scale gives.
//   "0"   the triad on the tonic, built from the scale
//   "4M"  force a major third (the raised dominant in minor)
//   "3m"  force a minor third
//   "07"  add the diatonic seventh
//   "0s"  sus4: the fourth instead of the third
//   "02"  add the ninth
//   "1-M" the step lowered a semitone, major: the Neapolitan in minor

export type ChordSpec = string | readonly number[];

const chordCache = new Map<string, number[]>();

/** Semitones above the tonic, ascending, for the chord's tones. */
export function chordTones(scale: Scale, spec: ChordSpec): number[] {
  if (typeof spec !== "string") return [...spec].sort((a, b) => a - b);

  const key = `${scale.join(",")}:${spec}`;
  const cached = chordCache.get(key);
  if (cached) return cached;

  const match = /^(-?\d)(-?)(.*)$/.exec(spec);
  const step = match ? Number(match[1]) : 0;
  const lowered = match?.[2] === "-";
  const mods = match?.[3] ?? "";

  const root = stepToSemis(scale, step) - (lowered ? 1 : 0);
  let third = stepToSemis(scale, step + 2) - (lowered ? 1 : 0);
  let fifth = stepToSemis(scale, step + 4) - (lowered ? 1 : 0);
  if (mods.includes("M")) third = root + 4;
  if (mods.includes("m")) third = root + 3;
  // A forced quality implies a perfect fifth (no accidental diminished chords).
  if (mods.includes("M") || mods.includes("m")) fifth = root + 7;

  const tones = [root, mods.includes("s") ? root + 5 : third, fifth];
  if (mods.includes("7")) tones.push(stepToSemis(scale, step + 6) - (lowered ? 1 : 0));
  if (mods.includes("2")) tones.push(root + 14);
  chordCache.set(key, tones);
  return tones;
}

/** Chord tone `index`, wrapping into higher (or lower, if negative) octaves. */
export function chordToneAt(tones: readonly number[], index: number): number {
  const n = tones.length;
  const octave = Math.floor(index / n);
  return tones[index - octave * n]! + octave * 12;
}

/**
 * Places a chord near the previous one: tries each inversion around `centre`
 * and keeps the one that moves the voices least. This is what keeps a pad from
 * leaping about like a beginner's left hand.
 */
export function voiceLead(tones: readonly number[], centre: number, previous: readonly number[] | null): number[] {
  let best: number[] = [];
  let bestCost = Infinity;
  const n = tones.length;
  for (let inv = 0; inv < n; inv++) {
    const voiced: number[] = [];
    for (let i = 0; i < n; i++) {
      let note = tones[(inv + i) % n]!;
      while (voiced.length > 0 && note <= voiced[voiced.length - 1]!) note += 12;
      voiced.push(note);
    }
    // Shift by octaves so the chord's middle sits nearest the centre.
    const mid = (voiced[0]! + voiced[n - 1]!) / 2;
    const shift = Math.round((centre - mid) / 12) * 12;
    for (let i = 0; i < n; i++) voiced[i] = voiced[i]! + shift;

    let cost = Math.abs((voiced[0]! + voiced[n - 1]!) / 2 - centre) * 0.5;
    if (previous && previous.length > 0) {
      for (let i = 0; i < n; i++) cost += Math.abs(voiced[i]! - previous[Math.min(i, previous.length - 1)]!);
    }
    if (cost < bestCost) {
      bestCost = cost;
      best = voiced;
    }
  }
  return best;
}
