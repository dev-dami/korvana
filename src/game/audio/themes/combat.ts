import { MODES } from "../theory";
import type { ThemeDef } from "./types";

/**
 * Fights. Both themes start at full energy - a duel begins mid-swing - and
 * keep a short form so the music never outstays a two-minute fight.
 */

/** Battle - driving drums and a string ostinato under a horn call. D minor. */
export const BATTLE: ThemeDef = {
  bpm: 140,
  meter: 4,
  root: 50,
  scale: MODES.aeolian,
  reverb: 0.25,
  start: "a",
  layers: {
    ostinato: { inst: "spiccato", gain: 0.9, pan: -0.2 },
    ostinatoHigh: { inst: "spiccato", gain: 0.6, pan: 0.3 },
    horn: { inst: "horn", gain: 1.05, pan: 0.2 },
    brass: { inst: "lowbrass", gain: 0.85, pan: -0.1 },
    strings: { inst: "strings", gain: 0.7, pan: -0.3 },
    bass: { inst: "bass", gain: 0.6 },
    taiko: { inst: "taiko", gain: 0.85, reverb: 0.3 },
    frame: { inst: "frame", gain: 0.55, pan: 0.3 },
    shaker: { inst: "shaker", gain: 0.5, pan: -0.4 },
    timpani: { inst: "timpani", gain: 0.7, pan: 0.05 },
    cymbal: { inst: "cymbal", gain: 0.7, pan: 0.35 },
  },
  sections: {
    a: {
      chords: ["0", "5", "6", "4M"],
      next: ["b", "a", "b"],
      parts: [
        { kind: "arp", layer: "ostinato", pattern: [0, 0, 2, 0, 3, 0, 2, 0], step: 0.5, vel: 0.75 },
        { kind: "drum", layer: "taiko", pattern: "X.....x.X...x...", step: 0.25, vel: 0.85 },
        { kind: "drum", layer: "frame", pattern: "....x.......x.xx", step: 0.25, vel: 0.6 },
        { kind: "drum", layer: "shaker", pattern: "xoxoxoxoxoxoxoxo", step: 0.25, vel: 0.5 },
        { kind: "bass", layer: "bass", octave: -1, pattern: "0/1.5 0/0.5 r/1 0/0.5 2/0.5", vel: 0.7 },
        { kind: "bass", layer: "brass", octave: -1, pattern: "0^/0.75 r/0.75 0/0.5 r/2", vel: 0.65 },
        {
          kind: "line",
          layer: "horn",
          octave: 1,
          vel: 0.85,
          fromPass: 1,
          phrases: [["0/1.5 4/0.5 7/2 | 5/1.5 4/0.5 2/2 | 6/1 5/1 4/1 6/1 | 4/4", "7/1.5 7/0.5 4/1 0/1 | 5/2 4/1 2/1 | 3/1 4/1 5/1 6/1 | 4/4"]],
        },
      ],
    },
    b: {
      chords: ["5", "6", "0", "4M"],
      next: ["a", "c"],
      parts: [
        { kind: "arp", layer: "ostinato", pattern: [0, 0, 2, 0, 3, 0, 2, 0], step: 0.5, vel: 0.75 },
        { kind: "arp", layer: "ostinatoHigh", octave: 1, pattern: [0, 1, 2, 1], step: 0.25, vel: 0.5 },
        { kind: "drum", layer: "taiko", pattern: "X..x..x.X..x.x..", step: 0.25, vel: 0.85 },
        { kind: "drum", layer: "frame", pattern: "..x...x...x...xx", step: 0.25, vel: 0.6 },
        { kind: "drum", layer: "shaker", pattern: "xoxoxoxoxoxoxoxo", step: 0.25, vel: 0.5 },
        { kind: "pad", layer: "strings", vel: 0.5 },
        { kind: "bass", layer: "bass", octave: -1, pattern: "0/1.5 0/0.5 r/1 0/0.5 2/0.5", vel: 0.7 },
        { kind: "line", layer: "horn", octave: 1, vel: 0.85, phrases: [["7/3 6/1 | 5/3 4/1 | 2/1 4/1 6/1 7/1 | 4/4", "7/2 8/1 7/1 | 5/2 4/2 | 2/1 4/1 5/1 6/1 | 4/4"]] },
        { kind: "drum", layer: "cymbal", pattern: "x", step: 4, dur: 4, bars: [3] },
      ],
    },
    c: {
      chords: ["0", "0", "5", "4M"],
      next: ["a"],
      parts: [
        { kind: "arp", layer: "ostinato", pattern: [0, 0, 1, 0, 2, 0, 1, 0], step: 0.5, vel: 0.6 },
        { kind: "drum", layer: "taiko", pattern: "X.......x.......", step: 0.25, vel: 0.8 },
        { kind: "drum", layer: "shaker", pattern: "x.o.x.o.x.o.x.o.", step: 0.25, vel: 0.4 },
        { kind: "bass", layer: "brass", octave: -1, pattern: "0/4", vel: 0.55 },
        { kind: "drum", layer: "timpani", octave: -1, tuned: true, pattern: "ggggggoooooxxxxX", step: 0.25, dur: 0.5, vel: 0.6, bars: [3] },
      ],
    },
  },
};

