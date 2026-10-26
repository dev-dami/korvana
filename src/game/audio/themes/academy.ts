import { MODES } from "../theory";
import type { ThemeDef } from "./types";

/**
 * Academy - warm, whimsical, a little mischievous. A waltz in G major.
 *
 * Oom-pah-pah from pizzicato bass and plucked dyads, a reedy tune that keeps
 * sneaking up on its notes by a chromatic half-step, and a woodblock that
 * ticks like a corridor clock. The tune passes between reed, flute and
 * celesta from one pass to the next.
 */

/** Plucked dyads on beats two and three; -99 is a rest. */
const PAH_LOW = [-99, 1, 1] as const;
const PAH_HIGH = [-99, 2, 2] as const;

export const ACADEMY: ThemeDef = {
  bpm: 150,
  meter: 3,
  root: 67,
  scale: MODES.ionian,
  reverb: 0.3,
  start: "intro",
  resume: "a",
  layers: {
    reed: { inst: "reed", gain: 1.05, pan: 0.18 },
    flute: { inst: "flute", gain: 1, pan: 0.25 },
    celesta: { inst: "celesta", gain: 0.95, pan: 0.38 },
    pizz: { inst: "pizz", gain: 0.6, pan: -0.3 },
    bass: { inst: "pizz", gain: 0.95, pan: -0.05 },
    harp: { inst: "harp", gain: 0.55, pan: -0.4 },
    strings: { inst: "strings", gain: 0.55, pan: -0.15 },
    rim: { inst: "rim", gain: 0.5, pan: 0.3, reverb: 0.2 },
    shaker: { inst: "shaker", gain: 0.5, pan: -0.35 },
  },
  sections: {
    intro: {
      chords: ["0", "47"],
      next: ["a"],
      parts: [
        { kind: "bass", layer: "bass", octave: -2, pattern: "0/1 r/2", vel: 0.85 },
        { kind: "arp", layer: "pizz", octave: -1, pattern: PAH_LOW, step: 1, vel: 0.6 },
        { kind: "arp", layer: "pizz", octave: -1, pattern: PAH_HIGH, step: 1, vel: 0.55 },
        { kind: "drum", layer: "rim", pattern: "..x.x.", step: 0.5, vel: 0.6 },
      ],
    },
    a: {
      chords: ["0", "0", "3", "4", "0", "3", "47", "0"],
      next: ["b", "a", "c"],
      parts: [
        {
          kind: "line",
          layer: ["reed", "reed", "flute", "celesta"],
          vel: 0.85,
          phrases: [
            [
              "4/1 3+/0.5 4/0.5 5/1 | 4/1 2/1 0/1 | 1/0.5 2/0.5 3/1 5/1 | 4/3",
              "4/0.5 5/0.5 4/0.5 3+/0.5 4/1 | 2/1 0/1 r/1 | 1/0.5 2/0.5 3/0.5 4/0.5 5/1 | 4/2 r/1",
            ],
            [
              "4/1 3+/0.5 4/0.5 7/1 | 5/1 7/0.5 5/0.5 3/1 | 1/1 3/1 6/1 | 7/2 r/1",
              "4/0.5 5/0.5 4/0.5 3+/0.5 4/0.5 7/0.5 | 5/1 3/1 2/1 | 1/0.5 0/0.5 1/0.5 3/0.5 6/1 | 7/2 r/1",
            ],
          ],
        },
        { kind: "bass", layer: "bass", octave: -2, pattern: "0/1 r/2", vel: 0.85 },
        { kind: "arp", layer: "pizz", octave: -1, pattern: PAH_LOW, step: 1, vel: 0.55 },
        { kind: "arp", layer: "pizz", octave: -1, pattern: PAH_HIGH, step: 1, vel: 0.5 },
        { kind: "drum", layer: "rim", pattern: "..x.x.", step: 0.5, vel: 0.5, prob: 0.6 },
        { kind: "pad", layer: "strings", vel: 0.35, fromPass: 1 },
        { kind: "scatter", layer: "celesta", octave: 1, pool: "chord", count: [0, 2], dur: 1, vel: 0.4, fromPass: 1, prob: 0.5 },
      ],
    },
    b: {
      chords: ["5", "5", "1", "1", "3", "4", "5", "47"],
      next: ["a", "a", "c"],
      parts: [
        {
          kind: "line",
          layer: ["reed", "flute"],
          vel: 0.85,
          phrases: [
            ["5/0.5 4+/0.5 5/0.5 6/0.5 7/1 | 6/0.5 5/0.5 4/1 2/1 | 1/0.5 0+/0.5 1/0.5 2/0.5 3/1 | 5/2 r/1"],
            [
              "3/1 5/1 7/1 | 8/1.5 7/0.5 6/1 | 7/0.5 6/0.5 5/1 4/1 | 3/1 1/1 -1/1",
              "3/1 5/0.5 7/0.5 8/1 | 8/1 7+/0.5 8/0.5 9/1 | 7/1 5/1 4/1 | 3/1 1/1 -1/1",
            ],
          ],
        },
        { kind: "bass", layer: "bass", octave: -2, pattern: "0/1 r/2", vel: 0.85 },
        { kind: "arp", layer: "pizz", octave: -1, pattern: PAH_LOW, step: 1, vel: 0.55 },
        { kind: "arp", layer: "pizz", octave: -1, pattern: PAH_HIGH, step: 1, vel: 0.5 },
        { kind: "drum", layer: "shaker", pattern: "x.o.o.", step: 0.5, vel: 0.5 },
        { kind: "pad", layer: "strings", vel: 0.3 },
      ],
    },
    c: {
      chords: ["0", "5", "3", "47"],
      next: ["a", "b"],
      parts: [
        {
          kind: "line",
          layer: "celesta",
          octave: 1,
          vel: 0.75,
          phrases: [["4/1 2/1 4/1 | 5/2 2/1 | 3/1 5/1 7/1 | 6/2 r/1", "7/1 4/1 2/1 | 5/1 4/1 2/1 | 3/1 2/1 3/1 | 1/2 r/1"]],
        },
        { kind: "arp", layer: "harp", pattern: [0, 1, 2], step: 1, gate: 2, vel: 0.5 },
        { kind: "bass", layer: "bass", octave: -2, pattern: "0/1 r/2", vel: 0.7 },
        { kind: "pad", layer: "strings", vel: 0.35 },
        { kind: "drum", layer: "rim", pattern: "x.....", step: 0.5, vel: 0.35 },
      ],
    },
  },
};
