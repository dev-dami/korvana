import { MODES } from "../theory";
import type { ThemeDef } from "./types";

/**
 * Exploration music for the Endless Grounds. These play the longest, so they
 * are the most restrained: plenty of bars where nothing but the accompaniment
 * moves, and melodies that sit out a pass now and then.
 */

/** Meadow - pastoral and open. F major, flute over a rippling harp. */
export const MEADOW: ThemeDef = {
  bpm: 84,
  meter: 4,
  root: 65,
  scale: MODES.ionian,
  reverb: 0.35,
  start: "a",
  layers: {
    flute: { inst: "flute", gain: 1, pan: 0.25 },
    celesta: { inst: "celesta", gain: 0.8, pan: 0.35 },
    violins: { inst: "strings", gain: 1.05, pan: -0.25 },
    harp: { inst: "harp", gain: 0.75, pan: -0.38 },
    lute: { inst: "lute", gain: 0.6, pan: 0.42 },
    strings: { inst: "strings", gain: 0.7, pan: -0.1 },
    bass: { inst: "bass", gain: 0.55 },
    frame: { inst: "frame", gain: 0.45, pan: 0.15, reverb: 0.25 },
  },
  sections: {
    a: {
      chords: ["0", "3", "5", "4", "0", "3", "1", "4"],
      next: ["b", "c", "a"],
      parts: [
        {
          kind: "line",
          layer: ["flute", "flute", "celesta"],
          octave: 1,
          vel: 0.8,
          prob: 0.9,
          phrases: [
            [
              "4/1.5 5/0.5 4/1 2/1 | 3/2 r/0.5 1/0.5 2/0.5 3/0.5 | 4/1.5 2/0.5 5/1 4/1 | 4/2 1/1 2/1",
              "4/1 5/0.5 4/0.5 2/1 0/1 | 3/1.5 2/0.5 1/2 | 2/1 4/1 5/1.5 4/0.5 | 4/1 2/1 1/2",
            ],
            [
              "4/1.5 5/0.5 7/1 5/1 | 3/1 5/1 4/1 3/1 | 1/1.5 2/0.5 3/1 1/1 | 4/2 r/2",
              "7/1.5 5/0.5 4/1 5/1 | 3/1.5 4/0.5 5/2 | 4/1 3/1 2/1 1/1 | 1/1 2/1 4/2",
            ],
          ],
        },
        { kind: "arp", layer: "harp", octave: -1, pattern: [0, 2, 3, 4, 5, 4, 3, 2], step: 0.5, gate: 2, vel: 0.5 },
        { kind: "pad", layer: "strings", vel: 0.4 },
        { kind: "bass", layer: "bass", octave: -2, pattern: "0/2 2/1.5 1/0.5", vel: 0.5 },
        { kind: "drum", layer: "frame", pattern: "x.o.", step: 1, vel: 0.35, fromPass: 1, prob: 0.5 },
      ],
    },
    b: {
      chords: ["5", "3", "0", "4", "5", "3", "1", "4"],
      next: ["a", "c"],
      parts: [
        {
          kind: "line",
          layer: "violins",
          octave: 1,
          vel: 0.6,
          phrases: [["2/2 4/2 | 3/3 1/1 | 0/2 2/1 4/1 | 4/4"], ["5/2 4/2 | 3/2 5/2 | 4/1 3/1 2/1 1/1 | 1/4"]],
        },
        { kind: "arp", layer: "lute", pattern: [0, 1, 2, 1], step: 1, vel: 0.5 },
        { kind: "pad", layer: "strings", octave: -1, vel: 0.35 },
        { kind: "bass", layer: "bass", octave: -2, pattern: "0/3 2/1", vel: 0.45 },
        { kind: "scatter", layer: "celesta", octave: 2, pool: "chord", count: [0, 2], dur: 1, vel: 0.35, prob: 0.6 },
      ],
    },
    c: {
      chords: ["0", "02", "3", "3"],
      next: ["a", "b"],
      parts: [
        { kind: "arp", layer: "harp", octave: -1, pattern: [0, 2, 3, 4, 5, 4, 3, 2], step: 0.5, gate: 2, vel: 0.45 },
        { kind: "pad", layer: "strings", vel: 0.35 },
        { kind: "bass", layer: "bass", octave: -2, pattern: "0/4", vel: 0.4 },
        { kind: "scatter", layer: "flute", octave: 1, pool: "chord", count: [0, 2], dur: 1.5, vel: 0.5, prob: 0.7 },
      ],
    },
  },
};