/**
 * Boss - C harmonic minor with a Neapolitan D-flat: choir and low brass over
 * war drums and timpani, the choir lamenting in thirds in the second section.
 */
export const BOSS: ThemeDef = {
  bpm: 122,
  meter: 4,
  root: 48,
  scale: MODES.harmonicMinor,
  reverb: 0.35,
  start: "a",
  layers: {
    choir: { inst: "choir", gain: 0.95, pan: -0.25, reverb: 0.5 },
    voices: { inst: "choir", gain: 0.95, pan: 0.25, reverb: 0.5 },
    brass: { inst: "lowbrass", gain: 1, pan: -0.1 },
    horn: { inst: "horn", gain: 0.95, pan: 0.2 },
    ostinato: { inst: "spiccato", gain: 0.65, pan: 0.3 },
    strings: { inst: "strings", gain: 0.7, pan: -0.3 },
    bass: { inst: "bass", gain: 0.6 },
    taiko: { inst: "taiko", gain: 0.9, reverb: 0.3 },
    timpani: { inst: "timpani", gain: 0.75 },
    frame: { inst: "frame", gain: 0.5, pan: 0.3 },
    cymbal: { inst: "cymbal", gain: 0.7, pan: -0.35 },
  },
  sections: {
    a: {
      chords: ["0", "1-M", "0", "4"],
      next: ["b", "a", "b"],
      parts: [
        { kind: "bass", layer: "brass", octave: -1, pattern: "0/0.75 0/0.75 0/0.5 2/1 1/1", vel: 0.8 },
        { kind: "pad", layer: "choir", vel: 0.7 },
        { kind: "arp", layer: "ostinato", octave: 1, pattern: [0, 1, 0, 2, 0, 1, 0, 2], step: 0.25, vel: 0.55 },
        { kind: "drum", layer: "taiko", pattern: "X..x..x.X.x.x...", step: 0.25, vel: 0.9 },
        { kind: "drum", layer: "timpani", octave: -2, tuned: true, pattern: "X.......x...x.x.", step: 0.25, dur: 0.5, vel: 0.6 },
        { kind: "drum", layer: "frame", pattern: "..x...x...x...x.", step: 0.25, vel: 0.5 },
        { kind: "bass", layer: "bass", octave: -2, pattern: "0/0.75 0/0.75 0/0.5 2/1 1/1", vel: 0.65 },
        { kind: "line", layer: "horn", octave: 0, vel: 0.75, fromPass: 2, phrases: [["7/2 6/1 5/1 | 8-/4 | 7/1 8/1 7/1 4/1 | 6/4"]] },
      ],
    },
    b: {
      chords: ["5", "1-M", "5", "4"],
      next: ["a", "c"],
      parts: [
        { kind: "line", layer: "voices", octave: 1, vel: 0.75, harmony: -2, phrases: [["7/2 8-/2 | 8-/1 7/1 5/2 | 5/2 4/1 7/1 | 6/4"]] },
        { kind: "pad", layer: "strings", octave: -1, vel: 0.55, root: true },
        { kind: "bass", layer: "brass", octave: -1, pattern: "0/0.75 0/0.75 0/0.5 2/1 1/1", vel: 0.8 },
        { kind: "arp", layer: "ostinato", octave: 1, pattern: [0, 1, 0, 2, 0, 1, 0, 2], step: 0.25, vel: 0.55 },
        { kind: "drum", layer: "taiko", pattern: "X..x..x.X.x.x.xx", step: 0.25, vel: 0.9 },
        { kind: "drum", layer: "timpani", octave: -2, tuned: true, pattern: "X.......X.......", step: 0.25, dur: 1, vel: 0.6 },
        { kind: "bass", layer: "bass", octave: -2, pattern: "0/0.75 0/0.75 0/0.5 2/1 1/1", vel: 0.65 },
        { kind: "drum", layer: "cymbal", pattern: "x", step: 4, dur: 4, bars: [3] },
      ],
    },
    c: {
      chords: ["0", "0"],
      next: ["a", "b"],
      parts: [
        { kind: "drum", layer: "taiko", pattern: "X...x...X.x.x.x.", step: 0.25, vel: 0.85 },
        { kind: "drum", layer: "timpani", octave: -2, tuned: true, pattern: "ggggggggoooooooooooxxxxxxxxxXXXX", step: 0.25, dur: 0.5, vel: 0.6 },
        { kind: "pad", layer: "choir", octave: -1, vel: 0.6 },
        { kind: "drum", layer: "cymbal", pattern: "x", step: 4, dur: 4, bars: [1] },
      ],
    },
  },
};
