import { MODES } from "../theory";
import { MOTIF_ANSWER, MOTIF_CHORDS, MOTIF_QUESTION } from "./leitmotif";
import type { ThemeDef } from "./types";

/**
 * Title - grand, wistful, magical. D Dorian at a slow four.
 *
 * The celesta states the leitmotif over harp and strings; the horn takes a
 * development section with the choir behind it; the reprise gives the tune to
 * the violins in thirds with timpani underneath. A quiet interlude keeps the
 * loop from feeling like a loop.
 */
export const TITLE: ThemeDef = {
  bpm: 68,
  meter: 4,
  root: 62,
  scale: MODES.dorian,
  reverb: 0.42,
  start: "intro",
  resume: "a",
  layers: {
    celesta: { inst: "celesta", gain: 0.95, pan: 0.3 },
    harp: { inst: "harp", gain: 0.75, pan: -0.38 },
    strings: { inst: "strings", gain: 0.85, pan: -0.12 },
    violins: { inst: "strings", gain: 1.25, pan: -0.28 },
    choir: { inst: "choir", gain: 0.8, pan: 0.12, reverb: 0.55 },
    horn: { inst: "horn", gain: 1, pan: 0.22 },
    bass: { inst: "bass", gain: 0.6 },
    timpani: { inst: "timpani", gain: 0.7, pan: -0.05, reverb: 0.3 },
    cymbal: { inst: "cymbal", gain: 0.8, pan: 0.4 },
  },
  sections: {
    intro: {
      chords: ["0", "3"],
      next: ["a"],
      parts: [
        { kind: "pad", layer: "strings", vel: 0.55 },
        { kind: "arp", layer: "celesta", octave: 1, pattern: [0, 1, 2, 3, 4, 3, 2, 1], step: 0.5, vel: 0.45 },
        { kind: "bass", layer: "bass", octave: -2, pattern: "0/4", vel: 0.55 },
        { kind: "drum", layer: "cymbal", pattern: "x", step: 4, dur: 4, bars: [1] },
      ],
    },
    a: {
      chords: MOTIF_CHORDS,
      next: ["b", "c", "b"],
      parts: [
        { kind: "line", layer: "celesta", octave: 1, vel: 0.85, phrases: [MOTIF_QUESTION, MOTIF_ANSWER] },
        { kind: "pad", layer: "strings", vel: 0.5 },
        { kind: "arp", layer: "harp", octave: -1, pattern: [0, 1, 2, 3, 4, 3, 2, 1], step: 0.5, gate: 2, vel: 0.55 },
        { kind: "bass", layer: "bass", octave: -2, pattern: "0/2 2/2", vel: 0.5 },
        { kind: "pad", layer: "choir", vel: 0.4, fromPass: 2 },
      ],
    },
    b: {
      chords: ["2", "6", "3", "0", "2", "6", "4", "4M"],
      next: ["a2"],
      parts: [
        {
          kind: "line",
          layer: "horn",
          octave: 0,
          vel: 0.8,
          phrases: [
            ["4/2 5/1 4/1 | 2/2 1/1 2/1 | 3/1.5 4/0.5 5/1 7/1 | 4/4", "4/1 5/1 7/1 5/1 | 2/3 1/1 | 3/1 4/1 5/1 7/1 | 4/3 r/1"],
            ["4/2 5/1 7/1 | 8/2 9/1 8/1 | 6/1 5/1 4/1 3/1 | 4/2 r/2", "7/2 8/1 7/1 | 8/1.5 7/0.5 6/1 5/1 | 6/2 5/1 3/1 | 4/4"],
          ],
        },
        { kind: "pad", layer: "choir", vel: 0.55 },
        { kind: "pad", layer: "strings", octave: -1, vel: 0.4, root: true },
        { kind: "arp", layer: "celesta", octave: 1, pattern: [4, 2, 3, 1], step: 1, vel: 0.35 },
        { kind: "bass", layer: "bass", octave: -2, pattern: "0/2 0/1 2/1", vel: 0.5 },
        { kind: "drum", layer: "timpani", octave: -2, tuned: true, pattern: "x...", step: 1, dur: 2, vel: 0.5, prob: 0.7 },
        { kind: "drum", layer: "timpani", octave: -2, tuned: true, pattern: "ggggggoooooxxxxX", step: 0.25, dur: 0.5, vel: 0.5, bars: [7] },
        { kind: "drum", layer: "cymbal", pattern: "x", step: 4, dur: 4, bars: [7] },
      ],
    },
    c: {
      chords: ["0s", "0", "6", "3"],
      next: ["a2", "b"],
      parts: [
        { kind: "pad", layer: "strings", vel: 0.4 },
        { kind: "arp", layer: "harp", pattern: [0, 2, 4, 2], step: 1, gate: 3, vel: 0.5 },
        {
          kind: "line",
          layer: "celesta",
          octave: 1,
          vel: 0.7,
          prob: 0.85,
          phrases: [["r/2 0/1 4/1 | 5/4 | r/2 7/1 6/1 | 5/2 4/2", "r/2 4/1 5/1 | 7/4 | r/2 6/1 5/1 | 4/4"]],
        },
        { kind: "bass", layer: "bass", octave: -2, pattern: "0/4", vel: 0.4 },
      ],
    },
    a2: {
      chords: MOTIF_CHORDS,
      next: ["c", "b", "a"],
      parts: [
        { kind: "line", layer: "violins", octave: 1, vel: 0.7, harmony: -2, phrases: [MOTIF_QUESTION, MOTIF_ANSWER] },
        { kind: "pad", layer: "choir", vel: 0.5 },
        { kind: "pad", layer: "strings", octave: -1, vel: 0.4, root: true },
        { kind: "arp", layer: "harp", octave: -1, pattern: [0, 1, 2, 3, 4, 3, 2, 1], step: 0.5, gate: 2, vel: 0.5 },
        { kind: "arp", layer: "celesta", octave: 2, pattern: [0, 2, 1, 2], step: 0.5, vel: 0.25, fromPass: 3 },
        { kind: "bass", layer: "bass", octave: -2, pattern: "0/2 2/2", vel: 0.55 },
        { kind: "drum", layer: "timpani", octave: -2, tuned: true, pattern: "x.......", step: 0.5, dur: 2, vel: 0.55, bars: [0, 2, 4, 6] },
      ],
    },
  },
};