/** Forest - mysterious, a slow three in E minor. Harp, a distant flute, glassy echoes. */
export const FOREST: ThemeDef = {
  bpm: 63,
  meter: 3,
  root: 64,
  scale: MODES.aeolian,
  reverb: 0.5,
  start: "a",
  layers: {
    harp: { inst: "harp", gain: 0.8, pan: -0.32 },
    flute: { inst: "flute", gain: 0.95, pan: 0.28, reverb: 0.6 },
    low: { inst: "strings", gain: 0.85, pan: -0.1 },
    pad: { inst: "pad", gain: 0.9, pan: 0.05 },
    glass: { inst: "glass", gain: 0.8, pan: 0.45, reverb: 0.7 },
    celesta: { inst: "celesta", gain: 0.65, pan: 0.4, reverb: 0.6 },
    bass: { inst: "bass", gain: 0.45 },
  },
  sections: {
    a: {
      chords: ["0", "5", "3", "0", "0", "5", "6", "4"],
      next: ["b", "c", "a"],
      parts: [
        {
          kind: "line",
          layer: "flute",
          octave: 1,
          vel: 0.75,
          phrases: [
            ["4/2 3/1 | 2/3 | 4/1 5/1 7/1 | 6/3", "7/1.5 6/0.5 4/1 | 5/3 | 4/1 2/1 4/1 | 3/2 r/1", "-"],
            ["4/2 2/1 | 0/1.5 1/0.5 2/1 | 1/3 | -1/3", "2/1 4/1 7/1 | 6/1.5 4/0.5 2/1 | 3/1.5 2/0.5 1/1 | 1/3", "-"],
          ],
        },
        { kind: "arp", layer: "harp", pattern: [0, 2, 4, 5, 4, 2], step: 0.5, gate: 2.5, vel: 0.45 },
        { kind: "pad", layer: "pad", octave: -1, vel: 0.45 },
        { kind: "bass", layer: "bass", octave: -2, pattern: "0/3", vel: 0.4 },
        { kind: "scatter", layer: "glass", octave: 1, pool: "chord", count: [1, 1], dur: 3, vel: 0.5, prob: 0.3 },
      ],
    },
    b: {
      chords: ["5", "6", "0", "5", "3", "5", "4", "4M"],
      next: ["a", "c"],
      parts: [
        {
          kind: "line",
          layer: "low",
          vel: 0.6,
          phrases: [["0/2 2/1 | 1/3 | 0/1 -1/1 -3/1 | -2/3"], ["3/2 2/1 | 0/1.5 2/0.5 4/1 | 4/2 3/1 | 1/3"]],
        },
        { kind: "arp", layer: "harp", octave: 1, pattern: [2, 1, 0], step: 1, gate: 3, vel: 0.4 },
        { kind: "pad", layer: "pad", octave: -1, vel: 0.45 },
        { kind: "scatter", layer: "celesta", octave: 1, pool: "scale", count: [0, 2], dur: 1, vel: 0.4, prob: 0.5, spread: 2 },
        { kind: "bass", layer: "bass", octave: -2, pattern: "0/3", vel: 0.4 },
      ],
    },
    c: {
      chords: ["0", "0", "1-M", "0"],
      next: ["a", "a", "b"],
      parts: [
        { kind: "pad", layer: "pad", octave: -1, vel: 0.5 },
        { kind: "scatter", layer: "harp", pool: "scale", count: [1, 3], dur: 2, vel: 0.5, spread: 2 },
        { kind: "scatter", layer: "glass", octave: 1, pool: "chord", count: [0, 1], dur: 4, vel: 0.5, prob: 0.6 },
      ],
    },
  },
};

