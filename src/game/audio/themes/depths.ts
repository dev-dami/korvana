import { MODES } from "../theory";
import type { ThemeDef } from "./types";

/**
 * Underground and the Scar. Neither has a tune you could hum: they are
 * texture first, built from drones, bowed metal and voices, with long gaps.
 * The point is that the player listens harder - for the drip, the grind of a
 * mechanism, the thing behind them.
 */

/**
 * Tomb - tense, ancient, sparse. C Phrygian at a very slow four.
 * Sections wander between stillness, a faint heartbeat, and an ominous swell
 * of strings and low voices, choosing their order afresh every time.
 */
export const TOMB: ThemeDef = {
  bpm: 54,
  meter: 4,
  root: 48,
  scale: MODES.phrygian,
  reverb: 0.6,
  gain: 0.95,
  start: "still",
  layers: {
    drone: { inst: "drone", gain: 1, pan: 0 },
    glass: { inst: "glass", gain: 0.9, pan: 0.5, reverb: 0.85 },
    glassLeft: { inst: "glass", gain: 0.7, pan: -0.55, reverb: 0.85 },
    choir: { inst: "choir", gain: 0.75, pan: -0.2, reverb: 0.7 },
    swell: { inst: "swell", gain: 0.9, pan: 0.25 },
    flute: { inst: "flute", gain: 0.75, pan: 0.3, reverb: 0.75 },
    heart: { inst: "frame", gain: 0.55, pan: -0.25, reverb: 0.5 },
    timpani: { inst: "timpani", gain: 0.7, pan: 0.1, reverb: 0.8 },
    bell: { inst: "bell", gain: 0.6, pan: 0.4, reverb: 0.9 },
  },
  sections: {
    still: {
      chords: [[0, 7], [0, 7], [0, 7], [1, 8]],
      next: ["unease", "swell", "still", "void"],
      parts: [
        { kind: "pad", layer: "drone", octave: -1, vel: 0.65 },
        { kind: "scatter", layer: "glass", octave: 1, pool: "chord", count: [0, 1], dur: 6, vel: 0.55, prob: 0.4 },
        { kind: "scatter", layer: "bell", octave: -1, pool: "chord", count: [1, 1], dur: 6, vel: 0.45, prob: 0.12 },
      ],
    },
    unease: {
      chords: ["0", "0", "1", "0"],
      next: ["still", "swell", "void"],
      parts: [
        { kind: "pad", layer: "drone", octave: -1, vel: 0.65 },
        { kind: "drum", layer: "heart", pattern: "Xo..............", step: 0.25, vel: 0.45, pitch: 70 },
        {
          kind: "line",
          layer: "flute",
          octave: 1,
          vel: 0.55,
          prob: 0.65,
          phrases: [["r/2 1/1 0/1 | 0/4 | r/1 3/1 1/1 0/1 | -1/4", "r/3 4/1 | 3/2 1/2 | r/2 0/1 1/1 | 0/4"]],
        },
        { kind: "scatter", layer: "glassLeft", octave: 1, pool: "scale", count: [0, 1], dur: 5, vel: 0.5, prob: 0.4 },
      ],
    },
    swell: {
      chords: ["0", "5", "1", "0"],
      next: ["still", "void", "unease"],
      parts: [
        { kind: "pad", layer: "drone", octave: -1, vel: 0.6 },
        { kind: "pad", layer: "choir", vel: 0.55 },
        { kind: "pad", layer: "swell", octave: -1, vel: 0.7 },
        { kind: "drum", layer: "timpani", octave: -2, tuned: true, pattern: "....x...", step: 0.5, dur: 3, vel: 0.6, bars: [3] },
      ],
    },
    void: {
      chords: [[0], [0], [0], [0]],
      next: ["still", "unease"],
      parts: [
        { kind: "pad", layer: "drone", octave: -2, vel: 0.7 },
        { kind: "scatter", layer: "glass", octave: 0, pool: "scale", count: [0, 1], dur: 6, vel: 0.45, prob: 0.5 },
      ],
    },
  },
};

/**
 * Scar - desolate. B Locrian, with chords that are clusters rather than
 * triads, a bass that moves by half-steps, and a lone high voice lamenting.
 */
export const SCAR: ThemeDef = {
  bpm: 50,
  meter: 4,
  root: 59,
  scale: MODES.locrian,
  reverb: 0.7,
  gain: 0.95,
  start: "a",
  layers: {
    choir: { inst: "choir", gain: 0.85, pan: -0.25, reverb: 0.8 },
    voice: { inst: "choir", gain: 0.75, pan: 0.3, reverb: 0.85 },
    drone: { inst: "drone", gain: 1 },
    swell: { inst: "swell", gain: 0.8, pan: 0.15 },
    glass: { inst: "glass", gain: 0.8, pan: -0.45, reverb: 0.9 },
    bell: { inst: "bell", gain: 0.5, pan: 0.45, reverb: 0.95 },
  },
  sections: {
    a: {
      chords: [
        [0, 3, 6],
        [1, 5, 8],
        [0, 2, 7],
        [-2, 1, 6],
      ],
      next: ["b", "a"],
      parts: [
        { kind: "pad", layer: "choir", vel: 0.6 },
        { kind: "bass", layer: "drone", octave: -2, pattern: "0/4", vel: 0.7 },
        { kind: "line", layer: "voice", octave: 1, vel: 0.5, prob: 0.6, phrases: [["r/2 4/2 | 3/4 | r/1 4/1 5/1 4/1 | 3/4", "r/3 1/1 | 0/4 | r/2 1/1 3/1 | 4/4"]] },
        { kind: "scatter", layer: "glass", octave: 1, pool: "chord", count: [0, 1], dur: 6, vel: 0.5, prob: 0.5 },
      ],
    },
    b: {
      chords: [
        [0, 1, 7],
        [0, 1, 7],
        [-1, 3, 6],
        [0, 6],
      ],
      next: ["a"],
      parts: [
        { kind: "pad", layer: "swell", vel: 0.6 },
        { kind: "pad", layer: "choir", octave: -1, vel: 0.55 },
        { kind: "bass", layer: "drone", octave: -2, pattern: "0/4", vel: 0.7 },
        { kind: "scatter", layer: "bell", octave: 0, pool: "chord", count: [0, 1], dur: 6, vel: 0.45, prob: 0.3 },
      ],
    },
  },
};