/** Highland - wide and windswept. A Mixolydian horn call over open-voiced strings. */
export const HIGHLAND: ThemeDef = {
  bpm: 76,
  meter: 4,
  root: 57,
  scale: MODES.mixolydian,
  reverb: 0.45,
  start: "a",
  layers: {
    horn: { inst: "horn", gain: 1.1, pan: 0.15 },
    violins: { inst: "strings", gain: 1.05, pan: -0.28 },
    strings: { inst: "strings", gain: 0.85, pan: -0.15 },
    flute: { inst: "flute", gain: 0.8, pan: 0.42, reverb: 0.6 },
    harp: { inst: "harp", gain: 0.6, pan: -0.4 },
    bass: { inst: "bass", gain: 0.6 },
    timpani: { inst: "timpani", gain: 0.75, reverb: 0.35 },
    frame: { inst: "frame", gain: 0.5, pan: 0.2 },
    cymbal: { inst: "cymbal", gain: 0.7, pan: -0.3 },
  },
  sections: {
    a: {
      chords: ["0", "6", "3", "0", "5", "6", "3", "0"],
      next: ["b", "c", "b"],
      parts: [
        {
          kind: "line",
          layer: "horn",
          octave: 0,
          vel: 0.8,
          phrases: [
            ["0/1 4/1 7/2 | 6/1.5 4/0.5 3/1 1/1 | 3/2 2/1 3/1 | 4/4", "0/1.5 0/0.5 4/1 7/1 | 6/2 4/1 3/1 | 3/1 2/0.5 1/0.5 3/2 | 4/3 r/1"],
            ["5/1 4/1 5/1 7/1 | 8/1.5 7/0.5 6/2 | 5/1 3/1 4/1 2/1 | 0/4", "5/2 7/1 9/1 | 8/2 6/2 | 5/1.5 4/0.5 3/1 2/1 | 0/4"],
          ],
        },
        { kind: "pad", layer: "strings", octave: -1, vel: 0.45, root: true },
        { kind: "bass", layer: "bass", octave: -1, pattern: "0/2 2/2", vel: 0.5 },
        { kind: "drum", layer: "timpani", octave: -1, tuned: true, pattern: "x.......", step: 0.5, dur: 2, vel: 0.55, bars: [0, 4] },
        { kind: "drum", layer: "frame", pattern: "x..x..x.", step: 0.5, vel: 0.35, fromPass: 1 },
        { kind: "scatter", layer: "flute", octave: 2, pool: "chord", count: [0, 1], dur: 2, vel: 0.4, prob: 0.4 },
      ],
    },
    b: {
      chords: ["3", "0", "6", "3", "1", "6", "4", "0"],
      next: ["a", "c"],
      parts: [
        {
          kind: "line",
          layer: "violins",
          octave: 1,
          vel: 0.65,
          harmony: -2,
          phrases: [["7/3 6/1 | 4/4 | 6/2 5/1 4/1 | 3/4"], ["1/2 3/2 | 6/2 5/2 | 4/3 3/1 | 4/4"]],
        },
        { kind: "arp", layer: "harp", octave: -1, pattern: [0, 2, 3, 4], step: 1, gate: 2, vel: 0.5 },
        { kind: "pad", layer: "strings", octave: -1, vel: 0.4, root: true },
        { kind: "bass", layer: "bass", octave: -1, pattern: "0/3 2/1", vel: 0.5 },
        { kind: "drum", layer: "frame", pattern: "x..x..x.", step: 0.5, vel: 0.4 },
        { kind: "drum", layer: "timpani", octave: -1, tuned: true, pattern: "ggggggoooooxxxxX", step: 0.25, dur: 0.5, vel: 0.5, bars: [6] },
        { kind: "drum", layer: "cymbal", pattern: "x", step: 4, dur: 4, bars: [6] },
      ],
    },
    c: {
      chords: ["0s", "0", "6", "6"],
      next: ["a"],
      parts: [
        { kind: "pad", layer: "strings", octave: -1, vel: 0.35 },
        { kind: "line", layer: "flute", octave: 1, vel: 0.65, prob: 0.85, phrases: [["7/2 8/1 7/1 | 4/4 | 6/2 4/1 3/1 | 4/4"]] },
        { kind: "bass", layer: "bass", octave: -1, pattern: "0/4", vel: 0.4 },
      ],
    },
  },
};

/** Coast - gentle and swelling, a lilting six in E-flat. String swells like breaking water. */
export const COAST: ThemeDef = {
  bpm: 168,
  meter: 6,
  root: 63,
  scale: MODES.ionian,
  reverb: 0.5,
  start: "a",
  layers: {
    swell: { inst: "swell", gain: 0.9, pan: -0.2 },
    celesta: { inst: "celesta", gain: 0.85, pan: 0.35 },
    flute: { inst: "flute", gain: 0.85, pan: 0.25 },
    harp: { inst: "harp", gain: 0.75, pan: -0.38 },
    choir: { inst: "choir", gain: 0.7, pan: 0.1, reverb: 0.6 },
    bass: { inst: "bass", gain: 0.5 },
  },
  sections: {
    a: {
      chords: ["0", "3", "0", "4", "5", "3", "1", "4"],
      next: ["b", "a"],
      parts: [
        {
          kind: "line",
          layer: ["celesta", "flute"],
          octave: 1,
          vel: 0.75,
          phrases: [
            [
              "4/3 5/2 4/1 | 3/6 | 2/2 4/1 7/2 6/1 | 4/6 | 5/3 4/2 2/1 | 3/3 2/3 | 1/2 2/1 3/2 1/1 | 1/6",
              "7/3 6/2 4/1 | 5/3 3/3 | 4/2 2/1 0/3 | 1/6 | 2/3 4/3 | 5/3 7/3 | 8/2 7/1 5/3 | 4/6",
              "-",
            ],
          ],
        },
        { kind: "arp", layer: "harp", octave: -1, pattern: [0, 2, 4, 5, 4, 2], step: 1, gate: 2, vel: 0.5 },
        { kind: "pad", layer: "swell", vel: 0.55 },
        { kind: "bass", layer: "bass", octave: -2, pattern: "0/3 2/3", vel: 0.45 },
      ],
    },
    b: {
      chords: ["5", "3", "0", "4", "5", "1", "3", "4"],
      next: ["a"],
      parts: [
        { kind: "pad", layer: "choir", vel: 0.5 },
        { kind: "pad", layer: "swell", octave: -1, vel: 0.45 },
        { kind: "arp", layer: "harp", pattern: [0, 1, 2, 3, 2, 1], step: 1, gate: 2, vel: 0.45 },
        { kind: "scatter", layer: "celesta", octave: 1, pool: "chord", count: [0, 2], dur: 2, vel: 0.4, spread: 2 },
        { kind: "line", layer: "flute", octave: 1, vel: 0.6, prob: 0.5, phrases: [["2/6 | 3/6 | 4/3 2/3 | 1/6", "7/6 | 5/6 | 4/3 7/3 | 5/6"], ["2/6 | 3/6 | 4/3 2/3 | 1/6"]] },
        { kind: "bass", layer: "bass", octave: -2, pattern: "0/6", vel: 0.45 },
      ],
    },
  },
};
